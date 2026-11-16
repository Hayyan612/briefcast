"""ARQ worker: the scheduler tick and the episode pipeline.

Run with:  arq app.worker.WorkerSettings

schedule_due_briefings (cron, every minute)
    Locks due briefings with SELECT ... FOR UPDATE SKIP LOCKED, inserts one episode per
    (briefing, slot) (a unique constraint makes this idempotent), advances next_run_at,
    commits, then enqueues the jobs. It also re-enqueues episodes that were committed but
    never picked up (e.g. the worker died between commit and enqueue).

generate_episode (job)
    research -> script -> TTS -> store -> email. Each stage saves its output, so a retry
    resumes from the first unfinished stage instead of paying for research twice.
"""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from arq import Retry, cron, func
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from tavily import AsyncTavilyClient

from app.agent.llm import make_client
from app.agent.research import ResearchAgent
from app.agent.script import write_script
from app.config import get_settings
from app.db import SessionLocal
from app.mailer import episode_email, send_mail
from app.models import (
    Briefing,
    Episode,
    EpisodeAudio,
    EpisodeStatus,
    EpisodeTrigger,
    User,
)
from app.queue import GENERATE_EPISODE, enqueue_episode, redis_settings
from app.scheduling import next_run_after
from app.tokens import make_unsubscribe_token
from app.tts import TTSError, synthesize_script

log = logging.getLogger("briefcast.worker")

JOB_TIMEOUT = timedelta(minutes=15)
MAX_TRIES = 3
IN_PROGRESS = [EpisodeStatus.researching, EpisodeStatus.writing, EpisodeStatus.synthesizing]


def now_utc() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------- scheduler


async def schedule_due_briefings(ctx: dict) -> int:
    now = now_utc()
    to_enqueue: list[uuid.UUID] = []
    async with SessionLocal() as session, session.begin():
        due = (
            await session.scalars(
                select(Briefing)
                .where(Briefing.is_active.is_(True), Briefing.next_run_at <= now)
                .order_by(Briefing.next_run_at)
                .limit(200)
                .with_for_update(skip_locked=True)
            )
        ).all()
        for b in due:
            # Missed slots (worker was down) collapse into one catch-up episode.
            stmt = (
                insert(Episode)
                .values(
                    id=uuid.uuid4(),
                    briefing_id=b.id,
                    user_id=b.user_id,
                    topic=b.topic,
                    trigger=EpisodeTrigger.scheduled,
                    status=EpisodeStatus.queued,
                    scheduled_for=b.next_run_at,
                    attempts=0,
                )
                .on_conflict_do_nothing(constraint="uq_episode_slot")
                .returning(Episode.id)
            )
            episode_id = await session.scalar(stmt)
            if episode_id:
                to_enqueue.append(episode_id)
            b.next_run_at = next_run_after(b.delivery_time, b.timezone, now)

        # Recovery: queued but never started, or started by a worker that died.
        stale = await session.scalars(
            select(Episode.id).where(
                (
                    (Episode.status == EpisodeStatus.queued)
                    & (Episode.created_at < now - timedelta(minutes=2))
                )
                | (
                    Episode.status.in_(IN_PROGRESS)
                    & (Episode.started_at < now - JOB_TIMEOUT - timedelta(minutes=2))
                )
            )
        )
        to_enqueue += [i for i in stale if i not in to_enqueue]

    for episode_id in to_enqueue:
        await enqueue_episode(ctx["redis"], episode_id)  # duplicate job ids are ignored
    if to_enqueue:
        log.info("enqueued %d episode(s)", len(to_enqueue))
    return len(to_enqueue)


# ---------------------------------------------------------------- pipeline


async def set_status(episode_id: uuid.UUID, status: EpisodeStatus, **fields) -> None:
    async with SessionLocal() as session, session.begin():
        ep = await session.get(Episode, episode_id)
        if ep is None:
            return
        ep.status = status
        for k, v in fields.items():
            setattr(ep, k, v)


async def generate_episode(ctx: dict, episode_id_str: str) -> str:
    episode_id = uuid.UUID(episode_id_str)
    settings = get_settings()

    async with SessionLocal() as session:
        ep = await session.get(Episode, episode_id)
        if ep is None or ep.status == EpisodeStatus.ready:
            return "skip"
        briefing = await session.get(Briefing, ep.briefing_id)
        user = await session.get(User, ep.user_id)
        if briefing is None or user is None:
            return "skip"
        has_audio = await session.get(EpisodeAudio, episode_id) is not None
        script, title = ep.script, ep.title
        ep.attempts += 1
        ep.started_at = now_utc()
        ep.error = None
        await session.commit()

    tz = ZoneInfo(briefing.timezone)
    local_date = ep.scheduled_for.astimezone(tz).strftime("%A, %d %B %Y")

    try:
        if not script:
            await set_status(episode_id, EpisodeStatus.researching)
            agent = ResearchAgent(ctx["llm"], ctx["tavily"])
            research = await agent.run(ep.topic, now_utc(), local_date)
            await set_status(
                episode_id,
                EpisodeStatus.writing,
                sources=[s.public() for s in research.sources],
                research_log=research.log,
            )
            title, script = await write_script(
                ctx["llm"], ep.topic, local_date, research, settings.target_words, briefing.language
            )
            await set_status(episode_id, EpisodeStatus.writing, title=title, script=script)

        if not has_audio:
            await set_status(episode_id, EpisodeStatus.synthesizing)
            mp3, duration = await synthesize_script(script, briefing.voice, briefing.language)
            async with SessionLocal() as session, session.begin():
                session.add(EpisodeAudio(episode_id=episode_id, data=mp3))
                ep_row = await session.get(Episode, episode_id)
                ep_row.duration_seconds = duration

        await set_status(episode_id, EpisodeStatus.ready, completed_at=now_utc())
    except TTSError as exc:
        if "rejected" in str(exc):  # bad key / no credit: retrying will not help
            await set_status(episode_id, EpisodeStatus.failed, error=str(exc)[:1000])
            raise
        await _retry_or_fail(ctx, episode_id, exc)
    except Exception as exc:  # noqa: BLE001 - every failure is recorded on the episode
        await _retry_or_fail(ctx, episode_id, exc)

    await send_ready_email(episode_id)
    return "ready"


async def _retry_or_fail(ctx: dict, episode_id: uuid.UUID, exc: Exception) -> None:
    log.exception("episode %s failed (try %s)", episode_id, ctx.get("job_try"))
    if ctx.get("job_try", 1) < MAX_TRIES:
        raise Retry(defer=60 * ctx.get("job_try", 1)) from exc
    await set_status(episode_id, EpisodeStatus.failed, error=f"{type(exc).__name__}: {exc}"[:1000])
    raise exc


async def send_ready_email(episode_id: uuid.UUID) -> None:
    settings = get_settings()
    async with SessionLocal() as session:
        ep = await session.get(Episode, episode_id)
        user = await session.get(User, ep.user_id) if ep else None
        briefing = await session.get(Briefing, ep.briefing_id) if ep else None
        if ep is None or user is None or briefing is None or ep.emailed_at is not None:
            return
        if not briefing.email_enabled:
            return
        base = settings.app_url.rstrip("/")
        unsubscribe_url = f"{base}/unsubscribe/{make_unsubscribe_token(briefing.id)}"
        subject, text, html = episode_email(
            user.name,
            ep.topic,
            ep.title or "Your daily briefing",
            f"{settings.app_url.rstrip('/')}/episodes/{ep.id}",
            max(1, round((ep.duration_seconds or 0) / 60)),
            len(ep.sources or []),
            unsubscribe_url,
        )
        try:
            await send_mail(user.email, subject, text, html, unsubscribe_url)
        except Exception:
            log.exception("email for episode %s failed", episode_id)
            return
        ep.emailed_at = now_utc()
        await session.commit()


# ---------------------------------------------------------------- worker config


async def startup(ctx: dict) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
    ctx["llm"] = make_client()
    ctx["tavily"] = AsyncTavilyClient(api_key=get_settings().tavily_api_key)


async def shutdown(ctx: dict) -> None:
    await ctx["llm"].close()


class WorkerSettings:
    redis_settings = redis_settings()
    functions = (
        func(
            generate_episode,
            name=GENERATE_EPISODE,
            timeout=JOB_TIMEOUT,
            max_tries=MAX_TRIES,
        ),
    )
    cron_jobs = (cron(schedule_due_briefings, second=0, run_at_startup=True, timeout=55),)
    on_startup = startup
    on_shutdown = shutdown
    # Gnani allows one active TTS request per account, so keep generation serial-ish.
    max_jobs = 2
    keep_result = 0  # lets a failed episode be re-enqueued under the same job id
    health_check_interval = 60
