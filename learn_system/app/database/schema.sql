-- Personal Adaptive Learning System - Database Schema for Supabase (PostgreSQL)

-- Technique bundles define learning technique combinations
CREATE TABLE IF NOT EXISTS technique_bundles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    retrieval_mode TEXT NOT NULL DEFAULT 'cued_recall',
    spacing_multiplier REAL NOT NULL DEFAULT 1.0,
    interleaving_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    elaboration_prompts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    reflection_prompts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    feedback_timing TEXT NOT NULL DEFAULT 'immediate',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Content sources store ingested documents
CREATE TABLE IF NOT EXISTS content_sources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT,
    content TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'text',
    domain TEXT NOT NULL DEFAULT 'general',
    word_count INTEGER,
    metadata JSONB,
    ingested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active'
);

-- Knowledge components are individual learnable units
CREATE TABLE IF NOT EXISTS knowledge_components (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    cognitive_level TEXT NOT NULL DEFAULT 'remember',
    intrinsic_complexity INTEGER NOT NULL DEFAULT 3,
    domain TEXT NOT NULL DEFAULT 'general',
    practice_environment TEXT,
    source_excerpt TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- KC state tracks mastery and scheduling per knowledge component
CREATE TABLE IF NOT EXISTS kc_state (
    kc_id TEXT PRIMARY KEY REFERENCES knowledge_components(id) ON DELETE CASCADE,
    mastery_level REAL NOT NULL DEFAULT 0.0,
    exposure_count INTEGER NOT NULL DEFAULT 0,
    correct_count INTEGER NOT NULL DEFAULT 0,
    consecutive_correct INTEGER NOT NULL DEFAULT 0,
    consecutive_incorrect INTEGER NOT NULL DEFAULT 0,
    last_exposure_at TIMESTAMP WITH TIME ZONE,
    next_review_at TIMESTAMP WITH TIME ZONE,
    current_interval_days REAL NOT NULL DEFAULT 1.0,
    easiness_factor REAL NOT NULL DEFAULT 2.5,
    learning_velocity REAL,
    proceduralization_level REAL,
    plateau_detected BOOLEAN NOT NULL DEFAULT FALSE,
    struggling_flag BOOLEAN NOT NULL DEFAULT FALSE,
    average_response_time_ms INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- KC prerequisites define learning dependencies
CREATE TABLE IF NOT EXISTS kc_prerequisites (
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    prerequisite_kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    strength REAL NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (kc_id, prerequisite_kc_id)
);

-- KC subskills break down complex KCs
CREATE TABLE IF NOT EXISTS kc_subskills (
    id TEXT PRIMARY KEY,
    parent_kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Practice items are specific questions/tasks for KCs
CREATE TABLE IF NOT EXISTS practice_items (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    practice_mode TEXT NOT NULL,
    difficulty_level INTEGER NOT NULL DEFAULT 2,
    prompt TEXT NOT NULL,
    expected_response TEXT,
    hints JSONB,
    rubric TEXT,
    success_criteria TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sessions track study periods
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    technique_bundle_id TEXT REFERENCES technique_bundles(id),
    session_type TEXT NOT NULL DEFAULT 'mixed',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
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

-- Attempts record individual practice interactions
CREATE TABLE IF NOT EXISTS attempts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    practice_item_id TEXT NOT NULL REFERENCES practice_items(id) ON DELETE CASCADE,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    response_time_ms INTEGER,
    response TEXT,
    score REAL,
    correctness TEXT NOT NULL DEFAULT 'pending',
    confidence_before INTEGER,
    difficulty_rating INTEGER,
    hints_requested INTEGER NOT NULL DEFAULT 0,
    hints_viewed JSONB,
    time_before_first_hint_ms INTEGER,
    independence_level TEXT,
    task_completed BOOLEAN,
    iterations_to_complete INTEGER,
    errors_encountered TEXT,
    explanation_provided BOOLEAN,
    self_identified_gaps TEXT,
    acted_on_feedback BOOLEAN,
    resources_accessed TEXT,
    error_type TEXT,
    mastery_before REAL,
    mastery_after REAL
);

-- KC technique history tracks which bundles were used
CREATE TABLE IF NOT EXISTS kc_technique_history (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    technique_bundle_id TEXT NOT NULL REFERENCES technique_bundles(id),
    used_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    used_until TIMESTAMP WITH TIME ZONE,
    exposures_during INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Retention tests for measuring long-term retention
CREATE TABLE IF NOT EXISTS retention_tests (
    id TEXT PRIMARY KEY,
    kc_id TEXT NOT NULL REFERENCES knowledge_components(id) ON DELETE CASCADE,
    delay_days INTEGER NOT NULL,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    score REAL,
    response_time_ms INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Learning goals for tracking objectives
CREATE TABLE IF NOT EXISTS learning_goals (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'active',
    progress_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_kc_source ON knowledge_components(source_id);
CREATE INDEX IF NOT EXISTS idx_kc_type ON knowledge_components(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_items_kc ON practice_items(kc_id);
CREATE INDEX IF NOT EXISTS idx_items_mode ON practice_items(practice_mode);
CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
CREATE INDEX IF NOT EXISTS idx_attempts_kc ON attempts(kc_id);
CREATE INDEX IF NOT EXISTS idx_state_review ON kc_state(next_review_at);
CREATE INDEX IF NOT EXISTS idx_state_mastery ON kc_state(mastery_level);
