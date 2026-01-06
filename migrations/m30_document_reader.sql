-- M30: Document Reader Core Infrastructure Migration
-- Run this SQL in Supabase SQL Editor
-- Date: 2026-01-05

-- =============================================================================
-- 1. Add file storage columns to content_sources
-- =============================================================================

ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS original_filename TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- =============================================================================
-- 2. Create reading_progress table
-- =============================================================================

CREATE TABLE IF NOT EXISTS reading_progress (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    scroll_position REAL DEFAULT 0,
    current_page INTEGER DEFAULT 1,
    total_pages INTEGER,
    completion_percentage REAL DEFAULT 0,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookup by source
CREATE INDEX IF NOT EXISTS idx_reading_progress_source ON reading_progress(source_id);

-- =============================================================================
-- 3. Create annotations table
-- =============================================================================

CREATE TABLE IF NOT EXISTS annotations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    annotation_type TEXT NOT NULL DEFAULT 'highlight', -- 'highlight', 'note', 'bookmark'
    selected_text TEXT,
    note_content TEXT,
    color TEXT DEFAULT '#14F0C6', -- teal default
    start_offset INTEGER,
    end_offset INTEGER,
    page_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for annotations
CREATE INDEX IF NOT EXISTS idx_annotations_source ON annotations(source_id);
CREATE INDEX IF NOT EXISTS idx_annotations_type ON annotations(annotation_type);

-- =============================================================================
-- 4. Create document_sections table (for TOC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS document_sections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    level INTEGER NOT NULL DEFAULT 1, -- heading level: 1, 2, 3
    page_number INTEGER,
    scroll_position REAL,
    section_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for ordered section retrieval
CREATE INDEX IF NOT EXISTS idx_document_sections_source_order ON document_sections(source_id, section_order);

-- =============================================================================
-- 5. Enable RLS (Row Level Security) - Optional for single-user, but good practice
-- =============================================================================

-- For single-user system, we'll keep RLS disabled but add it for future multi-user
-- ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Verification: Run these to confirm migration success
-- =============================================================================

-- Check new columns on content_sources:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'content_sources' AND column_name IN ('storage_path', 'original_filename', 'file_size_bytes', 'mime_type');

-- Check new tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name IN ('reading_progress', 'annotations', 'document_sections');
