# Database Schema

**Last Updated:** 2026-01-18
**Database:** Supabase (PostgreSQL)
**Location:** `learn_system/app/database/schema.sql`

## Tables Overview

| Table | Purpose |
|-------|---------|
| technique_bundles | Learning technique configurations for A/B testing |
| content_sources | Uploaded documents and their metadata |
| knowledge_components | Extracted learning concepts from sources |
| kc_state | Mastery tracking and spaced repetition state |
| kc_prerequisites | Dependency relationships between KCs |
| kc_subskills | Sub-components of procedural KCs |
| practice_items | Generated questions and exercises |
| sessions | Study session records |
| attempts | Individual practice attempt records |
| kc_technique_history | Which techniques used for which KCs |
| retention_tests | Scheduled retention assessments |
| learning_goals | User-defined learning objectives |
| user_preferences | Per-user settings (zoom level, etc.) |

## Full Schema

```sql
CREATE TABLE IF NOT EXISTS technique_bundles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    retrieval_mode TEXT NOT NULL DEFAULT 'cued_recall',
    spacing_multiplier REAL NOT NULL DEFAULT 1.0,
    interleaving_enabled INTEGER NOT NULL DEFAULT 0,
    elaboration_prompts_enabled INTEGER NOT NULL DEFAULT 0,
    reflection_prompts_enabled INTEGER NOT NULL DEFAULT 0,
    feedback_timing TEXT NOT NULL DEFAULT 'immediate',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS content_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    domain TEXT NOT NULL DEFAULT 'general',
    word_count INTEGER,
    metadata TEXT,
    ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'active',
    -- Processing status columns (added M16-M20)
    processing_status TEXT DEFAULT 'pending',
    processing_progress INTEGER DEFAULT 0,
    processing_step TEXT,
    error_message TEXT,
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_components (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES content_sources(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    cognitive_level TEXT NOT NULL DEFAULT 'remember',
    intrinsic_complexity INTEGER NOT NULL DEFAULT 3,
    domain TEXT NOT NULL DEFAULT 'general',
    practice_environment TEXT,
    source_excerpt TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kc_state (
    kc_id TEXT PRIMARY KEY REFERENCES knowledge_components(id),
    mastery_level REAL NOT NULL DEFAULT 0.0,
    exposure_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    consecutive_incorrect INTEGER NOT NULL DEFAULT 0,
    last_exposure_at TEXT,
    next_review_at TEXT,
    current_interval_days REAL NOT NULL DEFAULT 1.0,
    easiness_factor REAL NOT NULL DEFAULT 2.5,
    learning_velocity REAL,
    proceduralization_level REAL,
    plateau_detected INTEGER NOT NULL DEFAULT 0,
    struggling_flag INTEGER NOT NULL DEFAULT 0,
    average_response_time_ms INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS kc_prerequisites (
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    prerequisite_kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    strength REAL NOT NULL DEFAULT 1.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (kc_id, prerequisite_kc_id)
);

CREATE TABLE IF NOT EXISTS kc_subskills (
    id TEXT PRIMARY KEY,
    parent_kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    name TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS practice_items (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    practice_mode TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL DEFAULT 2,
    prompt TEXT NOT NULL,
    expected_response TEXT,
    hints TEXT,
    rubric TEXT,
    success_criteria TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    technique_bundle_id TEXT REFERENCES technique_bundles(id),
    session_type TEXT NOT NULL DEFAULT 'mixed',
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    ended_at TEXT,
    target_duration_minutes INTEGER,
    actual_duration_minutes INTEGER,
    items_completed INTEGER NOT NULL DEFAULT 0,
    items_skipped INTEGER NOT NULL DEFAULT 0,
    average_score REAL,
    notes TEXT,
    time_of_day TEXT,
    energy_level INTEGER,
    focus_rating INTEGER
);

CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id),
    practice_item_id TEXT NOT NULL REFERENCES practice_items(id),
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    response_time_ms INTEGER,
    response TEXT,
    score REAL,
    correctness TEXT NOT NULL DEFAULT 'pending',
    confidence_before INTEGER,
    difficulty_rating INTEGER,
    hints_requested INTEGER NOT NULL DEFAULT 0,
    hints_viewed TEXT,
    time_before_first_hint_ms INTEGER,
    independence_level TEXT,
    task_completed INTEGER,
    iterations_to_complete INTEGER,
    errors_encountered TEXT,
    explanation_provided INTEGER,
    self_identified_gaps TEXT,
    acted_on_feedback INTEGER,
    resources_accessed TEXT,
    error_type TEXT,
    mastery_before REAL,
    mastery_after REAL
);

CREATE TABLE IF NOT EXISTS kc_technique_history (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    technique_bundle_id TEXT NOT NULL REFERENCES technique_bundles(id),
    used_from TEXT NOT NULL DEFAULT (datetime('now')),
    used_until TEXT,
    exposures_during INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retention_tests (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
    delay_days INTEGER NOT NULL,
    scheduled_for TEXT NOT NULL,
    completed_at TEXT,
    score REAL,
    response_time_ms INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS learning_goals (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    target_date TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    progress_notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## Indexes

```sql
CREATE INDEX IF NOT EXISTS idx_kc_source ON knowledge_components(source_id);
CREATE INDEX IF NOT EXISTS idx_kc_type ON knowledge_components(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_items_kc ON practice_items(kc_id);
CREATE INDEX IF NOT EXISTS idx_items_mode ON practice_items(practice_mode);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_kc ON attempts(kc_id);
CREATE INDEX IF NOT EXISTS idx_state_review ON kc_state(next_review_at);
CREATE INDEX IF NOT EXISTS idx_state_mastery ON kc_state(mastery_level);
```

## Processing Status Migrations (M16-M20)

Run in Supabase SQL Editor:

```sql
-- Add processing status columns to content_sources
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_step TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

-- Enable realtime for processing updates
ALTER PUBLICATION supabase_realtime ADD TABLE content_sources;
```

## Default Technique Bundles

```sql
INSERT INTO technique_bundles (id, name, description, retrieval_mode, spacing_multiplier,
    interleaving_enabled, elaboration_prompts_enabled, reflection_prompts_enabled, feedback_timing)
VALUES
    ('bundle_standard', 'Standard SRS', 'Cued recall with immediate feedback and standard spacing',
     'cued_recall', 1.0, 0, 0, 0, 'immediate'),
    ('bundle_deep', 'Deep Retrieval', 'Free recall with elaboration and reflection prompts',
     'free_recall', 1.0, 0, 1, 1, 'immediate'),
    ('bundle_interleaved', 'Interleaved Practice', 'Mixed topics within sessions for discrimination',
     'free_recall', 1.0, 1, 1, 0, 'immediate'),
    ('bundle_execution', 'Execution Focus', 'Hands-on tasks with graduated independence',
     'execution', 1.2, 0, 0, 1, 'immediate'),
    ('bundle_generation', 'Generation First', 'Pre-testing before instruction to prime encoding',
     'free_recall', 1.0, 0, 1, 0, 'delayed');
```

## User Preferences Table (M48)

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, preference_key)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- RLS: Users can only access their own preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
```

**Used for:** reader_zoom (document reader zoom level)

## Cross-References

- Related decisions: `decisions/architecture.md` (Supabase choice)
- Related API: `schemas/api.md` (endpoints that modify this data)
