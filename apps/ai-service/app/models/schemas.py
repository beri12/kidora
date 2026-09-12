"""Request and response contracts. Every LLM response is validated against
these before it reaches a child."""
from typing import Literal

from pydantic import BaseModel, Field

Difficulty = int  # 1-5, see ml/difficulty_model.py


class StudentContext(BaseModel):
    """What the tutor is told about the learner.

    NestJS builds this after authorising the caller; the AI service never
    looks a student up by an id handed to it by a browser.
    """
    student_id: str
    grade: str | None = None
    subject: str | None = None
    course_id: str | None = None
    course_title: str | None = None
    lesson_id: str | None = None
    lesson_title: str | None = None
    mastery: float = Field(default=0.5, ge=0.0, le=1.0)
    recent_mistakes: list[str] = Field(default_factory=list)


class TutorRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    context: StudentContext
    history: list[dict[str, str]] = Field(default_factory=list, max_length=20)


class TutorResponse(BaseModel):
    """Structured so the UI can render each part deliberately rather than
    dumping a wall of text at a child."""
    type: Literal["tutor_response"] = "tutor_response"
    message: str
    explanation: str | None = None
    example: str | None = None
    question: str | None = None
    hint: str | None = None
    difficulty: Difficulty = Field(default=2, ge=1, le=5)
    recommended_next_step: Literal["practice", "quiz", "revise", "advance", "ask_teacher"] = "practice"
    learning_objective: str | None = None
    # True when the LLM was unreachable and this is the offline fallback, so
    # the UI can say so honestly instead of passing it off as a real answer.
    degraded: bool = False


class ModerationResult(BaseModel):
    allowed: bool
    category: str | None = None
    reason: str | None = None
    safe_reply: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    service: str
    environment: str
    llm_provider: str
    llm_configured: bool
    version: str


# --------------------------------------------------------------- teaching aids
#
# Everything below is for TEACHERS, not children. The output is a draft the
# teacher reviews and edits; nothing generated here is ever published to a
# student without a teacher explicitly saving it.


class ClassContext(BaseModel):
    """Real class figures, assembled by NestJS from the database after it has
    checked the teacher actually teaches this class."""
    class_name: str | None = None
    course_title: str | None = None
    subject: str | None = None
    grade: str | None = None
    student_count: int = 0
    average_score: float | None = None
    completion_percent: float | None = None
    # [{topic, mastered, total, mastery_percent}]
    topics: list[dict[str, object]] = Field(default_factory=list)
    # [{name, progress_percent, average_score, health}] — first names only.
    struggling: list[dict[str, object]] = Field(default_factory=list)
    thriving: list[dict[str, object]] = Field(default_factory=list)


class LessonPlanRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    grade: str = Field(min_length=1, max_length=40)
    topic: str = Field(min_length=1, max_length=160)
    objectives: list[str] = Field(default_factory=list, max_length=10)
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"
    duration_min: int = Field(default=30, ge=5, le=240)
    language: str = "English"
    notes: str | None = Field(default=None, max_length=1000)


class LessonPlanSection(BaseModel):
    heading: str
    body: str


class LessonPlan(BaseModel):
    type: Literal["lesson_plan"] = "lesson_plan"
    title: str
    summary: str
    objectives: list[str] = Field(default_factory=list)
    sections: list[LessonPlanSection] = Field(default_factory=list)
    activities: list[str] = Field(default_factory=list)
    check_questions: list[str] = Field(default_factory=list)
    materials: list[str] = Field(default_factory=list)
    estimated_min: int = 30
    degraded: bool = False


class QuizDraftRequest(BaseModel):
    subject: str = Field(min_length=1, max_length=80)
    grade: str = Field(min_length=1, max_length=40)
    topic: str = Field(min_length=1, max_length=160)
    question_count: int = Field(default=5, ge=1, le=20)
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"
    question_types: list[str] = Field(default_factory=lambda: ["MULTIPLE_CHOICE"], max_length=6)
    language: str = "English"


class DraftQuestion(BaseModel):
    prompt: str
    type: Literal["MULTIPLE_CHOICE", "TRUE_FALSE", "MULTIPLE_SELECT", "SHORT_ANSWER"] = "MULTIPLE_CHOICE"
    options: list[str] = Field(default_factory=list)
    correct: int | None = None
    correct_options: list[int] = Field(default_factory=list)
    answer_text: str | None = None
    explanation: str | None = None
    difficulty: Literal["EASY", "MEDIUM", "HARD"] = "MEDIUM"


class QuizDraft(BaseModel):
    type: Literal["quiz_draft"] = "quiz_draft"
    title: str
    questions: list[DraftQuestion] = Field(default_factory=list)
    degraded: bool = False


class ClassAnalysisRequest(BaseModel):
    context: ClassContext
    question: str | None = Field(default=None, max_length=500)


class Intervention(BaseModel):
    focus: str
    why: str
    suggestion: str


class ClassAnalysis(BaseModel):
    type: Literal["class_analysis"] = "class_analysis"
    summary: str
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    interventions: list[Intervention] = Field(default_factory=list)
    differentiation: list[str] = Field(default_factory=list)
    degraded: bool = False
