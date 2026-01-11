"""FastAPI dependencies for authentication."""

from typing import Optional, Annotated

from fastapi import Depends, Header, Response

from .schemas import AuthenticatedUser
from .jwt_utils import extract_bearer_token, decode_token, check_token_expiring_soon
from .exceptions import AuthenticationError


async def get_current_user(
    response: Response,
    authorization: Annotated[Optional[str], Header()] = None,
) -> AuthenticatedUser:
    """
    FastAPI dependency to get the current authenticated user.

    Extracts and validates JWT from Authorization header.
    Sets X-Token-Expiring-Soon header if token expires within 5 minutes.

    Args:
        response: FastAPI response to add headers
        authorization: Authorization header value

    Returns:
        AuthenticatedUser with user info including access token

    Raises:
        AuthenticationError: If not authenticated
    """
    token = extract_bearer_token(authorization)
    payload = decode_token(token)

    # Warn if token expiring soon
    if check_token_expiring_soon(payload):
        response.headers["X-Token-Expiring-Soon"] = "true"

    return AuthenticatedUser(
        id=payload.sub,
        email=payload.email,
        access_token=token,  # Preserve token for RLS-authenticated DB operations
    )


async def get_optional_user(
    response: Response,
    authorization: Annotated[Optional[str], Header()] = None,
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency to get user if authenticated, None otherwise.

    Useful for endpoints that work both authenticated and unauthenticated.

    Args:
        response: FastAPI response to add headers
        authorization: Authorization header value

    Returns:
        AuthenticatedUser if authenticated, None otherwise
    """
    if not authorization:
        return None

    try:
        return await get_current_user(response, authorization)
    except AuthenticationError:
        return None


# Type aliases for cleaner route signatures
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
OptionalUser = Annotated[Optional[AuthenticatedUser], Depends(get_optional_user)]
