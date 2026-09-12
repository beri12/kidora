"""Kidora AI service.

Deliberately not public: NestJS owns authentication, authorisation and the
database, and calls this service over the internal network with a shared
secret. This service owns AI, ML and retrieval only.
"""
from fastapi import FastAPI

from app.api.routes import health, moderation, teaching, tutor
from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger

configure_logging()
logger = get_logger(__name__)

settings = get_settings()

app = FastAPI(
    title="Kidora AI Service",
    version=health.VERSION,
    description=(
        "AI and ML for the Kidora learning platform. Called by the Kidora API, "
        "never directly by a browser."
    ),
    docs_url="/docs",
    openapi_url="/openapi.json",
)

API_PREFIX = "/api/v1/ai"
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(tutor.router, prefix=API_PREFIX)
app.include_router(moderation.router, prefix=API_PREFIX)
app.include_router(teaching.router, prefix=API_PREFIX)


@app.on_event("startup")
async def on_startup() -> None:
    logger.info(
        "ai_service_started",
        extra={
            "environment": settings.environment,
            "llm_provider": settings.llm_provider,
            "llm_configured": settings.llm_configured,
        },
    )
    if not settings.ai_service_token and settings.environment == "production":
        # Loud, because an unauthenticated AI service in production would let
        # anything on the network spend tokens and read learner context.
        logger.error("ai_service_token_missing_in_production")
