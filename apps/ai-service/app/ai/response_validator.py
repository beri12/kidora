"""Validate structured LLM output.

An LLM can return prose where JSON was asked for, or JSON with the wrong
shape. Rather than passing whatever arrives to a child, parse and validate; on
failure retry once with a correction, then fall back to a safe response.
"""
from __future__ import annotations

import json
import re
from typing import Any

from pydantic import ValidationError

from app.core.logging import get_logger
from app.models.schemas import TutorResponse

logger = get_logger(__name__)

_JSON_BLOCK = re.compile(r"\{.*\}", re.DOTALL)


def extract_json(text: str) -> dict[str, Any] | None:
    """Pull the JSON object out of a reply that may be wrapped in prose or
    fenced in markdown."""
    if not text:
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = _JSON_BLOCK.search(text)
    if not match:
        return None
    try:
        return json.loads(match.group(0))
    except json.JSONDecodeError:
        return None


def parse_tutor_response(text: str, *, degraded: bool = False) -> TutorResponse | None:
    """None means the caller should retry or fall back — never guess."""
    payload = extract_json(text)
    if payload is None:
        # A plain-prose answer is still usable as the message body.
        stripped = text.strip()
        if stripped:
            return TutorResponse(message=stripped[:2000], degraded=degraded)
        return None

    payload.setdefault("message", payload.get("explanation") or "")
    payload["degraded"] = degraded
    try:
        return TutorResponse(**payload)
    except ValidationError as exc:
        logger.warning("tutor_response_invalid", extra={"errors": exc.error_count()})
        return None


def safe_fallback(reason: str = "unavailable") -> TutorResponse:
    """Used when the model is unreachable or its output could not be trusted.
    Says so plainly rather than inventing an answer."""
    return TutorResponse(
        message=(
            "I couldn't work that one out just now. Try asking me again in a moment, "
            "or carry on with your lesson and ask your teacher if you're stuck."
        ),
        recommended_next_step="ask_teacher",
        degraded=True,
        learning_objective=None,
    )
