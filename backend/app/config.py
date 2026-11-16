"""Runtime settings, loaded from environment variables (and a local .env in development)."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Infrastructure
    database_url: str = "postgresql+asyncpg://briefcast:briefcast@localhost:5432/briefcast"
    redis_url: str = "redis://localhost:6379/0"

    # Auth: the Next.js server signs a short-lived HS256 token for every proxied request.
    backend_jwt_secret: str
    backend_jwt_issuer: str = "briefcast-web"
    backend_jwt_audience: str = "briefcast-api"

    # Public URL of the web app, used for links in emails.
    app_url: str = "http://localhost:3000"

    # LLM (OpenAI-compatible endpoint; OpenRouter by default)
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""
    llm_model: str = "anthropic/claude-sonnet-5.5"

    # Research
    tavily_api_key: str = ""

    # Gnani TTS
    gnani_api_key: str = ""
    gnani_tts_url: str = "https://api.vachana.ai/api/v1/tts/inference"

    # Email (SMTP; Brevo in production)
    smtp_host: str = "smtp-relay.brevo.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    mail_from: str = "Briefcast <podcast@example.com>"

    # Product knobs
    target_words: int = 750  # ~5 minutes at ~150 spoken words per minute
    manual_runs_per_day: int = 5


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
