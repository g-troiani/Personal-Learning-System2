"""Migration endpoints for first user data migration.

These endpoints handle the one-time migration of orphaned data (user_id IS NULL)
to the first authenticated user. This is needed for data created before
multi-user authentication was implemented.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List

from ..auth import CurrentUser
from ...auth.first_user_migration import (
    check_has_orphaned_data,
    migrate_existing_data_to_user,
    get_migration_status,
)


router = APIRouter()


class MigrationStatusResponse(BaseModel):
    """Response for migration status check."""
    has_orphaned_data: bool
    total_orphaned_rows: int
    tables: Dict[str, int]
    message: str


class MigrationTriggerResponse(BaseModel):
    """Response for migration trigger."""
    success: bool
    tables_migrated: int
    rows_migrated: int
    errors: List[str]
    message: str


@router.get("/status", response_model=MigrationStatusResponse)
async def get_migration_status_endpoint(current_user: CurrentUser):
    """
    Check if there is orphaned data that needs migration.

    This endpoint is used by the frontend after user registration to
    determine if the first-user migration should be triggered.

    Args:
        current_user: Authenticated user (from JWT)

    Returns:
        MigrationStatusResponse with orphaned data counts
    """
    status = get_migration_status()

    if status["has_orphaned_data"]:
        message = f"Found {status['total_orphaned_rows']} orphaned rows that can be migrated to your account."
    else:
        message = "No orphaned data found. Your account is ready to use."

    return MigrationStatusResponse(
        has_orphaned_data=status["has_orphaned_data"],
        total_orphaned_rows=status["total_orphaned_rows"],
        tables=status["tables"],
        message=message,
    )


@router.post("/trigger", response_model=MigrationTriggerResponse)
async def trigger_migration_endpoint(current_user: CurrentUser):
    """
    Trigger first-user data migration.

    Assigns all orphaned data (user_id IS NULL) to the current authenticated user.
    This should only be called once, after the first user registers.

    The migration is idempotent - running it multiple times is safe but will
    only affect rows that still have NULL user_id.

    Args:
        current_user: Authenticated user (from JWT)

    Returns:
        MigrationTriggerResponse with migration results
    """
    # Check if there's anything to migrate
    if not check_has_orphaned_data():
        return MigrationTriggerResponse(
            success=True,
            tables_migrated=0,
            rows_migrated=0,
            errors=[],
            message="No orphaned data to migrate. Migration skipped.",
        )

    # Perform the migration
    result = migrate_existing_data_to_user(current_user.id)

    if result.success:
        message = f"Successfully migrated {result.rows_migrated} rows across {result.tables_migrated} tables to your account."
    else:
        message = f"Migration completed with errors. Migrated {result.rows_migrated} rows, {len(result.errors)} errors occurred."

    return MigrationTriggerResponse(
        success=result.success,
        tables_migrated=result.tables_migrated,
        rows_migrated=result.rows_migrated,
        errors=result.errors,
        message=message,
    )
