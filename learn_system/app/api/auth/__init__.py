"""Authentication package for JWT validation and user management."""

from .dependencies import get_current_user, get_optional_user, CurrentUser, OptionalUser
from .schemas import TokenPayload, AuthenticatedUser
from .exceptions import AuthenticationError, AuthorizationError
from .approval import (
    is_admin,
    is_user_approved,
    require_approved_user,
    require_admin,
    ApprovedUser,
    AdminUser,
    ADMIN_EMAILS,
)

__all__ = [
    # Authentication dependencies
    "get_current_user",
    "get_optional_user",
    "CurrentUser",
    "OptionalUser",
    # Schemas
    "TokenPayload",
    "AuthenticatedUser",
    # Exceptions
    "AuthenticationError",
    "AuthorizationError",
    # Approval/Admin (M47)
    "is_admin",
    "is_user_approved",
    "require_approved_user",
    "require_admin",
    "ApprovedUser",
    "AdminUser",
    "ADMIN_EMAILS",
]
