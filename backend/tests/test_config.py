from app.config import Settings


def test_smtp_key_is_used_as_the_smtp_password(monkeypatch):
    monkeypatch.setenv("BACKEND_JWT_SECRET", "test")
    monkeypatch.setenv("SMTP_PASSWORD", "old")
    monkeypatch.setenv("SMTP_KEY", "new")
    assert Settings(_env_file=None).smtp_password == "new"


def test_smtp_password_still_works_alone(monkeypatch):
    monkeypatch.setenv("BACKEND_JWT_SECRET", "test")
    monkeypatch.delenv("SMTP_KEY", raising=False)
    monkeypatch.setenv("SMTP_PASSWORD", "only")
    assert Settings(_env_file=None).smtp_password == "only"
