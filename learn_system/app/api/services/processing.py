"""Processing pipeline service for document ingestion with status updates."""

import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any

from ...database.connection import get_client
from ...database.queries import generate_id
from ...ingestion.extractors import extract_text, get_file_metadata
from ...ingestion.kc_extractor import extract_and_store_kcs
from ...practice.generator import generate_all_items


class ProcessingPipeline:
    """
    Wraps the ingestion pipeline with status updates to Supabase.

    Status progression: pending -> extracting_text -> extracting_kcs -> generating_items -> ready (or error)
    """

    def __init__(self, source_id: str):
        self.source_id = source_id
        self.client = get_client()

    def update_status(
        self,
        status: str,
        progress: int = 0,
        step: Optional[str] = None,
        error_message: Optional[str] = None,
        kc_count: Optional[int] = None,
        item_count: Optional[int] = None
    ):
        """Update processing status in database."""
        update_data = {
            "processing_status": status,
            "processing_progress": progress,
            "processing_step": step,
        }

        if error_message is not None:
            update_data["error_message"] = error_message

        if status == "extracting_text" and "processing_started_at" not in update_data:
            update_data["processing_started_at"] = datetime.utcnow().isoformat()

        if status in ("ready", "error"):
            update_data["processing_completed_at"] = datetime.utcnow().isoformat()

        try:
            self.client.table("content_sources").update(update_data).eq("id", self.source_id).execute()
        except Exception as e:
            print(f"Warning: Failed to update status for {self.source_id}: {e}")

    def process_file(self, file_path: str, domain: str = "general") -> Dict[str, Any]:
        """
        Process an uploaded file through the full ingestion pipeline.

        Args:
            file_path: Path to the uploaded file
            domain: Knowledge domain for categorization

        Returns:
            Dictionary with processing results
        """
        result = {
            "source_id": self.source_id,
            "success": False,
            "kc_count": 0,
            "item_count": 0,
            "error": None
        }

        try:
            # Step 1: Extract text
            self.update_status("extracting_text", 10, "Extracting text from document...")

            path = Path(file_path)
            if not path.exists():
                raise FileNotFoundError(f"File not found: {file_path}")

            content, content_type = extract_text(file_path)

            if not content or not content.strip():
                raise ValueError("No text content could be extracted from the document")

            self.update_status("extracting_text", 25, "Text extracted, preparing for analysis...")

            # Get file metadata
            metadata = get_file_metadata(file_path)
            metadata["content_type"] = content_type

            # Calculate statistics
            word_count = len(content.split())

            # Update source with extracted content
            self.client.table("content_sources").update({
                "content": content,
                "content_type": content_type,
                "word_count": word_count,
                "metadata": metadata
            }).eq("id", self.source_id).execute()

            # Step 2: Extract knowledge components
            self.update_status("extracting_kcs", 35, "Analyzing content for knowledge components...")

            kc_count = extract_and_store_kcs(self.source_id, content, domain)
            result["kc_count"] = kc_count

            self.update_status("extracting_kcs", 60, f"Extracted {kc_count} knowledge components")

            # Step 3: Generate practice items
            if kc_count > 0:
                self.update_status("generating_items", 65, "Generating practice items...")

                def progress_callback(msg):
                    # Parse progress from message like "Generating items for KC 5/10: ..."
                    import re
                    match = re.search(r'KC (\d+)/(\d+)', msg)
                    if match:
                        current_kc = int(match.group(1))
                        total_kcs = int(match.group(2))
                        # Progress goes from 65% to 98% during item generation
                        current_progress = 65 + int((current_kc / total_kcs) * 33)
                    else:
                        current_progress = 65
                    self.update_status("generating_items", current_progress, msg)

                item_count = generate_all_items(self.source_id, progress_callback)
                result["item_count"] = item_count

            # Complete!
            self.update_status(
                "ready",
                100,
                "Processing complete!",
                kc_count=kc_count,
                item_count=result["item_count"]
            )

            result["success"] = True

        except Exception as e:
            error_msg = str(e)
            self.update_status("error", 0, "Processing failed", error_message=error_msg)
            result["error"] = error_msg

        return result


def create_pending_source(filename: str, domain: str = "general") -> str:
    """
    Create a pending source entry in the database.

    Args:
        filename: Original filename
        domain: Knowledge domain

    Returns:
        source_id: The created source ID
    """
    source_id = generate_id("src")
    client = get_client()

    client.table("content_sources").insert({
        "id": source_id,
        "title": filename,
        "content": "",  # Will be filled during processing
        "domain": domain,
        "status": "active",
        "processing_status": "pending",
        "processing_progress": 0,
        "processing_step": "Waiting to process...",
        "ingested_at": datetime.utcnow().isoformat()
    }).execute()

    return source_id


def get_source_status(source_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the current processing status of a source.

    Args:
        source_id: The source ID to check

    Returns:
        Dictionary with status info or None if not found
    """
    client = get_client()

    try:
        result = client.table("content_sources").select(
            "id, title, domain, content_type, word_count, ingested_at, status, "
            "processing_status, processing_progress, processing_step, error_message, "
            "processing_started_at, processing_completed_at"
        ).eq("id", source_id).execute()

        if result.data and len(result.data) > 0:
            source = result.data[0]

            # Get KC and item counts
            kc_result = client.table("knowledge_components").select("id", count="exact").eq("source_id", source_id).execute()
            item_result = client.table("practice_items").select(
                "id", count="exact"
            ).in_(
                "kc_id",
                client.table("knowledge_components").select("id").eq("source_id", source_id)
            ).execute() if kc_result.count > 0 else type('obj', (object,), {'count': 0})()

            source["kc_count"] = kc_result.count or 0
            source["item_count"] = getattr(item_result, 'count', 0) or 0

            return source

        return None

    except Exception as e:
        print(f"Error getting source status: {e}")
        return None


def retry_processing(source_id: str) -> bool:
    """
    Retry processing for a failed source.

    Args:
        source_id: The source ID to retry

    Returns:
        True if retry was initiated, False otherwise
    """
    client = get_client()

    try:
        # Check if source exists and is in error state
        result = client.table("content_sources").select(
            "id, processing_status, file_path, domain"
        ).eq("id", source_id).execute()

        if not result.data or len(result.data) == 0:
            return False

        source = result.data[0]

        if source.get("processing_status") != "error":
            return False

        # Reset status to pending
        client.table("content_sources").update({
            "processing_status": "pending",
            "processing_progress": 0,
            "processing_step": "Retry scheduled...",
            "error_message": None
        }).eq("id", source_id).execute()

        return True

    except Exception as e:
        print(f"Error initiating retry: {e}")
        return False


def delete_source(source_id: str) -> bool:
    """
    Delete a source and all its associated data.

    Args:
        source_id: The source ID to delete

    Returns:
        True if deleted successfully, False otherwise
    """
    client = get_client()

    try:
        # Delete in order: attempts -> practice_items -> kc_state -> kc_technique_history -> knowledge_components -> source
        # First get KC IDs
        kc_result = client.table("knowledge_components").select("id").eq("source_id", source_id).execute()
        kc_ids = [kc["id"] for kc in kc_result.data] if kc_result.data else []

        if kc_ids:
            # Delete practice items
            client.table("practice_items").delete().in_("kc_id", kc_ids).execute()

            # Delete KC states
            client.table("kc_state").delete().in_("kc_id", kc_ids).execute()

            # Delete KC technique history
            client.table("kc_technique_history").delete().in_("kc_id", kc_ids).execute()

            # Delete knowledge components
            client.table("knowledge_components").delete().eq("source_id", source_id).execute()

        # Delete source
        client.table("content_sources").delete().eq("id", source_id).execute()

        return True

    except Exception as e:
        print(f"Error deleting source: {e}")
        return False
