"""Everything the research agent should know before it starts, gathered per episode.

* Memory: URLs and stories from this briefing's recent episodes (to avoid repeats).
* Requested links the listener added ("Add a link"), extracted with Tavily.
* New pages on websites the listener follows, found with Tavily map. The first run on a
  site only records a baseline (otherwise the whole site would look new) and uses a
  site-restricted search for recent pages instead.
"""

import logging
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from urllib.parse import urlparse

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from tavily import AsyncTavilyClient

from app.agent.research import ResearchPrefs, host_of
from app.models import Briefing, BriefingLink, Episode, EpisodeStatus, WatchedPage

log = logging.getLogger(__name__)

MEMORY_DAYS = 7
COVERED_EPISODES = 3
MAX_COVERED = 15
MAX_LINKS = 3
MAX_NEW_PER_SITE = 4
PAGE_CHARS = 8000


@dataclass
class ResearchContext:
    prefs: ResearchPrefs
    link_ids: list[uuid.UUID] = field(default_factory=list)
    new_pages: list[WatchedPage] = field(default_factory=list)


async def _extract(tavily: AsyncTavilyClient, urls: list[str]) -> dict[str, str]:
    if not urls:
        return {}
    try:
        resp = await tavily.extract(urls)
    except Exception as exc:  # noqa: BLE001 - a failed extract should not sink the episode
        log.warning("extract failed: %s", exc)
        return {}
    return {r["url"]: (r.get("raw_content") or "")[:PAGE_CHARS] for r in resp.get("results", [])}


MIN_ARTICLE_CHARS = 1200


def looks_like_article(url: str, site: str) -> bool:
    """Skip listing, tag and pagination pages: articles have a slug with words in it."""
    path = urlparse(url).path.rstrip("/")
    last = path.rsplit("/", 1)[-1]
    if path == urlparse(site).path.rstrip("/") or not last:
        return False
    if any(seg in path for seg in ("/tag/", "/tags/", "/category/", "/author/", "/page/")):
        return False
    return last.count("-") >= 2


def keep_real_articles(pages: list[dict]) -> list[dict]:
    """Drop pages whose text is too short or is the same boilerplate as another page."""
    seen: set[str] = set()
    out = []
    for page in pages:
        text = page.get("content", "")
        fingerprint = text[:400]
        if len(text) < MIN_ARTICLE_CHARS or fingerprint in seen:
            continue
        seen.add(fingerprint)
        out.append(page)
    return out


def _title_from(content: str, url: str) -> str:
    for line in content.splitlines():
        line = line.strip("# ").strip()
        if 12 <= len(line) <= 140:
            return line
    return url


async def _memory(session: AsyncSession, briefing: Briefing, episode_id: uuid.UUID):
    since = datetime.now(UTC) - timedelta(days=MEMORY_DAYS)
    recent = (
        await session.scalars(
            select(Episode)
            .where(
                Episode.briefing_id == briefing.id,
                Episode.id != episode_id,
                Episode.created_at >= since,
            )
            .order_by(Episode.created_at.desc())
        )
    ).all()
    seen = {s["url"] for e in recent for s in (e.sources or []) if s.get("url")}
    covered: list[str] = []
    for e in [e for e in recent if e.status == EpisodeStatus.ready][:COVERED_EPISODES]:
        covered += [str(p) for p in (e.findings or [])[:6]]
    return seen, covered[:MAX_COVERED]


async def _requested(session: AsyncSession, tavily: AsyncTavilyClient, briefing: Briefing):
    links = (
        await session.scalars(
            select(BriefingLink)
            .where(BriefingLink.briefing_id == briefing.id, BriefingLink.used_at.is_(None))
            .order_by(BriefingLink.created_at)
            .limit(MAX_LINKS)
        )
    ).all()
    texts = await _extract(tavily, [link.url for link in links])
    pages = [
        {
            "url": link.url,
            "title": link.title or _title_from(texts.get(link.url, ""), link.url),
            "content": texts.get(link.url, ""),
        }
        for link in links
    ]
    return pages, [link.id for link in links]


async def _watched(
    session: AsyncSession, tavily: AsyncTavilyClient, briefing: Briefing, lookback: str
):
    pages: list[dict] = []
    new_rows: list[WatchedPage] = []
    for site in (briefing.watch_urls or [])[:3]:
        parsed = urlparse(site)
        path = parsed.path.rstrip("/")
        try:
            mapped = await tavily.map(
                site,
                max_depth=1,
                limit=60,
                select_paths=[f"{path}/.*"] if path else None,
                timeout=60,
            )
        except Exception as exc:  # noqa: BLE001
            log.warning("map failed for %s: %s", site, exc)
            continue
        urls = [
            u
            for u in mapped.get("results", [])
            if isinstance(u, str) and u.rstrip("/") != site.rstrip("/")
        ]
        known = set(
            (
                await session.scalars(
                    select(WatchedPage.url).where(
                        WatchedPage.briefing_id == briefing.id, WatchedPage.site == site
                    )
                )
            ).all()
        )
        fresh = [u for u in urls if u not in known]
        new_rows += [WatchedPage(briefing_id=briefing.id, site=site, url=u) for u in fresh]

        if not known:
            # First visit: everything is "new", so use a recent, site-restricted search instead.
            try:
                found = await tavily.search(
                    briefing.topic,
                    include_domains=[host_of(site)],
                    time_range=lookback,
                    max_results=MAX_NEW_PER_SITE,
                )
                candidates = [
                    r["url"]
                    for r in found.get("results", [])
                    if r.get("url") and looks_like_article(r["url"], site)
                ]
            except Exception as exc:  # noqa: BLE001
                log.warning("site search failed for %s: %s", site, exc)
                candidates = []
        else:
            candidates = [u for u in fresh if looks_like_article(u, site)][:MAX_NEW_PER_SITE]

        texts = await _extract(tavily, candidates)
        pages += keep_real_articles(
            [
                {"url": u, "title": _title_from(texts[u], u), "content": texts[u], "site": site}
                for u in candidates
                if texts.get(u)
            ]
        )
    return pages, new_rows


async def gather_context(
    session: AsyncSession, tavily: AsyncTavilyClient, briefing: Briefing, episode_id: uuid.UUID
) -> ResearchContext:
    seen, covered = await _memory(session, briefing, episode_id)
    requested, link_ids = await _requested(session, tavily, briefing)
    watched, new_rows = await _watched(session, tavily, briefing, briefing.lookback)
    prefs = ResearchPrefs(
        lookback=briefing.lookback,
        trusted_domains=list(briefing.trusted_domains or []),
        blocked_domains=list(briefing.blocked_domains or []),
        region=briefing.region,
        finance_mode=briefing.finance_mode,
        seen_urls=seen - {p["url"] for p in requested},
        covered=covered,
        requested=requested,
        watched=watched,
    )
    return ResearchContext(prefs=prefs, link_ids=link_ids, new_pages=new_rows)
