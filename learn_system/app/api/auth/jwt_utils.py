"""JWT validation utilities for Supabase Auth tokens."""

import os
import time
from typing import Optional, Tuple

import jwt
from jwt.exceptions import InvalidTokenError, ExpiredSignatureError
import requests

from .schemas import TokenPayload
from .exceptions import AuthenticationError


# Cache for JWKS keys
_jwks_cache = None
_jwks_cache_time = 0
JWKS_CACHE_TTL = 3600  # 1 hour


def get_supabase_url() -> str:
    """Get Supabase URL from environment."""
    url = os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    if not url:
        raise AuthenticationError("Supabase URL not configured")
    return url


def get_jwks() -> dict:
    """
    Fetch JWKS (JSON Web Key Set) from Supabase.
    Results are cached for 1 hour.
    """
    global _jwks_cache, _jwks_cache_time

    current_time = time.time()
    if _jwks_cache and (current_time - _jwks_cache_time) < JWKS_CACHE_TTL:
        return _jwks_cache

    supabase_url = get_supabase_url()
    jwks_url = f"{supabase_url}/auth/v1/.well-known/jwks.json"

    try:
        response = requests.get(jwks_url, timeout=10)
        response.raise_for_status()
        _jwks_cache = response.json()
        _jwks_cache_time = current_time
        return _jwks_cache
    except Exception as e:
        raise AuthenticationError(f"Failed to fetch JWKS: {str(e)}")


def get_signing_key(token: str) -> jwt.PyJWK:
    """
    Get the signing key for the token from JWKS.
    """
    try:
        # Get the key ID from the token header
        unverified_header = jwt.get_unverified_header(token)
        kid = unverified_header.get("kid")

        if not kid:
            raise AuthenticationError("Token missing key ID (kid)")

        jwks = get_jwks()
        jwks_client = jwt.PyJWKClient.__new__(jwt.PyJWKClient)
        jwks_client.jwk_set_cache = None

        # Find the key with matching kid
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == kid:
                return jwt.PyJWK.from_dict(key_data)

        raise AuthenticationError(f"Key with kid '{kid}' not found in JWKS")
    except AuthenticationError:
        raise
    except Exception as e:
        raise AuthenticationError(f"Failed to get signing key: {str(e)}")


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
        # Get the signing key from JWKS
        signing_key = get_signing_key(token)

        # Decode with verification using the public key
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "RS256", "HS256"],
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
    except AuthenticationError:
        raise
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
