"""Source management endpoints - upload, status, retry, delete, file-url, sections."""

import os
import tempfile
import mimetypes
from typing import Optional, List

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel

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
from ..auth import CurrentUser
from ..auth.ownership import verify_source_ownership
from ...database.connection import get_client, get_user_client


# Response models for new endpoints
class FileUrlResponse(BaseModel):
    url: str
    expires_in: int = 3600  # 1 hour default


class DocumentSection(BaseModel):
    id: str
    title: str
    level: int
    page_number: Optional[int] = None
    scroll_position: Optional[float] = None


class SectionsResponse(BaseModel):
    sections: List[DocumentSection]


class ContentResponse(BaseModel):
    content: Optional[str] = None
    source_id: str


router = APIRouter()

# Supported file types
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt", ".pptx", ".ppt"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB


def validate_file(file: UploadFile) -> Optional[str]:
    """Validate uploaded file. Returns error message or None if valid."""
    # Check file extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        return f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"

    return None


def process_document_background(source_id: str, file_path: str, domain: str):
    """Background task to process the uploaded document.

    Note: This is a synchronous function (not async) so FastAPI runs it
    in a thread pool, which is appropriate for blocking I/O operations.
    """
    try:
        print(f"[Background] Starting processing for {source_id}")
        pipeline = ProcessingPipeline(source_id)
        result = pipeline.process_file(file_path, domain)
        print(f"[Background] Completed processing for {source_id}: {result}")
    except Exception as e:
        print(f"[Background] ERROR processing {source_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temp file
        try:
            os.remove(file_path)
        except Exception:
            pass


def upload_to_storage(source_id: str, content: bytes, filename: str) -> str:
    """
    Upload file to Supabase Storage.

    Args:
        source_id: The source ID (used in storage path)
        content: File content bytes
        filename: Original filename

    Returns:
        storage_path: Path in storage bucket
    """
    client = get_client()
    ext = os.path.splitext(filename)[1].lower()
    storage_path = f"{source_id}{ext}"

    # Upload to 'documents' bucket
    client.storage.from_("documents").upload(
        path=storage_path,
        file=content,
        file_options={"content-type": mimetypes.guess_type(filename)[0] or "application/octet-stream"}
    )

    return storage_path


@router.post("/upload", response_model=UploadResponse)
async def upload_source(
    current_user: CurrentUser,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    domain: str = Form(default="general")
):
    """
    Upload a document for processing.

    The document will be processed in the background. Use the status endpoint
    to check processing progress. File is stored in Supabase Storage for later viewing.

    Args:
        current_user: Authenticated user (from JWT)
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
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    if file_size == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    original_filename = file.filename or "untitled"
    mime_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"

    # Create pending source entry with user_id and access token for RLS
    source_id = create_pending_source(
        original_filename,
        domain,
        user_id=current_user.id,
        access_token=current_user.access_token
    )

    # Upload to Supabase Storage
    try:
        storage_path = upload_to_storage(source_id, content, original_filename)

        # Update source with storage metadata (use user client for RLS)
        db_client = get_user_client(current_user.access_token)
        db_client.table("content_sources").update({
            "storage_path": storage_path,
            "original_filename": original_filename,
            "file_size_bytes": file_size,
            "mime_type": mime_type
        }).eq("id", source_id).execute()

    except Exception as e:
        # If storage upload fails, still proceed with processing
        print(f"Warning: Failed to upload to storage: {e}")
        storage_path = None

    # Save file to temp location for processing
    ext = os.path.splitext(original_filename)[1].lower()
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
async def get_status(source_id: str, current_user: CurrentUser):
    """
    Get the processing status of a source.

    Args:
        source_id: The source ID to check
        current_user: Authenticated user (from JWT)

    Returns:
        ProcessingStatusResponse with current status and progress
    """
    verify_source_ownership(source_id, current_user)
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
        completed_at=status.get("processing_completed_at"),
        # Additional fields for document reader
        title=status.get("title"),
        domain=status.get("domain"),
        word_count=status.get("word_count"),
        mime_type=status.get("mime_type")
    )


async def reprocess_from_storage(source_id: str, storage_path: str, domain: str):
    """Background task to download file from storage and reprocess."""
    client = get_client()

    try:
        # Download file from Supabase Storage
        file_bytes = client.storage.from_("documents").download(storage_path)

        # Get file extension from storage path
        ext = os.path.splitext(storage_path)[1].lower()

        # Save to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(file_bytes)
            temp_path = tmp.name

        # Process the file
        pipeline = ProcessingPipeline(source_id)
        pipeline.process_file(temp_path, domain)

        # Clean up temp file
        try:
            os.remove(temp_path)
        except Exception:
            pass

    except Exception as e:
        # Update status to error if download/reprocess fails
        client.table("content_sources").update({
            "processing_status": "error",
            "error_message": f"Retry failed: {str(e)}"
        }).eq("id", source_id).execute()


@router.post("/{source_id}/retry", response_model=RetryResponse)
async def retry_source(source_id: str, current_user: CurrentUser, background_tasks: BackgroundTasks):
    """
    Retry processing for a failed source.

    Only sources in error state can be retried.

    Args:
        source_id: The source ID to retry
        current_user: Authenticated user (from JWT)

    Returns:
        RetryResponse with new status
    """
    verify_source_ownership(source_id, current_user)
    client = get_client()

    # Get source info including storage path
    result = client.table("content_sources").select(
        "id, processing_status, storage_path, domain"
    ).eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    source = result.data[0]

    if source.get("processing_status") != "error":
        raise HTTPException(
            status_code=400,
            detail="Only sources in error state can be retried"
        )

    storage_path = source.get("storage_path")
    if not storage_path:
        raise HTTPException(
            status_code=400,
            detail="No stored file available for retry. Please re-upload the document."
        )

    success = retry_processing(source_id)

    if not success:
        raise HTTPException(status_code=500, detail="Failed to initiate retry")

    # Trigger background reprocessing using stored file
    domain = source.get("domain", "general")
    background_tasks.add_task(reprocess_from_storage, source_id, storage_path, domain)

    return RetryResponse(
        source_id=source_id,
        status=ProcessingStatus.PENDING,
        message="Retry initiated. Processing started."
    )


@router.delete("/{source_id}", response_model=DeleteResponse)
async def delete_source_endpoint(source_id: str, current_user: CurrentUser):
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
        current_user: Authenticated user (from JWT)

    Returns:
        DeleteResponse with success status
    """
    verify_source_ownership(source_id, current_user)
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


@router.get("/{source_id}/file-url", response_model=FileUrlResponse)
async def get_file_url(source_id: str, current_user: CurrentUser, expires_in: int = 3600):
    """
    Get a signed URL for accessing the source document.

    Args:
        source_id: The source ID
        current_user: Authenticated user (from JWT)
        expires_in: URL expiry time in seconds (default: 3600 = 1 hour)

    Returns:
        FileUrlResponse with signed URL
    """
    verify_source_ownership(source_id, current_user)
    client = get_client()

    # Get storage path from source
    result = client.table("content_sources").select(
        "storage_path"
    ).eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    storage_path = result.data[0].get("storage_path")

    if not storage_path:
        raise HTTPException(
            status_code=404,
            detail="No file stored for this source. It may have been uploaded before file storage was enabled."
        )

    # Generate signed URL
    try:
        signed_url = client.storage.from_("documents").create_signed_url(
            path=storage_path,
            expires_in=expires_in
        )
        return FileUrlResponse(url=signed_url["signedURL"], expires_in=expires_in)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")


class ConvertedPdfUrlResponse(BaseModel):
    url: str
    expires_in: int = 3600


@router.get("/{source_id}/pdf-url", response_model=ConvertedPdfUrlResponse)
async def get_converted_pdf_url(source_id: str, current_user: CurrentUser, expires_in: int = 3600):
    """
    Get a signed URL for the converted PDF (for PPTX sources).

    Args:
        source_id: The source ID
        current_user: Authenticated user (from JWT)
        expires_in: URL expiry time in seconds (default: 3600)

    Returns:
        ConvertedPdfUrlResponse with signed URL
    """
    verify_source_ownership(source_id, current_user)
    client = get_client()

    result = client.table("content_sources").select(
        "converted_pdf_path, content_type"
    ).eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    source = result.data[0]
    converted_pdf_path = source.get("converted_pdf_path")

    if not converted_pdf_path:
        raise HTTPException(
            status_code=404,
            detail="No converted PDF available. The presentation may not have been converted yet."
        )

    try:
        signed_url = client.storage.from_("documents").create_signed_url(
            path=converted_pdf_path,
            expires_in=expires_in
        )
        return ConvertedPdfUrlResponse(url=signed_url["signedURL"], expires_in=expires_in)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate signed URL: {str(e)}")


@router.get("/{source_id}/sections", response_model=SectionsResponse)
async def get_sections(source_id: str, current_user: CurrentUser):
    """
    Get the table of contents (document sections) for a source.

    Args:
        source_id: The source ID
        current_user: Authenticated user (from JWT)

    Returns:
        SectionsResponse with list of sections
    """
    verify_source_ownership(source_id, current_user)
    client = get_client()

    # Verify source exists
    source_result = client.table("content_sources").select("id").eq("id", source_id).execute()

    if not source_result.data or len(source_result.data) == 0:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    # Get sections ordered by section_order
    result = client.table("document_sections").select(
        "id, title, level, page_number, scroll_position"
    ).eq("source_id", source_id).order("section_order").execute()

    sections = [
        DocumentSection(
            id=s["id"],
            title=s["title"],
            level=s["level"],
            page_number=s.get("page_number"),
            scroll_position=s.get("scroll_position")
        )
        for s in (result.data or [])
    ]

    return SectionsResponse(sections=sections)


@router.get("/{source_id}/content", response_model=ContentResponse)
async def get_content(source_id: str, current_user: CurrentUser):
    """
    Get the extracted text content for a source.

    This is useful for rendering Markdown or text files that need the
    actual text content rather than just a file URL.

    Args:
        source_id: The source ID
        current_user: Authenticated user (from JWT)

    Returns:
        ContentResponse with the extracted text content
    """
    verify_source_ownership(source_id, current_user)
    client = get_client()

    # Get content from source
    result = client.table("content_sources").select(
        "id, content"
    ).eq("id", source_id).execute()

    if not result.data or len(result.data) == 0:
        raise HTTPException(status_code=404, detail=f"Source not found: {source_id}")

    return ContentResponse(
        source_id=source_id,
        content=result.data[0].get("content")
    )
