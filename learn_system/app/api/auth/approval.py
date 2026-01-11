"""Approval logic for restricting expensive operations to approved users."""

from typing import Annotated, List

from fastapi import Depends, HTTPException, status

from .dependencies import get_current_user
from .schemas import AuthenticatedUser
from ...database.connection import get_client


# Hardcoded admin emails - these users can manage the approved users whitelist
ADMIN_EMAILS: List[str] = [
    "gianmariatroiani@gmail.com",
    "gtroiani@equilibriaconsulting.net",
]


def is_admin(email: str) -> bool:
    """Check if an email belongs to an admin user."""
    if not email:
        return False
    return email.lower() in [e.lower() for e in ADMIN_EMAILS]


def is_user_approved(email: str) -> bool:
    """
    Check if a user email is in the approved users whitelist.

    Uses service role client to bypass RLS.

    Args:
        email: User email to check

    Returns:
        True if user is approved, False otherwise
    """
    if not email:
        return False

    try:
        client = get_client()  # Uses service role key, bypasses RLS
        result = client.table("approved_users").select("email").eq("email", email.lower()).execute()
        return len(result.data) > 0
    except Exception:
        # If we can't check, deny access for safety
        return False


async def require_approved_user(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]
) -> AuthenticatedUser:
    """
    FastAPI dependency that ensures the current user is approved for uploads.

    Admins are always approved.

    Args:
        current_user: The authenticated user from JWT

    Returns:
        The authenticated user if approved

    Raises:
        HTTPException: 403 Forbidden if user is not approved
    """
    # Admins are always approved
    if is_admin(current_user.email):
        return current_user

    # Check approved_users table
    if not is_user_approved(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is not approved for document uploads. Please contact an administrator."
        )

    return current_user


async def require_admin(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)]
) -> AuthenticatedUser:
    """
    FastAPI dependency that ensures the current user is an admin.

    Args:
        current_user: The authenticated user from JWT

    Returns:
        The authenticated user if admin

    Raises:
        HTTPException: 403 Forbidden if user is not an admin
    """
    if not is_admin(current_user.email):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user


# Type aliases for cleaner route signatures
ApprovedUser = Annotated[AuthenticatedUser, Depends(require_approved_user)]
AdminUser = Annotated[AuthenticatedUser, Depends(require_admin)]
