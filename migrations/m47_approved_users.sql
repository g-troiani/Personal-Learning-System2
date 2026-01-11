-- M47: Approved Users Whitelist
-- This migration creates the approved_users table for restricting document uploads
-- to whitelisted users. Admins can manage the whitelist via /admin page.
-- Run with: Supabase SQL Editor

-- ============================================================================
-- PART 1: Create approved_users table
-- ============================================================================

-- approved_users table: whitelist for costly API operations (Claude/Groq processing)
CREATE TABLE IF NOT EXISTS public.approved_users (
    email TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by TEXT NOT NULL,
    approved_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- Index for fast user_id lookups when checking approval status
CREATE INDEX IF NOT EXISTS idx_approved_users_user_id ON approved_users(user_id);

-- ============================================================================
-- PART 2: Enable RLS with deny-all for regular users
-- ============================================================================

-- Enable RLS (service role key bypasses RLS, so backend can query this table)
ALTER TABLE public.approved_users ENABLE ROW LEVEL SECURITY;

-- No SELECT/INSERT/UPDATE/DELETE policies = deny all for anon/authenticated roles
-- This is intentional: only service role (backend) can access this table
-- Regular users cannot see who else is approved (privacy)

-- ============================================================================
-- PART 3: Seed initial admin emails as approved users
-- ============================================================================

-- Insert admin emails as initial approved users
-- ON CONFLICT DO NOTHING ensures idempotency (safe to run multiple times)
INSERT INTO public.approved_users (email, approved_by, notes)
VALUES
    ('gianmariatroiani@gmail.com', 'system', 'Initial admin'),
    ('gtroiani@equilibriaconsulting.net', 'system', 'Initial admin')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to verify:
-- ============================================================================

-- Check table exists:
-- SELECT * FROM approved_users;

-- Check RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'approved_users';

-- Check policies (should be empty - deny-all):
-- SELECT policyname FROM pg_policies WHERE tablename = 'approved_users';

-- Test as authenticated user (should return 0 rows due to RLS):
-- SET ROLE authenticated;
-- SELECT * FROM approved_users;
-- RESET ROLE;
