import uuid

from sqlalchemy import select

from app.agent.context import gather_context
from app.agent.research import ResearchAgent, ResearchPrefs, domain_matches
from app.db import SessionLocal
from app.models import Briefing, WatchedPage

BASE = {
    "topic": "Indian startup funding news",
    "delivery_time": "08:00",
    "timezone": "Asia/Kolkata",
}


class FakeTavily:
    def __init__(self, search_results=None, mapped=None, extracted=None):
        self.search_results = search_results or {}
        self.mapped = mapped or []
        self.extracted = extracted or {}
        self.calls: list[tuple[str, dict]] = []

    async def search(self, query, **kw):
        self.calls.append(("search", kw))
        key = "trusted" if kw.get("include_domains") else "open"
        return {"results": self.search_results.get(key, [])}

    async def map(self, url, **kw):
        self.calls.append(("map", kw))
        return {"results": self.mapped}

    async def extract(self, urls):
        return {
            "results": [
                {"url": u, "raw_content": self.extracted.get(u, "")}
                for u in urls
                if u in self.extracted
            ]
        }


def r(url, title="t"):
    return {"url": url, "title": title, "content": "snippet", "published_date": None}


def test_domain_matching():
    assert domain_matches("https://www.inc42.com/x", ["inc42.com"])
    assert domain_matches("https://news.inc42.com/x", ["inc42.com"])
    assert not domain_matches("https://notinc42.com/x", ["inc42.com"])


async def test_search_filters_repeats_blocked_and_puts_trusted_first():
    tav = FakeTavily(
        search_results={
            "trusted": [r("https://inc42.com/a", "trusted")],
            "open": [
                r("https://inc42.com/a"),  # duplicate of trusted result
                r("https://spam.example.com/b"),  # blocked
                r("https://techcrunch.com/old"),  # used yesterday
                r("https://techcrunch.com/new", "fresh"),
            ],
        }
    )
    prefs = ResearchPrefs(
        trusted_domains=["inc42.com"],
        blocked_domains=["example.com"],
        seen_urls={"https://techcrunch.com/old"},
        region="india",
        lookback="week",
    )
    agent = ResearchAgent(llm=None, tavily=tav, prefs=prefs)
    out = await agent.search_web("funding", kind="news")
    titles = [i["title"] for i in __import__("json").loads(out)]
    assert titles == ["trusted", "fresh"]
    assert agent.log[-1]["skipped_repeats"] == 1
    kws = [kw for name, kw in tav.calls if name == "search"]
    assert all(kw["time_range"] == "week" for kw in kws)
    assert all(kw["exclude_domains"] == ["example.com"] for kw in kws)
    assert all("country" not in kw for kw in kws)  # country applies to general search only


async def test_finance_mode_uses_finance_topic():
    tav = FakeTavily(search_results={"open": [r("https://ft.com/x")]})
    agent = ResearchAgent(llm=None, tavily=tav, prefs=ResearchPrefs(finance_mode=True))
    await agent.search_web("markets")
    assert tav.calls[0][1]["topic"] == "finance"


async def test_source_controls_saved_and_cleared(api, alice):
    body = {
        **BASE,
        "trusted_domains": ["https://www.Inc42.com/funding", "entrackr.com"],
        "blocked_domains": ["example.com"],
        "region": "india",
        "lookback": "week",
        "finance_mode": True,
        "watch_urls": ["openai.com/news/"],
    }
    created = (await api.post("/briefings", json=body, headers=alice)).json()
    assert created["trusted_domains"] == ["inc42.com", "entrackr.com"]
    assert created["watch_urls"] == ["https://openai.com/news/"]
    r2 = await api.patch(f"/briefings/{created['id']}", json={"region": None}, headers=alice)
    assert r2.json()["region"] is None
    bad = {**BASE, "watch_urls": ["a.com", "b.com", "c.com", "d.com"]}
    assert (await api.post("/briefings", json=bad, headers=alice)).status_code == 422


async def test_links_add_list_limit_delete(api, alice, bob):
    b = (await api.post("/briefings", json=BASE, headers=alice)).json()
    url = f"/briefings/{b['id']}/links"
    for i in range(3):
        assert (
            await api.post(url, json={"url": f"example.com/{i}"}, headers=alice)
        ).status_code == 201
    assert (await api.post(url, json={"url": "example.com/4"}, headers=alice)).status_code == 400
    links = (await api.get(url, headers=alice)).json()
    assert links[0]["url"] == "https://example.com/0"
    listed = (await api.get("/briefings", headers=alice)).json()
    assert listed[0]["pending_links"] == 3
    assert (await api.get(url, headers=bob)).status_code == 404
    assert (await api.delete(f"{url}/{links[0]['id']}", headers=alice)).status_code == 204


async def test_add_link_and_run_now(api, alice):
    b = (await api.post("/briefings", json=BASE, headers=alice)).json()
    r_ = await api.post(
        f"/briefings/{b['id']}/links",
        json={"url": "https://example.com/report", "run_now": True},
        headers=alice,
    )
    assert r_.status_code == 201 and r_.json()["episode"]["status"] == "queued"


async def test_followed_site_baseline_then_only_new_pages():
    async with SessionLocal() as s:
        from app.models import User

        user = User(email=f"watch-{uuid.uuid4().hex[:8]}@example.com")
        s.add(user)
        await s.flush()
        from datetime import UTC, datetime, time

        b = Briefing(
            user_id=user.id,
            topic="AI lab news",
            delivery_time=time(8),
            timezone="UTC",
            voice="timbre-v3.0:Vasudha",
            next_run_at=datetime.now(UTC),
            watch_urls=["https://lab.example.org/news"],
        )
        s.add(b)
        await s.commit()
        bid = b.id

    site_pages = [
        "https://lab.example.org/news/model-a-launch-notes",
        "https://lab.example.org/news/safety-b-update-report",
    ]
    tav = FakeTavily(
        mapped=site_pages,
        search_results={"trusted": [r("https://lab.example.org/news/safety-b-update-report")]},
        extracted={
            u: f"Article {u} " + "body text " * 200
            for u in site_pages + ["https://lab.example.org/news/c-new-feature-post"]
        },
    )
    async with SessionLocal() as s:
        ctx = await gather_context(s, tav, await s.get(Briefing, bid), uuid.uuid4())
    # Baseline: all mapped pages recorded as seen; content comes from a site-restricted search.
    assert {p.url for p in ctx.new_pages} == set(site_pages)
    assert [p["url"] for p in ctx.prefs.watched] == [
        "https://lab.example.org/news/safety-b-update-report"
    ]

    async with SessionLocal() as s:
        for p in ctx.new_pages:
            s.add(WatchedPage(briefing_id=bid, site=p.site, url=p.url))
        await s.commit()

    tav.mapped = site_pages + [
        "https://lab.example.org/news/c-new-feature-post",
        "https://lab.example.org/news/page/2",
    ]
    async with SessionLocal() as s:
        ctx2 = await gather_context(s, tav, await s.get(Briefing, bid), uuid.uuid4())
        seen = (
            await s.scalars(select(WatchedPage.url).where(WatchedPage.briefing_id == bid))
        ).all()
    assert [p["url"] for p in ctx2.prefs.watched] == [
        "https://lab.example.org/news/c-new-feature-post"
    ]
    assert len(seen) == 2


def test_article_filter():
    from app.agent.context import keep_real_articles, looks_like_article

    site = "https://inc42.com/buzz"
    assert looks_like_article("https://inc42.com/buzz/zepto-raises-funding-round-led-by-x/", site)
    assert not looks_like_article("https://inc42.com/buzz/", site)
    assert not looks_like_article("https://inc42.com/tag/funding-news-india/", site)
    assert not looks_like_article("https://inc42.com/buzz/page/2", site)
    nav = "Menu Home News Buzz " * 120
    pages = [{"content": nav}, {"content": nav}, {"content": "short"}, {"content": "real " * 400}]
    assert len(keep_real_articles(pages)) == 2
