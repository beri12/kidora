from fastapi import APIRouter, Depends

from app.ai import teaching
from app.core.security import require_service_token
from app.models.schemas import (
    ClassAnalysis, ClassAnalysisRequest, LessonPlan, LessonPlanRequest, QuizDraft, QuizDraftRequest,
)

router = APIRouter(prefix="/teaching", tags=["teaching"], dependencies=[Depends(require_service_token)])


@router.post("/lesson-plan", response_model=LessonPlan)
async def lesson_plan(request: LessonPlanRequest) -> LessonPlan:
    """A lesson plan draft for a teacher to review. Never published on its own."""
    return await teaching.generate_lesson_plan(request)


@router.post("/quiz", response_model=QuizDraft)
async def quiz(request: QuizDraftRequest) -> QuizDraft:
    """Draft quiz questions. Questions that could not be graded are dropped
    rather than handed to a teacher looking correct."""
    return await teaching.generate_quiz_draft(request)


@router.post("/analyse-class", response_model=ClassAnalysis)
async def analyse_class(request: ClassAnalysisRequest) -> ClassAnalysis:
    """Analyse real class figures. NestJS assembles the context after checking
    the teacher actually teaches the class; this service is never given a class
    id to look up itself."""
    return await teaching.analyse_class(request)
