-- Migration: Add processing status columns to content_sources
-- Run this migration in Supabase SQL Editor before using the API

-- Add processing status columns to content_sources
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_step TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Enable realtime for processing updates (if not already enabled)
-- Note: This may already be enabled. If so, this statement will succeed silently.
-- ALTER PUBLICATION supabase_realtime ADD TABLE content_sources;

-- Status values: pending, extracting_text, extracting_kcs, generating_items, ready, error
-- The existing 'status' column (active/archived) remains for lifecycle state

-- Update existing sources to have 'ready' processing status
UPDATE content_sources
SET processing_status = 'ready', processing_progress = 100
WHERE processing_status IS NULL OR processing_status = 'pending';
