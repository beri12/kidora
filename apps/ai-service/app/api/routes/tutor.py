from fastapi import APIRouter, Depends

from app.ai import tutor
from app.core.security import require_service_token
from app.models.schemas import TutorRequest, TutorResponse

router = APIRouter(prefix="/tutor", tags=["tutor"], dependencies=[Depends(require_service_token)])


@router.post("/chat", response_model=TutorResponse)
async def chat(request: TutorRequest) -> TutorResponse:
    """Ask the tutor.

    The learner context in the body is built by NestJS *after* it has
    authorised the caller. This service never resolves a student id on its own,
    so a browser cannot ask about someone else's child by changing an id.
    """
    return await tutor.answer(request)
