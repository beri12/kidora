"""LLM provider abstraction.

Business logic never names a vendor. Swapping LLM_PROVIDER changes the
implementation behind this interface and nothing else. `local` is a real,
deterministic fallback — not a pretend LLM: it returns clearly-labelled
guidance and every response it produces is marked degraded.
"""
from __future__ import annotations

import abc
import json
from dataclasses import dataclass

import httpx

from app.core.config import Settings, get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class LLMReply:
    text: str
    model: str
    prompt_tokens: int = 0
    completion_tokens: int = 0
    degraded: bool = False


class LLMUnavailable(RuntimeError):
    """Raised when the provider cannot be reached. Callers fall back rather
    than surfacing an error to a child."""


class LLMProvider(abc.ABC):
    """One method, so a new vendor is one small class."""

    name: str

    @abc.abstractmethod
    async def complete(self, *, system: str, user: str, json_mode: bool = False) -> LLMReply: ...


class OpenAIProvider(LLMProvider):
    name = "openai"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(self, *, system: str, user: str, json_mode: bool = False) -> LLMReply:
        s = self._settings
        payload: dict = {
            "model": s.llm_model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": s.ai_max_tokens,
            "temperature": s.ai_temperature,
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}

        try:
            async with httpx.AsyncClient(timeout=s.ai_request_timeout_seconds) as client:
                res = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {s.llm_api_key}"},
                    json=payload,
                )
            res.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMUnavailable(str(exc)) from exc

        data = res.json()
        usage = data.get("usage", {})
        return LLMReply(
            text=data["choices"][0]["message"]["content"],
            model=data.get("model", s.llm_model),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
        )


class AnthropicProvider(LLMProvider):
    name = "anthropic"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(self, *, system: str, user: str, json_mode: bool = False) -> LLMReply:
        s = self._settings
        try:
            async with httpx.AsyncClient(timeout=s.ai_request_timeout_seconds) as client:
                res = await client.post(
                    "https://api.anthropic.com/v1/messages",
                    headers={
                        "x-api-key": s.llm_api_key or "",
                        "anthropic-version": "2023-06-01",
                        "content-type": "application/json",
                    },
                    json={
                        "model": s.llm_model,
                        "system": system,
                        "messages": [{"role": "user", "content": user}],
                        "max_tokens": s.ai_max_tokens,
                        "temperature": s.ai_temperature,
                    },
                )
            res.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMUnavailable(str(exc)) from exc

        data = res.json()
        usage = data.get("usage", {})
        return LLMReply(
            text="".join(part.get("text", "") for part in data.get("content", [])),
            model=data.get("model", s.llm_model),
            prompt_tokens=usage.get("input_tokens", 0),
            completion_tokens=usage.get("output_tokens", 0),
        )


class GoogleProvider(LLMProvider):
    name = "google"

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def complete(self, *, system: str, user: str, json_mode: bool = False) -> LLMReply:
        s = self._settings
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{s.llm_model}:generateContent?key={s.llm_api_key}"
        )
        try:
            async with httpx.AsyncClient(timeout=s.ai_request_timeout_seconds) as client:
                res = await client.post(
                    url,
                    json={
                        "systemInstruction": {"parts": [{"text": system}]},
                        "contents": [{"role": "user", "parts": [{"text": user}]}],
                        "generationConfig": {
                            "maxOutputTokens": s.ai_max_tokens,
                            "temperature": s.ai_temperature,
                            **({"responseMimeType": "application/json"} if json_mode else {}),
                        },
                    },
                )
            res.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMUnavailable(str(exc)) from exc

        data = res.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return LLMReply(text="".join(p.get("text", "") for p in parts), model=s.llm_model)


class LocalProvider(LLMProvider):
    """Offline fallback.

    This is NOT a fake LLM pretending to answer. It returns a short, honest
    message telling the child the tutor is unavailable and pointing them at
    their lesson, and everything it produces is flagged degraded so the UI can
    label it. It exists so a missing API key never takes the dashboard down.
    """

    name = "local"

    async def complete(self, *, system: str, user: str, json_mode: bool = False) -> LLMReply:
        body = {
            "message": (
                "The AI tutor is unavailable right now, so I can't work through this with you yet. "
                "Keep going with your lesson and try again shortly — or ask your teacher."
            ),
            "recommended_next_step": "ask_teacher",
            "difficulty": 2,
        }
        return LLMReply(
            text=json.dumps(body) if json_mode else body["message"],
            model="local-fallback",
            degraded=True,
        )


_PROVIDERS: dict[str, type[LLMProvider]] = {
    "openai": OpenAIProvider,
    "anthropic": AnthropicProvider,
    "google": GoogleProvider,
    "local": LocalProvider,
}


def get_provider(settings: Settings | None = None) -> LLMProvider:
    s = settings or get_settings()
    # An unconfigured provider degrades to local rather than throwing on every
    # request, so the platform keeps working without an API key.
    if not s.llm_configured:
        logger.warning("llm_not_configured", extra={"provider": s.llm_provider})
        return LocalProvider()
    cls = _PROVIDERS.get(s.llm_provider, LocalProvider)
    return cls(s) if cls is not LocalProvider else LocalProvider()
