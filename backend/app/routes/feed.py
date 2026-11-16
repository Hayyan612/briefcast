"""Private podcast feed: one secret URL per user that any podcast app can subscribe to.

Podcast apps cannot sign in, so the feed and its audio are authorised by an unguessable
token in the URL. Rotating the token revokes every previously shared link.
"""

import secrets
import uuid
from email.utils import format_datetime
from typing import Annotated
from xml.sax.saxutils import escape

from fastapi import APIRouter, Header, HTTPException, Response, status
from sqlalchemy import func, select

from app.audio import audio_response
from app.auth import CurrentUser
from app.config import get_settings
from app.db import DbSession
from app.models import Episode, EpisodeAudio, EpisodeStatus, User

router = APIRouter()


def feed_path(token: str) -> str:
    return f"/feed/{token}"


@router.get("/me/feed")
async def my_feed(user: CurrentUser, session: DbSession) -> dict:
    if not user.feed_token:
        user.feed_token = secrets.token_urlsafe(24)
        await session.commit()
    return {"path": feed_path(user.feed_token)}


@router.post("/me/feed/rotate")
async def rotate_feed(user: CurrentUser, session: DbSession) -> dict:
    user.feed_token = secrets.token_urlsafe(24)
    await session.commit()
    return {"path": feed_path(user.feed_token)}


async def _user_for_token(session: DbSession, token: str) -> User:
    user = await session.scalar(select(User).where(User.feed_token == token)) if token else None
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feed not found")
    return user


@router.get("/public/feed/{token}")
async def public_feed(token: str, session: DbSession) -> Response:
    user = await _user_for_token(session, token)
    base = get_settings().app_url.rstrip("/")
    rows = (
        await session.execute(
            select(Episode, func.length(EpisodeAudio.data))
            .join(EpisodeAudio, EpisodeAudio.episode_id == Episode.id)
            .where(Episode.user_id == user.id, Episode.status == EpisodeStatus.ready)
            .order_by(Episode.completed_at.desc())
            .limit(100)
        )
    ).all()

    items = []
    for ep, size in rows:
        when = ep.completed_at or ep.created_at
        sources = "".join(
            f'<li><a href="{escape(s["url"])}">{escape(s["title"])}</a></li>'
            for s in (ep.sources or [])
        )
        notes = f"<p>{escape(ep.topic)}</p><ul>{sources}</ul>"
        items.append(
            f"""    <item>
      <title>{escape(ep.title or ep.topic)}</title>
      <guid isPermaLink="false">{ep.id}</guid>
      <pubDate>{format_datetime(when)}</pubDate>
      <link>{base}/episodes/{ep.id}</link>
      <description><![CDATA[{notes}]]></description>
      <enclosure url="{base}{feed_path(token)}/{ep.id}.mp3" length="{size}" type="audio/mpeg"/>
      <itunes:duration>{ep.duration_seconds or 0}</itunes:duration>
      <itunes:explicit>false</itunes:explicit>
    </item>"""
        )

    who = escape(user.name or "you")
    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Briefcast · {who}</title>
    <link>{base}/dashboard</link>
    <language>en</language>
    <description>Your daily research briefings, made by Briefcast.</description>
    <itunes:author>Briefcast</itunes:author>
    <itunes:explicit>false</itunes:explicit>
    <itunes:block>yes</itunes:block>
{chr(10).join(items)}
  </channel>
</rss>
"""
    return Response(
        xml,
        media_type="application/rss+xml; charset=utf-8",
        headers={"Cache-Control": "private, max-age=300"},
    )


@router.get("/public/feed/{token}/{episode_id}.mp3")
async def public_feed_audio(
    token: str,
    episode_id: uuid.UUID,
    session: DbSession,
    range_header: Annotated[str | None, Header(alias="range")] = None,
) -> Response:
    user = await _user_for_token(session, token)
    episode = await session.scalar(
        select(Episode).where(Episode.id == episode_id, Episode.user_id == user.id)
    )
    audio = await session.get(EpisodeAudio, episode_id) if episode else None
    if audio is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Episode not found")
    return audio_response(audio.data, audio.mime_type, range_header)
