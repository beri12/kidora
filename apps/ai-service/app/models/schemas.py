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
