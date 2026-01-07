-- M40: PowerPoint Support
-- Adds columns for PPTX file handling and PDF conversion
-- Run in Supabase SQL Editor

-- Add slide_count column for presentations
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS slide_count INTEGER;

COMMENT ON COLUMN content_sources.slide_count IS
  'Number of slides for PPTX files. NULL for non-presentation documents.';

-- Store path to converted PDF (for PPTX sources displayed as PDF)
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS converted_pdf_path TEXT;

COMMENT ON COLUMN content_sources.converted_pdf_path IS
  'Supabase Storage path to converted PDF (for PPTX sources). NULL for other types.';

-- Index for content type filtering (optimizes queries by document type)
CREATE INDEX IF NOT EXISTS idx_content_sources_content_type
ON content_sources(content_type);

-- Update content_type enum comment to include pptx
COMMENT ON COLUMN content_sources.content_type IS
  'Document format: pdf, docx, markdown, text, pptx';
