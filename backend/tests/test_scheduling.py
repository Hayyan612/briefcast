from datetime import UTC, datetime, time

import pytest

from app.scheduling import next_run_after, validate_timezone


def test_later_today_when_time_not_passed():
    after = datetime(2026, 11, 16, 1, 0, tzinfo=UTC)  # 06:30 IST
    assert next_run_after(time(8, 0), "Asia/Kolkata", after) == datetime(
        2026, 11, 16, 2, 30, tzinfo=UTC
    )


def test_tomorrow_when_time_already_passed():
    after = datetime(2026, 11, 16, 3, 0, tzinfo=UTC)  # 08:30 IST
    assert next_run_after(time(8, 0), "Asia/Kolkata", after) == datetime(
        2026, 11, 17, 2, 30, tzinfo=UTC
    )


def test_exact_slot_moves_to_next_day():
    after = datetime(2026, 11, 16, 2, 30, tzinfo=UTC)
    assert next_run_after(time(8, 0), "Asia/Kolkata", after).day == 17


def test_keeps_local_time_across_dst_change():
    # New York leaves DST on 2026-11-01: 08:00 local is 12:00 UTC before, 13:00 UTC after.
    before = next_run_after(time(8, 0), "America/New_York", datetime(2026, 10, 30, tzinfo=UTC))
    after = next_run_after(time(8, 0), "America/New_York", datetime(2026, 11, 2, tzinfo=UTC))
    assert before.hour == 12
    assert after.hour == 13


def test_rejects_unknown_timezone():
    with pytest.raises(ValueError):
        validate_timezone("Mars/Olympus")
