-- M39: PDF Annotation Support Migration
-- Run this SQL in Supabase SQL Editor
-- Date: 2026-01-06

-- =============================================================================
-- 1. Add position type discriminator
-- =============================================================================

ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS position_type TEXT DEFAULT 'offset'
CHECK (position_type IN ('offset', 'page_rect'));

-- =============================================================================
-- 2. Add PDF page-based coordinates
-- =============================================================================

-- Format: [{"page": 1, "x": 10.5, "y": 20.3, "width": 30.0, "height": 5.2}]
-- Coordinates are percentages relative to page dimensions for zoom resilience
ALTER TABLE annotations
ADD COLUMN IF NOT EXISTS pdf_rects JSONB;

-- =============================================================================
-- 3. Migrate existing annotations
-- =============================================================================

UPDATE annotations
SET position_type = 'offset'
WHERE position_type IS NULL;

-- =============================================================================
-- 4. Index for filtering by position type
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_annotations_position_type
ON annotations(source_id, position_type);

-- =============================================================================
-- Verification: Run these to confirm migration success
-- =============================================================================

-- Check new columns on annotations:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'annotations' AND column_name IN ('position_type', 'pdf_rects');
