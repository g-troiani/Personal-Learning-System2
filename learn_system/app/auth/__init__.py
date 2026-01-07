"""Auth utilities for the Personal Learning System."""

from .first_user_migration import (
    check_is_first_user,
    check_has_orphaned_data,
    migrate_existing_data_to_user,
    MigrationResult,
)

__all__ = [
    "check_is_first_user",
    "check_has_orphaned_data",
    "migrate_existing_data_to_user",
    "MigrationResult",
]
