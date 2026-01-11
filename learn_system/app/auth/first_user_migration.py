"""
First user data migration for the Personal Learning System.

This module handles migrating existing orphaned data (created before authentication
was implemented) to the first registered user. This is a one-time migration that
runs when the first user signs up.

IMPORTANT: This migration uses the service role key which bypasses RLS.
Only run this server-side, never expose to frontend.
"""

from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from datetime import datetime

from ..database.connection import get_client


@dataclass
class MigrationResult:
    """Result of a data migration operation."""
    success: bool
    tables_migrated: int
    rows_migrated: int
    errors: List[str]
    started_at: datetime
    completed_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "success": self.success,
            "tables_migrated": self.tables_migrated,
            "rows_migrated": self.rows_migrated,
            "errors": self.errors,
            "started_at": self.started_at.isoformat(),
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


# Tables that need user_id assignment during migration
# Note: technique_bundles is EXCLUDED - system bundles (user_id IS NULL) should stay NULL
TABLES_TO_MIGRATE = [
    "content_sources",
    "knowledge_components",
    "kc_state",
    "kc_prerequisites",
    "kc_subskills",
    "practice_items",
    "sessions",
    "attempts",
    "kc_technique_history",
    "retention_tests",
    "learning_goals",
    "reading_progress",
    "annotations",
]


def check_is_first_user() -> bool:
    """
    Check if this is the first user registration.

    Returns True if no data has been assigned to any user yet (all user_id columns are NULL).
    This indicates the system was used before authentication and needs data migration.

    Returns:
        True if this appears to be the first user (orphaned data exists)
    """
    return check_has_orphaned_data()


def check_has_orphaned_data() -> bool:
    """
    Check if there is any orphaned data (user_id IS NULL) that needs migration.

    Checks ALL tables in TABLES_TO_MIGRATE, not just content_sources,
    since orphaned data could exist in child tables even if parent is migrated.

    Returns:
        True if orphaned data exists that needs migration
    """
    # Check each table for orphaned data
    for table_name in TABLES_TO_MIGRATE:
        count = get_orphaned_count(table_name)
        if count > 0:
            print(f"[Migration Check] Found {count} orphaned rows in {table_name}")
            return True

    return False


def get_orphaned_count(table_name: str) -> int:
    """
    Get count of orphaned rows in a table.

    Args:
        table_name: Name of the table to check

    Returns:
        Count of rows where user_id IS NULL
    """
    client = get_client()

    try:
        # Use user_id for count since all tables have it, not all have 'id'
        result = client.table(table_name).select(
            "user_id",
            count="exact"
        ).is_("user_id", "null").execute()

        return result.count or 0

    except Exception as e:
        print(f"Error counting orphaned rows in {table_name}: {e}")
        return 0


def migrate_existing_data_to_user(user_id: str) -> MigrationResult:
    """
    Assign all existing orphaned data to the specified user.

    This is called once after first user registration to migrate all
    data created before authentication was implemented.

    The migration:
    1. Updates all rows where user_id IS NULL
    2. Skips technique_bundles (system bundles stay NULL)
    3. Uses batch updates per table for performance
    4. Is idempotent (safe to run multiple times)

    Args:
        user_id: UUID of the user to assign data to

    Returns:
        MigrationResult with details of the operation
    """
    client = get_client()
    started_at = datetime.utcnow()
    errors: List[str] = []
    tables_migrated = 0
    total_rows_migrated = 0

    print(f"[Migration] Starting data migration to user {user_id}")

    for table_name in TABLES_TO_MIGRATE:
        try:
            # Count orphaned rows before update
            orphaned_count = get_orphaned_count(table_name)

            if orphaned_count == 0:
                print(f"[Migration] {table_name}: No orphaned rows to migrate")
                continue

            print(f"[Migration] {table_name}: Migrating {orphaned_count} orphaned rows")

            # Update all rows where user_id IS NULL
            result = client.table(table_name).update({
                "user_id": user_id
            }).is_("user_id", "null").execute()

            rows_updated = len(result.data) if result.data else 0
            total_rows_migrated += rows_updated
            tables_migrated += 1

            print(f"[Migration] {table_name}: Migrated {rows_updated} rows")

        except Exception as e:
            error_msg = f"Failed to migrate {table_name}: {str(e)}"
            print(f"[Migration] ERROR: {error_msg}")
            errors.append(error_msg)

    completed_at = datetime.utcnow()
    success = len(errors) == 0

    print(f"[Migration] Complete: {tables_migrated} tables, {total_rows_migrated} rows, {len(errors)} errors")

    return MigrationResult(
        success=success,
        tables_migrated=tables_migrated,
        rows_migrated=total_rows_migrated,
        errors=errors,
        started_at=started_at,
        completed_at=completed_at,
    )


def get_migration_status() -> Dict[str, Any]:
    """
    Get current migration status showing orphaned data counts.

    Returns:
        Dictionary with counts of orphaned rows per table
    """
    status = {
        "has_orphaned_data": False,
        "total_orphaned_rows": 0,
        "tables": {}
    }

    for table_name in TABLES_TO_MIGRATE:
        count = get_orphaned_count(table_name)
        status["tables"][table_name] = count
        status["total_orphaned_rows"] += count

    status["has_orphaned_data"] = status["total_orphaned_rows"] > 0

    return status
