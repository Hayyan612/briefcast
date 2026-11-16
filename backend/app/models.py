"""Database schema.

users ─< briefings ─< episodes ─ episode_audio

Every episode also stores user_id, so ownership checks are one indexed filter.
Audio lives in its own table so listing episodes never loads megabytes of MP3.
"""

import enum
import uuid
from datetime import datetime, time

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    Time,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    name: Mapped[str | None] = mapped_column(String(200))
    image: Mapped[str | None] = mapped_column(Text)
    # Secret token for the user's private podcast feed. Rotating it revokes old links.
    feed_token: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Briefing(Base):
    __tablename__ = "briefings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    topic: Mapped[str] = mapped_column(Text)
    # Wall-clock delivery time in the user's own timezone, e.g. 08:00 Asia/Kolkata.
    delivery_time: Mapped[time] = mapped_column(Time)
    timezone: Mapped[str] = mapped_column(String(64))
    voice: Mapped[str] = mapped_column(String(64))
    language: Mapped[str] = mapped_column(String(8), default="en-IN", server_default="en-IN")
    email_enabled: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Source controls (all optional).
    trusted_domains: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    blocked_domains: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    region: Mapped[str | None] = mapped_column(String(32))
    lookback: Mapped[str] = mapped_column(String(8), default="day", server_default="day")
    finance_mode: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    # Websites to follow: new pages on them become sources.
    watch_urls: Mapped[list] = mapped_column(JSONB, default=list, server_default="[]")
    # Cover art (None = chosen automatically from the topic).
    icon: Mapped[str | None] = mapped_column(String(24))
    color: Mapped[str | None] = mapped_column(String(16))
    # Next due instant in UTC. The scheduler only ever compares this to now().
    next_run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    episodes: Mapped[list["Episode"]] = relationship(
        back_populates="briefing", cascade="all, delete-orphan", passive_deletes=True
    )


class EpisodeStatus(str, enum.Enum):
    queued = "queued"
    researching = "researching"
    writing = "writing"
    synthesizing = "synthesizing"
    ready = "ready"
    failed = "failed"


class EpisodeTrigger(str, enum.Enum):
    scheduled = "scheduled"
    manual = "manual"


class Episode(Base):
    __tablename__ = "episodes"
    # One scheduled episode per briefing per slot: makes the scheduler idempotent.
    __table_args__ = (UniqueConstraint("briefing_id", "scheduled_for", name="uq_episode_slot"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("briefings.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    topic: Mapped[str] = mapped_column(Text)  # snapshot, so editing a briefing keeps history true
    trigger: Mapped[EpisodeTrigger] = mapped_column(Enum(EpisodeTrigger, name="episode_trigger"))
    status: Mapped[EpisodeStatus] = mapped_column(
        Enum(EpisodeStatus, name="episode_status"), default=EpisodeStatus.queued, index=True
    )
    scheduled_for: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    title: Mapped[str | None] = mapped_column(Text)
    script: Mapped[str | None] = mapped_column(Text)
    sources: Mapped[list | None] = mapped_column(JSONB)
    research_log: Mapped[list | None] = mapped_column(JSONB)
    # Short statements of what this episode covered; later episodes avoid repeating them.
    findings: Mapped[list | None] = mapped_column(JSONB)
    # Timed transcript: [{start, end, text, p}] in seconds, p = paragraph index.
    transcript: Mapped[list | None] = mapped_column(JSONB)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    emailed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    briefing: Mapped[Briefing] = relationship(back_populates="episodes", lazy="joined")

    # The briefing's cover choice, shown with each episode.
    @property
    def icon(self) -> str | None:
        return self.briefing.icon if self.briefing else None

    @property
    def color(self) -> str | None:
        return self.briefing.color if self.briefing else None


class EpisodeAudio(Base):
    __tablename__ = "episode_audio"

    episode_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("episodes.id", ondelete="CASCADE"), primary_key=True
    )
    mime_type: Mapped[str] = mapped_column(String(64), default="audio/mpeg")
    data: Mapped[bytes] = mapped_column(LargeBinary)


class VoicePreview(Base):
    """A short sample per (voice, language), generated once and reused."""

    __tablename__ = "voice_previews"

    key: Mapped[str] = mapped_column(String(96), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BriefingLink(Base):
    """An article the listener asked to include ("Add a link")."""

    __tablename__ = "briefing_links"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("briefings.id", ondelete="CASCADE"), index=True
    )
    url: Mapped[str] = mapped_column(Text)
    title: Mapped[str | None] = mapped_column(Text)
    used_episode_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("episodes.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class WatchedPage(Base):
    """A page already seen on a followed website, so only new pages count as news."""

    __tablename__ = "watched_pages"
    __table_args__ = (UniqueConstraint("briefing_id", "url", name="uq_watched_page"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    briefing_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("briefings.id", ondelete="CASCADE"), index=True
    )
    site: Mapped[str] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text)
    first_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
