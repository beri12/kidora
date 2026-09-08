"""Service-to-service authentication.

The AI service is not public. NestJS authenticates the human, authorises what
they may read, and then calls here with a shared secret. This check only
answers "did this come from NestJS" — it is never used to decide what a
student may see.
"""
import hmac

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


async def require_service_token(x_kidora_service_token: str | None = Header(default=None)) -> None:
    settings = get_settings()

    # Unset in development so the service can be run standalone; refusing to
    # start unauthenticated in production is handled by the deployment check.
    if not settings.ai_service_token:
        return

    if not x_kidora_service_token or not hmac.compare_digest(
        x_kidora_service_token, settings.ai_service_token
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing service token.",
        )
