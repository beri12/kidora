"""Teaching aids for teachers: lesson plans, quiz drafts, class analysis.

Two things separate this from the tutor:

* The audience is an adult professional, so the child-safety framing is
  different — but the *output* is destined for children, so the content rules
  still apply to what is generated.
* Nothing here is ever published automatically. Every response is a draft the
  teacher reads, edits and chooses to save. The API says so, and the NestJS
  layer has no route that writes generated content straight into a course.

When no model is configured the provider returns `degraded`, and these
functions return an empty draft that says so rather than inventing a lesson.
"""
from __future__ import annotations

from app.ai.llm import get_provider
from app.ai.moderation import check_output
from app.ai.response_validator import extract_json
from app.core.logging import get_logger
from app.models.schemas import (
    ClassAnalysis,
    ClassAnalysisRequest,
    DraftQuestion,
    Intervention,
    LessonPlan,
    LessonPlanRequest,
    LessonPlanSection,
    QuizDraft,
    QuizDraftRequest,
)

logger = get_logger(__name__)

CONTENT_RULES = """
Everything you write will be read by children in school. Therefore:
- Keep language at the stated grade level.
- No violent, sexual, frightening or otherwise age-inappropriate material.
- No personal data, no links to outside sites, no brand promotion.
- Use examples that work in an African classroom: local names, local currency,
  everyday objects. Do not assume expensive equipment or reliable internet.
- Be factually careful. If you are unsure of a fact, leave it out.
""".strip()

REVIEW_NOTE = (
    "This is a draft for a teacher to review. It is never shown to a student "
    "until the teacher edits and saves it."
)


# --------------------------------------------------------------- lesson plan


def _lesson_prompt(req: LessonPlanRequest) -> str:
    objectives = "\n".join(f"- {o}" for o in req.objectives) or "- (none given; propose 2-4)"
    return "\n".join(
        [
            "You are an experienced teacher writing a lesson plan for a colleague.",
            CONTENT_RULES,
            REVIEW_NOTE,
            "",
            f"Subject: {req.subject}",
            f"Grade: {req.grade}",
            f"Topic: {req.topic}",
            f"Difficulty: {req.difficulty}",
            f"Length: about {req.duration_min} minutes",
            f"Language: {req.language}",
            "Learning objectives:",
            objectives,
            f"Teacher's notes: {req.notes}" if req.notes else "",
            "",
            "Reply as JSON with exactly these keys:",
            '{"title": str, "summary": str, "objectives": [str], '
            '"sections": [{"heading": str, "body": str}], "activities": [str], '
            '"check_questions": [str], "materials": [str], "estimated_min": int}',
            "",
            "Write 3-6 sections that walk through the lesson in order. Keep each",
            "body to a short paragraph a teacher can skim.",
        ]
    )


async def generate_lesson_plan(req: LessonPlanRequest) -> LessonPlan:
    provider = get_provider()
    result = await provider.complete(
        system=_lesson_prompt(req),
        user=f"Write the lesson plan for: {req.topic}",
        json_mode=True,
    )

    if result.degraded:
        return LessonPlan(
            title=req.topic,
            summary=(
                "No AI model is configured, so no lesson plan was generated. "
                "Ask an administrator to set an LLM provider key."
            ),
            estimated_min=req.duration_min,
            degraded=True,
        )

    verdict = check_output(result.text)
    if not verdict.allowed:
        logger.warning("lesson_plan_blocked", extra={"category": verdict.category})
        return LessonPlan(
            title=req.topic,
            summary="The generated plan did not pass the content check and was discarded. Try rewording the topic.",
            estimated_min=req.duration_min,
            degraded=True,
        )

    payload = extract_json(result.text)
    if not payload:
        # Prose instead of JSON is still useful to a teacher — keep it as the
        # summary rather than throwing the work away.
        return LessonPlan(title=req.topic, summary=result.text.strip()[:4000], estimated_min=req.duration_min)

    sections = [
        LessonPlanSection(heading=str(s.get("heading", "")), body=str(s.get("body", "")))
        for s in payload.get("sections", [])
        if isinstance(s, dict) and (s.get("heading") or s.get("body"))
    ]
    return LessonPlan(
        title=str(payload.get("title") or req.topic),
        summary=str(payload.get("summary") or ""),
        objectives=[str(o) for o in payload.get("objectives", []) if str(o).strip()],
        sections=sections,
        activities=[str(a) for a in payload.get("activities", []) if str(a).strip()],
        check_questions=[str(q) for q in payload.get("check_questions", []) if str(q).strip()],
        materials=[str(m) for m in payload.get("materials", []) if str(m).strip()],
        estimated_min=int(payload.get("estimated_min") or req.duration_min),
    )


# ---------------------------------------------------------------- quiz draft


def _quiz_prompt(req: QuizDraftRequest) -> str:
    types = ", ".join(req.question_types) or "MULTIPLE_CHOICE"
    return "\n".join(
        [
            "You are an experienced teacher writing quiz questions for a colleague.",
            CONTENT_RULES,
            REVIEW_NOTE,
            "",
            f"Subject: {req.subject}",
            f"Grade: {req.grade}",
            f"Topic: {req.topic}",
            f"Difficulty: {req.difficulty}",
            f"Language: {req.language}",
            f"Write exactly {req.question_count} questions using only these types: {types}",
            "",
            "Reply as JSON with exactly these keys:",
            '{"title": str, "questions": [{"prompt": str, "type": str, '
            '"options": [str], "correct": int, "correct_options": [int], '
            '"answer_text": str|null, "explanation": str, "difficulty": "EASY"|"MEDIUM"|"HARD"}]}',
            "",
            "Rules that make a question usable:",
            "- MULTIPLE_CHOICE: at least 3 options, `correct` is the index of the right one.",
            "- TRUE_FALSE: options are exactly [\"True\", \"False\"], `correct` is 0 or 1.",
            "- MULTIPLE_SELECT: `correct_options` lists every right index.",
            "- SHORT_ANSWER: no options; `answer_text` is the expected answer.",
            "- Every question needs a one-sentence explanation of the answer.",
            "- Exactly one plausible correct answer. No trick questions.",
        ]
    )


_ALLOWED_TYPES = {"MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT", "SHORT_ANSWER"}


def _coerce_question(raw: dict) -> DraftQuestion | None:
    """Drop a question rather than hand a teacher one that cannot be graded."""
    prompt = str(raw.get("prompt") or "").strip()
    if not prompt:
        return None
    qtype = str(raw.get("type") or "MULTIPLE_CHOICE").upper()
    if qtype not in _ALLOWED_TYPES:
        qtype = "MULTIPLE_CHOICE"
    options = [str(o) for o in raw.get("options", []) if str(o).strip()]
    explanation = str(raw.get("explanation") or "").strip() or None
    difficulty = str(raw.get("difficulty") or "MEDIUM").upper()
    if difficulty not in {"EASY", "MEDIUM", "HARD"}:
        difficulty = "MEDIUM"

    if qtype == "SHORT_ANSWER":
        answer = str(raw.get("answer_text") or "").strip()
        if not answer:
            return None
        return DraftQuestion(prompt=prompt, type=qtype, answer_text=answer, explanation=explanation, difficulty=difficulty)

    if qtype == "TRUE_FALSE":
        options = ["True", "False"]
        correct = raw.get("correct")
        if correct not in (0, 1):
            return None
        return DraftQuestion(prompt=prompt, type=qtype, options=options, correct=int(correct), explanation=explanation, difficulty=difficulty)

    if qtype == "MULTIPLE_SELECT":
        picked = [int(i) for i in raw.get("correct_options", []) if isinstance(i, int)]
        picked = [i for i in picked if 0 <= i < len(options)]
        if len(options) < 2 or not picked:
            return None
        return DraftQuestion(prompt=prompt, type=qtype, options=options, correct_options=sorted(set(picked)), explanation=explanation, difficulty=difficulty)

    correct = raw.get("correct")
    if len(options) < 2 or not isinstance(correct, int) or not (0 <= correct < len(options)):
        return None
    return DraftQuestion(prompt=prompt, type=qtype, options=options, correct=correct, explanation=explanation, difficulty=difficulty)


async def generate_quiz_draft(req: QuizDraftRequest) -> QuizDraft:
    provider = get_provider()
    result = await provider.complete(
        system=_quiz_prompt(req),
        user=f"Write {req.question_count} questions on: {req.topic}",
        json_mode=True,
    )

    if result.degraded:
        return QuizDraft(title=req.topic, degraded=True)

    verdict = check_output(result.text)
    if not verdict.allowed:
        logger.warning("quiz_draft_blocked", extra={"category": verdict.category})
        return QuizDraft(title=req.topic, degraded=True)

    payload = extract_json(result.text)
    if not payload:
        return QuizDraft(title=req.topic, degraded=True)

    questions: list[DraftQuestion] = []
    for raw in payload.get("questions", []):
        if isinstance(raw, dict):
            q = _coerce_question(raw)
            if q:
                questions.append(q)
    return QuizDraft(title=str(payload.get("title") or req.topic), questions=questions[: req.question_count])


# ------------------------------------------------------------ class analysis


def _analysis_prompt(req: ClassAnalysisRequest) -> str:
    c = req.context
    lines = [
        "You are a senior teacher advising a colleague on their class.",
        CONTENT_RULES,
        "Base every statement on the figures below. Do not invent numbers, and",
        "do not speculate about a child's home life, health or family.",
        "Refer to students only by the names given.",
        "",
        f"Class: {c.class_name or 'unnamed'}",
        f"Course: {c.course_title or 'not specified'}",
        f"Subject: {c.subject or 'not specified'} · Grade: {c.grade or 'not specified'}",
        f"Students: {c.student_count}",
    ]
    if c.average_score is not None:
        lines.append(f"Class average score: {c.average_score:.0f}%")
    if c.completion_percent is not None:
        lines.append(f"Average course completion: {c.completion_percent:.0f}%")
    if c.topics:
        lines.append("Topic mastery:")
        for t in c.topics[:12]:
            lines.append(f"- {t.get('topic')}: {t.get('mastered')}/{t.get('total')} students ({t.get('mastery_percent')}%)")
    if c.struggling:
        lines.append("Students needing support:")
        for s in c.struggling[:10]:
            lines.append(f"- {s.get('name')}: {s.get('progress_percent')}% done, average {s.get('average_score')}%")
    if c.thriving:
        lines.append("Students doing well:")
        for s in c.thriving[:10]:
            lines.append(f"- {s.get('name')}: {s.get('progress_percent')}% done, average {s.get('average_score')}%")
    if req.question:
        lines.append(f"\nThe teacher asks: {req.question}")

    lines += [
        "",
        "Reply as JSON with exactly these keys:",
        '{"summary": str, "strengths": [str], "weaknesses": [str], '
        '"interventions": [{"focus": str, "why": str, "suggestion": str}], '
        '"differentiation": [str]}',
        "",
        "Give 2-4 interventions, each one a concrete thing the teacher could do",
        "next week. Differentiation should suggest how to stretch the confident",
        "students while supporting the rest.",
    ]
    return "\n".join(lines)


async def analyse_class(req: ClassAnalysisRequest) -> ClassAnalysis:
    if req.context.student_count == 0:
        return ClassAnalysis(
            summary="There are no students in this class yet, so there is nothing to analyse.",
            degraded=False,
        )

    provider = get_provider()
    result = await provider.complete(
        system=_analysis_prompt(req),
        user="Analyse this class and suggest what to do next.",
        json_mode=True,
    )

    if result.degraded:
        return ClassAnalysis(
            summary=(
                "No AI model is configured, so no analysis was generated. "
                "The class figures on this page are real and come from the database."
            ),
            degraded=True,
        )

    verdict = check_output(result.text)
    if not verdict.allowed:
        logger.warning("class_analysis_blocked", extra={"category": verdict.category})
        return ClassAnalysis(summary="The generated analysis did not pass the content check and was discarded.", degraded=True)

    payload = extract_json(result.text)
    if not payload:
        return ClassAnalysis(summary=result.text.strip()[:4000])

    interventions = [
        Intervention(
            focus=str(i.get("focus", "")),
            why=str(i.get("why", "")),
            suggestion=str(i.get("suggestion", "")),
        )
        for i in payload.get("interventions", [])
        if isinstance(i, dict) and i.get("focus")
    ]
    return ClassAnalysis(
        summary=str(payload.get("summary") or ""),
        strengths=[str(s) for s in payload.get("strengths", []) if str(s).strip()],
        weaknesses=[str(w) for w in payload.get("weaknesses", []) if str(w).strip()],
        interventions=interventions,
        differentiation=[str(d) for d in payload.get("differentiation", []) if str(d).strip()],
    )
