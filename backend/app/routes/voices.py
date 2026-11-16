"""Languages, voices and cached voice previews."""

import asyncio
from typing import Annotated

import httpx
from fastapi import APIRouter, HTTPException, Query, status

from app.audio import audio_response
from app.auth import CurrentUser
from app.db import DbSession
from app.models import VoicePreview
from app.tts import GnaniTTS, encode_mp3, silence
from app.voices import LANGUAGES, PREVIEW_TEXT, VOICES, voice_supports

router = APIRouter()
# Gnani allows one active request per account; never generate two previews at once.
_preview_lock = asyncio.Lock()


@router.get("/languages")
async def languages() -> list[dict]:
    return [{"code": code, **meta} for code, meta in LANGUAGES.items()]


@router.get("/voices")
async def voices() -> list[dict]:
    return [
        {"id": key, "label": meta["label"], "languages": list(meta["languages"])}
        for key, meta in VOICES.items()
    ]


@router.get("/voices/{voice_id}/preview")
async def voice_preview(
    voice_id: str,
    user: CurrentUser,
    session: DbSession,
    language: Annotated[str, Query()] = "en-IN",
):
    """A five-second sample. Generated once per (voice, language), then served from Postgres."""
    if voice_id not in VOICES or language not in LANGUAGES:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unknown voice or language")
    if not voice_supports(voice_id, language):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This voice does not speak that language")

    key = f"{voice_id}|{language}"
    cached = await session.get(VoicePreview, key)
    if cached is None:
        async with _preview_lock:
            cached = await session.get(VoicePreview, key)
            if cached is None:
                async with httpx.AsyncClient() as client:
                    pcm = await GnaniTTS(client, voice_id, language).synth_pcm(
                        PREVIEW_TEXT[language]
                    )
                cached = VoicePreview(key=key, data=await encode_mp3(pcm + silence(0.2)))
                session.add(cached)
                await session.commit()
    return audio_response(cached.data, "audio/mpeg", None, cache="private, max-age=86400")
