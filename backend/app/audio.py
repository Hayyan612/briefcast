"""Serving MP3 bytes with HTTP Range support (players seek with Range requests)."""

import re

from fastapi import Response

RANGE_RE = re.compile(r"bytes=(\d*)-(\d*)")


def audio_response(
    data: bytes,
    mime_type: str,
    range_header: str | None,
    *,
    filename: str | None = None,
    cache: str = "private, max-age=3600",
) -> Response:
    size = len(data)
    headers = {"Accept-Ranges": "bytes", "Cache-Control": cache}
    if filename:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'

    match = RANGE_RE.fullmatch(range_header.strip()) if range_header else None
    if not match or (not match.group(1) and not match.group(2)):
        return Response(data, media_type=mime_type, headers=headers)

    start_s, end_s = match.groups()
    if start_s:
        start, end = int(start_s), min(int(end_s) if end_s else size - 1, size - 1)
    else:  # suffix range: the last N bytes
        start, end = max(size - int(end_s), 0), size - 1
    if start > end or start >= size:
        return Response(status_code=416, headers={"Content-Range": f"bytes */{size}"})
    headers["Content-Range"] = f"bytes {start}-{end}/{size}"
    return Response(data[start : end + 1], status_code=206, media_type=mime_type, headers=headers)


def slug_filename(title: str | None, fallback: str) -> str:
    base = re.sub(r"[^A-Za-z0-9]+", "-", title or "").strip("-").lower()[:60]
    return f"{base or fallback}.mp3"
