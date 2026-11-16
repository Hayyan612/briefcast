from datetime import UTC, datetime

BRIEFING = {
    "topic": "Startup funding announced in the last 24 hours",
    "delivery_time": "08:00",
    "timezone": "Asia/Kolkata",
}


async def test_requires_auth(api):
    assert (await api.get("/briefings")).status_code == 401
    bad = {"Authorization": "Bearer not-a-jwt"}
    assert (await api.get("/briefings", headers=bad)).status_code == 401


async def test_create_and_list_briefing(api, alice):
    r = await api.post("/briefings", json=BRIEFING, headers=alice)
    assert r.status_code == 201, r.text
    body = r.json()
    next_run = datetime.fromisoformat(body["next_run_at"])
    assert next_run > datetime.now(UTC)
    assert next_run.astimezone(UTC).strftime("%H:%M") == "02:30"  # 08:00 IST
    listed = (await api.get("/briefings", headers=alice)).json()
    assert [b["id"] for b in listed] == [body["id"]]


async def test_users_are_isolated(api, alice, bob):
    created = (await api.post("/briefings", json=BRIEFING, headers=alice)).json()
    assert (await api.get("/briefings", headers=bob)).json() == []
    assert (
        await api.patch(f"/briefings/{created['id']}", json={"is_active": False}, headers=bob)
    ).status_code == 404
    assert (await api.delete(f"/briefings/{created['id']}", headers=bob)).status_code == 404
    assert (await api.post(f"/briefings/{created['id']}/run", headers=bob)).status_code == 404


async def test_run_now_creates_one_episode(api, alice):
    created = (await api.post("/briefings", json=BRIEFING, headers=alice)).json()
    r = await api.post(f"/briefings/{created['id']}/run", headers=alice)
    assert r.status_code == 202, r.text
    assert r.json()["status"] == "queued"
    again = await api.post(f"/briefings/{created['id']}/run", headers=alice)
    assert again.status_code == 409


async def test_validation(api, alice):
    bad_tz = {**BRIEFING, "timezone": "Mars/Base"}
    assert (await api.post("/briefings", json=bad_tz, headers=alice)).status_code == 422
    short = {**BRIEFING, "topic": "ai"}
    assert (await api.post("/briefings", json=short, headers=alice)).status_code == 422
