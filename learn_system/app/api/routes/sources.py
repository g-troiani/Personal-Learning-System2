"""Source management endpoints - upload, status, retry, delete."""

import os
import tempfile
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse

from ..models.schemas import (
    UploadResponse,
    ProcessingStatusResponse,
    ProcessingStatus,
    DeleteResponse,
    RetryResponse,
    ErrorResponse
)
from ..services.processing import (
    ProcessingPipeline,
    create_pending_source,
    get_source_status,
    retry_processing,
    delete_source
)


router = APIRouter()

# Supported file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file. Returns error message or None if valid."""
    # Check file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    return None


async def process_document_background(source_id: str, file_path: str, domain: str):
    """Background task to process the uploaded document."""
    pipeline = ProcessingPipeline(source_id)
    pipeline.process_file(file_path, domain)

    # Clean up temp file
    try:
        os.remove(file_path)
    except Exception:
        pass


@router.post("/upload", response_model=UploadResponse)
async def upload_source(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    domain: str = Form(default="general")
):
    """
    Upload a document for processing.

    The document will be processed in the background. Use the status endpoint
    to check processing progress.

    Args:
        file: The document file to upload
        domain: Knowledge domain for categorization (default: general)

    Returns:
        UploadResponse with source_id and initial status
    """
    # Validate file
    error = validate_file(file)
    if error:
        raise HTTPException(status_code=400, detail=error)

    # Read file content to check size
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Create pending source entry
    source_id = create_pending_source(file.filename or "untitled", domain)

    # Save file to temp location
    ext = os.path.splitext(file.filename or "")[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        temp_path = tmp.name

    # Start background processing
    background_tasks.add_task(process_document_background, source_id, temp_path, domain)

    return UploadResponse(
        source_id=source_id,
        status=ProcessingStatus.PENDING,
        message="Upload received. Processing started."
    )


@router.get("/{source_id}/status", response_model=ProcessingStatusResponse)
async def get_status(source_id: str):
    """
    Get the processing status of a source.

    Args:
        source_id: The source ID to check

    Returns:
        ProcessingStatusResponse with current status and progress
    """
    status = get_source_status(source_id)

    if not status:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    return ProcessingStatusResponse(
        source_id=source_id,
        status=ProcessingStatus(status.get("processing_status", "pending")),
        progress=status.get("processing_progress", 0),
        step=status.get("processing_step"),
        error_message=status.get("error_message"),
        kc_count=status.get("kc_count"),
        item_count=status.get("item_count"),
        started_at=status.get("processing_started_at"),
        completed_at=status.get("processing_completed_at")
    )


@router.post("/{source_id}/retry", response_model=RetryResponse)
async def retry_source(source_id: str, background_tasks: BackgroundTasks):
    """
    Retry processing for a failed source.

    Only sources in error state can be retried.

    Args:
        source_id: The source ID to retry

    Returns:
        RetryResponse with new status
    """
    status = get_source_status(source_id)

    if not status:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    if status.get("processing_status") != "error":
        raise HTTPException(
            status_code=400,
            detail="Only sources in error state can be retried"
        )

    success = retry_processing(source_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to initiate retry")

    # Note: In a full implementation, we would need to re-process the file
    # For now, retry just resets the status. The file would need to be re-uploaded
    # or we'd need to store the file path for retry.

    return RetryResponse(
        source_id=source_id,
        status=ProcessingStatus.PENDING,
        message="Retry initiated. Please re-upload the file to complete processing."
    )


@router.delete("/{source_id}", response_model=DeleteResponse)
async def delete_source_endpoint(source_id: str):
    """
    Delete a source and all its associated data.

    This will delete:
    - The source record
    - All knowledge components
    - All practice items
    - All KC states
    - All technique history

    Args:
        source_id: The source ID to delete

    Returns:
        DeleteResponse with success status
    """
    status = get_source_status(source_id)

    if not status:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    success = delete_source(source_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete source")

    return DeleteResponse(
        success=True,
        message=f"Source {source_id} and all associated data deleted successfully"
    )
