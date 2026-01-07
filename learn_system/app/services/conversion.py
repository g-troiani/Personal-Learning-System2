"""PPTX to PDF conversion service for M40 PowerPoint support."""

import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import Optional, Tuple

from ..database.connection import get_client


def is_libreoffice_available() -> bool:
    """Check if LibreOffice is available on the system."""
    for cmd in ['soffice', 'libreoffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice']:
        if shutil.which(cmd):
            return True
        if os.path.exists(cmd):
            return True
    return False


def get_libreoffice_command() -> Optional[str]:
    """Get the LibreOffice command path."""
    candidates = [
        'soffice',
        'libreoffice',
        '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        '/usr/bin/soffice',
        '/usr/local/bin/soffice',
    ]

    for cmd in candidates:
        if shutil.which(cmd):
            return cmd
        if os.path.exists(cmd):
            return cmd

    return None


def convert_pptx_to_pdf_local(pptx_path: str, output_dir: Optional[str] = None) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Convert PPTX to PDF using local LibreOffice installation.

    Args:
        pptx_path: Path to the PPTX file
        output_dir: Directory to save the PDF (defaults to temp directory)

    Returns:
        Tuple of (success: bool, pdf_path: Optional[str], error: Optional[str])
    """
    soffice_cmd = get_libreoffice_command()

    if not soffice_cmd:
        return False, None, "LibreOffice not installed. Install with: brew install --cask libreoffice"

    pptx_path = Path(pptx_path)
    if not pptx_path.exists():
        return False, None, f"PPTX file not found: {pptx_path}"

    if output_dir is None:
        output_dir = tempfile.mkdtemp()
    else:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

    try:
        result = subprocess.run(
            [
                soffice_cmd,
                '--headless',
                '--convert-to', 'pdf',
                '--outdir', str(output_dir),
                str(pptx_path)
            ],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode != 0:
            return False, None, f"Conversion failed: {result.stderr}"

        pdf_name = pptx_path.stem + '.pdf'
        pdf_path = Path(output_dir) / pdf_name

        if not pdf_path.exists():
            return False, None, "PDF was not generated"

        return True, str(pdf_path), None

    except subprocess.TimeoutExpired:
        return False, None, "Conversion timed out after 120 seconds"
    except Exception as e:
        return False, None, f"Conversion error: {str(e)}"


def upload_converted_pdf(source_id: str, pdf_path: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Upload converted PDF to Supabase Storage.

    Args:
        source_id: The source ID for the PPTX
        pdf_path: Path to the local PDF file

    Returns:
        Tuple of (success: bool, storage_path: Optional[str], error: Optional[str])
    """
    try:
        client = get_client()
        storage_path = f"{source_id}_converted.pdf"

        with open(pdf_path, 'rb') as f:
            pdf_content = f.read()

        client.storage.from_("documents").upload(
            path=storage_path,
            file=pdf_content,
            file_options={"content-type": "application/pdf"}
        )

        return True, storage_path, None

    except Exception as e:
        return False, None, f"Upload failed: {str(e)}"


def convert_and_store_pptx(source_id: str, pptx_path: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Convert PPTX to PDF and store in Supabase Storage.

    Args:
        source_id: The source ID for the PPTX
        pptx_path: Path to the local PPTX file

    Returns:
        Tuple of (success: bool, storage_path: Optional[str], error: Optional[str])
    """
    if not is_libreoffice_available():
        return False, None, "CONVERSION_NOT_AVAILABLE"

    temp_dir = tempfile.mkdtemp()

    try:
        success, pdf_path, error = convert_pptx_to_pdf_local(pptx_path, temp_dir)

        if not success:
            return False, None, error

        success, storage_path, error = upload_converted_pdf(source_id, pdf_path)

        if not success:
            return False, None, error

        client = get_client()
        client.table("content_sources").update({
            "converted_pdf_path": storage_path
        }).eq("id", source_id).execute()

        return True, storage_path, None

    finally:
        try:
            shutil.rmtree(temp_dir)
        except Exception:
            pass


def get_slide_count(pptx_path: str) -> int:
    """Get the number of slides in a PPTX file."""
    try:
        from pptx import Presentation
        prs = Presentation(pptx_path)
        return len(prs.slides)
    except Exception:
        return 0
