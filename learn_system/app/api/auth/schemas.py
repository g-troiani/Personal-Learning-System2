"""Authentication schemas and data models."""

from typing import Optional
from pydantic import BaseModel


class TokenPayload(BaseModel):
    """JWT token payload from Supabase Auth."""
    sub: str  # user UUID
    email: Optional[str] = None
    exp: int  # expiration timestamp
    iat: int  # issued at timestamp
    aud: Optional[str] = None
    role: Optional[str] = None


class AuthenticatedUser(BaseModel):
    """Authenticated user context passed to endpoints."""
    id: str  # user UUID
    email: Optional[str] = None

    @property
    def user_id(self) -> str:
        """Alias for id to match database column name."""
        return self.id
