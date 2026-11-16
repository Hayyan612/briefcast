"""Turning "08:00 every day in Asia/Kolkata" into the next UTC instant.

Stored as wall-clock time + IANA timezone (not a UTC offset), so a briefing keeps
firing at 08:00 local time across DST changes.
"""

from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def validate_timezone(name: str) -> str:
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError) as exc:
        raise ValueError(f"Unknown timezone: {name}") from exc
    return name


def next_run_after(delivery_time: time, tz_name: str, after: datetime) -> datetime:
    """First UTC instant strictly after `after` whose local wall clock is `delivery_time`."""
    tz = ZoneInfo(tz_name)
    local_after = after.astimezone(tz)
    candidate_date = local_after.date()
    for _ in range(3):
        local = datetime.combine(candidate_date, delivery_time, tzinfo=tz)
        # A wall time skipped by a DST jump does not round-trip; normalise via UTC.
        utc = local.astimezone(UTC)
        if utc > after:
            return utc
        candidate_date += timedelta(days=1)
    raise RuntimeError("unreachable: no run time found within 3 days")


def now_utc() -> datetime:
    return datetime.now(UTC)
