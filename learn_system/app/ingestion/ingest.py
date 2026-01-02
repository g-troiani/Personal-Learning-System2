"""Document ingestion orchestration."""

from pathlib import Path
from typing import Dict, Any, Optional

from .extractors import extract_text, get_file_metadata
from .kc_extractor import extract_and_store_kcs
from ..database.queries import insert_source, get_source
from ..practice.generator import generate_all_items


def ingest_document(file_path: str, domain: str = 'general',
                   extract_kcs: bool = True,
                   generate_items: bool = True,
                   progress_callback: Optional[callable] = None) -> Dict[str, Any]:
    """
    Ingests a document: extracts text, stores in database, extracts KCs, generates items.

    Args:
        file_path: Path to the document file
        domain: Knowledge domain for categorization (default: 'general')
        extract_kcs: Whether to extract knowledge components (default: True)
        generate_items: Whether to generate practice items (default: True)
        progress_callback: Optional callback function for progress updates

    Returns:
        Dictionary with ingestion results including source_id, title,
        word_count, character_count, kc_count, and item_count
    """
    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    # Extract text content
    content, content_type = extract_text(file_path)

    if not content or not content.strip():
        raise ValueError(f"No text content extracted from: {file_path}")

    # Get file metadata
    metadata = get_file_metadata(file_path)
    metadata['content_type'] = content_type

    # Calculate statistics
    word_count = len(content.split())
    char_count = len(content)

    # Store in database
    source_id = insert_source(
        title=path.name,
        content=content,
        domain=domain,
        metadata=metadata,
        file_path=str(path.absolute())
    )

    result = {
        'source_id': source_id,
        'title': path.name,
        'domain': domain,
        'word_count': word_count,
        'char_count': char_count,
        'content_type': content_type,
        'kc_count': 0,
        'item_count': 0,
    }

    # Extract knowledge components if requested
    if extract_kcs:
        if progress_callback:
            progress_callback("Extracting knowledge components...")
        kc_count = extract_and_store_kcs(source_id, content, domain)
        result['kc_count'] = kc_count

        # Generate practice items if requested and KCs were extracted
        if generate_items and kc_count > 0:
            if progress_callback:
                progress_callback("Generating practice items...")
            item_count = generate_all_items(source_id, progress_callback)
            result['item_count'] = item_count

    return result


def get_ingested_source(source_id: str) -> Dict[str, Any]:
    """
    Retrieves an ingested source by ID.

    Args:
        source_id: The source ID to retrieve

    Returns:
        Source record dictionary or None if not found
    """
    return get_source(source_id)
