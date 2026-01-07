"""Authentication package for JWT validation and user management."""

from .dependencies import get_current_user, get_optional_user, CurrentUser, OptionalUser
from .schemas import TokenPayload, AuthenticatedUser
from .exceptions import AuthenticationError, AuthorizationError

__all__ = [
    "get_current_user",
    "get_optional_user",
    "CurrentUser",
    "OptionalUser",
    "TokenPayload",
    "AuthenticatedUser",
    "AuthenticationError",
    "AuthorizationError",
]
