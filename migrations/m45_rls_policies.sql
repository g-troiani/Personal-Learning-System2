-- M45: Row-Level Security Policies
-- This migration enables RLS on all user-owned tables and creates policies for data isolation.
-- IMPORTANT: Run this AFTER m42_auth_schema.sql (user_id columns must exist)
-- Run with: Supabase SQL Editor

-- ============================================================================
-- PART 1: Enable RLS on all tables
-- ============================================================================

ALTER TABLE content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_subskills ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kc_technique_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE technique_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 2: content_sources - Direct user ownership
-- ============================================================================

CREATE POLICY "Users can view own sources"
    ON content_sources FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own sources"
    ON content_sources FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sources"
    ON content_sources FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sources"
    ON content_sources FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 3: knowledge_components - Owned via source_id
-- ============================================================================

CREATE POLICY "Users can view own KCs"
    ON knowledge_components FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM content_sources
            WHERE content_sources.id = knowledge_components.source_id
            AND (content_sources.user_id = auth.uid() OR content_sources.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert KCs for own sources"
    ON knowledge_components FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KCs"
    ON knowledge_components FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KCs"
    ON knowledge_components FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 4: kc_state - Owned via kc_id
-- ============================================================================

CREATE POLICY "Users can view own KC state"
    ON kc_state FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = kc_state.kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert KC state for own KCs"
    ON kc_state FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KC state"
    ON kc_state FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KC state"
    ON kc_state FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 5: kc_prerequisites - Owned via kc_id
-- ============================================================================

CREATE POLICY "Users can view own KC prerequisites"
    ON kc_prerequisites FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = kc_prerequisites.kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert KC prerequisites for own KCs"
    ON kc_prerequisites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KC prerequisites"
    ON kc_prerequisites FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KC prerequisites"
    ON kc_prerequisites FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 6: kc_subskills - Owned via parent_kc_id
-- ============================================================================

CREATE POLICY "Users can view own KC subskills"
    ON kc_subskills FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = kc_subskills.parent_kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert KC subskills for own KCs"
    ON kc_subskills FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KC subskills"
    ON kc_subskills FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KC subskills"
    ON kc_subskills FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 7: practice_items - Owned via kc_id
-- ============================================================================

CREATE POLICY "Users can view own practice items"
    ON practice_items FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = practice_items.kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert practice items for own KCs"
    ON practice_items FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice items"
    ON practice_items FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own practice items"
    ON practice_items FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 8: sessions - Direct user ownership
-- ============================================================================

CREATE POLICY "Users can view own sessions"
    ON sessions FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
    ON sessions FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
    ON sessions FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 9: attempts - Owned via session_id
-- ============================================================================

CREATE POLICY "Users can view own attempts"
    ON attempts FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM sessions
            WHERE sessions.id = attempts.session_id
            AND (sessions.user_id = auth.uid() OR sessions.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert attempts for own sessions"
    ON attempts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
    ON attempts FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own attempts"
    ON attempts FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 10: kc_technique_history - Owned via kc_id
-- ============================================================================

CREATE POLICY "Users can view own KC technique history"
    ON kc_technique_history FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = kc_technique_history.kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert KC technique history for own KCs"
    ON kc_technique_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own KC technique history"
    ON kc_technique_history FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own KC technique history"
    ON kc_technique_history FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 11: retention_tests - Owned via kc_id
-- ============================================================================

CREATE POLICY "Users can view own retention tests"
    ON retention_tests FOR SELECT
    USING (
        auth.uid() = user_id
        OR user_id IS NULL
        OR EXISTS (
            SELECT 1 FROM knowledge_components
            WHERE knowledge_components.id = retention_tests.kc_id
            AND (knowledge_components.user_id = auth.uid() OR knowledge_components.user_id IS NULL)
        )
    );

CREATE POLICY "Users can insert retention tests for own KCs"
    ON retention_tests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own retention tests"
    ON retention_tests FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own retention tests"
    ON retention_tests FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 12: learning_goals - Direct user ownership
-- ============================================================================

CREATE POLICY "Users can view own learning goals"
    ON learning_goals FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own learning goals"
    ON learning_goals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning goals"
    ON learning_goals FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own learning goals"
    ON learning_goals FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 13: technique_bundles - System bundles (user_id IS NULL) + user bundles
-- ============================================================================

CREATE POLICY "Users can view system and own technique bundles"
    ON technique_bundles FOR SELECT
    USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can insert own technique bundles"
    ON technique_bundles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own technique bundles"
    ON technique_bundles FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own technique bundles"
    ON technique_bundles FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- PART 14: reading_progress - Direct user ownership
-- ============================================================================

CREATE POLICY "Users can view own reading progress"
    ON reading_progress FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own reading progress"
    ON reading_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reading progress"
    ON reading_progress FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reading progress"
    ON reading_progress FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 15: annotations - Direct user ownership
-- ============================================================================

CREATE POLICY "Users can view own annotations"
    ON annotations FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own annotations"
    ON annotations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own annotations"
    ON annotations FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own annotations"
    ON annotations FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- PART 16: Storage Policies for documents bucket
-- ============================================================================

-- Policy: Users can only access their own files in the documents bucket
-- Path format: documents/{user_id}/{filename}

-- SELECT (download)
CREATE POLICY "Users can download own documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- INSERT (upload)
CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- UPDATE (replace)
CREATE POLICY "Users can update own documents"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- DELETE
CREATE POLICY "Users can delete own documents"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'documents'
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- Run these after applying the migration to verify RLS is working:
-- ============================================================================

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('content_sources', 'knowledge_components', 'sessions', 'technique_bundles');

-- List all policies:
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Test data isolation (run as authenticated user):
-- SELECT * FROM content_sources; -- Should only see own sources
