"""The AI Tutor.

Pipeline, in order, every time:
    input moderation -> prompt with real learner context -> LLM
    -> structured validation (one retry) -> output moderation -> response

Any step that cannot be completed safely degrades to a clearly-labelled
fallback rather than passing unvalidated text to a child.
"""
from __future__ import annotations

import time

from app.ai import moderation
from app.ai.llm import LLMUnavailable, get_provider
from app.ai.prompts import tutor_system_prompt
from app.ai.response_validator import parse_tutor_response, safe_fallback
from app.core.logging import get_logger
from app.ml.difficulty_model import difficulty_for_mastery
from app.models.schemas import TutorRequest, TutorResponse

logger = get_logger(__name__)


async def answer(request: TutorRequest) -> TutorResponse:
    started = time.perf_counter()

    # 1. Screen the child's message before it reaches any model.
    inbound = moderation.check_input(request.message)
    if not inbound.allowed:
        logger.info("moderation_blocked_input", extra={"category": inbound.category})
        return TutorResponse(
            message=inbound.safe_reply or "Let's keep to schoolwork.",
            recommended_next_step="ask_teacher" if inbound.category == "self_harm" else "revise",
            difficulty=difficulty_for_mastery(request.context.mastery),
        )

    provider = get_provider()
    system = tutor_system_prompt(request.context)

    # Recent turns give continuity without sending the whole history.
    history = "\n".join(
        f"{m.get('role', 'user')}: {m.get('content', '')}" for m in request.history[-6:]
    )
    user = f"{history}\nchild: {request.message}" if history else request.message

    try:
        reply = await provider.complete(system=system, user=user, json_mode=True)
        parsed = parse_tutor_response(reply.text, degraded=reply.degraded)

        # 2. One corrective retry before giving up on the model's output.
        if parsed is None:
            logger.info("tutor_retry_after_invalid_output")
            retry = await provider.complete(
                system=system + "\n\nYour last reply was not valid JSON. Reply with JSON only.",
                user=user,
                json_mode=True,
            )
            parsed = parse_tutor_response(retry.text, degraded=retry.degraded)
            reply = retry
    except LLMUnavailable as exc:
        logger.warning("llm_unavailable", extra={"error": str(exc)})
        return safe_fallback("provider_unavailable")

    if parsed is None:
        return safe_fallback("invalid_output")

    # 3. Screen the model's own words before the child reads them.
    outbound = moderation.check_output(
        " ".join(filter(None, [parsed.message, parsed.explanation, parsed.example, parsed.question, parsed.hint]))
    )
    if not outbound.allowed:
        logger.warning("moderation_blocked_output", extra={"category": outbound.category})
        return TutorResponse(
            message=outbound.safe_reply or "Let's get back to your lesson.",
            recommended_next_step="revise",
            difficulty=difficulty_for_mastery(request.context.mastery),
        )

    # The model may suggest a difficulty; the learner model decides it.
    parsed.difficulty = difficulty_for_mastery(request.context.mastery)

    logger.info(
        "tutor_answered",
        extra={
            "latency_ms": round((time.perf_counter() - started) * 1000),
            "model": reply.model,
            "prompt_tokens": reply.prompt_tokens,
            "completion_tokens": reply.completion_tokens,
            "degraded": parsed.degraded,
        },
    )
    return parsed
