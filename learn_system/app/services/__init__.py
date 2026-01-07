"""Services module for document processing and conversion."""

from .conversion import (
    convert_and_store_pptx,
    convert_pptx_to_pdf_local,
    get_slide_count,
    is_libreoffice_available,
    upload_converted_pdf,
)

__all__ = [
    'convert_and_store_pptx',
    'convert_pptx_to_pdf_local',
    'get_slide_count',
    'is_libreoffice_available',
    'upload_converted_pdf',
]
