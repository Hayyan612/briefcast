"""Briefcast HTTP API. Every query is scoped to the authenticated user."""

import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.align import align_transcript, is_aligned
from app.audio import audio_response, slug_filename
from app.auth import CurrentUser
from app.db import DbSession
from app.episodes import start_manual_episode
from app.models import (
    Briefing,
    BriefingLink,
    Episode,
    EpisodeAudio,
    EpisodeStatus,
    User,
)
from app.queue import enqueue_episode, make_pool
from app.routes import feed as feed_routes
from app.routes import links as links_routes
from app.routes import public as public_routes
from app.routes import voices as voices_routes
from app.scheduling import next_run_after
from app.schemas import (
    BriefingIn,
    BriefingOut,
    BriefingPatch,
    EpisodeDetail,
    EpisodeSummary,
    Me,
)
from app.tts import approximate_transcript
from app.voices import voice_supports


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await make_pool()
    yield
    await app.state.redis.aclose()


app = FastAPI(title="Briefcast API", lifespan=lifespan)
app.include_router(voices_routes.router)
app.include_router(feed_routes.router)
app.include_router(public_routes.router)
app.include_router(links_routes.router)


def now_utc() -> datetime:
    return datetime.now(UTC)


async def owned_briefing(session: AsyncSession, user: User, briefing_id: uuid.UUID) -> Briefing:
    briefing = await session.scalar(
        select(Briefing).where(Briefing.id == briefing_id, Briefing.user_id == user.id)
    )
    if briefing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Briefing not found")
    return briefing


async def owned_episode(session: AsyncSession, user: User, episode_id: uuid.UUID) -> Episode:
    episode = await session.scalar(
        select(Episode).where(Episode.id == episode_id, Episode.user_id == user.id)
    )
    if episode is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Episode not found")
    return episode


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/me", response_model=Me)
async def me(user: CurrentUser) -> User:
    return user


# ---------- briefings ----------


async def latest_episodes(session: AsyncSession, briefing_ids: list[uuid.UUID]) -> dict:
    if not briefing_ids:
        return {}
    rows = await session.scalars(
        select(Episode)
        .where(Episode.briefing_id.in_(briefing_ids))
        .ext(distinct_on(Episode.briefing_id))
        .order_by(Episode.briefing_id, Episode.created_at.desc())
    )
    return {e.briefing_id: e for e in rows}


async def pending_link_counts(session: AsyncSession, briefing_ids: list[uuid.UUID]) -> dict:
    if not briefing_ids:
        return {}
    rows = await session.execute(
        select(BriefingLink.briefing_id, func.count())
        .where(BriefingLink.briefing_id.in_(briefing_ids), BriefingLink.used_at.is_(None))
        .group_by(BriefingLink.briefing_id)
    )
    return dict(rows.all())


def briefing_out(briefing: Briefing, latest: Episode | None) -> BriefingOut:
    out = BriefingOut.model_validate(briefing)
    out.latest_episode = EpisodeSummary.model_validate(latest) if latest else None
    return out


@app.get("/briefings", response_model=list[BriefingOut])
async def list_briefings(user: CurrentUser, session: DbSession) -> list[BriefingOut]:
    briefings = list(
        await session.scalars(
            select(Briefing).where(Briefing.user_id == user.id).order_by(Briefing.created_at.desc())
        )
    )
    ids = [b.id for b in briefings]
    latest = await latest_episodes(session, ids)
    pending = await pending_link_counts(session, ids)
    out = []
    for b in briefings:
        item = briefing_out(b, latest.get(b.id))
        item.pending_links = pending.get(b.id, 0)
        out.append(item)
    return out


@app.post("/briefings", response_model=BriefingOut, status_code=201)
async def create_briefing(
    body: BriefingIn,
    user: CurrentUser,
    session: DbSession,
) -> BriefingOut:
    count = await session.scalar(select(func.count()).where(Briefing.user_id == user.id))
    if (count or 0) >= 10:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can have up to 10 briefings")
    briefing = Briefing(
        user_id=user.id,
        topic=body.topic,
        delivery_time=body.delivery_time,
        timezone=body.timezone,
        voice=body.voice,
        language=body.language,
        email_enabled=body.email_enabled,
        trusted_domains=body.trusted_domains,
        blocked_domains=body.blocked_domains,
        region=body.region,
        lookback=body.lookback,
        finance_mode=body.finance_mode,
        watch_urls=body.watch_urls,
        icon=body.icon,
        color=body.color,
        next_run_at=next_run_after(body.delivery_time, body.timezone, now_utc()),
    )
    session.add(briefing)
    await session.commit()
    await session.refresh(briefing)
    return briefing_out(briefing, None)


@app.patch("/briefings/{briefing_id}", response_model=BriefingOut)
async def update_briefing(
    briefing_id: uuid.UUID,
    body: BriefingPatch,
    user: CurrentUser,
    session: DbSession,
) -> BriefingOut:
    briefing = await owned_briefing(session, user, briefing_id)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("topic"):
        changes["topic"] = " ".join(changes["topic"].split())
    if changes.get("delivery_time"):
        changes["delivery_time"] = changes["delivery_time"].replace(second=0, microsecond=0)
    for field, value in changes.items():
        if value is not None or field in ("region", "icon", "color"):
            setattr(briefing, field, value)
    if not voice_supports(briefing.voice, briefing.language):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT, "This voice does not speak the chosen language"
        )
    if {"delivery_time", "timezone", "is_active"} & changes.keys():
        briefing.next_run_at = next_run_after(briefing.delivery_time, briefing.timezone, now_utc())
    await session.commit()
    await session.refresh(briefing)
    latest = await latest_episodes(session, [briefing.id])
    return briefing_out(briefing, latest.get(briefing.id))


@app.delete("/briefings/{briefing_id}", status_code=204)
async def delete_briefing(
    briefing_id: uuid.UUID,
    user: CurrentUser,
    session: DbSession,
) -> Response:
    briefing = await owned_briefing(session, user, briefing_id)
    await session.delete(briefing)
    await session.commit()
    return Response(status_code=204)


@app.post("/briefings/{briefing_id}/run", response_model=EpisodeSummary, status_code=202)
async def run_now(
    briefing_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> Episode:
    """Generate an episode immediately (for demos), outside the daily schedule."""
    briefing = await owned_briefing(session, user, briefing_id)
    return await start_manual_episode(session, request.app.state.redis, user, briefing)


# ---------- episodes ----------


@app.get("/episodes", response_model=list[EpisodeSummary])
async def list_episodes(
    user: CurrentUser,
    session: DbSession,
    briefing_id: uuid.UUID | None = None,
    limit: int = 30,
) -> list[Episode]:
    stmt = select(Episode).where(Episode.user_id == user.id)
    if briefing_id:
        stmt = stmt.where(Episode.briefing_id == briefing_id)
    stmt = stmt.order_by(Episode.created_at.desc()).limit(min(max(limit, 1), 100))
    return list(await session.scalars(stmt))


@app.get("/episodes/{episode_id}", response_model=EpisodeDetail)
async def get_episode(
    episode_id: uuid.UUID,
    user: CurrentUser,
    session: DbSession,
) -> EpisodeDetail:
    episode = await owned_episode(session, user, episode_id)
    if (
        episode.status == "ready"
        and episode.duration_seconds
        and not is_aligned(episode.transcript)
    ):
        await align_stored_transcript(session, episode)
    detail = EpisodeDetail.model_validate(episode)
    if not detail.transcript and episode.script and episode.duration_seconds:
        detail.transcript = approximate_transcript(episode.script, episode.duration_seconds)
    return detail


async def align_stored_transcript(session: AsyncSession, episode: Episode) -> None:
    """Snap an older episode's transcript to its audio once, and keep the result."""
    audio = await session.get(EpisodeAudio, episode.id)
    if audio is None:
        return
    lines = episode.transcript or (
        approximate_transcript(episode.script, episode.duration_seconds) if episode.script else []
    )
    aligned = await align_transcript(lines, audio.data, float(episode.duration_seconds))
    if is_aligned(aligned):
        episode.transcript = aligned
        await session.commit()


@app.post("/episodes/{episode_id}/retry", response_model=EpisodeSummary, status_code=202)
async def retry_episode(
    episode_id: uuid.UUID,
    request: Request,
    user: CurrentUser,
    session: DbSession,
) -> Episode:
    episode = await owned_episode(session, user, episode_id)
    if episode.status != EpisodeStatus.failed:
        raise HTTPException(status.HTTP_409_CONFLICT, "Only failed episodes can be retried")
    episode.status = EpisodeStatus.queued
    episode.error = None
    await session.commit()
    await enqueue_episode(request.app.state.redis, episode.id)
    return episode


@app.get("/episodes/{episode_id}/audio")
async def episode_audio(
    episode_id: uuid.UUID,
    user: CurrentUser,
    session: DbSession,
    download: bool = False,
    range_header: Annotated[str | None, Header(alias="range")] = None,
) -> Response:
    """Serve the MP3 (Range-aware, so players can seek). ?download=1 saves it as a file."""
    episode = await owned_episode(session, user, episode_id)
    audio = await session.get(EpisodeAudio, episode_id)
    if audio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audio not ready")
    filename = slug_filename(episode.title, "briefcast-episode") if download else None
    return audio_response(audio.data, audio.mime_type, range_header, filename=filename)
