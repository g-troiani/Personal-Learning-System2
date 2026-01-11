-- M42: Authentication Schema Migration
-- Add user_id columns to all user-owned tables for multi-user support
-- Run this migration BEFORE enabling RLS (M45)
-- user_id is NULLABLE initially for backwards compatibility with existing data

-- 1. content_sources - main document storage
ALTER TABLE content_sources
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. knowledge_components - extracted learning concepts
ALTER TABLE knowledge_components
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. kc_state - mastery tracking
ALTER TABLE kc_state
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. kc_prerequisites - KC dependencies
ALTER TABLE kc_prerequisites
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. kc_subskills - procedural sub-components
ALTER TABLE kc_subskills
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 6. practice_items - generated questions
ALTER TABLE practice_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 7. sessions - study sessions
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 8. attempts - practice attempts
ALTER TABLE attempts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 9. kc_technique_history - technique assignments
ALTER TABLE kc_technique_history
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. retention_tests - scheduled assessments
ALTER TABLE retention_tests
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 11. learning_goals - user objectives
ALTER TABLE learning_goals
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 12. technique_bundles - user_id NULL = system bundle, visible to all
-- User-created bundles have a user_id
ALTER TABLE technique_bundles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================
-- INDEXES: Single column indexes on user_id
-- ============================================

CREATE INDEX IF NOT EXISTS idx_content_sources_user_id
ON content_sources(user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_components_user_id
ON knowledge_components(user_id);

CREATE INDEX IF NOT EXISTS idx_kc_state_user_id
ON kc_state(user_id);

CREATE INDEX IF NOT EXISTS idx_kc_prerequisites_user_id
ON kc_prerequisites(user_id);

CREATE INDEX IF NOT EXISTS idx_kc_subskills_user_id
ON kc_subskills(user_id);

CREATE INDEX IF NOT EXISTS idx_practice_items_user_id
ON practice_items(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id
ON attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_kc_technique_history_user_id
ON kc_technique_history(user_id);

CREATE INDEX IF NOT EXISTS idx_retention_tests_user_id
ON retention_tests(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_goals_user_id
ON learning_goals(user_id);

CREATE INDEX IF NOT EXISTS idx_technique_bundles_user_id
ON technique_bundles(user_id);


-- ============================================
-- COMPOUND INDEXES: For common query patterns
-- ============================================

-- User's sources by status (dashboard filtering)
CREATE INDEX IF NOT EXISTS idx_sources_user_status
ON content_sources(user_id, status);

-- User's sources by processing status (upload progress)
CREATE INDEX IF NOT EXISTS idx_sources_user_processing
ON content_sources(user_id, processing_status);

-- User's KCs by source (document view)
CREATE INDEX IF NOT EXISTS idx_kc_user_source
ON knowledge_components(user_id, source_id);

-- User's sessions by date (history)
CREATE INDEX IF NOT EXISTS idx_sessions_user_started
ON sessions(user_id, started_at DESC);

-- User's attempts by session (session detail)
CREATE INDEX IF NOT EXISTS idx_attempts_user_session
ON attempts(user_id, session_id);

-- User's KC state for due items (practice scheduling)
CREATE INDEX IF NOT EXISTS idx_kc_state_user_review
ON kc_state(user_id, next_review_at);

-- User's KC state by mastery (progress tracking)
CREATE INDEX IF NOT EXISTS idx_kc_state_user_mastery
ON kc_state(user_id, mastery_level);

-- User's goals by status (goal tracking)
CREATE INDEX IF NOT EXISTS idx_goals_user_status
ON learning_goals(user_id, status);


-- ============================================
-- VERIFICATION: Check migration success
-- ============================================
-- Run these queries to verify:
--
-- SELECT column_name FROM information_schema.columns
-- WHERE table_name='content_sources' AND column_name='user_id';
--
-- SELECT indexname FROM pg_indexes
-- WHERE tablename='content_sources' AND indexname LIKE '%user%';
