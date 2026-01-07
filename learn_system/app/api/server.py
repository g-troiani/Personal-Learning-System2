"""FastAPI server for the Personal Learning System API."""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import health, sources, ai, migration


def get_cors_origins() -> list:
    """
    Get CORS origins from environment or use defaults.

    Production domains can be set via CORS_ORIGINS environment variable
    as a comma-separated list (e.g., "https://myapp.vercel.app,https://www.myapp.com")
    """
    # Default development origins
    dev_origins = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:3000",
    ]

    # Add production origins from environment
    prod_origins_env = os.getenv("CORS_ORIGINS", "")
    if prod_origins_env:
        prod_origins = [origin.strip() for origin in prod_origins_env.split(",") if origin.strip()]
        return dev_origins + prod_origins

    return dev_origins


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""

    app = FastAPI(
        title="Personal Learning System API",
        description="API for document upload and processing",
        version="1.0.0"
    )

    # Configure CORS for frontend access
    # M46: Support production domains via CORS_ORIGINS env var
    app.add_middleware(
        CORSMiddleware,
        allow_origins=get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Token-Expiring-Soon"],  # M43: Expose token expiry warning header
    )

    # Include routers
    app.include_router(health.router, prefix="/api", tags=["health"])
    app.include_router(sources.router, prefix="/api/sources", tags=["sources"])
    app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
    app.include_router(migration.router, prefix="/api/migration", tags=["migration"])

    return app


# Create the application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
