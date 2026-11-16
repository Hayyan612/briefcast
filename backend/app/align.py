"""Snap estimated sentence timings to the real pauses in the audio.

Sentence start times inside a TTS chunk are estimated from character counts, which
ignores the pauses between sentences, so the highlight drifts ahead of or behind the
voice. Every sentence starts right after a pause, so each estimate is moved to the
nearest detected pause end.
"""

from __future__ import annotations

import asyncio
import re

SILENCE_DB = -38
MIN_PAUSE_S = 0.12
# A sentence starts this long before its pause ends, so the eye lands with the voice.
ONSET_LEAD_S = 0.05
MIN_LINE_S = 0.4
# Marks lines already snapped to the audio, so older episodes are aligned once, lazily.
ALIGNED = "a"

_SILENCE_END = re.compile(r"silence_end: ([\d.]+)")


async def detect_pause_ends(mp3: bytes) -> list[float]:
    """Seconds at which speech resumes after each pause, via ffmpeg silencedetect."""
    proc = await asyncio.create_subprocess_exec(
        "ffmpeg",
        "-hide_banner",
        "-nostats",
        "-i",
        "pipe:0",
        "-af",
        f"silencedetect=noise={SILENCE_DB}dB:d={MIN_PAUSE_S}",
        "-f",
        "null",
        "-",
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.PIPE,
    )
    _, err = await proc.communicate(mp3)
    if proc.returncode != 0:
        raise RuntimeError(f"ffmpeg silencedetect failed ({proc.returncode})")
    return [float(m) for m in _SILENCE_END.findall(err.decode(errors="replace"))]


def snap_to_pauses(lines: list[dict], pause_ends: list[float], duration: float) -> list[dict]:
    """Return new lines whose starts sit on the nearest pause end (never reorders lines)."""
    if not lines or not pause_ends:
        return [dict(line) for line in lines]
    starts: list[float] = []
    floor = 0.0
    for i, line in enumerate(lines):
        est = float(line["start"])
        length = float(line.get("end", est)) - est
        window = max(1.5, 0.35 * length)
        best = min(
            (p for p in pause_ends if abs(p - est) <= window and p - ONSET_LEAD_S >= floor),
            key=lambda p: abs(p - est),
            default=None,
        )
        start = 0.0 if i == 0 and est < 0.5 else (best - ONSET_LEAD_S if best else est)
        start = max(start, floor)
        starts.append(round(start, 2))
        floor = start + MIN_LINE_S
    ends = starts[1:] + [round(duration, 2)]
    return [{**line, "start": s, "end": e, ALIGNED: 1} for line, s, e in zip(lines, starts, ends)]


def is_aligned(lines: list[dict] | None) -> bool:
    return bool(lines) and all(line.get(ALIGNED) for line in lines)


async def align_transcript(lines: list[dict], mp3: bytes, duration: float) -> list[dict]:
    """Snap `lines` to the audio; falls back to the estimates if detection fails."""
    try:
        pauses = await detect_pause_ends(mp3)
    except (OSError, RuntimeError):
        return [dict(line) for line in lines]
    return snap_to_pauses(lines, pauses, duration)
