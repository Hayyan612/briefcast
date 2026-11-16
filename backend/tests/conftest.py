import os
import time
import uuid

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings


def token_for(email: str, name: str = "Test User") -> str:
    s = get_settings()
    return jwt.encode(
        {
            "sub": email,
            "email": email,
            "name": name,
            "iss": s.backend_jwt_issuer,
            "aud": s.backend_jwt_audience,
            "exp": int(time.time()) + 300,
        },
        s.backend_jwt_secret,
        algorithm="HS256",
    )


@pytest.fixture
async def api():
    if os.environ.get("SKIP_DB_TESTS"):
        pytest.skip("database tests disabled")
    from app.db import engine
    from app.main import app
    from app.queue import make_pool

    app.state.redis = await make_pool()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
    await app.state.redis.aclose()
    await engine.dispose()


@pytest.fixture
def alice() -> dict:
    return {"Authorization": f"Bearer {token_for(f'alice-{uuid.uuid4().hex[:8]}@example.com')}"}


@pytest.fixture
def bob() -> dict:
    return {"Authorization": f"Bearer {token_for(f'bob-{uuid.uuid4().hex[:8]}@example.com')}"}
