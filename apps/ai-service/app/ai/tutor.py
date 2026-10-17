"""The AI Tutor.

Pipeline, in order, every time:
    input moderation (ours, then the vendor's) -> prompt with real learner
    context and Kidora's scope rules -> LLM -> structured validation (one
    retry) -> output moderation -> response

Any step that cannot be completed safely degrades to a clearly-labelled
fallback rather than passing unvalidated text to a child.
"""
from __future__ import annotations

import time

from app.ai import moderation
from app.ai.llm import LLMProvider, LLMUnavailable, get_provider, normalize_history
from app.ai.prompts import chat_system_prompt, tutor_system_prompt
from app.ai.response_validator import parse_tutor_response, safe_fallback, strip_links
from app.core.logging import get_logger
from app.ml.difficulty_model import difficulty_for_mastery
from app.models.schemas import CompleteRequest, CompleteResponse, ModerationResult, TutorRequest, TutorResponse

logger = get_logger(__name__)

# Shown under a blocked or off-topic answer, so the child has a way back in.
LEARNING_SUGGESTIONS = ["Give me a maths puzzle", "Tell me a science fact", "Help me with my lesson"]


async def _screen_input(provider: LLMProvider, text: str) -> ModerationResult:
    """Our patterns first (free, instant), then the vendor's classifier."""
    inbound = moderation.check_input(text)
    if not inbound.allowed:
        return inbound
    if await provider.flagged(text) is True:
        return moderation.vendor_flagged()
    return inbound


async def answer(request: TutorRequest) -> TutorResponse:
    started = time.perf_counter()
    provider = get_provider()

    # 1. Screen the child's message before it reaches any model.
    inbound = await _screen_input(provider, request.message)
    if not inbound.allowed:
        logger.info("moderation_blocked_input", extra={"category": inbound.category})
        return TutorResponse(
            message=inbound.safe_reply or "Let's keep to schoolwork.",
            recommended_next_step="ask_teacher" if inbound.category == "self_harm" else "revise",
            difficulty=difficulty_for_mastery(request.context.mastery),
            suggestions=[] if inbound.category == "self_harm" else LEARNING_SUGGESTIONS,
        )

    system = tutor_system_prompt(request.context)
    # Recent turns as real chat messages, so "explain it simpler" makes sense.
    history = normalize_history(request.history, limit=6)

    try:
        reply = await provider.complete(system=system, user=request.message, json_mode=True, history=history)
        parsed = parse_tutor_response(reply.text, degraded=reply.degraded)

        # 2. One corrective retry before giving up on the model's output.
        if parsed is None:
            logger.info("tutor_retry_after_invalid_output")
            retry = await provider.complete(
                system=system + "\n\nYour last reply was not valid JSON. Reply with JSON only.",
                user=request.message,
                json_mode=True,
                history=history,
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
        " ".join(filter(None, [
            parsed.message, parsed.explanation, parsed.example, parsed.question, parsed.hint, *parsed.suggestions,
        ]))
    )
    if not outbound.allowed:
        logger.warning("moderation_blocked_output", extra={"category": outbound.category})
        return TutorResponse(
            message=outbound.safe_reply or "Let's get back to your lesson.",
            recommended_next_step="revise",
            difficulty=difficulty_for_mastery(request.context.mastery),
            suggestions=LEARNING_SUGGESTIONS,
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


async def complete(request: CompleteRequest) -> CompleteResponse:
    """Free-text turn under the same rules: lesson explanations, practice
    questions, hints, and the teacher assistant."""
    provider = get_provider()
    turns = [{"role": t.role, "content": t.content} for t in request.messages]
    last = turns[-1]["content"]

    # Only the newest message is new; earlier ones were screened when sent.
    if request.audience == "child":
        inbound = await _screen_input(provider, last)
    else:
        inbound = moderation.check_input(last)
        if inbound.category == "off_topic":
            inbound = ModerationResult(allowed=True)  # adults may mention these in teaching
    if not inbound.allowed:
        logger.info("moderation_blocked_input", extra={"category": inbound.category})
        return CompleteResponse(text=inbound.safe_reply or "Let's keep to schoolwork.", blocked=True)

    try:
        reply = await provider.complete(
            system=chat_system_prompt(request.instructions, request.audience),
            user=last,
            history=normalize_history(turns[:-1], limit=8),
        )
    except LLMUnavailable as exc:
        logger.warning("llm_unavailable", extra={"error": str(exc)})
        return CompleteResponse(text=safe_fallback().message, degraded=True)

    text = strip_links(reply.text)[:4000]
    outbound = moderation.check_output(text)
    if not text or not outbound.allowed:
        logger.warning("moderation_blocked_output", extra={"category": outbound.category})
        return CompleteResponse(text=outbound.safe_reply or "Let's get back to your lesson.", blocked=True)

    return CompleteResponse(
        text=text,
        degraded=reply.degraded,
        tokens=reply.prompt_tokens + reply.completion_tokens,
    )
