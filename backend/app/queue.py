"""ARQ (Redis) connection used by the API to enqueue work for the worker."""

from arq import ArqRedis, create_pool
from arq.connections import RedisSettings

from app.config import get_settings

GENERATE_EPISODE = "generate_episode"


def redis_settings() -> RedisSettings:
    return RedisSettings.from_dsn(get_settings().redis_url)


def episode_job_id(episode_id: object) -> str:
    # Same id for the same episode, so a double enqueue is a no-op in ARQ.
    return f"episode:{episode_id}"


async def enqueue_episode(redis: ArqRedis, episode_id: object) -> None:
    await redis.enqueue_job(GENERATE_EPISODE, str(episode_id), _job_id=episode_job_id(episode_id))


async def make_pool() -> ArqRedis:
    return await create_pool(redis_settings())
