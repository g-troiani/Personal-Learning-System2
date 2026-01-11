-- M46: Enforce Authentication Constraints
-- =========================================
--
-- IMPORTANT: Run this migration ONLY AFTER:
-- 1. First user has registered successfully
-- 2. Data migration has completed (all orphaned data assigned to first user)
-- 3. Verification that no NULL user_id values remain in data tables
--
-- This migration enforces NOT NULL constraints on user_id columns,
-- making authentication mandatory for all future data operations.
--
-- Run with: Supabase SQL Editor
-- =========================================

-- ============================================
-- PRE-MIGRATION VERIFICATION
-- ============================================
-- Run these queries BEFORE applying the NOT NULL constraints.
-- All counts should return 0. If not, run the data migration first.

-- SELECT COUNT(*) FROM content_sources WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM knowledge_components WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM kc_state WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM practice_items WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM sessions WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM attempts WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM learning_goals WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM reading_progress WHERE user_id IS NULL;
-- SELECT COUNT(*) FROM annotations WHERE user_id IS NULL;

-- ============================================
-- PART 1: Add NOT NULL constraints to core tables
-- ============================================

-- content_sources - primary document storage
ALTER TABLE content_sources
ALTER COLUMN user_id SET NOT NULL;

-- knowledge_components - extracted learning concepts
ALTER TABLE knowledge_components
ALTER COLUMN user_id SET NOT NULL;

-- kc_state - mastery tracking per user
ALTER TABLE kc_state
ALTER COLUMN user_id SET NOT NULL;

-- kc_prerequisites - KC dependency relationships
ALTER TABLE kc_prerequisites
ALTER COLUMN user_id SET NOT NULL;

-- kc_subskills - procedural sub-components
ALTER TABLE kc_subskills
ALTER COLUMN user_id SET NOT NULL;

-- practice_items - generated questions
ALTER TABLE practice_items
ALTER COLUMN user_id SET NOT NULL;

-- sessions - study sessions
ALTER TABLE sessions
ALTER COLUMN user_id SET NOT NULL;

-- attempts - practice attempts
ALTER TABLE attempts
ALTER COLUMN user_id SET NOT NULL;

-- kc_technique_history - technique assignments
ALTER TABLE kc_technique_history
ALTER COLUMN user_id SET NOT NULL;

-- retention_tests - scheduled assessments
ALTER TABLE retention_tests
ALTER COLUMN user_id SET NOT NULL;

-- learning_goals - user objectives
ALTER TABLE learning_goals
ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- PART 2: Document reader tables (from M30)
-- ============================================

-- reading_progress - document reading progress
ALTER TABLE reading_progress
ALTER COLUMN user_id SET NOT NULL;

-- annotations - highlights and notes
ALTER TABLE annotations
ALTER COLUMN user_id SET NOT NULL;

-- ============================================
-- PART 3: technique_bundles - SPECIAL CASE
-- ============================================
-- technique_bundles does NOT get NOT NULL constraint
-- System bundles (user_id IS NULL) are visible to all users
-- Only user-created bundles have a user_id
-- This is intentional design - DO NOT change

-- ============================================
-- PART 4: Update RLS policies to remove NULL fallback
-- ============================================
-- After enforcing NOT NULL, we can simplify RLS policies
-- by removing the "OR user_id IS NULL" fallback conditions.
-- This makes the policies stricter and more secure.

-- Drop existing policies that have NULL fallback
DROP POLICY IF EXISTS "Users can view own sources" ON content_sources;
DROP POLICY IF EXISTS "Users can update own sources" ON content_sources;
DROP POLICY IF EXISTS "Users can delete own sources" ON content_sources;

-- Create strict policies (no NULL fallback)
CREATE POLICY "Users can view own sources"
    ON content_sources FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sources"
    ON content_sources FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sources"
    ON content_sources FOR DELETE
    USING (auth.uid() = user_id);

-- Repeat for other tables - knowledge_components
DROP POLICY IF EXISTS "Users can view own KCs" ON knowledge_components;
DROP POLICY IF EXISTS "Users can update own KCs" ON knowledge_components;
DROP POLICY IF EXISTS "Users can delete own KCs" ON knowledge_components;

CREATE POLICY "Users can view own KCs"
    ON knowledge_components FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own KCs"
    ON knowledge_components FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KCs"
    ON knowledge_components FOR DELETE
    USING (auth.uid() = user_id);

-- kc_state
DROP POLICY IF EXISTS "Users can view own KC state" ON kc_state;
DROP POLICY IF EXISTS "Users can update own KC state" ON kc_state;
DROP POLICY IF EXISTS "Users can delete own KC state" ON kc_state;

CREATE POLICY "Users can view own KC state"
    ON kc_state FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own KC state"
    ON kc_state FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KC state"
    ON kc_state FOR DELETE
    USING (auth.uid() = user_id);

-- practice_items
DROP POLICY IF EXISTS "Users can view own practice items" ON practice_items;
DROP POLICY IF EXISTS "Users can update own practice items" ON practice_items;
DROP POLICY IF EXISTS "Users can delete own practice items" ON practice_items;

CREATE POLICY "Users can view own practice items"
    ON practice_items FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own practice items"
    ON practice_items FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice items"
    ON practice_items FOR DELETE
    USING (auth.uid() = user_id);

-- sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id);

-- attempts
DROP POLICY IF EXISTS "Users can view own attempts" ON attempts;
DROP POLICY IF EXISTS "Users can update own attempts" ON attempts;
DROP POLICY IF EXISTS "Users can delete own attempts" ON attempts;

CREATE POLICY "Users can view own attempts"
    ON attempts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
    ON attempts FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attempts"
    ON attempts FOR DELETE
    USING (auth.uid() = user_id);

-- learning_goals
DROP POLICY IF EXISTS "Users can view own learning goals" ON learning_goals;
DROP POLICY IF EXISTS "Users can update own learning goals" ON learning_goals;
DROP POLICY IF EXISTS "Users can delete own learning goals" ON learning_goals;

CREATE POLICY "Users can view own learning goals"
    ON learning_goals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own learning goals"
    ON learning_goals FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning goals"
    ON learning_goals FOR DELETE
    USING (auth.uid() = user_id);

-- reading_progress
DROP POLICY IF EXISTS "Users can view own reading progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can update own reading progress" ON reading_progress;
DROP POLICY IF EXISTS "Users can delete own reading progress" ON reading_progress;

CREATE POLICY "Users can view own reading progress"
    ON reading_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
    ON reading_progress FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
    ON reading_progress FOR DELETE
    USING (auth.uid() = user_id);

-- annotations
DROP POLICY IF EXISTS "Users can view own annotations" ON annotations;
DROP POLICY IF EXISTS "Users can update own annotations" ON annotations;
DROP POLICY IF EXISTS "Users can delete own annotations" ON annotations;

CREATE POLICY "Users can view own annotations"
    ON annotations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
    ON annotations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
    ON annotations FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- POST-MIGRATION VERIFICATION
-- ============================================
-- Run these queries after applying the migration to verify:

-- Check NOT NULL constraints are in place:
-- SELECT table_name, column_name, is_nullable
-- FROM information_schema.columns
-- WHERE column_name = 'user_id'
-- AND table_schema = 'public'
-- ORDER BY table_name;

-- Check RLS policies are updated:
-- SELECT tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- AND qual NOT LIKE '%IS NULL%'
-- ORDER BY tablename;
