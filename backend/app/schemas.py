"""API request and response shapes."""

import uuid
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models import EpisodeStatus, EpisodeTrigger
from app.scheduling import validate_timezone
from app.voices import DEFAULT_VOICE, VOICES


class BriefingIn(BaseModel):
    topic: str = Field(min_length=5, max_length=500)
    delivery_time: time
    timezone: str = "Asia/Kolkata"
    voice: str = DEFAULT_VOICE

    @field_validator("topic")
    @classmethod
    def strip_topic(cls, v: str) -> str:
        return " ".join(v.split())

    @field_validator("timezone")
    @classmethod
    def check_tz(cls, v: str) -> str:
        return validate_timezone(v)

    @field_validator("voice")
    @classmethod
    def check_voice(cls, v: str) -> str:
        if v not in VOICES:
            raise ValueError("Unknown voice")
        return v

    @field_validator("delivery_time")
    @classmethod
    def whole_minutes(cls, v: time) -> time:
        return v.replace(second=0, microsecond=0, tzinfo=None)


class BriefingPatch(BaseModel):
    topic: str | None = Field(default=None, min_length=5, max_length=500)
    delivery_time: time | None = None
    timezone: str | None = None
    voice: str | None = None
    is_active: bool | None = None

    @field_validator("timezone")
    @classmethod
    def check_tz(cls, v: str | None) -> str | None:
        return validate_timezone(v) if v else v

    @field_validator("voice")
    @classmethod
    def check_voice(cls, v: str | None) -> str | None:
        if v is not None and v not in VOICES:
            raise ValueError("Unknown voice")
        return v


class EpisodeSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    briefing_id: uuid.UUID
    topic: str
    title: str | None
    status: EpisodeStatus
    trigger: EpisodeTrigger
    scheduled_for: datetime
    created_at: datetime
    completed_at: datetime | None
    duration_seconds: int | None
    error: str | None


class Source(BaseModel):
    id: str
    title: str
    url: str
    published: str | None = None


class EpisodeDetail(EpisodeSummary):
    script: str | None
    sources: list[Source] | None
    research_log: list[dict] | None
    emailed_at: datetime | None


class BriefingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    delivery_time: time
    timezone: str
    voice: str
    is_active: bool
    next_run_at: datetime
    created_at: datetime
    latest_episode: EpisodeSummary | None = None


class Me(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str | None
