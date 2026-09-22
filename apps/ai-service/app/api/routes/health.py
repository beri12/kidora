from fastapi import APIRouter

from app.core.config import get_settings
from app.models.schemas import HealthResponse

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness plus honest capability reporting.

    Reports `degraded` (not unhealthy) when no LLM is configured: the service
    is up and will serve fallbacks, which is exactly what an orchestrator
    should keep routing traffic to.
    """
    s = get_settings()
    return HealthResponse(
        status="ok" if s.llm_configured else "degraded",
        service=s.app_name,
        environment=s.environment,
        llm_provider=s.llm_provider,
        llm_configured=s.llm_configured,
        version=VERSION,
    )


@router.get("/ready")
async def ready() -> dict[str, bool]:
    return {"ready": True}
