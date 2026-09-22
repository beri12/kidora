"""Teaching aids: what a teacher gets back, and what is dropped on the way."""
import json
from unittest.mock import AsyncMock, patch

import pytest

from app.ai import teaching
from app.ai.llm import LLMProvider, LLMReply
from app.models.schemas import (
    ClassAnalysisRequest, ClassContext, LessonPlanRequest, QuizDraftRequest,
)


def _provider(text: str, degraded: bool = False):
    """Specced against LLMProvider, so calling `complete` with the wrong
    keywords fails here instead of only against a real vendor."""
    mock = AsyncMock(spec=LLMProvider)
    mock.complete = AsyncMock(
        spec=LLMProvider.complete,
        return_value=LLMReply(text=text, model="test", degraded=degraded),
    )
    return mock


# ------------------------------------------------------------- lesson plans

@pytest.mark.asyncio
async def test_lesson_plan_is_parsed_into_sections():
    body = json.dumps({
        "title": "Introducing fractions",
        "summary": "Halves and quarters using everyday objects.",
        "objectives": ["Name a half", "Name a quarter"],
        "sections": [
            {"heading": "Starter", "body": "Share an orange between two learners."},
            {"heading": "Main", "body": "Fold paper into equal parts."},
        ],
        "activities": ["Paper folding"],
        "check_questions": ["What is half of 8?"],
        "materials": ["Paper", "An orange"],
        "estimated_min": 40,
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        plan = await teaching.generate_lesson_plan(
            LessonPlanRequest(subject="Maths", grade="Grade 5", topic="Fractions")
        )
    assert plan.title == "Introducing fractions"
    assert len(plan.sections) == 2
    assert plan.sections[0].heading == "Starter"
    assert plan.estimated_min == 40
    assert plan.degraded is False


@pytest.mark.asyncio
async def test_lesson_plan_says_so_when_no_model_is_configured():
    with patch.object(teaching, "get_provider", return_value=_provider("", degraded=True)):
        plan = await teaching.generate_lesson_plan(
            LessonPlanRequest(subject="Maths", grade="Grade 5", topic="Fractions")
        )
    assert plan.degraded is True
    assert "No AI model is configured" in plan.summary
    # It must not invent a plan to fill the gap.
    assert plan.sections == []
    assert plan.activities == []


@pytest.mark.asyncio
async def test_lesson_plan_keeps_prose_rather_than_discarding_it():
    with patch.object(teaching, "get_provider", return_value=_provider("Start by sharing an orange.")):
        plan = await teaching.generate_lesson_plan(
            LessonPlanRequest(subject="Maths", grade="Grade 5", topic="Fractions")
        )
    assert "orange" in plan.summary


# --------------------------------------------------------------- quiz drafts

@pytest.mark.asyncio
async def test_quiz_draft_keeps_gradable_questions():
    body = json.dumps({
        "title": "Fractions check",
        "questions": [
            {"prompt": "Which is a half?", "type": "MULTIPLE_CHOICE",
             "options": ["1/2", "1/3", "1/4"], "correct": 0, "explanation": "Two equal parts."},
            {"prompt": "A quarter is bigger than a half.", "type": "TRUE_FALSE",
             "correct": 1, "explanation": "It is smaller."},
        ],
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        draft = await teaching.generate_quiz_draft(
            QuizDraftRequest(subject="Maths", grade="Grade 5", topic="Fractions", question_count=2)
        )
    assert len(draft.questions) == 2
    assert draft.questions[0].correct == 0
    assert draft.questions[1].options == ["True", "False"]


@pytest.mark.asyncio
async def test_quiz_draft_drops_a_question_with_no_correct_answer():
    body = json.dumps({
        "title": "Broken",
        "questions": [
            {"prompt": "Which is a half?", "type": "MULTIPLE_CHOICE", "options": ["1/2", "1/3"]},
            {"prompt": "Good one", "type": "MULTIPLE_CHOICE", "options": ["a", "b"], "correct": 1},
        ],
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        draft = await teaching.generate_quiz_draft(
            QuizDraftRequest(subject="Maths", grade="Grade 5", topic="Fractions", question_count=2)
        )
    # The ungradable one is dropped, not passed through looking plausible.
    assert len(draft.questions) == 1
    assert draft.questions[0].prompt == "Good one"


@pytest.mark.asyncio
async def test_quiz_draft_drops_a_correct_index_out_of_range():
    body = json.dumps({
        "title": "Off by one",
        "questions": [{"prompt": "Pick one", "type": "MULTIPLE_CHOICE", "options": ["a", "b"], "correct": 5}],
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        draft = await teaching.generate_quiz_draft(
            QuizDraftRequest(subject="Maths", grade="Grade 5", topic="X", question_count=1)
        )
    assert draft.questions == []


@pytest.mark.asyncio
async def test_quiz_draft_never_returns_more_than_asked_for():
    body = json.dumps({
        "title": "Too many",
        "questions": [
            {"prompt": f"Q{i}", "type": "MULTIPLE_CHOICE", "options": ["a", "b"], "correct": 0}
            for i in range(10)
        ],
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        draft = await teaching.generate_quiz_draft(
            QuizDraftRequest(subject="Maths", grade="Grade 5", topic="X", question_count=3)
        )
    assert len(draft.questions) == 3


@pytest.mark.asyncio
async def test_quiz_draft_is_empty_when_no_model_is_configured():
    with patch.object(teaching, "get_provider", return_value=_provider("", degraded=True)):
        draft = await teaching.generate_quiz_draft(
            QuizDraftRequest(subject="Maths", grade="Grade 5", topic="X", question_count=3)
        )
    assert draft.degraded is True
    assert draft.questions == []


# ------------------------------------------------------------ class analysis

def _class(**kw) -> ClassContext:
    base = dict(
        class_name="5A", subject="Maths", grade="Grade 5", student_count=20,
        average_score=64.0, completion_percent=48.0,
        topics=[{"topic": "Fractions", "mastered": 8, "total": 20, "mastery_percent": 40}],
        struggling=[{"name": "Abebe", "progress_percent": 20, "average_score": 41, "health": "AT_RISK"}],
        thriving=[{"name": "Sara", "progress_percent": 92, "average_score": 88, "health": "ON_TRACK"}],
    )
    base.update(kw)
    return ClassContext(**base)


@pytest.mark.asyncio
async def test_class_analysis_is_parsed():
    body = json.dumps({
        "summary": "The class is behind on fractions.",
        "strengths": ["Good attendance"],
        "weaknesses": ["Fractions"],
        "interventions": [{"focus": "Fractions", "why": "Only 40% mastered", "suggestion": "Run a paper-folding starter."}],
        "differentiation": ["Give Sara a challenge sheet."],
    })
    with patch.object(teaching, "get_provider", return_value=_provider(body)):
        out = await teaching.analyse_class(ClassAnalysisRequest(context=_class()))
    assert out.summary.startswith("The class is behind")
    assert len(out.interventions) == 1
    assert out.interventions[0].focus == "Fractions"


@pytest.mark.asyncio
async def test_class_analysis_does_not_call_the_model_for_an_empty_class():
    provider = _provider("should not be used")
    with patch.object(teaching, "get_provider", return_value=provider):
        out = await teaching.analyse_class(ClassAnalysisRequest(context=_class(student_count=0)))
    provider.complete.assert_not_awaited()
    assert "no students" in out.summary.lower()


@pytest.mark.asyncio
async def test_class_analysis_says_so_when_no_model_is_configured():
    with patch.object(teaching, "get_provider", return_value=_provider("", degraded=True)):
        out = await teaching.analyse_class(ClassAnalysisRequest(context=_class()))
    assert out.degraded is True
    assert out.interventions == []
    # The honest fallback must not pretend the figures are missing too.
    assert "real" in out.summary.lower()


@pytest.mark.asyncio
async def test_the_real_figures_reach_the_prompt():
    provider = _provider(json.dumps({"summary": "ok"}))
    with patch.object(teaching, "get_provider", return_value=provider):
        await teaching.analyse_class(ClassAnalysisRequest(context=_class()))
    system = provider.complete.await_args.kwargs["system"]
    assert "5A" in system
    assert "64%" in system
    assert "Fractions: 8/20" in system
    assert "Abebe" in system
    # And the rule that stops it inventing numbers is present.
    assert "Do not invent numbers" in system


@pytest.mark.asyncio
async def test_unsafe_generated_content_is_discarded():
    with patch.object(teaching, "get_provider", return_value=_provider("Here is how to hurt yourself badly")):
        with patch.object(teaching, "check_output") as guard:
            guard.return_value = type("V", (), {"allowed": False, "category": "self_harm"})()
            plan = await teaching.generate_lesson_plan(
                LessonPlanRequest(subject="Maths", grade="Grade 5", topic="X")
            )
    assert plan.degraded is True
    assert plan.sections == []


@pytest.mark.asyncio
async def test_the_provider_is_called_with_the_interface_it_declares():
    provider = _provider(json.dumps({"summary": "ok"}))
    with patch.object(teaching, "get_provider", return_value=provider):
        await teaching.analyse_class(ClassAnalysisRequest(context=_class()))
    kwargs = provider.complete.await_args.kwargs
    assert set(kwargs) <= {"system", "user", "json_mode"}
    assert isinstance(kwargs["system"], str) and isinstance(kwargs["user"], str)
