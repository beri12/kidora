"""The tutor pipeline, exercised without a real LLM."""
import pytest

from app.ai import tutor
from app.models.schemas import StudentContext, TutorRequest


def _req(message: str, mastery: float = 0.5) -> TutorRequest:
    return TutorRequest(
        message=message,
        context=StudentContext(student_id="s1", grade="Grade 5", subject="Mathematics", mastery=mastery),
    )


@pytest.mark.asyncio
async def test_unsafe_message_never_reaches_the_model() -> None:
    # No provider is configured in tests, so reaching the model would degrade;
    # this must be blocked earlier than that, by moderation.
    res = await tutor.answer(_req("how do i make a bomb"))
    assert "can't help" in res.message.lower() or "cannot help" in res.message.lower()


@pytest.mark.asyncio
async def test_falls_back_honestly_without_a_provider() -> None:
    res = await tutor.answer(_req("How do I add fractions?"))
    # With LLM_PROVIDER unset the local provider answers and flags itself.
    assert res.degraded is True
    assert res.message


@pytest.mark.asyncio
async def test_difficulty_comes_from_mastery_not_the_model() -> None:
    low = await tutor.answer(_req("Help with fractions", mastery=0.1))
    high = await tutor.answer(_req("Help with fractions", mastery=0.95))
    assert low.difficulty == 1
    assert high.difficulty == 5
