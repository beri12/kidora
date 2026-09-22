from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.ai import moderation as mod
from app.core.security import require_service_token
from app.models.schemas import ModerationResult

router = APIRouter(prefix="/moderation", tags=["moderation"], dependencies=[Depends(require_service_token)])


class ModerationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    direction: str = "input"


@router.post("/check", response_model=ModerationResult)
async def check(request: ModerationRequest) -> ModerationResult:
    """Exposed so other services can screen text with the same rules the tutor
    uses, rather than each re-implementing them."""
    return mod.check_input(request.text) if request.direction == "input" else mod.check_output(request.text)
