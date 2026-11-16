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
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
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
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    error: Mapped[str | None] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    emailed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    briefing: Mapped[Briefing] = relationship(back_populates="episodes")


class EpisodeAudio(Base):
    __tablename__ = "episode_audio"

    episode_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("episodes.id", ondelete="CASCADE"), primary_key=True
    )
    mime_type: Mapped[str] = mapped_column(String(64), default="audio/mpeg")
    data: Mapped[bytes] = mapped_column(LargeBinary)
