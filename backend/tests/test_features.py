import uuid
import xml.etree.ElementTree as ET
from datetime import UTC, datetime

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Episode, EpisodeAudio, EpisodeStatus, EpisodeTrigger, User
from app.tokens import make_unsubscribe_token, read_unsubscribe_token

BASE = {
    "topic": "Indian startup funding news",
    "delivery_time": "08:00",
    "timezone": "Asia/Kolkata",
}


async def test_language_and_voice_must_match(api, alice):
    ok = {**BASE, "language": "hi-IN", "voice": "timbre-v3.0:Vasudha"}
    r = await api.post("/briefings", json=ok, headers=alice)
    assert r.status_code == 201 and r.json()["language"] == "hi-IN"
    # Girish (Timbre v2.5) only speaks English.
    bad = {**BASE, "language": "ta-IN", "voice": "timbre-v2.5:Girish"}
    assert (await api.post("/briefings", json=bad, headers=alice)).status_code == 422
    unknown = {**BASE, "language": "xx-YY"}
    assert (await api.post("/briefings", json=unknown, headers=alice)).status_code == 422


async def test_patch_rejects_incompatible_language(api, alice):
    created = (
        await api.post("/briefings", json={**BASE, "voice": "timbre-v2.5:Girish"}, headers=alice)
    ).json()
    r = await api.patch(f"/briefings/{created['id']}", json={"language": "hi-IN"}, headers=alice)
    assert r.status_code == 422


async def test_catalogs(api):
    langs = (await api.get("/languages")).json()
    assert {"en-IN", "hi-IN", "hi-en", "ta-IN"} <= {item["code"] for item in langs}
    voices = (await api.get("/voices")).json()
    assert all(v["languages"] for v in voices)


def test_unsubscribe_token_roundtrip_and_tamper():
    bid = uuid.uuid4()
    token = make_unsubscribe_token(bid)
    assert read_unsubscribe_token(token) == bid
    assert read_unsubscribe_token(token[:-2] + "AA") is None
    assert read_unsubscribe_token("garbage") is None


async def test_unsubscribe_turns_off_email(api, alice):
    created = (await api.post("/briefings", json=BASE, headers=alice)).json()
    assert created["email_enabled"] is True
    token = make_unsubscribe_token(uuid.UUID(created["id"]))
    info = (await api.get(f"/public/unsubscribe/{token}")).json()
    assert info == {"topic": BASE["topic"], "email_enabled": True}
    assert (await api.post(f"/public/unsubscribe/{token}")).json()["email_enabled"] is False
    listed = (await api.get("/briefings", headers=alice)).json()
    assert listed[0]["email_enabled"] is False


async def _ready_episode(owner_email: str, briefing_id: str) -> uuid.UUID:
    async with SessionLocal() as s:
        user = await s.scalar(select(User).where(User.email == owner_email))
        ep = Episode(
            briefing_id=uuid.UUID(briefing_id),
            user_id=user.id,
            topic=BASE["topic"],
            title="Test & episode",
            trigger=EpisodeTrigger.manual,
            status=EpisodeStatus.ready,
            scheduled_for=datetime.now(UTC),
            completed_at=datetime.now(UTC),
            duration_seconds=300,
            sources=[{"id": "S1", "title": "Src", "url": "https://example.com/a?b=1&c=2"}],
        )
        s.add(ep)
        await s.flush()
        s.add(EpisodeAudio(episode_id=ep.id, data=b"ID3" + b"\0" * 997))
        await s.commit()
        return ep.id


async def test_feed_lists_ready_episodes_and_rotates(api, alice, bob):
    created = (await api.post("/briefings", json=BASE, headers=alice)).json()
    me = (await api.get("/me", headers=alice)).json()
    ep_id = await _ready_episode(me["email"], created["id"])

    path = (await api.get("/me/feed", headers=alice)).json()["path"]
    token = path.rsplit("/", 1)[1]
    r = await api.get(f"/public/feed/{token}")
    assert r.status_code == 200 and "rss+xml" in r.headers["content-type"]
    item = ET.fromstring(r.text).find("channel/item")
    enclosure = item.find("enclosure")
    assert enclosure.get("length") == "1000"
    assert enclosure.get("url").endswith(f"/feed/{token}/{ep_id}.mp3")

    audio = await api.get(f"/public/feed/{token}/{ep_id}.mp3", headers={"range": "bytes=0-9"})
    assert audio.status_code == 206 and len(audio.content) == 10

    # Another user's token cannot fetch this episode.
    bob_token = (await api.get("/me/feed", headers=bob)).json()["path"].rsplit("/", 1)[1]
    assert (await api.get(f"/public/feed/{bob_token}/{ep_id}.mp3")).status_code == 404

    # Rotating revokes the old link.
    await api.post("/me/feed/rotate", headers=alice)
    assert (await api.get(f"/public/feed/{token}")).status_code == 404


async def test_download_sets_attachment(api, alice):
    created = (await api.post("/briefings", json=BASE, headers=alice)).json()
    me = (await api.get("/me", headers=alice)).json()
    ep_id = await _ready_episode(me["email"], created["id"])
    r = await api.get(f"/episodes/{ep_id}/audio?download=1", headers=alice)
    assert r.status_code == 200
    assert r.headers["content-disposition"] == 'attachment; filename="test-episode.mp3"'
