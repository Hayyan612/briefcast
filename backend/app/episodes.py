"""Starting an episode on demand (Run now, or "make an episode from this link")."""

from datetime import timedelta

from arq import ArqRedis
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Briefing, Episode, EpisodeStatus, EpisodeTrigger, User
from app.queue import enqueue_episode
from app.scheduling import now_utc


async def start_manual_episode(
    session: AsyncSession, redis: ArqRedis, user: User, briefing: Briefing
) -> Episode:
    in_flight = await session.scalar(
        select(func.count()).where(
            Episode.briefing_id == briefing.id,
            Episode.status.notin_([EpisodeStatus.ready, EpisodeStatus.failed]),
        )
    )
    if in_flight:
        raise HTTPException(status.HTTP_409_CONFLICT, "An episode is already being generated")
    manual_today = await session.scalar(
        select(func.count()).where(
            Episode.user_id == user.id,
            Episode.trigger == EpisodeTrigger.manual,
            Episode.created_at > now_utc() - timedelta(days=1),
        )
    )
    if (manual_today or 0) >= get_settings().manual_runs_per_day:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, "Daily limit for manual runs")

    episode = Episode(
        briefing_id=briefing.id,
        user_id=user.id,
        topic=briefing.topic,
        trigger=EpisodeTrigger.manual,
        scheduled_for=now_utc(),
    )
    session.add(episode)
    await session.commit()
    await session.refresh(episode)
    await enqueue_episode(redis, episode.id)
    return episode
