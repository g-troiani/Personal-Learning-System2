# Personal Adaptive Learning System - Implementation Plan

This ExecPlan is a living document maintained in accordance with PLANS.md. The sections Progress, Surprises and Discoveries, Decision Log, and Outcomes and Retrospective must be kept up to date as work proceeds. All content required to implement this system is contained within this document; no external references are needed.


## Purpose and Big Picture

After implementing this system, a user can upload educational documents and receive automatically generated practice items scheduled for optimal retention. The user runs a command to see what needs review, another command to study, and the system tracks everything needed to measure learning effectiveness over time.

The observable behavior works as follows. On Monday, the user runs `python -m app.main ingest Evaluating_LLMs.docx --domain ai_ml` and the system extracts approximately fifty knowledge components, generates around one hundred fifty practice items, and stores them in a local database. The user then runs `python -m app.main study --duration 30` and spends thirty minutes practicing. The system presents items, collects responses, records confidence and difficulty ratings, and updates mastery estimates. On Tuesday, the user runs `python -m app.main todo` and sees output showing that fifteen items from the LLM evaluation document are due for review. The user runs `python -m app.main review eval` to focus on that specific topic. After a week of use across multiple documents, the database contains enough data to analyze which learning techniques produce better retention for which types of content.

The system solves five problems. First, it eliminates the "I don't know what I don't know" problem by forcing retrieval practice that reveals actual gaps. Second, it fights forgetting through spaced repetition scheduling. Third, it measures learning objectively through tracked performance rather than felt fluency. Fourth, it enables self-experimentation by recording which techniques were used for which content. Fifth, it removes cognitive overhead by telling the user exactly what to practice and when.


## Progress

This section tracks granular progress with timestamps. Each stopping point must be documented, even if it requires splitting a partially completed task.

- [x] Milestone 1: Project foundation including database schema, CLI skeleton, and configuration (2026-01-02)
  - Created virtual environment with Python 3.9
  - Installed dependencies: click, python-dotenv, python-docx, pypdf, anthropic, supabase
  - Created project directory structure under learn_system/
  - Created database schema with 12 tables in Supabase
  - Implemented CLI with commands: init, status, sources, bundles, schema
  - Created 5 default technique bundles in database
  - Verified all tables and bundles via Supabase dashboard
- [x] Milestone 2: Document ingestion including text extraction and content storage (2026-01-02)
  - Implemented extractors for PDF, DOCX, Markdown, and plain text files
  - Created ingest.py orchestration module
  - Updated CLI ingest command with actual functionality
  - Tested with DOCX (Make_It_Stick_Distillation.docx) and Markdown (test_document.md)
  - Verified both documents stored correctly in Supabase content_sources table
- [x] Milestone 3: Knowledge component extraction using LLM-based identification (2026-01-02)
  - Created kc_extractor.py with LLM client wrapper for Anthropic API
  - Implemented content chunking for large documents (20k char limit)
  - Built KC extraction prompt based on EXECPLAN.md specification
  - Implemented JSON parsing with error handling for LLM responses
  - Added deduplication logic to prevent duplicate KC names
  - Tested with test_document.md (12 KCs) and Mind_For_Numbers (18 KCs)
  - Fixed curly brace escaping issue in prompt template
- [x] Milestone 4: Practice item generation with type-specific question creation (2026-01-02)
  - Created practice/templates.py with 4 prompt templates by KC type (factual, conceptual, procedural_cognitive, procedural_execution)
  - Created practice/generator.py with LLM-based item generation and JSON parsing
  - Each KC generates 3 items with varying difficulty levels (1-5) and practice modes
  - Practice modes: free_recall, cued_recall, recognition, explanation, application, execution
  - Each item includes: prompt, expected_response, hints (2-3 progressive), rubric/success_criteria
  - Updated ingest.py to call generate_all_items() after KC extraction
  - Added --skip-items flag to ingest command
  - Tested with test_document.md: 12 KCs generated 36 practice items
  - Verified items stored correctly in Supabase practice_items table
- [x] Milestone 5: Core learning loop with session management and response collection (2026-01-02)
  - Created study/scheduler.py with get_study_queue() and get_todo_summary()
  - Created study/loop.py with interactive study session implementation
  - Implemented present_recall_item() for free_recall, cued_recall, recognition modes
  - Implemented present_explanation_item() for explanation/application modes
  - Implemented present_execution_item() for hands-on task tracking
  - Session management: create session, record attempts, close with summary
  - Technique history tracking integrated with attempt recording
  - Connected study command to run_study_session()
  - Tested: scheduler returns prioritized items, sessions/attempts recorded correctly
- [x] Milestone 6: Spaced repetition engine with SM-2 scheduling and mastery tracking (2026-01-02)
  - Created state/spacing.py with SM-2 algorithm (calculate_next_review)
  - Created state/estimator.py with mastery calculation (exponential moving average)
  - Integrated SM-2 into study loop: updates kc_state after each attempt
  - Mastery updates based on exposure count (alpha decreases over time)
  - Interval calculation: perfect score -> 6 days, failed -> 1 day reset
  - Easiness factor adjusts based on performance quality
  - Status command shows average mastery and due counts
  - Fixed datetime parsing issue for Python 3.9 compatibility
  - Tested: KC state updates correctly with mastery, interval, next_review_at
- [x] Milestone 7: To-do dashboard showing due items organized by source (2026-01-02)
  - Implemented todo command using get_todo_summary() from scheduler
  - Shows totals: overdue, due today, new content
  - Groups items by source with individual counts
  - Implemented review command with source pattern matching
  - Supports multiple matches with user selection
  - Passes source_id to run_study_session for filtered practice
  - Tested: todo shows 53 new items across 4 sources, review filters correctly
- [x] Milestone 8: Technique bundle tracking for self-experimentation (2026-01-02)
  - Sessions already record technique_bundle_id on creation
  - record_technique_usage tracks KC-bundle associations in kc_technique_history
  - Study loop already calls record_technique_usage after each attempt
  - Bundle option available on study (--bundle) and review (--bundle) commands
  - Added techniques command to view bundle usage statistics
  - Shows KCs practiced, total exposures, and sessions per bundle
  - Foundation ready for self-experimentation and A/B testing of techniques
- [x] Milestone 9: Web UI Foundation - Project setup and layout components (2026-01-02)
  - Scaffolded React project with Vite in web/ directory
  - Installed dependencies: react-router-dom, @supabase/supabase-js, lucide-react, recharts, tailwindcss
  - Configured Tailwind CSS with design system colors from spec (bg-main, accent-progress, etc.)
  - Created Sidebar component with navigation links and user profile
  - Created Layout component with sidebar and content area
  - Set up React Router with all page routes
  - Created SupabaseContext provider with data fetching methods
  - Created placeholder pages for: Home, Calendar, DueForReview, Sources, Progress, Analytics, Study
  - Verified navigation works correctly between all pages
  - Note: Supabase auth returns 401 due to RLS - requires service role key (hardcoded fallback added)
- [x] Milestone 10: Web UI Home Dashboard - Main dashboard with greeting, alerts, search, and source cards (2026-01-02)
  - Created home components: GreetingHeader, OverdueAlert, SearchBar, QuickActions, SourceCard
  - Implemented time-based greeting ("Good morning/afternoon/evening, Learner")
  - Search bar with placeholder "Search your knowledge base..."
  - Quick action buttons: Study, Plan, Add Document, Analytics with navigation
  - Source cards grid showing: emoji, title, mastery progress bar, due/overdue counts
  - Quick Stats section showing: Total Sources, New Items, Due Today, Overdue
  - Sidebar shows "Due for Review" badge with live count (53 items)
  - Recent sources section in sidebar with emoji icons
  - Overdue alert banner (only visible when overdue > 0)
  - Fixed shell environment variable conflict causing wrong Supabase URL
  - Must use publishable key (sb_publishable_) not secret key in browser
- [x] Milestone 11: Web UI Study Session - Interactive practice interface with answer input (2026-01-02)
  - Created SessionHeader component with progress indicator and "End session" button
  - Created QuestionCard component with KC type badge, practice mode, name, and prompt
  - Created AnswerInput component with textarea, mic button placeholder, submit button, skip link
  - Created SelfAssessment component with 5-point score and difficulty ratings
  - Created SessionSummary modal with items completed, average score, duration, navigation buttons
  - Full Study.jsx page with session lifecycle: fetch queue, create session, present items, record attempts
  - Attempts recorded to database with response time, score, correctness, difficulty
  - KC state updated with mastery calculation (EMA) after each attempt
  - Fixed hints JSON parsing to handle both JSON arrays and plain text
  - Verified mastery updates persist (0% → 11% after successful attempt)
- [ ] Milestone 12: Web UI Calendar - Learning calendar and session scheduling
- [ ] Milestone 13: Web UI Due for Review - Organized review queue by urgency
- [ ] Milestone 14: Web UI Progress - Statistics dashboard with charts
- [ ] Milestone 15: Web UI Analytics - Deep insights, technique comparison, and recommendations


## Surprises and Discoveries

This section documents unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Each observation includes concise evidence.

2026-01-02: Python 3.9 type hints incompatibility. The system default Python 3.9 does not support the `X | None` union syntax (PEP 604). Had to use `Optional[X]` from typing module instead. Also `list[dict]` needed to be `List[Dict]`. Evidence: TypeError when importing modules.

2026-01-02: Supabase client library requires specific key format. The secret key (service role key) is needed for full database access, not the anon/publishable key. Evidence: Initial connection tests failed with anon key.

2026-01-02: Curly brace escaping in Python format strings. The KC extraction prompt template contained JSON examples with curly braces, which conflicted with Python's `.format()` method. Fixed by using double braces `{{` and `}}` to escape literal braces. Evidence: KeyError when calling prompt.format().

2026-01-02: Supabase timestamp parsing in Python 3.9. Timestamps returned from Supabase have variable microsecond precision (e.g., `.17045+00:00`) which Python 3.9's `datetime.fromisoformat()` cannot parse. Fixed with try-except fallback that strips timezone for comparison. Evidence: ValueError in end_session() function.

2026-01-02: Practice items generated per KC. The LLM consistently generates exactly 3 practice items per KC as instructed, resulting in predictable item counts (36 items for 12 KCs). This 3:1 ratio holds across all knowledge types.

2026-01-02: Vite environment variable caching with multiple projects. When multiple Vite dev servers run on different ports, environment variables may appear to cross over between projects if ports are reused. The solution is to add hardcoded fallbacks in the supabase client or ensure clean server restarts. Evidence: Network requests going to wrong Supabase URL despite correct .env file.

2026-01-02: Supabase key formats (sb_publishable_ and sb_secret_) require service role key for table access when RLS is enabled. The web app needs the same service role key as the Python CLI to bypass RLS. For production, proper RLS policies should be configured. Evidence: 401 errors with publishable key, success with service role key.

2026-01-02: Shell environment variables override Vite .env files. When VITE_* variables are exported in the shell (e.g., from sourcing another project's .env), they take precedence over the local .env file. Solution: Pass correct values explicitly when starting Vite (e.g., `VITE_SUPABASE_URL=... npm run dev`) or unset conflicting shell variables. Evidence: Vite served wrong Supabase URL despite correct .env file.

2026-01-02: Supabase blocks secret API keys in browser. Keys starting with `sb_secret_` are rejected with "Forbidden use of secret API key in browser" error. Must use `sb_publishable_` key for client-side JavaScript. This is a Supabase security feature to prevent exposing service role keys. Evidence: 401 response with JSON message about secret key usage.

2026-01-02: Practice item hints stored inconsistently. Some hints are stored as JSON arrays (e.g., `["hint1", "hint2"]`), others as plain text strings. The QuestionCard component needed try-catch around JSON.parse to handle both formats gracefully. Evidence: SyntaxError when trying to parse non-JSON hint text.


## Decision Log

This section records every significant decision with rationale.

Decision: Use Supabase (PostgreSQL) instead of SQLite for data storage. Rationale: User requested Supabase for cloud-hosted database with dashboard visibility. Provides real-time data inspection, automatic backups, and future potential for web interface. Trade-off is network dependency vs. offline-first design. Date: 2026-01-02 (overrides initial SQLite decision).

Decision: Use technique bundles rather than individual technique toggles for self-experimentation. Rationale: Testing one technique at a time requires too many comparisons to reach statistical significance. Bundles group related techniques together, such as combining free recall with elaboration prompts and delayed feedback into a "Deep Retrieval" bundle. This enables meaningful comparisons with fewer data points. Date: Initial design.

Decision: Implement hands-on execution tasks as self-reported rather than automatically verified. Rationale: Automatic verification would require integration with development environments, detection of installed tools, and sandboxed code execution. This complexity is substantial and orthogonal to the core learning system. Self-reporting captures completion status, independence level, errors encountered, and iteration count, which provides sufficient signal for learning measurement. Date: Initial design.

Decision: Use the SM-2 algorithm for spaced repetition rather than newer alternatives. Rationale: SM-2 has decades of validation, is well-documented, and is sufficient for this use case. The same attempt data supports migration to more sophisticated algorithms like FSRS later. Starting with a proven algorithm reduces implementation risk. Date: Initial design.

Decision: Use the Anthropic Claude API for knowledge component extraction and practice item generation. Rationale: Extraction quality directly determines system usefulness. Claude produces consistent, well-structured output. The cost of a few dollars per document is acceptable for personal use. Local models can be added as an alternative later without changing the data model. Date: Initial design.

Decision: Track Cognitive Load Theory proxies in the MVP rather than implementing full CLT-aware presentation selection. Rationale: Full CLT implementation requires content-level tagging of presentation properties such as split attention versus integrated visuals, worked examples versus independent practice, and novice-appropriate versus expert-appropriate formats. The MVP captures proxies including intrinsic complexity ratings on knowledge components, difficulty ratings on attempts, response time patterns, and hint usage depth. These proxies enable future CLT-aware features without blocking initial implementation. Date: Design review.

Decision: Add web UI in addition to CLI interface. Rationale: While the CLI remains functional for power users and scripting, a web UI provides better UX for daily learning sessions. The UI design follows a clean, light-theme aesthetic with intuitive navigation. The web app will connect to the same Supabase backend, ensuring data consistency across both interfaces. This enables the system to reach users who prefer visual interfaces while maintaining CLI capabilities. Date: 2026-01-02.

Decision: Use React with Vite for web UI implementation. Rationale: React provides component-based architecture ideal for the modular UI design. Vite offers fast development experience with HMR. The stack includes Tailwind CSS for styling, Recharts for data visualization, and Supabase client for backend connectivity. This aligns with modern web development practices and ensures maintainability. Date: 2026-01-02.

Decision: Pass Supabase environment variables explicitly when starting Vite dev server. Rationale: Shell environment variables (VITE_*) override Vite's .env file when exported in the terminal session. If a user has worked on multiple Vite projects, stale VITE_* variables may persist in the shell and cause requests to go to the wrong Supabase instance. The solution is to pass the correct values explicitly on the command line: `VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run dev`. This ensures the correct values are used regardless of shell state. Alternative: run `unset VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY` before starting the server. Date: 2026-01-02.

Decision: Use Supabase publishable key (sb_publishable_) instead of secret key for web UI. Rationale: Supabase intentionally blocks secret keys (sb_secret_) in browser environments as a security measure to prevent service role key exposure. The publishable key is designed for client-side use. This differs from the CLI which can use secret keys safely. Both key types access the same database; the difference is RLS enforcement (publishable respects RLS policies, secret bypasses them). For the web UI, we use the publishable key with RLS disabled on tables during development. Date: 2026-01-02.


## Outcomes and Retrospective

This section summarizes outcomes, gaps, and lessons learned at major milestones or at completion.

### All 8 Milestones Complete (2026-01-02)

**What's Working:**
- Complete document ingestion pipeline: PDF, DOCX, Markdown, text extraction
- LLM-based knowledge component extraction with type classification
- Automatic practice item generation with type-specific prompts (3 items per KC)
- Interactive study sessions with confidence/difficulty ratings
- SM-2 spaced repetition algorithm with mastery tracking
- Todo dashboard showing overdue, due today, and new items by source
- Source-filtered review sessions
- Technique bundle tracking for self-experimentation

**CLI Commands Available:**
- `init` - Initialize database and default bundles
- `ingest <file>` - Process documents, extract KCs, generate items
- `status` - Show system statistics and due counts
- `sources` - List ingested documents
- `bundles` - List technique bundles
- `todo` - Show what needs review
- `study` - Start interactive practice session
- `review <pattern>` - Focus session on specific source
- `techniques` - View bundle usage statistics

**Technical Decisions That Worked Well:**
- Using Supabase instead of SQLite provided real-time visibility into data
- Click framework made CLI development straightforward
- Separating scheduler, loop, spacing, and estimator modules kept code organized
- Progress callbacks during ingestion provided good user feedback

**Known Gaps for Future Work:**
- No automated correctness verification (relies on self-assessment)
- No interleaving implementation within sessions (just bundle tracking)
- No retention test scheduling (structure exists but not implemented)
- No learning goals tracking (table exists but not used)
- Could benefit from progress charts and analytics visualization


## Context and Orientation

This section describes the current state as if the reader knows nothing about the project. It defines every term that might be unfamiliar and names all key files by full path.

This system is a personal learning tool implementing evidence-based learning science. The system provides both a CLI interface and a web UI, stores data in Supabase (PostgreSQL), and calls the Anthropic Claude API for intelligent content processing during document ingestion.

A knowledge component, abbreviated KC throughout this document, refers to a single learnable unit extracted from source content. A knowledge component might be a definition such as "Precision is the ratio of true positives to all predicted positives," a concept such as "When to prioritize precision over recall depends on the cost of false positives versus false negatives," a cognitive procedure such as "Calculate precision given a confusion matrix," or an execution task such as "Implement a function that computes precision from prediction and label arrays." Each knowledge component has a type that determines appropriate practice approaches.

The four knowledge types are factual, conceptual, procedural_cognitive, and procedural_execution. Factual knowledge comprises definitions, terms, formulas, and other content where correct recall is the goal. Conceptual knowledge comprises relationships, principles, and explanatory understanding where the learner must grasp why something works, not just what it is. Procedural_cognitive knowledge comprises problem-solving methods and analytical techniques where the learner must apply a process mentally. Procedural_execution knowledge comprises hands-on skills where the learner must actually do something in the real world, such as writing code, configuring a system, or operating a tool.

A practice item is a specific question, problem, or task generated for a knowledge component. Each knowledge component typically has multiple practice items at different difficulty levels and in different modes. Practice modes include free_recall where the learner must produce the answer from memory with no cues, cued_recall where a hint or partial information is provided, recognition where the learner selects from options, explanation where the learner must articulate understanding in their own words, application where the learner applies knowledge to a scenario, and execution where the learner performs a hands-on task.

Mastery level is a number between zero and one representing the estimated probability that the learner will respond correctly without assistance. Mastery updates after each practice attempt using an exponential moving average. In an exponential moving average, recent values receive higher weight than older values, but history is never completely discarded. The formula is new_mastery equals alpha times current_score plus one minus alpha times old_mastery, where alpha determines how much weight to give the new observation versus history.

Spaced repetition refers to scheduling reviews at increasing intervals. The SM-2 algorithm implements this by adjusting intervals based on response quality. The algorithm maintains an easiness factor per item that increases when performance is good and decreases when performance is poor. The interval before the next review equals the previous interval multiplied by the easiness factor. After an incorrect response, the interval resets to one day. The spacing effect, with an effect size around g equals 0.74 in research literature, is one of the most robust findings in learning science: distributed practice dramatically outperforms massed practice for long-term retention.

A technique bundle is a named combination of learning techniques applied together during a study session. The five default bundles are Standard SRS combining cued recall with immediate feedback and standard spacing intervals, Deep Retrieval combining free recall with elaboration prompts and delayed feedback, Interleaved Practice adding topic mixing within sessions for discrimination learning, Execution Focus emphasizing hands-on tasks with graduated independence levels, and Generation First presenting problems before instruction to prime encoding. Tracking which bundle was used for which content enables analysis of technique effectiveness over time.

A session is a study period during which the user practices items. Sessions record their start time, end time, duration, technique bundle, and all attempts made during the session.

An attempt records a single interaction with a practice item. Each attempt captures the item presented, the response given, correctness assessment, time taken, confidence rating before the attempt, difficulty rating after the attempt, hints requested, and for execution tasks, independence level and errors encountered.

The project has two main parts: `learn_system/` for the Python CLI and `web/` for the React web UI. Both connect to the same Supabase database. The CLI structure: `app/main.py` (CLI entry), `app/config.py` (configuration), `app/database/` (Supabase queries), `app/ingestion/` (document processing and KC extraction), `app/practice/` (item generation), `app/study/` (session loop and scheduler), `app/state/` (mastery and spacing algorithms). The web structure is defined in the "Web UI Technology Stack" section.

The CLI requires Python 3.9+ with packages: click, python-dotenv, python-docx, pypdf, anthropic, and supabase. The web UI requires Node.js 18+ with React, Vite, Tailwind CSS, Recharts, and Supabase client. An Anthropic API key and Supabase credentials must be available in environment variables. An internet connection is required for database access and during document ingestion when the LLM API is called.


## Plan of Work

Implementation proceeds through fifteen milestones. Milestones 1-8 (CLI) are complete. Milestones 9-15 implement the web UI.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI (Pending):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.


## CLI Usage Reference

CLI commands (all complete and functional):

```
python -m app.main init                    # Initialize database and bundles
python -m app.main ingest <file> --domain  # Process document, extract KCs, generate items
python -m app.main status                  # Show system statistics
python -m app.main sources                 # List ingested documents
python -m app.main bundles                 # List technique bundles
python -m app.main todo                    # Show what's due for review
python -m app.main study --duration 30     # Start study session
python -m app.main review <pattern>        # Focus session on specific source
python -m app.main techniques              # View bundle usage statistics
```

## How to Run Web UI

To start the web UI development server:

```bash
cd web/

# Option 1: Pass environment variables explicitly (recommended if you have multiple Vite projects)
VITE_SUPABASE_URL=https://bqrdwysxguktbiegkwss.supabase.co \
VITE_SUPABASE_ANON_KEY=sb_publishable_Clg3cJKsuZXWmqlPC1k4Pg_p0BpjhVU \
npm run dev

# Option 2: Unset any stale shell variables first
unset VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY
npm run dev

# Option 3: Just run npm run dev (works if no conflicting shell variables exist)
npm run dev
```

The app runs at http://localhost:5173

**Important:** Use the publishable key (`sb_publishable_...`) not the secret key (`sb_secret_...`) for browser-based apps. Supabase blocks secret keys in browsers for security.


## Recovery Notes

- Running `init` multiple times is safe (uses IF NOT EXISTS)
- Re-ingesting same document creates duplicate; check first if needed
- Failed ingestion during KC extraction: no partial data committed, retry safely
- Failed during item generation: KCs saved, items not; can regenerate
- Interrupted sessions: completed attempts saved; restart begins new session
- Database backups via Supabase dashboard or pg_dump


## Artifacts and Notes

This section contains important implementation details, schema definitions, and reference material.

The complete database schema follows. This SQL should be placed in learn_system/app/database/schema.sql and executed during init.

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
        status TEXT NOT NULL DEFAULT 'active'
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

    CREATE INDEX IF NOT EXISTS idx_kc_source ON knowledge_components(source_id);
    CREATE INDEX IF NOT EXISTS idx_kc_type ON knowledge_components(knowledge_type);
    CREATE INDEX IF NOT EXISTS idx_items_kc ON practice_items(kc_id);
    CREATE INDEX IF NOT EXISTS idx_items_mode ON practice_items(practice_mode);
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_kc ON attempts(kc_id);
    CREATE INDEX IF NOT EXISTS idx_state_review ON kc_state(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_state_mastery ON kc_state(mastery_level);

The five default technique bundles to insert during init:

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

The SM-2 algorithm implementation in pseudocode:

    function calculate_next_review(score, current_interval, easiness_factor):
        # Convert 0-1 score to 0-5 quality rating
        quality = round(score * 5)
        
        # Update easiness factor (minimum 1.3)
        new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, new_ef)
        
        # Calculate new interval
        if quality < 3:
            # Failed: reset to 1 day
            new_interval = 1.0
        elif current_interval < 1:
            # First successful review
            new_interval = 1.0
        elif current_interval < 6:
            # Second successful review
            new_interval = 6.0
        else:
            # Subsequent reviews: multiply by easiness factor
            new_interval = current_interval * new_ef
        
        # Calculate next review date
        next_review = now() + timedelta(days=new_interval)
        
        return (new_interval, new_ef, next_review)

The mastery estimation using exponential moving average:

    function calculate_mastery(new_score, current_mastery, exposure_count):
        # Alpha decreases with exposure: high early (0.7), low later (0.2)
        if exposure_count <= 2:
            alpha = 0.7
        elif exposure_count <= 5:
            alpha = 0.5
        elif exposure_count <= 10:
            alpha = 0.35
        else:
            alpha = 0.2
        
        # Exponential moving average
        new_mastery = alpha * new_score + (1 - alpha) * current_mastery
        
        return new_mastery

The prompt template for knowledge component extraction. This goes in the LLM call during ingestion:

    You are analyzing educational content to extract learnable knowledge components.
    
    For each distinct concept, skill, or fact that a learner should master, extract:
    1. name: A concise identifier (3-8 words)
    2. description: What the learner should know or be able to do (1-3 sentences)
    3. knowledge_type: One of factual, conceptual, procedural_cognitive, procedural_execution
    4. cognitive_level: One of remember, understand, apply, analyze, evaluate, create
    5. intrinsic_complexity: 1-5 where 1 is simple definition, 5 is complex multi-step concept
    6. prerequisites: Names of other KCs that should be learned first (if any)
    
    Knowledge type definitions:
    - factual: Definitions, terms, formulas. Tested by recall.
    - conceptual: Principles, relationships, "why" knowledge. Tested by explanation.
    - procedural_cognitive: Problem-solving methods. Tested by solving problems.
    - procedural_execution: Hands-on skills. Tested by doing tasks.
    
    Return as JSON array. Extract 10-20 knowledge components from this content.
    Be specific and granular. Each KC should be independently learnable and testable.
    
    Content to analyze:
    {content}


## Milestones

### CLI Milestones 1-8 (Complete)

All CLI milestones are complete. See the **Progress** section for detailed implementation notes and the **Outcomes and Retrospective** section for what's working.

- **M1:** Project foundation, database schema, CLI skeleton
- **M2:** Document ingestion (PDF, DOCX, Markdown extraction)
- **M3:** KC extraction via LLM with chunking and deduplication
- **M4:** Practice item generation with type-specific templates
- **M5:** Interactive study loop with session management
- **M6:** SM-2 spaced repetition and mastery tracking
- **M7:** Todo dashboard and source-filtered review
- **M8:** Technique bundle tracking for self-experimentation

### Milestone 9: Web UI Foundation

At the end of this milestone, a React web application exists with the core layout structure, navigation sidebar, and connection to the Supabase backend. The app runs locally and can authenticate with the existing database.

The work involves scaffolding a new React project with Vite in a `web/` directory alongside the existing `learn_system/` CLI. Installing dependencies: React 18, React Router, Tailwind CSS, Supabase client, Lucide React icons, and Recharts for visualization. Creating the root layout with a persistent left sidebar containing: app logo ("Learn"), navigation links (Home, Calendar, Due for Review with badge, Sources, Progress, Analytics), a "Recent" section showing recent sources with emoji icons, and a user profile area at the bottom. Implementing a Supabase context provider for database access. Setting up Tailwind with a light theme color palette matching the design: warm off-white backgrounds (#FAF9F7), green accents for progress (#10B981), amber/orange for alerts (#F59E0B), red for overdue (#EF4444).

To verify, run `npm run dev` in the web directory. The application should display the sidebar layout. Clicking navigation links should change the active state. The "Due for Review" badge should show the count from the database. Recent sources should populate from content_sources table.


### Milestone 10: Web UI Home Dashboard

At the end of this milestone, the Home page displays a personalized greeting, overdue alert banner, search box with quick actions, and source cards showing mastery progress.

The work involves creating the Home page component with: a time-based greeting ("Good morning/afternoon/evening, [name]") with subtitle "Ready to learn something?", an alert banner showing overdue item count with clock icon and "Review now" button (only visible when items are overdue), a search input with placeholder "Search your knowledge base...", quick action buttons below search (Study, Plan, Add Document, Analytics) each with an icon, and a grid of source cards. Each source card displays: emoji icon (configurable per source), truncated title, horizontal progress bar with mastery percentage, and status text showing due/overdue counts in appropriate colors (amber for due today, red for overdue). Cards link to source-specific study sessions.

To verify, navigate to Home. Verify greeting reflects current time. If overdue items exist, the alert banner should appear with accurate count. Source cards should display correct mastery percentages matching database values. Clicking "Review now" should navigate to Due for Review page. Quick action buttons should trigger their respective actions or navigate to relevant pages.


### Milestone 11: Web UI Study Session

At the end of this milestone, users can complete interactive study sessions through the web interface with the same functionality as the CLI study loop.

The work involves creating a full-screen study session view with: header showing "X End session" on left and progress indicator "N of M" with progress bar on right, knowledge component display showing type badge (factual/conceptual/procedural) and practice mode (Free recall/Cued recall/etc), KC name as heading, question prompt in a rounded card, answer input area supporting both text entry and voice input (microphone button), submit button, and "Skip and show answer" link. After submission: display expected answer, collect self-assessment rating (1-5 scale), collect difficulty rating, and advance to next item. Session summary modal on completion showing items completed, average score, and session duration. All attempts must be recorded to the database with the same fields as CLI attempts.

To verify, start a study session from any entry point. Complete several items verifying: progress indicator updates, answers are recorded, ratings are collected, session summary appears on completion. Query the attempts table to confirm records match the session activity. End session early and verify partial progress is saved.


### Milestone 12: Web UI Calendar

At the end of this milestone, users can view a learning calendar showing scheduled reviews and plan future study sessions.

The work involves creating the Calendar page with: page header "Learning Calendar" with subtitle "Plan and schedule your study sessions", month navigation (previous/next arrows with "January 2026" display), a 7-column calendar grid (Sun-Sat) showing all days of the month, current day highlighted with a circle indicator, and a "Schedule a Study Session" form at the bottom. The scheduling form includes: source dropdown ("Select source..."), session type dropdown (Review/Study/New), duration input (default 30 minutes), date picker, and "Add" button. Future enhancement: show scheduled sessions and due item density on calendar days.

To verify, navigate to Calendar. Verify current month displays correctly with proper day alignment. Today's date should be highlighted. Change months using navigation arrows. Schedule a study session using the form and verify it creates a database entry. The scheduled session should appear on the calendar day.


### Milestone 13: Web UI Due for Review

At the end of this milestone, the Due for Review page displays all items needing attention organized by urgency with direct action buttons.

The work involves creating the Due for Review page with: page header "Due for Review", three sections with colored indicators: Overdue (red dot), Due Today (amber dot), New Content (green dot). Each section lists sources with: source emoji and name, item count and status text ("X items overdue" / "X items due" / "X items not yet practiced"), and action button (Review/Study/Start) styled appropriately. At the bottom: "Review everything at once?" prompt with "Study All (N items)" button in dark style. Clicking any action button starts a filtered study session for that source/category.

To verify, navigate to Due for Review. Verify sources appear in correct sections based on their item states. Badge count in sidebar should match total items shown. Click "Review" on an overdue source and verify session starts with only items from that source. Click "Study All" and verify all due items are included in the session.


### Milestone 14: Web UI Progress

At the end of this milestone, the Progress page displays learning statistics, mastery by source, and weekly activity visualization.

The work involves creating the Progress page with: page header "Progress", summary stat cards in a row showing: Sources (count), Items Learned (count), Study Sessions (count), Total Time (formatted hours). Mastery by Source section showing each source with: emoji, name, horizontal progress bar, and percentage. This Week bar chart showing daily activity (M-T-W-T-F-S-S) with green bars indicating items practiced each day, streak indicator ("N day streak 🔥"), and weekly total ("N items this week"). A "View detailed analytics >" link at bottom navigating to Analytics page.

To verify, navigate to Progress. Verify stat cards show accurate counts from database. Mastery percentages should match kc_state averages per source. Weekly chart should reflect actual session activity for the current week. Streak calculation should be accurate based on consecutive days with sessions.


### Milestone 15: Web UI Analytics

At the end of this milestone, the Analytics page provides deep insights into learning patterns, technique effectiveness, and actionable recommendations.

The work involves creating the Analytics page with: page header "Analytics" with subtitle "Deep insights into your learning patterns", filter controls (time period dropdown, source filter, knowledge type filter), three insight cards in a row: "What's Working" (green, shows best performing technique/pattern with improvement percentage), "Needs Attention" (amber, shows calibration issues or struggling areas), "Optimization" (light blue, shows recommendations like best study time). Technique Bundle Effectiveness section comparing bundles with: dual progress bars (7-day retention, 30-day retention), percentages, and "N sessions, avg to mastery, n=X items" metrics. Performance by Knowledge Type showing horizontal bars for Factual, Conceptual, Procedural (Cognitive), Procedural (Execution) with percentages and item counts. Calibration Analysis showing confidence vs actual performance per knowledge type with badges (Calibrated/Overconfident/Underconfident). Optimal Spacing Analysis showing retention curve by interval with recommendation text. Items Needing Attention list showing KCs with low mastery or high difficulty, each with: KC name, source name, mastery percentage (colored by level), attempts and difficulty info, and "Practice" button.

To verify, navigate to Analytics with sufficient data in the database. Verify technique comparisons reflect actual retention rates from attempts. Verify calibration analysis correctly compares confidence_before ratings to actual scores. Filter controls should update all sections. Clicking "Practice" on a struggling item should start a focused session.


## Web UI Technology Stack

The web interface uses the following technology stack:

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React | 18.x | Component-based UI |
| Build Tool | Vite | 5.x | Fast development and bundling |
| Routing | React Router | 6.x | Client-side navigation |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Icons | Lucide React | latest | Consistent iconography |
| Charts | Recharts | 2.x | Data visualization |
| Database | Supabase Client | 2.x | Backend connectivity |
| State | React Context | built-in | Global state management |

Directory structure for web application:

    web/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.jsx
    │   │   │   ├── Layout.jsx
    │   │   │   └── UserProfile.jsx
    │   │   ├── home/
    │   │   │   ├── GreetingHeader.jsx
    │   │   │   ├── OverdueAlert.jsx
    │   │   │   ├── SearchBar.jsx
    │   │   │   ├── QuickActions.jsx
    │   │   │   └── SourceCard.jsx
    │   │   ├── study/
    │   │   │   ├── SessionHeader.jsx
    │   │   │   ├── QuestionCard.jsx
    │   │   │   ├── AnswerInput.jsx
    │   │   │   ├── SelfAssessment.jsx
    │   │   │   └── SessionSummary.jsx
    │   │   ├── calendar/
    │   │   │   ├── CalendarGrid.jsx
    │   │   │   ├── MonthNavigation.jsx
    │   │   │   └── ScheduleForm.jsx
    │   │   ├── review/
    │   │   │   ├── ReviewSection.jsx
    │   │   │   └── SourceItem.jsx
    │   │   ├── progress/
    │   │   │   ├── StatCards.jsx
    │   │   │   ├── MasteryBySource.jsx
    │   │   │   └── WeeklyChart.jsx
    │   │   └── analytics/
    │   │       ├── InsightCards.jsx
    │   │       ├── TechniqueComparison.jsx
    │   │       ├── PerformanceByType.jsx
    │   │       ├── CalibrationAnalysis.jsx
    │   │       ├── SpacingAnalysis.jsx
    │   │       └── ItemsNeedingAttention.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Calendar.jsx
    │   │   ├── DueForReview.jsx
    │   │   ├── Sources.jsx
    │   │   ├── Progress.jsx
    │   │   ├── Analytics.jsx
    │   │   └── Study.jsx
    │   ├── contexts/
    │   │   ├── SupabaseContext.jsx
    │   │   └── SessionContext.jsx
    │   ├── hooks/
    │   │   ├── useStudyQueue.js
    │   │   ├── useSources.js
    │   │   ├── useProgress.js
    │   │   └── useAnalytics.js
    │   ├── lib/
    │   │   ├── supabase.js
    │   │   ├── spacing.js
    │   │   └── mastery.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── public/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js


## Web UI Design Specifications

This section documents the exact visual design based on the reference screenshots.

### Color Palette

    Background (main):     #FAF9F7 (warm off-white)
    Background (sidebar):  #F5F4F2 (slightly darker)
    Card background:       #FFFFFF (white)
    Card border:           #E5E4E2 (light gray)

    Text (primary):        #1A1A1A (near black)
    Text (secondary):      #6B7280 (gray)
    Text (muted):          #9CA3AF (light gray)

    Accent (progress):     #10B981 (emerald green)
    Accent (alert):        #F59E0B (amber)
    Accent (overdue):      #EF4444 (red)
    Accent (new):          #3B82F6 (blue)

    Button (primary):      #1A1A1A (dark)
    Button (secondary):    #F3F4F6 (light gray)
    Button (action):       #FEF3C7 (light amber background)

### Typography

    Logo:                  "Learn" - 20px, font-weight 600
    Page titles:           32px, font-weight 600
    Section headers:       18px, font-weight 600
    Card titles:           16px, font-weight 500
    Body text:             14px, font-weight 400
    Small/muted:           12px, font-weight 400

    Font family:           Inter, system-ui, sans-serif

### Spacing

    Sidebar width:         240px
    Content padding:       32px
    Card padding:          20px
    Card gap:              16px
    Section gap:           24px
    Border radius (cards): 12px
    Border radius (buttons): 8px

### Component Specifications

**Sidebar Navigation Item:**
- Height: 40px
- Padding: 12px 16px
- Border radius: 8px
- Active state: light gray background (#F3F4F6)
- Icon size: 20px
- Badge: circular, amber background, white text

**Source Card:**
- Width: flexible (grid column)
- Padding: 20px
- Emoji: 32px
- Progress bar height: 8px
- Progress bar border radius: 4px

**Alert Banner:**
- Background: #FEF3C7 (light amber)
- Border radius: 12px
- Icon: clock, amber color
- Button: amber background, white text

**Study Session Question Card:**
- Background: #F9FAFB (very light gray)
- Border radius: 12px
- Padding: 24px

**Knowledge Type Badge:**
- Background: #E0E7FF (light indigo)
- Text: #4338CA (indigo)
- Padding: 4px 12px
- Border radius: 16px
- Font size: 12px


## Research Foundation

This section summarizes the learning science research that informs the system design. This information comes from four sources: Make It Stick by Brown, Roediger, and McDaniel; A Mind for Numbers by Oakley; Ultralearning by Young; and the Adaptive Learning Platform Blueprint.

The most robust finding in learning science is that retrieval practice dramatically outperforms passive review. Testing yourself on material, even without feedback, strengthens memory more than rereading. The system implements this by generating practice items that require active recall rather than recognition.

The spacing effect shows that distributed practice outperforms massed practice with an effect size around g equals 0.74. Reviewing material at increasing intervals produces better long-term retention than cramming. The system implements this through the SM-2 spaced repetition algorithm.

Interleaving different topics during practice builds discrimination skills and transfer ability better than blocked practice on one topic. The system supports this through technique bundles that enable interleaved sessions.

The testing effect combines with spacing: testing yourself at spaced intervals is more effective than either alone. The system combines these by scheduling retrieval practice at spaced intervals.

Desirable difficulties are challenges that slow initial learning but improve long-term retention. Free recall is harder than cued recall which is harder than recognition, but the difficulty is beneficial. The system offers multiple practice modes with different difficulty levels.

Cognitive Load Theory identifies three types of load: intrinsic load from material complexity, extraneous load from poor presentation, and germane load from productive learning effort. The system tracks proxies for cognitive load including difficulty ratings, response times, and hint usage to enable future load-aware adaptations.

The Zone of Proximal Development describes the range between what a learner can do independently and what they can do with assistance. Items should challenge learners within this zone. The system tracks hint usage and independence levels to estimate ZPD position.

Elaboration, explaining material in your own words and connecting it to prior knowledge, creates additional retrieval routes and deepens understanding. The system supports elaboration through technique bundles that prompt for explanations.

Metacognition, knowing what you know and do not know, is often poorly calibrated. People overestimate their knowledge after passive review. The system collects confidence ratings before attempts to measure calibration.

Self-experimentation treats learning technique selection as an empirical question rather than accepting general recommendations. What works on average may not work best for an individual. The system tracks which techniques were used with which content to enable personalized analysis.


## Feature Tracking by Research Source

This section maps implemented features to their research sources for traceability.

From Make It Stick: retrieval practice is implemented through the practice item system with active recall modes. Spaced practice is implemented through SM-2 scheduling. Interleaving is supported through technique bundles. Elaboration is supported through explanation practice modes. Calibration tracking is implemented through confidence ratings.

From A Mind for Numbers: the focused versus diffuse mode distinction informs session duration recommendations but is not explicitly enforced. Chunking is implemented through the knowledge component extraction that breaks content into learnable units. The testing effect is the foundation of the entire practice system.

From Ultralearning: directness is implemented through execution tasks for procedural_execution knowledge. Drill is supported by tracking struggling items for focused practice. Retrieval is the core mechanism. Feedback is immediate by default with delayed feedback as a bundle option. Experimentation is enabled through technique bundle tracking.

From the Adaptive Learning Platform Blueprint: Bloom's cognitive levels are captured on knowledge components. ZPD estimation is supported through hint tracking and independence levels. Cognitive Load Theory proxies are captured through complexity ratings and difficulty ratings. Q-matrix style knowledge component mapping is implemented. Mastery modeling uses exponential moving average as a simpler alternative to BKT.


## Revision History

2026-01-02: Added Web UI milestones (9-15) based on UI design screenshots. Added comprehensive specifications for React-based web interface including: technology stack (React, Vite, Tailwind, Recharts, Supabase client), detailed milestone descriptions for all pages (Home, Calendar, Due for Review, Sources, Progress, Analytics, Study Session), directory structure, color palette, typography, spacing, and component specifications. Added Decision Log entries for web UI addition and technology choices.
