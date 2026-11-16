"""Request authentication.

Google sign-in happens in the Next.js app (Auth.js). The browser never talks to this API
directly: the Next.js server proxies each request and attaches a 5-minute HS256 token
signed with BACKEND_JWT_SECRET. Here we verify it and upsert the user by email.
"""

from typing import Annotated

import jwt
from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.config import get_settings
from app.db import DbSession
from app.models import User


def decode_token(token: str) -> dict:
    settings = get_settings()
    try:
        claims = jwt.decode(
            token,
            settings.backend_jwt_secret,
            algorithms=["HS256"],
            audience=settings.backend_jwt_audience,
            issuer=settings.backend_jwt_issuer,
            options={"require": ["exp", "sub", "email"]},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from exc
    return claims


async def current_user(
    session: DbSession,
    authorization: Annotated[str, Header()] = "",
) -> User:
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    claims = decode_token(token)
    email = str(claims["email"]).lower()

    stmt = (
        insert(User)
        .values(email=email, name=claims.get("name"), image=claims.get("picture"))
        .on_conflict_do_update(
            index_elements=[User.email],
            set_={"name": claims.get("name"), "image": claims.get("picture")},
        )
    )
    await session.execute(stmt)
    await session.commit()
    user = await session.scalar(select(User).where(User.email == email))
    assert user is not None
    return user


CurrentUser = Annotated[User, Depends(current_user)]
