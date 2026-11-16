from tests.test_api import BRIEFING


async def test_interests_are_saved_cleaned_and_returned(api, alice):
    body = {**BRIEFING, "interests": ["  Fintech ", "fintech", "Cricket", ""]}
    r = await api.post("/briefings", json=body, headers=alice)
    assert r.status_code == 201, r.text
    assert r.json()["interests"] == ["Fintech", "Cricket"]


async def test_interests_can_be_updated(api, alice):
    created = (await api.post("/briefings", json=BRIEFING, headers=alice)).json()
    assert created["interests"] == []
    r = await api.patch(
        f"/briefings/{created['id']}", json={"interests": ["SaaS", "Startup IPOs"]}, headers=alice
    )
    assert r.status_code == 200, r.text
    assert r.json()["interests"] == ["SaaS", "Startup IPOs"]


async def test_at_most_six_interests(api, alice):
    body = {**BRIEFING, "interests": [f"Interest {i}" for i in range(7)]}
    assert (await api.post("/briefings", json=body, headers=alice)).status_code == 422
