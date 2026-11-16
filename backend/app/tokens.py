"""Signed, URL-safe tokens for links that work without signing in (unsubscribe)."""

import base64
import hashlib
import hmac
import uuid

from app.config import get_settings


def _sig(payload: bytes, purpose: str) -> bytes:
    key = get_settings().backend_jwt_secret.encode()
    return hmac.new(key, purpose.encode() + b":" + payload, hashlib.sha256).digest()[:16]


def _b64(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode()


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def make_unsubscribe_token(briefing_id: uuid.UUID) -> str:
    payload = briefing_id.bytes
    return f"{_b64(payload)}.{_b64(_sig(payload, 'unsubscribe'))}"


def read_unsubscribe_token(token: str) -> uuid.UUID | None:
    try:
        raw_payload, raw_sig = token.split(".", 1)
        payload, sig = _unb64(raw_payload), _unb64(raw_sig)
    except (ValueError, TypeError):
        return None
    if len(payload) != 16 or not hmac.compare_digest(sig, _sig(payload, "unsubscribe")):
        return None
    return uuid.UUID(bytes=payload)
