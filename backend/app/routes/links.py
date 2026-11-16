"""Add a link: articles the listener wants covered in the next (or an immediate) episode."""

import uuid

from fastapi import APIRouter, HTTPException, Request, Response, status
from sqlalchemy import func, select

from app.auth import CurrentUser
from app.db import DbSession
from app.episodes import start_manual_episode
from app.models import Briefing, BriefingLink
from app.schemas import EpisodeSummary, LinkIn, LinkOut

router = APIRouter()
MAX_PENDING = 3


async def _owned(session: DbSession, user, briefing_id: uuid.UUID) -> Briefing:
    briefing = await session.scalar(
        select(Briefing).where(Briefing.id == briefing_id, Briefing.user_id == user.id)
    )
    if briefing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Briefing not found")
    return briefing


@router.get("/briefings/{briefing_id}/links", response_model=list[LinkOut])
async def pending_links(briefing_id: uuid.UUID, user: CurrentUser, session: DbSession):
    await _owned(session, user, briefing_id)
    return list(
        await session.scalars(
            select(BriefingLink)
            .where(BriefingLink.briefing_id == briefing_id, BriefingLink.used_at.is_(None))
            .order_by(BriefingLink.created_at)
        )
    )


@router.post("/briefings/{briefing_id}/links", status_code=201)
async def add_link(
    briefing_id: uuid.UUID, body: LinkIn, request: Request, user: CurrentUser, session: DbSession
) -> dict:
    briefing = await _owned(session, user, briefing_id)
    pending = await session.scalar(
        select(func.count()).where(
            BriefingLink.briefing_id == briefing.id, BriefingLink.used_at.is_(None)
        )
    )
    if (pending or 0) >= MAX_PENDING:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, f"Up to {MAX_PENDING} links can wait for an episode"
        )
    link = BriefingLink(briefing_id=briefing.id, url=body.url)
    session.add(link)
    await session.commit()
    episode = None
    if body.run_now:
        episode = await start_manual_episode(session, request.app.state.redis, user, briefing)
    return {
        "link": LinkOut.model_validate(link).model_dump(mode="json"),
        "episode": EpisodeSummary.model_validate(episode).model_dump(mode="json")
        if episode
        else None,
    }


@router.delete("/briefings/{briefing_id}/links/{link_id}", status_code=204)
async def remove_link(
    briefing_id: uuid.UUID, link_id: uuid.UUID, user: CurrentUser, session: DbSession
) -> Response:
    await _owned(session, user, briefing_id)
    link = await session.get(BriefingLink, link_id)
    if link is None or link.briefing_id != briefing_id or link.used_at is not None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found")
    await session.delete(link)
    await session.commit()
    return Response(status_code=204)
