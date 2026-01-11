"""Resource ownership validation utilities."""

from typing import Optional

from ...database.connection import get_client
from .schemas import AuthenticatedUser
from .exceptions import AuthorizationError


def verify_source_ownership(source_id: str, user: AuthenticatedUser) -> bool:
    """
    Verify that a source belongs to the current user.

    Args:
        source_id: The source ID to check
        user: The authenticated user

    Returns:
        True if user owns the source

    Raises:
        AuthorizationError: If user doesn't own the source
    """
    client = get_client()

    result = client.table("content_sources").select(
        "id, user_id"
    ).eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        # Source not found - let the calling code handle 404
        return True

    source = result.data[0]
    source_user_id = source.get("user_id")

    # If source has no user_id (legacy data), allow access during migration
    if source_user_id is None:
        return True

    if source_user_id != user.id:
        raise AuthorizationError("You don't have access to this resource")

    return True


def get_user_id_filter(user: Optional[AuthenticatedUser]) -> Optional[str]:
    """
    Get user_id for database filtering.

    Args:
        user: The authenticated user (or None)

    Returns:
        user.id if authenticated, None otherwise
    """
    if user is None:
        return None
    return user.id
