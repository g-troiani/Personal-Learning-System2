-- M51: Session Continuity Across Page Reloads
-- Adds columns to persist study session progress for resumption after page reload

-- Add status column to track session state (active, paused, completed)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
  CHECK (status IN ('active', 'paused', 'completed', 'abandoned'));

-- Add current_item_index to track position in queue
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS current_item_index INTEGER DEFAULT 0;

-- Add queue_item_ids to store the practice item IDs in order (JSON array as text)
-- Using TEXT to store JSON array since PostgreSQL TEXT[] requires different handling
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS queue_item_ids TEXT;

-- Add paused_at to track when session was paused
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add last_activity_at to detect stale sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ DEFAULT now();

-- Index for fast lookup of user's active/paused sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_status
  ON sessions(user_id, status)
  WHERE status IN ('active', 'paused');

-- Index for session cleanup (finding old abandoned sessions)
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity
  ON sessions(last_activity_at)
  WHERE status = 'active';

-- Backfill existing sessions: mark old sessions without ended_at as abandoned
-- Sessions with ended_at are already completed
UPDATE sessions
SET status = 'completed'
WHERE ended_at IS NOT NULL AND status = 'active';

UPDATE sessions
SET status = 'abandoned'
WHERE ended_at IS NULL
  AND started_at < now() - INTERVAL '7 days'
  AND status = 'active';
