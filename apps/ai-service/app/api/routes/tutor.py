from fastapi import APIRouter, Depends

from app.ai import tutor
from app.core.security import require_service_token
from app.models.schemas import CompleteRequest, CompleteResponse, TutorRequest, TutorResponse

router = APIRouter(prefix="/tutor", tags=["tutor"], dependencies=[Depends(require_service_token)])


@router.post("/chat", response_model=TutorResponse)
async def chat(request: TutorRequest) -> TutorResponse:
    """Ask the tutor.

    The learner context in the body is built by NestJS *after* it has
    authorised the caller. This service never resolves a student id on its own,
    so a browser cannot ask about someone else's child by changing an id.
    """
    return await tutor.answer(request)


@router.post("/complete", response_model=CompleteResponse)
async def complete(request: CompleteRequest) -> CompleteResponse:
    """Free-text turn for lesson features (explain, practice, hint) and the
    teacher assistant, under the same safety and scope rules as the chat."""
    return await tutor.complete(request)
