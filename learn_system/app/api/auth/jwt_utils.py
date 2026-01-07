"""JWT validation utilities for Supabase Auth tokens."""

import os
import time
from typing import Optional, Tuple

import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError

from .schemas import TokenPayload
from .exceptions import AuthenticationError


# JWT secret from environment
def get_jwt_secret() -> str:
    """Get JWT secret from environment."""
    secret = os.getenv("SUPABASE_JWT_SECRET")
    if not secret:
        raise AuthenticationError("JWT secret not configured")
    return secret


def decode_token(token: str) -> TokenPayload:
    """
    Decode and validate a Supabase JWT token.

    Args:
        token: The JWT token string (without 'Bearer ' prefix)

    Returns:
        TokenPayload with decoded claims

    Raises:
        AuthenticationError: If token is invalid or expired
    """
    try:
        secret = get_jwt_secret()

        # Decode with verification
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["sub", "exp", "iat"]}
        )

        return TokenPayload(
            sub=payload["sub"],
            email=payload.get("email"),
            exp=payload["exp"],
            iat=payload["iat"],
            aud=payload.get("aud"),
            role=payload.get("role"),
        )

    except ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except InvalidTokenError as e:
        raise AuthenticationError(f"Invalid token: {str(e)}")


def check_token_expiring_soon(payload: TokenPayload, threshold_seconds: int = 300) -> bool:
    """
    Check if token will expire within threshold.

    Args:
        payload: Decoded token payload
        threshold_seconds: Seconds before expiration to warn (default: 5 minutes)

    Returns:
        True if token expires within threshold
    """
    time_remaining = payload.exp - int(time.time())
    return time_remaining <= threshold_seconds


def extract_bearer_token(authorization: Optional[str]) -> str:
    """
    Extract token from Authorization header.

    Args:
        authorization: The Authorization header value

    Returns:
        The token string

    Raises:
        AuthenticationError: If header is missing or malformed
    """
    if not authorization:
        raise AuthenticationError("Authorization header missing")

    parts = authorization.split()

    if len(parts) != 2:
        raise AuthenticationError("Invalid authorization header format")

    scheme, token = parts

    if scheme.lower() != "bearer":
        raise AuthenticationError("Invalid authentication scheme. Use Bearer")

    return token
