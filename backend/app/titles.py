"""Readable source titles.

Extracted pages often start with navigation ("[Skip to content](#content)",
"Subscribe") and search results sometimes have no title at all, so titles are cleaned
of markdown, boilerplate is rejected, and the URL's slug is the fallback.
"""

from __future__ import annotations

import re
from urllib.parse import unquote, urlparse

# A title given by a search result can be short; a line picked out of page text must be
# long enough not to be a menu item.
MIN_TITLE_LEN = 3
MIN_LINE_LEN = 12
MAX_LEN = 160

_IMAGE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_MARKUP = re.compile(r"[*_`#>|]+")
_SPACE = re.compile(r"\s+")
_BOILERPLATE = re.compile(
    r"^(skip to|jump to|subscribe|sign (in|up)|log ?in|menu|home|search|advertisement|"
    r"cookie|accept|newsletter|share|close|loading|read more|download the app)\b",
    re.IGNORECASE,
)
_SLUG_NOISE = re.compile(r"(\.[a-z0-9]{2,5}$)|(\b\d{5,}\b)|([-_]?[0-9a-f]{8,}$)", re.IGNORECASE)


def clean_title(raw: str | None, min_len: int = MIN_TITLE_LEN) -> str | None:
    """The text a reader would call the title, or None when there is nothing usable."""
    if not raw:
        return None
    text = _IMAGE.sub(" ", raw)
    text = _LINK.sub(r"\1", text)
    text = _MARKUP.sub(" ", text)
    text = _SPACE.sub(" ", text).strip(" -–—:·|")
    if not (min_len <= len(text) <= MAX_LEN) or _BOILERPLATE.match(text):
        return None
    return text


def title_from_url(url: str) -> str:
    """'…/bharat-semi-raises-24m-seed-1234567.html' -> 'Bharat semi raises 24m seed'."""
    parsed = urlparse(url)
    for segment in reversed([s for s in parsed.path.split("/") if s]):
        words = _SLUG_NOISE.sub("", unquote(segment)).replace("-", " ").replace("_", " ")
        words = _SPACE.sub(" ", words).strip()
        if len(words) >= MIN_LINE_LEN and re.search(r"[a-zA-Z]{3}", words):
            return words[0].upper() + words[1:]
    return parsed.netloc.removeprefix("www.") or url


def source_title(raw: str | None, url: str) -> str:
    return clean_title(raw) or title_from_url(url)


def title_from_text(content: str, url: str) -> str:
    """First line of extracted page text that reads as a title."""
    for line in content.splitlines():
        title = clean_title(line, MIN_LINE_LEN)
        if title:
            return title
    return title_from_url(url)
