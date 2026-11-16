"""Gnani TTS: script -> MP3.

Gnani's REST endpoint synthesises one text per request, rejects over-long text with a 500,
and (on the free tier) allows one active request at a time. So we:
  1. split the script into sentence-aligned chunks,
  2. synthesise them one by one as 16-bit mono WAV, retrying 429/5xx with backoff, and
     halving a chunk that keeps failing,
  3. join the PCM frames with short pauses between paragraphs,
  4. encode the result to MP3 with ffmpeg.
"""

import asyncio
import io
import logging
import re
import wave
from dataclasses import dataclass

import httpx

from app.config import get_settings
from app.voices import split_voice

log = logging.getLogger(__name__)

SAMPLE_RATE = 24000
MAX_CHUNK_CHARS = 450
PARAGRAPH_PAUSE_S = 0.45
MAX_ATTEMPTS = 5
RETRYABLE = {429, 500, 502, 503, 504}


class TTSError(RuntimeError):
    pass


@dataclass
class Chunk:
    text: str
    ends_paragraph: bool


# Sentence ends in Latin and Indic scripts: . ! ? plus the danda (।) and double danda (॥).
SENTENCE_END = re.compile(r"(?<=[.!?\u0964\u0965])\s+")


def split_sentences(paragraph: str) -> list[str]:
    parts = SENTENCE_END.split(paragraph.strip())
    return [p.strip() for p in parts if p.strip()]


def chunk_script(script: str, max_chars: int = MAX_CHUNK_CHARS) -> list[Chunk]:
    chunks: list[Chunk] = []
    for para in re.split(r"\n\s*\n", script):
        sentences = split_sentences(para)
        if not sentences:
            continue
        buf = ""
        para_chunks: list[str] = []
        for sentence in sentences:
            while len(sentence) > max_chars:  # very long sentence: split at a comma or space
                cut = sentence.rfind(", ", 0, max_chars)
                cut = cut + 1 if cut > max_chars // 2 else sentence.rfind(" ", 0, max_chars)
                if cut <= 0:
                    cut = max_chars
                if buf:
                    para_chunks.append(buf)
                    buf = ""
                para_chunks.append(sentence[:cut].strip())
                sentence = sentence[cut:].strip()
            if buf and len(buf) + 1 + len(sentence) > max_chars:
                para_chunks.append(buf)
                buf = sentence
            else:
                buf = f"{buf} {sentence}".strip()
        if buf:
            para_chunks.append(buf)
        chunks += [Chunk(t, i == len(para_chunks) - 1) for i, t in enumerate(para_chunks)]
    return chunks


def halve(text: str) -> tuple[str, str]:
    mid = len(text) // 2
    cut = text.rfind(". ", 0, mid + 80)
    if cut < len(text) // 4:
        cut = text.rfind(" ", 0, mid)
    cut = cut + 1 if cut > 0 else mid
    return text[:cut].strip(), text[cut:].strip()


class GnaniTTS:
    def __init__(self, client: httpx.AsyncClient, voice_key: str, language: str) -> None:
        self.client = client
        self.model, self.voice = split_voice(voice_key)
        self.language = language
        self.settings = get_settings()

    async def _request(self, text: str) -> bytes:
        resp = await self.client.post(
            self.settings.gnani_tts_url,
            headers={"X-API-Key-ID": self.settings.gnani_api_key},
            json={
                "text": text,
                "voice": self.voice,
                "model": self.model,
                "language": self.language,
                "speed": 1.0,
                "audio_config": {
                    "sample_rate": SAMPLE_RATE,
                    "num_channels": 1,
                    "sample_width": 2,
                    "encoding": "linear_pcm",
                    "container": "wav",
                },
            },
            timeout=120,
        )
        if resp.status_code == 200:
            return resp.content
        raise httpx.HTTPStatusError(
            f"Gnani TTS {resp.status_code}: {resp.text[:300]}", request=resp.request, response=resp
        )

    async def synth_pcm(self, text: str, depth: int = 0) -> bytes:
        """Return raw PCM frames for `text`, splitting it if Gnani keeps rejecting it."""
        delay = 1.5
        last_error: Exception | None = None
        for attempt in range(MAX_ATTEMPTS):
            try:
                return read_pcm(await self._request(text))
            except httpx.HTTPStatusError as exc:
                code = exc.response.status_code
                last_error = exc
                if code in (401, 402, 403):
                    raise TTSError(
                        f"Gnani rejected the request ({code}): check key and credit"
                    ) from exc
                if code not in RETRYABLE:
                    raise TTSError(str(exc)) from exc
                if code == 500 and attempt >= 1 and len(text) > 120 and depth < 3:
                    break  # Gnani returns 500 for over-long text: split instead of retrying
            except (httpx.TransportError, wave.Error) as exc:
                last_error = exc
            await asyncio.sleep(delay)
            delay = min(delay * 2, 20)
        if len(text) > 120 and depth < 3:
            first, second = halve(text)
            log.info("splitting TTS chunk of %d chars", len(text))
            return await self.synth_pcm(first, depth + 1) + await self.synth_pcm(second, depth + 1)
        raise TTSError(f"TTS failed after retries: {last_error}")


def read_pcm(wav_bytes: bytes) -> bytes:
    with wave.open(io.BytesIO(wav_bytes)) as w:
        if (w.getframerate(), w.getnchannels(), w.getsampwidth()) != (SAMPLE_RATE, 1, 2):
            raise wave.Error(
                f"Unexpected WAV format {w.getframerate()}Hz/{w.getnchannels()}ch/{w.getsampwidth()}B"
            )
        return w.readframes(w.getnframes())


def silence(seconds: float) -> bytes:
    return b"\x00\x00" * int(SAMPLE_RATE * seconds)


async def encode_mp3(pcm: bytes) -> bytes:
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg", "-hide_banner", "-loglevel", "error",
        "-f", "s16le", "-ar", str(SAMPLE_RATE), "-ac", "1", "-i", "pipe:0",
        "-codec:a", "libmp3lame", "-b:a", "64k", "-f", "mp3", "pipe:1",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )  # fmt: skip
    out, err = await proc.communicate(pcm)
    if proc.returncode != 0:
        raise TTSError(f"ffmpeg failed: {err.decode()[:300]}")
    return out


def seconds(pcm_len: int) -> float:
    return pcm_len / 2 / SAMPLE_RATE


def time_sentences(text: str, start: float, end: float, paragraph: int) -> list[dict]:
    """Spread a chunk's exact audio span over its sentences, in proportion to their length."""
    sentences = split_sentences(text) or [text]
    total = sum(len(s) for s in sentences) or 1
    out, t = [], start
    for sentence in sentences:
        span = (end - start) * len(sentence) / total
        out.append(
            {"start": round(t, 2), "end": round(t + span, 2), "text": sentence, "p": paragraph}
        )
        t += span
    return out


def approximate_transcript(script: str, duration: float) -> list[dict]:
    """For episodes made before timings were recorded: spread the script over its length."""
    paragraphs = [p for p in re.split(r"\n\s*\n", script) if p.strip()]
    pause_total = PARAGRAPH_PAUSE_S * len(paragraphs)
    speech = max(duration - pause_total, 1.0)
    total_chars = sum(len(p) for p in paragraphs) or 1
    out, t = [], 0.0
    for i, para in enumerate(paragraphs):
        span = speech * len(para) / total_chars
        out += time_sentences(para.strip(), t, t + span, i)
        t += span + PARAGRAPH_PAUSE_S
    return out


async def synthesize_script(
    script: str, voice_key: str, language: str
) -> tuple[bytes, int, list[dict]]:
    """Return (mp3 bytes, duration in seconds, timed transcript).

    Each chunk's start and end come from the exact PCM length synthesised so far, so the
    transcript stays in sync with the audio; only positions inside a chunk are estimated.
    """
    chunks = chunk_script(script)
    if not chunks:
        raise TTSError("Empty script")
    pcm = bytearray()
    transcript: list[dict] = []
    paragraph = 0
    async with httpx.AsyncClient() as client:
        tts = GnaniTTS(client, voice_key, language)
        for i, chunk in enumerate(chunks):
            start = seconds(len(pcm))
            pcm += await tts.synth_pcm(chunk.text)
            transcript += time_sentences(chunk.text, start, seconds(len(pcm)), paragraph)
            pcm += silence(PARAGRAPH_PAUSE_S if chunk.ends_paragraph else 0.12)
            if chunk.ends_paragraph:
                paragraph += 1
            log.debug("tts chunk %d/%d done", i + 1, len(chunks))
    duration = round(seconds(len(pcm)))
    return await encode_mp3(bytes(pcm)), duration, transcript
