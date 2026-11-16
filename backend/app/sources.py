"""Validation and normalisation for per-briefing source controls."""

import re
from urllib.parse import urlparse, urlunparse

# Tavily's `country` values for the regions offered in the UI.
REGIONS: dict[str, str] = {
    "india": "India",
    "united states": "United States",
    "united kingdom": "United Kingdom",
    "united arab emirates": "United Arab Emirates",
    "singapore": "Singapore",
    "germany": "Germany",
    "canada": "Canada",
    "australia": "Australia",
    "japan": "Japan",
}
LOOKBACKS = ("day", "week")
MAX_DOMAINS = 10
MAX_WATCH = 3
_DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


def normalize_domain(raw: str) -> str:
    text = raw.strip().lower()
    if "://" not in text:
        text = "http://" + text
    host = (urlparse(text).hostname or "").removeprefix("www.")
    if not _DOMAIN.match(host):
        raise ValueError(f"Not a website domain: {raw.strip()}")
    return host


def normalize_domains(values: list[str]) -> list[str]:
    out: list[str] = []
    for v in values:
        if v.strip():
            d = normalize_domain(v)
            if d not in out:
                out.append(d)
    if len(out) > MAX_DOMAINS:
        raise ValueError(f"Up to {MAX_DOMAINS} sites")
    return out


def normalize_url(raw: str) -> str:
    text = raw.strip()
    if "://" not in text:
        text = "https://" + text
    parsed = urlparse(text)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or "." not in parsed.hostname:
        raise ValueError(f"Not a web address: {raw.strip()}")
    return urlunparse(parsed._replace(fragment=""))


def normalize_watch_urls(values: list[str]) -> list[str]:
    out: list[str] = []
    for v in values:
        if v.strip():
            u = normalize_url(v)
            if u not in out:
                out.append(u)
    if len(out) > MAX_WATCH:
        raise ValueError(f"Follow up to {MAX_WATCH} websites per briefing")
    return out
