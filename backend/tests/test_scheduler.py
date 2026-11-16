import uuid
from datetime import UTC, datetime, time, timedelta

from sqlalchemy import select

from app.db import SessionLocal, engine
from app.models import Briefing, Episode, User
from app.worker import schedule_due_briefings


class FakeRedis:
    def __init__(self) -> None:
        self.jobs: list[str] = []

    async def enqueue_job(self, name, *args, _job_id=None):
        if _job_id in self.jobs:
            return None
        self.jobs.append(_job_id)
        return object()


async def test_due_briefing_gets_one_episode_and_advances():
    async with SessionLocal() as s:
        user = User(email=f"sched-{uuid.uuid4().hex[:8]}@example.com")
        s.add(user)
        await s.flush()
        due_at = datetime.now(UTC) - timedelta(minutes=1)
        b = Briefing(
            user_id=user.id,
            topic="AI policy news",
            delivery_time=time(8, 0),
            timezone="Asia/Kolkata",
            voice="timbre-v3.0:Vasudha",
            next_run_at=due_at,
        )
        s.add(b)
        await s.commit()
        briefing_id = b.id

    redis = FakeRedis()
    await schedule_due_briefings({"redis": redis})
    await schedule_due_briefings({"redis": redis})  # second tick must not duplicate

    async with SessionLocal() as s:
        episodes = (
            await s.scalars(select(Episode).where(Episode.briefing_id == briefing_id))
        ).all()
        refreshed = await s.get(Briefing, briefing_id)
    assert len(episodes) == 1
    assert f"episode:{episodes[0].id}" in redis.jobs
    assert refreshed.next_run_at > datetime.now(UTC)
    await engine.dispose()
