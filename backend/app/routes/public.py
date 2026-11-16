"""Endpoints reached from emails without signing in."""

from fastapi import APIRouter, HTTPException, status

from app.db import DbSession
from app.models import Briefing
from app.tokens import read_unsubscribe_token

router = APIRouter(prefix="/public")


async def _briefing(session: DbSession, token: str) -> Briefing:
    briefing_id = read_unsubscribe_token(token)
    briefing = await session.get(Briefing, briefing_id) if briefing_id else None
    if briefing is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link is invalid or expired")
    return briefing


@router.get("/unsubscribe/{token}")
async def unsubscribe_info(token: str, session: DbSession) -> dict:
    briefing = await _briefing(session, token)
    return {"topic": briefing.topic, "email_enabled": briefing.email_enabled}


@router.post("/unsubscribe/{token}")
async def unsubscribe(token: str, session: DbSession) -> dict:
    """Turns off emails for one briefing. Also the RFC 8058 one-click target."""
    briefing = await _briefing(session, token)
    briefing.email_enabled = False
    await session.commit()
    return {"topic": briefing.topic, "email_enabled": False}
