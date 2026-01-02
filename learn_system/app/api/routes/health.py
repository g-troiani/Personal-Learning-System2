"""Health check endpoint."""

from fastapi import APIRouter

from ..models.schemas import HealthResponse


router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Check API health status.

    Returns:
        HealthResponse with status, version, and timestamp
    """
    return HealthResponse(
        status="healthy",
        version="1.0.0"
    )
