"""Briefcast HTTP API. Every query is scoped to the authenticated user."""

import re
import uuid
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import FastAPI, Header, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import distinct_on
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import CurrentUser
from app.config import get_settings
from app.db import DbSession
from app.models import Briefing, Episode, EpisodeAudio, EpisodeStatus, EpisodeTrigger, User
from app.queue import enqueue_episode, make_pool
from app.scheduling import next_run_after
from app.schemas import (
    BriefingIn,
    BriefingOut,
    BriefingPatch,
    EpisodeDetail,
    EpisodeSummary,
    Me,
)
from app.voices import VOICES


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = await make_pool()
    yield
    await app.state.redis.aclose()


app = FastAPI(title="Briefcast API", lifespan=lifespan)


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


@app.get("/voices")
async def voices() -> list[dict]:
    return [{"id": key, **meta} for key, meta in VOICES.items()]


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
    latest = await latest_episodes(session, [b.id for b in briefings])
    return [briefing_out(b, latest.get(b.id)) for b in briefings]


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
        if value is not None:
            setattr(briefing, field, value)
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
    await enqueue_episode(request.app.state.redis, episode.id)
    return episode


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
) -> Episode:
    return await owned_episode(session, user, episode_id)


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


RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


@app.get("/episodes/{episode_id}/audio")
async def episode_audio(
    episode_id: uuid.UUID,
    user: CurrentUser,
    session: DbSession,
    range_header: Annotated[str | None, Header(alias="range")] = None,
) -> Response:
    """Serve the MP3, honouring Range requests so the player can seek."""
    await owned_episode(session, user, episode_id)
    audio = await session.get(EpisodeAudio, episode_id)
    if audio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Audio not ready")
    data, size = audio.data, len(audio.data)
    headers = {"Accept-Ranges": "bytes", "Cache-Control": "private, max-age=3600"}

    match = RANGE_RE.fullmatch(range_header.strip()) if range_header else None
    if not match or (not match.group(1) and not match.group(2)):
        return Response(data, media_type=audio.mime_type, headers=headers)

    start_s, end_s = match.groups()
    if start_s:
        start, end = int(start_s), min(int(end_s) if end_s else size - 1, size - 1)
    else:  # suffix range: last N bytes
        start, end = max(size - int(end_s), 0), size - 1
    if start > end or start >= size:
        return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
    headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return Response(
        data[start : end + 1], status_code=206, media_type=audio.mime_type, headers=headers
    )
