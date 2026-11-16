"""API request and response shapes."""

import uuid
from datetime import datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.cover import COLORS, ICONS
from app.models import EpisodeStatus, EpisodeTrigger
from app.scheduling import validate_timezone
from app.sources import LOOKBACKS, REGIONS, normalize_domains, normalize_url, normalize_watch_urls
from app.titles import source_title
from app.voices import DEFAULT_LANGUAGE, DEFAULT_VOICE, LANGUAGES, VOICES, voice_supports


def check_cover(field: str, v: str | None) -> str | None:
    if v in (None, ""):
        return None
    allowed = ICONS if field == "icon" else COLORS
    if v not in allowed:
        raise ValueError(f"Unknown {field}")
    return v


def check_region(v: str | None) -> str | None:
    if v in (None, ""):
        return None
    if v not in REGIONS:
        raise ValueError("Unsupported region")
    return v


def check_lookback(v: str) -> str:
    if v not in LOOKBACKS:
        raise ValueError("Look-back must be 'day' or 'week'")
    return v


class LinkIn(BaseModel):
    url: str
    run_now: bool = False

    @field_validator("url")
    @classmethod
    def check_url(cls, v: str) -> str:
        return normalize_url(v)


class LinkOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    title: str | None
    created_at: datetime


class BriefingIn(BaseModel):
    topic: str = Field(min_length=5, max_length=500)
    delivery_time: time
    timezone: str = "Asia/Kolkata"
    voice: str = DEFAULT_VOICE
    language: str = DEFAULT_LANGUAGE
    email_enabled: bool = True
    trusted_domains: list[str] = Field(default_factory=list)
    blocked_domains: list[str] = Field(default_factory=list)
    region: str | None = None
    lookback: str = "day"
    finance_mode: bool = False
    watch_urls: list[str] = Field(default_factory=list)
    icon: str | None = None
    color: str | None = None

    _cover = field_validator("icon", "color")(lambda cls, v, info: check_cover(info.field_name, v))
    _domains = field_validator("trusted_domains", "blocked_domains")(
        lambda cls, v: normalize_domains(v)
    )
    _watch = field_validator("watch_urls")(lambda cls, v: normalize_watch_urls(v))
    _region = field_validator("region")(lambda cls, v: check_region(v))
    _lookback = field_validator("lookback")(lambda cls, v: check_lookback(v))

    @field_validator("language")
    @classmethod
    def check_language(cls, v: str) -> str:
        if v not in LANGUAGES:
            raise ValueError("Unsupported language")
        return v

    @model_validator(mode="after")
    def voice_speaks_language(self) -> "BriefingIn":
        if not voice_supports(self.voice, self.language):
            raise ValueError("This voice does not speak the chosen language")
        return self

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
    language: str | None = None
    email_enabled: bool | None = None
    trusted_domains: list[str] | None = None
    blocked_domains: list[str] | None = None
    region: str | None = None
    lookback: str | None = None
    finance_mode: bool | None = None
    watch_urls: list[str] | None = None
    icon: str | None = None
    color: str | None = None

    _cover = field_validator("icon", "color")(lambda cls, v, info: check_cover(info.field_name, v))
    _domains = field_validator("trusted_domains", "blocked_domains")(
        lambda cls, v: None if v is None else normalize_domains(v)
    )
    _watch = field_validator("watch_urls")(
        lambda cls, v: None if v is None else normalize_watch_urls(v)
    )
    _region = field_validator("region")(lambda cls, v: check_region(v))
    _lookback = field_validator("lookback")(lambda cls, v: None if v is None else check_lookback(v))
    is_active: bool | None = None

    @field_validator("language")
    @classmethod
    def check_language(cls, v: str | None) -> str | None:
        if v is not None and v not in LANGUAGES:
            raise ValueError("Unsupported language")
        return v

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
    icon: str | None = None
    color: str | None = None


class Source(BaseModel):
    id: str
    title: str
    url: str
    published: str | None = None

    @model_validator(mode="before")
    @classmethod
    def readable_title(cls, data: Any) -> Any:
        # Episodes stored before titles were cleaned still read well.
        if isinstance(data, dict) and "url" in data:
            return {**data, "title": source_title(data.get("title"), data["url"])}
        return data


class EpisodeDetail(EpisodeSummary):
    script: str | None
    sources: list[Source] | None
    research_log: list[dict] | None
    transcript: list[dict] | None = None
    emailed_at: datetime | None


class BriefingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    topic: str
    delivery_time: time
    timezone: str
    voice: str
    language: str
    email_enabled: bool
    trusted_domains: list[str]
    blocked_domains: list[str]
    region: str | None
    lookback: str
    finance_mode: bool
    watch_urls: list[str]
    icon: str | None
    color: str | None
    pending_links: int = 0
    is_active: bool
    next_run_at: datetime
    created_at: datetime
    latest_episode: EpisodeSummary | None = None


class Me(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    name: str | None
