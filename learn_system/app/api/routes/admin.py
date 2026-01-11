"""Admin endpoints for managing approved users whitelist."""

from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from ..auth import CurrentUser, AdminUser, is_admin
from ...database.connection import get_client


router = APIRouter()


# ============================================================================
# Response Models
# ============================================================================

class AdminCheckResponse(BaseModel):
    """Response for admin status check."""
    is_admin: bool


class ApprovedUserResponse(BaseModel):
    """Approved user details."""
    email: str
    user_id: Optional[str] = None
    approved_by: str
    approved_at: datetime
    notes: Optional[str] = None


class ApprovedUsersListResponse(BaseModel):
    """List of all approved users."""
    users: List[ApprovedUserResponse]
    count: int


class AddApprovedUserRequest(BaseModel):
    """Request to add a new approved user."""
    email: EmailStr
    notes: Optional[str] = None


class AddApprovedUserResponse(BaseModel):
    """Response after adding an approved user."""
    success: bool
    email: str
    message: str


class RemoveApprovedUserResponse(BaseModel):
    """Response after removing an approved user."""
    success: bool
    email: str
    message: str


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/check-admin", response_model=AdminCheckResponse)
async def check_admin_status(current_user: CurrentUser):
    """
    Check if the current user is an admin.

    This endpoint is useful for the frontend to determine
    whether to show admin-only UI elements.

    Args:
        current_user: Authenticated user (from JWT)

    Returns:
        AdminCheckResponse with is_admin boolean
    """
    return AdminCheckResponse(is_admin=is_admin(current_user.email))


@router.get("/approved-users", response_model=ApprovedUsersListResponse)
async def list_approved_users(admin_user: AdminUser):
    """
    List all approved users.

    Admin access required.

    Args:
        admin_user: Authenticated admin user

    Returns:
        ApprovedUsersListResponse with list of approved users
    """
    client = get_client()  # Service role key bypasses RLS

    result = client.table("approved_users").select("*").order("approved_at", desc=True).execute()

    users = [
        ApprovedUserResponse(
            email=u["email"],
            user_id=u.get("user_id"),
            approved_by=u["approved_by"],
            approved_at=u["approved_at"],
            notes=u.get("notes")
        )
        for u in (result.data or [])
    ]

    return ApprovedUsersListResponse(users=users, count=len(users))


@router.post("/approved-users", response_model=AddApprovedUserResponse)
async def add_approved_user(request: AddApprovedUserRequest, admin_user: AdminUser):
    """
    Add a user to the approved users whitelist.

    Admin access required.

    Args:
        request: AddApprovedUserRequest with email and optional notes
        admin_user: Authenticated admin user

    Returns:
        AddApprovedUserResponse with success status
    """
    client = get_client()  # Service role key bypasses RLS
    email = request.email.lower()

    # Check if user already exists
    existing = client.table("approved_users").select("email").eq("email", email).execute()

    if existing.data and len(existing.data) > 0:
        raise HTTPException(
            status_code=400,
            detail=f"User {email} is already approved"
        )

    # Add to approved users
    client.table("approved_users").insert({
        "email": email,
        "approved_by": admin_user.email,
        "notes": request.notes
    }).execute()

    return AddApprovedUserResponse(
        success=True,
        email=email,
        message=f"User {email} has been approved for uploads"
    )


@router.delete("/approved-users/{email}", response_model=RemoveApprovedUserResponse)
async def remove_approved_user(email: str, admin_user: AdminUser):
    """
    Remove a user from the approved users whitelist.

    Admin access required. Cannot remove admin emails.

    Args:
        email: Email address to remove
        admin_user: Authenticated admin user

    Returns:
        RemoveApprovedUserResponse with success status
    """
    email = email.lower()

    # Prevent removing admin users
    if is_admin(email):
        raise HTTPException(
            status_code=400,
            detail="Cannot remove admin users from approved list"
        )

    client = get_client()  # Service role key bypasses RLS

    # Check if user exists
    existing = client.table("approved_users").select("email").eq("email", email).execute()

    if not existing.data or len(existing.data) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"User {email} is not in the approved list"
        )

    # Remove from approved users
    client.table("approved_users").delete().eq("email", email).execute()

    return RemoveApprovedUserResponse(
        success=True,
        email=email,
        message=f"User {email} has been removed from the approved list"
    )
