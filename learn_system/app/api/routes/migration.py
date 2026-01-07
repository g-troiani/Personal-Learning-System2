"""Migration endpoints for first user data migration."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List, Union

from ..auth import CurrentUser
from ...auth.first_user_migration import (
    check_has_orphaned_data,
    migrate_existing_data_to_user,
    get_migration_status,
    MigrationResult,
)


router = APIRouter()


@router.get("/practice-items-count")
async def get_practice_items_for_source(source_id: str, current_user: CurrentUser):
    """
    Get practice items count for a source using service role (bypasses RLS).
    This is a workaround for the RLS policy issue on practice_items table.
    """
    from ...database.connection import get_client
    client = get_client()  # Service role - bypasses RLS

    # Get KCs for this source that belong to the user
    kcs_result = client.table('knowledge_components').select('id').eq('source_id', source_id).eq('user_id', current_user.id).execute()
    kc_ids = [kc['id'] for kc in (kcs_result.data or [])]

    if not kc_ids:
        return {"source_id": source_id, "item_count": 0, "kc_count": 0}

    # Count practice items for these KCs (KC ownership already verified user access)
    items_result = client.table('practice_items').select('id', count='exact').in_('kc_id', kc_ids).execute()
    item_count = items_result.count or 0

    return {
        "source_id": source_id,
        "item_count": item_count,
        "kc_count": len(kc_ids)
    }


@router.get("/all-practice-items")
async def get_all_practice_items_for_user(current_user: CurrentUser):
    """
    Get all practice item IDs and KC IDs for the current user using service role.
    This is a workaround for the RLS policy issue on practice_items table.
    """
    from ...database.connection import get_client
    client = get_client()  # Service role - bypasses RLS

    # First get all KC IDs that belong to the user
    kcs_result = client.table('knowledge_components').select('id').eq('user_id', current_user.id).execute()
    kc_ids = [kc['id'] for kc in (kcs_result.data or [])]

    if not kc_ids:
        return {"items": [], "count": 0}

    # Get all practice items for user's KCs (KC ownership already verified user access)
    items_result = client.table('practice_items').select('id, kc_id').in_('kc_id', kc_ids).execute()

    return {
        "items": items_result.data or [],
        "count": len(items_result.data or [])
    }


@router.get("/study-items")
async def get_study_items(current_user: CurrentUser, source_id: Optional[str] = None, limit: int = 20):
    """
    Get practice items for study session using service role (bypasses RLS).
    Returns full practice item data with KC info.
    """
    from ...database.connection import get_client
    client = get_client()  # Service role - bypasses RLS

    # First get KCs (optionally filtered by source)
    kcs_query = client.table('knowledge_components').select('id, name, knowledge_type, source_id').eq('user_id', current_user.id)
    if source_id:
        kcs_query = kcs_query.eq('source_id', source_id)
    kcs_result = kcs_query.execute()
    kcs_data = kcs_result.data or []

    if not kcs_data:
        return {"items": [], "count": 0}

    kc_map = {kc['id']: kc for kc in kcs_data}
    kc_ids = list(kc_map.keys())

    # Get practice items for these KCs (KC ownership already verified user access)
    items_result = client.table('practice_items').select('*').in_('kc_id', kc_ids).limit(limit).execute()
    items_data = items_result.data or []

    # Attach KC info to each item
    for item in items_data:
        item['knowledge_components'] = kc_map.get(item['kc_id'])

    return {
        "items": items_data,
        "count": len(items_data)
    }


class CreateSessionRequest(BaseModel):
    """Request for creating a study session."""
    session_type: str = "mixed"
    source_id: Optional[str] = None


class CreateSessionResponse(BaseModel):
    """Response for session creation."""
    id: str
    session_type: str
    started_at: str


@router.post("/create-session", response_model=CreateSessionResponse)
async def create_study_session(request: CreateSessionRequest, current_user: CurrentUser):
    """
    Create a study session using service role (bypasses RLS).
    This is a workaround for the RLS policy issue on sessions table.
    """
    from ...database.connection import get_client
    from datetime import datetime
    import time

    client = get_client()  # Service role - bypasses RLS

    session_id = f"sess_{hex(int(time.time() * 1000))[2:]}"
    started_at = datetime.utcnow().isoformat() + "Z"

    session_data = {
        "id": session_id,
        "user_id": current_user.id,
        "session_type": request.session_type,
        "started_at": started_at,
    }

    result = client.table('sessions').insert(session_data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create session")

    return CreateSessionResponse(
        id=session_id,
        session_type=request.session_type,
        started_at=started_at
    )


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


@router.get("/debug-items")
async def debug_practice_items(current_user: CurrentUser):
    """Debug endpoint to check practice_items data (uses service role, bypasses RLS)."""
    from ...database.connection import get_client
    client = get_client()  # Service role - bypasses RLS

    # Count all practice items
    total_result = client.table('practice_items').select('id', count='exact').execute()
    total_count = total_result.count or 0

    # Count by user_id
    user_items = client.table('practice_items').select('id', count='exact').eq('user_id', current_user.id).execute()
    user_count = user_items.count or 0

    # Count orphaned (NULL user_id)
    orphaned = client.table('practice_items').select('id', count='exact').is_('user_id', 'null').execute()
    orphaned_count = orphaned.count or 0

    # Get sample of user_ids with more details
    sample = client.table('practice_items').select('id, user_id, kc_id').limit(3).execute()
    sample_data = sample.data or []

    # Also check kc_state for comparison
    kc_state_sample = client.table('kc_state').select('kc_id, user_id').limit(3).execute()
    kc_state_data = kc_state_sample.data or []

    # Check KC sample
    kc_sample = client.table('knowledge_components').select('id, user_id').limit(3).execute()
    kc_data = kc_sample.data or []

    # Check RLS policies on practice_items
    try:
        policies_result = client.rpc('get_policies_for_table', {'table_name': 'practice_items'}).execute()
        policies = policies_result.data
    except Exception as e:
        policies = f"Error: {e}"

    # Check if RLS is enabled
    try:
        rls_result = client.rpc('check_rls_enabled', {'table_name': 'practice_items'}).execute()
        rls_enabled = rls_result.data
    except Exception as e:
        rls_enabled = f"Error: {e}"

    return {
        "total_practice_items": total_count,
        "items_for_current_user": user_count,
        "orphaned_items": orphaned_count,
        "current_user_id": current_user.id,
        "practice_items_sample": sample_data,
        "kc_state_sample": kc_state_data,
        "knowledge_components_sample": kc_data,
        "policies": policies,
        "rls_enabled": rls_enabled
    }


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
