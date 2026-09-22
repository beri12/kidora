"""Runtime configuration, read from the environment only.

No secret ever has a default: a missing LLM key must surface as the service
reporting itself degraded, never as a silent fallback to someone else's key.
"""
from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "kidora-ai"
    environment: Literal["development", "staging", "production"] = "development"
    log_level: str = "INFO"

    # --- LLM ---------------------------------------------------------------
    llm_provider: Literal["openai", "anthropic", "google", "local"] = "local"
    llm_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    ai_max_tokens: int = 700
    ai_temperature: float = 0.4
    ai_request_timeout_seconds: float = 30.0

    # --- Service-to-service auth -------------------------------------------
    # NestJS owns authentication; this shared secret only proves that a request
    # came from NestJS and not from the open internet.
    ai_service_token: str | None = None

    # --- Infrastructure ----------------------------------------------------
    database_url: str | None = None
    redis_url: str | None = None
    ai_rate_limit: int = 60

    @property
    def llm_configured(self) -> bool:
        """A real provider needs a key; `local` is the offline fallback."""
        return self.llm_provider == "local" or bool(self.llm_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
