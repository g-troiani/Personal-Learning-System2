"""Pydantic models for API request/response schemas."""

from typing import Optional, List
from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    """Processing status values for document ingestion pipeline."""
    PENDING = "pending"
    EXTRACTING_TEXT = "extracting_text"
    EXTRACTING_KCS = "extracting_kcs"
    GENERATING_ITEMS = "generating_items"
    READY = "ready"
    ERROR = "error"


# Request Models

class UploadRequest(BaseModel):
    """Request model for file upload metadata."""
    domain: str = Field(default="general", description="Knowledge domain for categorization")


# Response Models

class HealthResponse(BaseModel):
    """Health check response."""
    status: str = Field(..., description="Server status")
    version: str = Field(..., description="API version")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class UploadResponse(BaseModel):
    """Response after initiating an upload."""
    source_id: str = Field(..., description="Unique identifier for the source")
    status: ProcessingStatus = Field(..., description="Current processing status")
    message: str = Field(..., description="Status message")


class ProcessingStatusResponse(BaseModel):
    """Response for processing status check."""
    source_id: str = Field(..., description="Source identifier")
    status: ProcessingStatus = Field(..., description="Current processing status")
    progress: int = Field(default=0, ge=0, le=100, description="Progress percentage (0-100)")
    step: Optional[str] = Field(default=None, description="Current processing step description")
    error_message: Optional[str] = Field(default=None, description="Error message if status is error")
    kc_count: Optional[int] = Field(default=None, description="Number of KCs extracted")
    item_count: Optional[int] = Field(default=None, description="Number of practice items generated")
    started_at: Optional[datetime] = Field(default=None, description="Processing start time")
    completed_at: Optional[datetime] = Field(default=None, description="Processing completion time")


class SourceResponse(BaseModel):
    """Response model for a source."""
    id: str
    title: str
    domain: str
    content_type: Optional[str] = None
    word_count: Optional[int] = None
    ingested_at: datetime
    status: str
    processing_status: Optional[ProcessingStatus] = None
    processing_progress: Optional[int] = None
    processing_step: Optional[str] = None
    error_message: Optional[str] = None
    kc_count: int = 0
    item_count: int = 0


class SourceListResponse(BaseModel):
    """Response model for list of sources."""
    sources: List[SourceResponse]
    total: int


class DeleteResponse(BaseModel):
    """Response for delete operation."""
    success: bool
    message: str


class RetryResponse(BaseModel):
    """Response for retry operation."""
    source_id: str
    status: ProcessingStatus
    message: str


class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    detail: Optional[str] = None
