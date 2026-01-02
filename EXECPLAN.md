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


## Surprises and Discoveries

This section documents unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Each observation includes concise evidence.

2026-01-02: Python 3.9 type hints incompatibility. The system default Python 3.9 does not support the `X | None` union syntax (PEP 604). Had to use `Optional[X]` from typing module instead. Also `list[dict]` needed to be `List[Dict]`. Evidence: TypeError when importing modules.

2026-01-02: Supabase client library requires specific key format. The secret key (service role key) is needed for full database access, not the anon/publishable key. Evidence: Initial connection tests failed with anon key.


## Decision Log

This section records every significant decision with rationale.

Decision: Use Supabase (PostgreSQL) instead of SQLite for data storage. Rationale: User requested Supabase for cloud-hosted database with dashboard visibility. Provides real-time data inspection, automatic backups, and future potential for web interface. Trade-off is network dependency vs. offline-first design. Date: 2026-01-02 (overrides initial SQLite decision).

Decision: Use technique bundles rather than individual technique toggles for self-experimentation. Rationale: Testing one technique at a time requires too many comparisons to reach statistical significance. Bundles group related techniques together, such as combining free recall with elaboration prompts and delayed feedback into a "Deep Retrieval" bundle. This enables meaningful comparisons with fewer data points. Date: Initial design.

Decision: Implement hands-on execution tasks as self-reported rather than automatically verified. Rationale: Automatic verification would require integration with development environments, detection of installed tools, and sandboxed code execution. This complexity is substantial and orthogonal to the core learning system. Self-reporting captures completion status, independence level, errors encountered, and iteration count, which provides sufficient signal for learning measurement. Date: Initial design.

Decision: Use the SM-2 algorithm for spaced repetition rather than newer alternatives. Rationale: SM-2 has decades of validation, is well-documented, and is sufficient for this use case. The same attempt data supports migration to more sophisticated algorithms like FSRS later. Starting with a proven algorithm reduces implementation risk. Date: Initial design.

Decision: Use the Anthropic Claude API for knowledge component extraction and practice item generation. Rationale: Extraction quality directly determines system usefulness. Claude produces consistent, well-structured output. The cost of a few dollars per document is acceptable for personal use. Local models can be added as an alternative later without changing the data model. Date: Initial design.

Decision: Track Cognitive Load Theory proxies in the MVP rather than implementing full CLT-aware presentation selection. Rationale: Full CLT implementation requires content-level tagging of presentation properties such as split attention versus integrated visuals, worked examples versus independent practice, and novice-appropriate versus expert-appropriate formats. The MVP captures proxies including intrinsic complexity ratings on knowledge components, difficulty ratings on attempts, response time patterns, and hint usage depth. These proxies enable future CLT-aware features without blocking initial implementation. Date: Design review.


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

This system is a personal learning tool implementing evidence-based learning science. There is no existing codebase; implementation starts from scratch. The system runs locally via command-line interface, stores data in SQLite, and calls an external LLM API for intelligent content processing.

A knowledge component, abbreviated KC throughout this document, refers to a single learnable unit extracted from source content. A knowledge component might be a definition such as "Precision is the ratio of true positives to all predicted positives," a concept such as "When to prioritize precision over recall depends on the cost of false positives versus false negatives," a cognitive procedure such as "Calculate precision given a confusion matrix," or an execution task such as "Implement a function that computes precision from prediction and label arrays." Each knowledge component has a type that determines appropriate practice approaches.

The four knowledge types are factual, conceptual, procedural_cognitive, and procedural_execution. Factual knowledge comprises definitions, terms, formulas, and other content where correct recall is the goal. Conceptual knowledge comprises relationships, principles, and explanatory understanding where the learner must grasp why something works, not just what it is. Procedural_cognitive knowledge comprises problem-solving methods and analytical techniques where the learner must apply a process mentally. Procedural_execution knowledge comprises hands-on skills where the learner must actually do something in the real world, such as writing code, configuring a system, or operating a tool.

A practice item is a specific question, problem, or task generated for a knowledge component. Each knowledge component typically has multiple practice items at different difficulty levels and in different modes. Practice modes include free_recall where the learner must produce the answer from memory with no cues, cued_recall where a hint or partial information is provided, recognition where the learner selects from options, explanation where the learner must articulate understanding in their own words, application where the learner applies knowledge to a scenario, and execution where the learner performs a hands-on task.

Mastery level is a number between zero and one representing the estimated probability that the learner will respond correctly without assistance. Mastery updates after each practice attempt using an exponential moving average. In an exponential moving average, recent values receive higher weight than older values, but history is never completely discarded. The formula is new_mastery equals alpha times current_score plus one minus alpha times old_mastery, where alpha determines how much weight to give the new observation versus history.

Spaced repetition refers to scheduling reviews at increasing intervals. The SM-2 algorithm implements this by adjusting intervals based on response quality. The algorithm maintains an easiness factor per item that increases when performance is good and decreases when performance is poor. The interval before the next review equals the previous interval multiplied by the easiness factor. After an incorrect response, the interval resets to one day. The spacing effect, with an effect size around g equals 0.74 in research literature, is one of the most robust findings in learning science: distributed practice dramatically outperforms massed practice for long-term retention.

A technique bundle is a named combination of learning techniques applied together during a study session. The five default bundles are Standard SRS combining cued recall with immediate feedback and standard spacing intervals, Deep Retrieval combining free recall with elaboration prompts and delayed feedback, Interleaved Practice adding topic mixing within sessions for discrimination learning, Execution Focus emphasizing hands-on tasks with graduated independence levels, and Generation First presenting problems before instruction to prime encoding. Tracking which bundle was used for which content enables analysis of technique effectiveness over time.

A session is a study period during which the user practices items. Sessions record their start time, end time, duration, technique bundle, and all attempts made during the session.

An attempt records a single interaction with a practice item. Each attempt captures the item presented, the response given, correctness assessment, time taken, confidence rating before the attempt, difficulty rating after the attempt, hints requested, and for execution tasks, independence level and errors encountered.

The project will be structured as follows. All source code lives under a directory called learn_system. The learn_system/app directory contains the Python package. The file learn_system/app/main.py serves as the CLI entry point using the Click framework. The file learn_system/app/config.py manages configuration constants and paths. The directory learn_system/app/database contains connection.py for SQLite management, schema.sql containing the complete database schema as SQL statements, and queries.py containing functions that execute database operations. The directory learn_system/app/ingestion contains ingest.py for orchestrating document processing, extractors.py for extracting text from PDF, DOCX, and Markdown files, and kc_extractor.py for LLM-based knowledge component identification. The directory learn_system/app/practice contains generator.py for creating practice items and templates.py for LLM prompt templates organized by knowledge type. The directory learn_system/app/session contains manager.py for session lifecycle management, scheduler.py for determining which items are due for review, presenter.py for displaying items appropriately by practice mode, and loop.py for the main interactive study loop. The directory learn_system/app/state contains estimator.py for mastery calculations using exponential moving average, spacing.py for implementing the SM-2 spaced repetition algorithm, and tracker.py for recording technique bundle history per knowledge component. The directory learn_system/app/analysis contains reports.py for analysis queries. The directory learn_system/data will contain the SQLite database file learning.db created at runtime.

The system requires five Python packages. Click version 8.0 or higher provides the command-line interface framework with decorators for defining commands and options. Python-dotenv version 1.0 or higher loads environment variables from a .env file, used for the API key. Python-docx version 0.8 or higher reads Microsoft Word DOCX files by parsing their XML structure. Pypdf version 3.0 or higher extracts text from PDF files. Anthropic version 0.18 or higher provides the official Claude API client.

The system requires Python 3.10 or higher because it uses modern type hints and match statements. An Anthropic API key must be available in the environment variable ANTHROPIC_API_KEY. The system needs approximately one hundred megabytes of disk space for the database as it grows with use. An internet connection is required during document ingestion when the LLM API is called, but not during study sessions.


## Plan of Work

This section describes the sequence of implementation in prose form.

Implementation proceeds through eight milestones that build incrementally toward the complete system. Each milestone produces working, testable functionality that the next milestone builds upon.

The first milestone establishes project foundation by creating the directory structure, implementing the complete database schema, building the CLI skeleton with the init command, and setting up configuration management. The database schema must be complete from the start because later milestones depend on specific tables and columns. The init command creates the database file and populates default technique bundles. Validation confirms that running init creates a database with all tables and that the bundles can be queried.

The second milestone implements document ingestion by building text extractors for PDF, DOCX, and Markdown formats, creating the ingest command that orchestrates extraction and storage, and storing documents with metadata in the content_sources table. Validation confirms that ingesting each file type produces stored content that can be retrieved.

The third milestone implements knowledge component extraction by building the LLM client wrapper for calling Claude, crafting extraction prompts that produce structured output, implementing text chunking for documents that exceed context limits, parsing LLM responses into knowledge component records, and storing components with their type, cognitive level, complexity, and relationships. Validation confirms that ingesting a document extracts knowledge components visible in the database with appropriate metadata.

The fourth milestone implements practice item generation by creating prompt templates specific to each knowledge type, generating multiple items per knowledge component at varying difficulty levels, and storing items with their prompts, expected responses, hints, and rubrics. Validation confirms that ingestion produces practice items for each knowledge component and that items are appropriately structured for their type.

The fifth milestone implements the core learning loop by building session management to create, track, and close sessions, implementing item presentation that formats questions appropriately for each practice mode, collecting user responses through interactive prompts, recording all attempt data including timing and ratings, and providing session summaries. Validation confirms that running the study command produces an interactive session where attempts are recorded to the database.

The sixth milestone implements the spaced repetition engine by implementing SM-2 interval calculations, building mastery estimation from attempt history, creating the scheduler that queries for due items, and updating knowledge component state after each attempt. Validation confirms that completing a session causes next review dates to be set based on performance and that subsequent todo calls reflect the schedule.

The seventh milestone implements the to-do dashboard and source-specific review by building the todo command that displays due items organized by source document with counts and overdue indicators, and implementing the review command that focuses a session on items from a specified source. Validation confirms that todo shows the expected breakdown and that review filters items correctly.

The eighth milestone implements technique bundle tracking by recording bundle associations on sessions, linking attempts to bundles through their session, and storing technique history per knowledge component to track which bundles have been used. Validation confirms that sessions record their bundle and that history accumulates correctly.


## Concrete Steps

This section provides exact commands to run from the repository root directory, which is learn_system. All paths are relative to that root unless otherwise specified.

To begin implementation, create the project directory and navigate into it:

    mkdir learn_system
    cd learn_system

Create the package structure:

    mkdir -p app/database app/ingestion app/practice app/session app/state app/analysis data
    touch app/__init__.py app/database/__init__.py app/ingestion/__init__.py
    touch app/practice/__init__.py app/session/__init__.py app/state/__init__.py
    touch app/analysis/__init__.py

Create requirements.txt with the dependencies:

    click>=8.0
    python-dotenv>=1.0
    python-docx>=0.8
    pypdf>=3.0
    anthropic>=0.18

Install dependencies:

    pip install -r requirements.txt

Create a .env file with the API key:

    echo "ANTHROPIC_API_KEY=your-key-here" > .env

After Milestone 1 is complete, verify the foundation:

    python -m app.main init

Expected output:

    Initialized database at data/learning.db
    Created 5 default technique bundles

Verify the database was created:

    sqlite3 data/learning.db ".tables"

Expected output showing all tables:

    attempts              kc_prerequisites      practice_items
    content_sources       kc_state              retention_tests
    kc_subskills          kc_technique_history  sessions
    knowledge_components  learning_goals        technique_bundles

After Milestone 2 is complete, verify document ingestion:

    python -m app.main ingest /path/to/test.pdf --domain tech

Expected output:

    Ingesting: test.pdf
    Extracted 15234 characters
    Stored as source: test.pdf (id: src_abc123)

Verify storage:

    sqlite3 data/learning.db "SELECT id, title, word_count FROM content_sources"

After Milestone 4 is complete, verify full ingestion with extraction and generation:

    python -m app.main ingest /path/to/Evaluating_LLMs.docx --domain ai_ml

Expected output:

    Ingesting: Evaluating_LLMs.docx
    Extracted 28456 characters
    Extracting knowledge components...
    Found 52 knowledge components
    Generating practice items...
    Generated 156 practice items
    Done. Source ready for study.

After Milestone 5 is complete, verify the study loop:

    python -m app.main study --duration 5

Expected interactive session beginning with:

    Starting study session (5 minutes, bundle: Standard SRS)
    
    [Item 1 of ~10]
    KC: Precision metric definition
    Mode: free_recall
    
    What is precision in the context of classification metrics?
    
    Your answer:

After providing an answer, expect:

    Expected: Precision is the ratio of true positives to all predicted positives (TP / (TP + FP))
    
    Rate your accuracy (1-5, where 5 is perfect):

After completing items, expect session summary:

    Session complete!
    Duration: 5 minutes
    Items completed: 8
    Average score: 0.72

After Milestone 6 is complete, verify spaced repetition:

    python -m app.main status

Expected output:

    Learning System Status
    =====================
    Sources: 1
    Knowledge Components: 52
    Practice Items: 156
    
    Mastery: 12% average across all KCs
    Due today: 15 items
    Overdue: 0 items

After Milestone 7 is complete, verify the todo dashboard:

    python -m app.main todo

Expected output:

    === What's Due ===
    
    🔴 OVERDUE (0 items)
    
    🟡 DUE TODAY (15 items)
      Evaluating_LLMs.docx: 15 items
    
    🟢 NEW CONTENT (37 items)
      Evaluating_LLMs.docx: 37 items not yet practiced

Verify source-specific review:

    python -m app.main review eval --duration 10

Expected output beginning:

    Starting review session for: Evaluating_LLMs.docx
    Duration: 10 minutes, Bundle: Standard SRS
    Items due from this source: 15


## Validation and Acceptance

This section describes how to verify that the implementation is correct. Acceptance criteria are stated as observable behavior.

The system is correctly implemented when all of the following behaviors can be observed:

Running `python -m app.main init` in an empty data directory creates learning.db containing twelve tables: content_sources, knowledge_components, kc_state, kc_prerequisites, kc_subskills, practice_items, attempts, sessions, technique_bundles, kc_technique_history, retention_tests, and learning_goals. The technique_bundles table contains five rows representing the default bundles.

Running `python -m app.main ingest document.pdf --domain tech` on a PDF file extracts text and stores a row in content_sources with the filename as title, extracted text in content, and a word count. The same command works for DOCX and Markdown files.

Running ingest on a document of substantial length (at least five thousand words) produces knowledge components in the knowledge_components table with appropriate knowledge_type values distributed across factual, conceptual, procedural_cognitive, and procedural_execution. Each knowledge component has a cognitive_level from the set remember, understand, apply, analyze, evaluate, create. Each has an intrinsic_complexity between one and five.

Running ingest produces practice items in the practice_items table linked to knowledge components. Each knowledge component has at least one practice item. Factual knowledge components have items with practice_mode in free_recall, cued_recall, or recognition. Conceptual knowledge components have items with practice_mode in explanation or application. Procedural_cognitive knowledge components have items with practice_mode application. Procedural_execution knowledge components have items with practice_mode execution.

Running `python -m app.main study --duration 5` starts an interactive session. The session presents practice items one at a time. For recall modes, it shows a prompt and waits for text input, then shows the expected answer. For explanation modes, it shows a scenario and waits for multi-line input, then shows evaluation criteria. For execution modes, it describes a task and asks for completion status, independence level, and errors encountered. After each item, it prompts for accuracy self-assessment (one through five) and difficulty rating (one through five). It records all inputs as an attempt row in the database. After the duration expires or items are exhausted, it shows a summary with items completed and average score.

Running `python -m app.main todo` after a study session shows items organized by source. Items practiced in the session do not appear as due today unless their computed next review date is today. Items not yet practiced appear under new content.

Running `python -m app.main review sourcename` starts a session filtered to items from sources matching the provided name pattern. Only items from matching sources appear during the session.

After multiple study sessions on different days, running `python -m app.main status` shows increasing mastery percentages for practiced knowledge components. Items practiced correctly have next review dates further in the future than items practiced incorrectly.

The technique_bundle_id on sessions matches the active bundle. The kc_technique_history table accumulates rows linking knowledge components to the bundles used when practicing them.


## Idempotence and Recovery

This section explains how to safely repeat steps and recover from partial failures.

Running init multiple times is safe. The schema creation uses IF NOT EXISTS clauses. Default technique bundles are inserted only if no bundles exist. Running init when a database already exists leaves existing data intact and ensures schema is current.

Running ingest on the same document multiple times creates duplicate entries. This is intentional: each ingestion represents a distinct processing of the source. To avoid duplicates, check for existing sources with the same filename before ingesting.

If ingestion fails partway through knowledge component extraction, no partial data is committed. The extraction process collects all components in memory before writing to the database in a single transaction. To retry after failure, simply run ingest again.

If ingestion fails during practice item generation, knowledge components will have been saved but practice items will not exist. The generation process can be run independently on existing knowledge components by calling the generate function directly or by implementing a regenerate command.

If a study session is interrupted, completed attempts are already committed to the database. Incomplete sessions may lack an end time. A cleanup function can mark interrupted sessions as abandoned. Restarting study begins a new session; no data is lost.

The database file can be backed up by copying data/learning.db. To restore, replace the file with the backup copy. All data including sources, knowledge components, practice items, attempts, and session history is contained in this single file.


## Interfaces and Dependencies

This section specifies the key functions, their signatures, and their purposes. These interfaces must exist at the end of implementation.

In learn_system/app/config.py:

    DATABASE_PATH: str
    # Path to SQLite database file, default "data/learning.db"
    
    ANTHROPIC_MODEL: str
    # Model identifier for LLM calls, default "claude-sonnet-4-20250514"
    
    def get_db_path() -> str
    # Returns absolute path to database file
    
    def get_api_key() -> str
    # Returns Anthropic API key from environment, raises if not set

In learn_system/app/database/connection.py:

    def get_connection() -> sqlite3.Connection
    # Returns connection to SQLite database, creating file if needed
    
    def init_database() -> None
    # Creates all tables and indexes if they do not exist
    
    def init_default_bundles() -> None
    # Inserts default technique bundles if none exist

In learn_system/app/database/queries.py:

    def insert_source(title: str, content: str, domain: str, metadata: dict) -> str
    # Inserts content source, returns generated ID
    
    def get_source(source_id: str) -> dict | None
    # Returns source record or None if not found
    
    def insert_kc(source_id: str, name: str, description: str, knowledge_type: str,
                  cognitive_level: str, intrinsic_complexity: int, domain: str) -> str
    # Inserts knowledge component, returns generated ID
    
    def get_kcs_for_source(source_id: str) -> list[dict]
    # Returns all knowledge components for a source
    
    def insert_practice_item(kc_id: str, practice_mode: str, difficulty_level: int,
                            prompt: str, expected_response: str, hints: list[str]) -> str
    # Inserts practice item, returns generated ID
    
    def get_items_for_kc(kc_id: str) -> list[dict]
    # Returns all practice items for a knowledge component
    
    def get_due_items(as_of: datetime) -> list[dict]
    # Returns items where next_review_at <= as_of, ordered by urgency
    
    def get_due_items_for_source(source_id: str, as_of: datetime) -> list[dict]
    # Returns due items filtered to specific source
    
    def insert_session(technique_bundle_id: str, session_type: str) -> str
    # Creates session record, returns generated ID
    
    def end_session(session_id: str, items_completed: int, notes: str) -> None
    # Updates session with end time and summary
    
    def insert_attempt(session_id: str, practice_item_id: str, kc_id: str,
                      response: str, score: float, correctness: str,
                      confidence_before: int, difficulty_rating: int,
                      response_time_ms: int, hints_requested: int) -> str
    # Records attempt, returns generated ID
    
    def get_kc_state(kc_id: str) -> dict | None
    # Returns current state for knowledge component
    
    def update_kc_state(kc_id: str, mastery_level: float, next_review_at: datetime,
                       interval_days: float, easiness_factor: float) -> None
    # Updates state after attempt

In learn_system/app/ingestion/extractors.py:

    def extract_pdf(file_path: str) -> str
    # Extracts text content from PDF file
    
    def extract_docx(file_path: str) -> str
    # Extracts text content from DOCX file
    
    def extract_markdown(file_path: str) -> str
    # Reads and returns Markdown file content
    
    def extract_text(file_path: str) -> str
    # Dispatches to appropriate extractor based on file extension

In learn_system/app/ingestion/kc_extractor.py:

    def extract_kcs(source_id: str, content: str, domain: str) -> list[dict]
    # Calls LLM to extract knowledge components from content
    # Returns list of KC dictionaries with name, description, type, level, complexity
    
    def chunk_content(content: str, max_chars: int = 20000) -> list[str]
    # Splits content into chunks for processing, preserving paragraph boundaries

In learn_system/app/practice/generator.py:

    def generate_items_for_kc(kc: dict) -> list[dict]
    # Generates practice items appropriate for KC type
    # Returns list with prompt, expected_response, hints, difficulty_level, practice_mode
    
    def generate_all_items(source_id: str) -> int
    # Generates items for all KCs in source, returns count generated

In learn_system/app/practice/templates.py:

    def get_factual_prompt(kc: dict) -> str
    # Returns LLM prompt for generating factual practice items
    
    def get_conceptual_prompt(kc: dict) -> str
    # Returns LLM prompt for generating conceptual practice items
    
    def get_procedural_cognitive_prompt(kc: dict) -> str
    # Returns LLM prompt for generating procedural-cognitive items
    
    def get_procedural_execution_prompt(kc: dict) -> str
    # Returns LLM prompt for generating execution task items

In learn_system/app/session/scheduler.py:

    def get_study_queue(duration_minutes: int, source_id: str | None = None) -> list[dict]
    # Builds ordered queue of items to practice
    # Prioritizes: overdue, due today, new items, reinforcement
    
    def get_todo_summary() -> dict
    # Returns counts of overdue, due today, and new items by source

In learn_system/app/session/presenter.py:

    def present_recall_item(item: dict) -> tuple[str, float]
    # Displays recall prompt, collects response, shows expected, gets self-score
    # Returns (response_text, score)
    
    def present_explanation_item(item: dict) -> tuple[str, float]
    # Displays scenario, collects explanation, shows rubric, gets self-score
    # Returns (response_text, score)
    
    def present_execution_item(item: dict) -> tuple[dict, float]
    # Displays task, collects completion status and metadata
    # Returns (execution_metadata, score)

In learn_system/app/session/loop.py:

    def run_study_session(duration_minutes: int, bundle_id: str,
                         source_id: str | None = None) -> dict
    # Runs interactive study loop, returns session summary

In learn_system/app/state/estimator.py:

    def calculate_mastery(kc_id: str, new_score: float, current_mastery: float,
                         exposure_count: int) -> float
    # Computes updated mastery using exponential moving average
    # Alpha varies by exposure count: higher early, lower later

In learn_system/app/state/spacing.py:

    def calculate_next_review(score: float, current_interval: float,
                             easiness_factor: float) -> tuple[float, float, datetime]
    # Implements SM-2 algorithm
    # Returns (new_interval_days, new_easiness_factor, next_review_datetime)

In learn_system/app/state/tracker.py:

    def record_technique_usage(kc_id: str, bundle_id: str) -> None
    # Records that KC was practiced with given bundle
    # Updates kc_technique_history table

In learn_system/app/main.py:

    @click.command()
    def init() -> None
    # Initializes database and default bundles
    
    @click.command()
    @click.argument('file_path')
    @click.option('--domain', default='general')
    def ingest(file_path: str, domain: str) -> None
    # Ingests document, extracts KCs, generates practice items
    
    @click.command()
    def status() -> None
    # Shows system status including source count, KC count, mastery summary
    
    @click.command()
    def sources() -> None
    # Lists all ingested sources with item counts
    
    @click.command()
    @click.option('--duration', default=30)
    @click.option('--bundle', default='standard_srs')
    def study(duration: int, bundle: str) -> None
    # Starts study session with specified duration and technique bundle
    
    @click.command()
    def todo() -> None
    # Shows what's due for review organized by source
    
    @click.command()
    @click.argument('source_pattern')
    @click.option('--duration', default=30)
    def review(source_pattern: str, duration: int) -> None
    # Starts review session filtered to matching sources


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

This section provides narrative detail for each milestone, following the structure: what will exist at the end that did not exist before, what work is involved, and how to verify completion.


### Milestone 1: Project Foundation

At the end of this milestone, the project directory structure exists, the database schema is defined and can be created, the CLI responds to the init command, and five default technique bundles are stored in the database. Nothing is visible to the end user yet except confirmation that initialization succeeded.

The work involves creating all directories and empty __init__.py files as specified in the project structure. The config.py file defines paths and provides functions to retrieve the database path and API key. The schema.sql file contains all CREATE TABLE and CREATE INDEX statements. The connection.py file implements get_connection returning a SQLite connection and init_database executing the schema. The queries.py file starts with insert and retrieval functions for technique bundles. The main.py file uses Click to define the init command that calls init_database and init_default_bundles.

To verify, run `python -m app.main init` from the learn_system directory. The output should confirm database creation and bundle initialization. Then run `sqlite3 data/learning.db ".tables"` to confirm all twelve tables exist. Run `sqlite3 data/learning.db "SELECT name FROM technique_bundles"` to confirm five bundles exist.


### Milestone 2: Document Ingestion

At the end of this milestone, the ingest command accepts a file path and domain, extracts text from PDF, DOCX, or Markdown files, and stores the content in the content_sources table. Knowledge component extraction and practice generation are not yet implemented; this milestone focuses only on getting document content into the database.

The work involves implementing extract_pdf using pypdf to iterate pages and join their text. Implementing extract_docx using python-docx to iterate paragraphs and join their text. Implementing extract_markdown by simply reading the file. Implementing extract_text to dispatch based on file extension. Adding insert_source and get_source to queries.py. Implementing the ingest command in main.py that calls extract_text, computes word count, and calls insert_source.

To verify, run `python -m app.main ingest /path/to/test.pdf --domain tech` on a PDF file. Confirm output shows extraction character count and stored source ID. Run `sqlite3 data/learning.db "SELECT id, title, word_count FROM content_sources"` to confirm the row exists. Repeat with a DOCX file and a Markdown file to verify all extractors work.


### Milestone 3: Knowledge Component Extraction

At the end of this milestone, the ingest command not only stores document content but also calls the LLM to extract knowledge components and stores them with full metadata. Practice items are not yet generated; this milestone focuses on the extraction step.

The work involves implementing an LLM client wrapper that calls the Anthropic API with appropriate error handling. Implementing chunk_content to split large documents at paragraph boundaries. Implementing extract_kcs that builds the extraction prompt, calls the LLM, parses the JSON response, and returns structured KC data. Adding insert_kc and get_kcs_for_source to queries.py. Modifying the ingest command to call extract_kcs after storing the source and insert each KC. Implementing deduplication to avoid exact duplicate KC names within a source.

To verify, run ingest on a substantial document. Confirm output shows knowledge component count. Run `sqlite3 data/learning.db "SELECT name, knowledge_type, cognitive_level FROM knowledge_components WHERE source_id = 'xxx'"` replacing xxx with the source ID. Confirm knowledge components exist with appropriate type distribution. Verify that factual, conceptual, and procedural types are all represented if the source content warrants them.


### Milestone 4: Practice Item Generation

At the end of this milestone, the ingest command generates practice items for each knowledge component. The full ingestion pipeline is complete: document goes in, knowledge components and practice items come out.

The work involves implementing prompt templates for each knowledge type in templates.py. Factual templates request free recall, cued recall, and recognition items with expected answers and hints. Conceptual templates request explanation and application items with scenarios and rubrics. Procedural_cognitive templates request problem-solving items with solution steps. Procedural_execution templates request task descriptions with success criteria. Implementing generate_items_for_kc that selects the appropriate template, calls the LLM, parses responses, and returns item dictionaries. Implementing generate_all_items that iterates through KCs and generates items. Adding insert_practice_item and get_items_for_kc to queries.py. Modifying the ingest command to call generate_all_items after KC extraction.

To verify, run ingest on a document. Confirm output shows practice item count, which should be roughly three times the KC count. Run `sqlite3 data/learning.db "SELECT pi.practice_mode, COUNT(*) FROM practice_items pi GROUP BY pi.practice_mode"` to confirm items exist across different modes. Examine specific items with `SELECT prompt, expected_response FROM practice_items LIMIT 3` to verify quality.


### Milestone 5: Core Learning Loop

At the end of this milestone, the study command starts an interactive session where the user practices items and all responses are recorded. The session runs for a specified duration, presents items one at a time, collects responses and ratings, and provides a summary at the end.

The work involves implementing insert_session and end_session in queries.py. Implementing insert_attempt with all the tracking fields. Implementing get_study_queue in scheduler.py that returns items ordered by priority, initially just randomized since spaced repetition is not yet implemented. Implementing present_recall_item that prints the prompt, waits for input, prints expected response, and prompts for self-assessed score. Implementing present_explanation_item similarly but for multi-line input with rubric display. Implementing present_execution_item that describes the task and collects completion metadata. Implementing run_study_session in loop.py that creates a session, loops through items calling appropriate presenters, records attempts, and summarizes results. Adding the study command to main.py.

To verify, run study after ingesting a document. Confirm the interactive loop presents items and accepts input. Complete several items and verify the session summary appears. Query `SELECT COUNT(*) FROM attempts WHERE session_id = 'xxx'` to confirm attempts were recorded. Query `SELECT response, score, confidence_before FROM attempts LIMIT 3` to verify data captured.


### Milestone 6: Spaced Repetition Engine

At the end of this milestone, item review dates are calculated using the SM-2 algorithm, mastery estimates update after each attempt, and the scheduler returns items based on their due dates. The system now implements spaced repetition.

The work involves implementing calculate_next_review in spacing.py following the SM-2 algorithm as specified in artifacts. Implementing calculate_mastery in estimator.py using exponential moving average. Adding update_kc_state to queries.py. Modifying the attempt recording flow to call these functions and update kc_state after each attempt. Modifying get_study_queue to query kc_state for next_review_at and prioritize overdue and due items. Implementing get_due_items and get_due_items_for_source in queries.py. Adding the status command to main.py showing source count, KC count, average mastery, and due item count.

To verify, complete a study session and then query `SELECT kc_id, mastery_level, next_review_at FROM kc_state WHERE mastery_level > 0 LIMIT 5` to confirm states were updated. Verify that next_review_at values are in the future. Run status and confirm it shows due item counts. Manually update a next_review_at to the past with `UPDATE kc_state SET next_review_at = datetime('now', '-1 day') WHERE kc_id = 'xxx'` and verify that item appears in the next study session.


### Milestone 7: To-Do Dashboard and Source Review

At the end of this milestone, the todo command shows items organized by source with overdue, due today, and new content sections. The review command starts a session filtered to items from a specific source. Users can now see what needs attention and focus on specific topics.

The work involves implementing get_todo_summary in scheduler.py that queries items grouped by source with categorization into overdue, due_today, and new based on next_review_at and exposure_count. Adding the todo command to main.py that calls get_todo_summary and formats output with emoji indicators and counts per source. Modifying get_study_queue to accept an optional source filter. Adding the review command that finds sources matching a pattern, selects one if multiple match, and calls run_study_session with that source ID. Adding the sources command to list ingested sources.

To verify, ingest two different documents. Complete some items from one document. Run todo and confirm output shows both sources with appropriate categorization. Items from the practiced document should appear under due sections; items from the unpracticed document should appear under new content. Run `review doc1` and confirm only items from that source appear. Run sources and confirm both documents are listed.


### Milestone 8: Technique Bundle Tracking

At the end of this milestone, sessions record which technique bundle was used, and the system tracks technique history per knowledge component. This provides the data foundation for analyzing which techniques work best.

The work involves ensuring sessions.technique_bundle_id is set when creating sessions. Implementing record_technique_usage in tracker.py that inserts or updates kc_technique_history when a KC is practiced with a bundle. Modifying the study loop to call record_technique_usage after each attempt. Adding a bundle option to the study and review commands with bundle_standard as the default. Verifying that history accumulates across sessions.

To verify, complete a study session with the default bundle. Query `SELECT * FROM kc_technique_history LIMIT 5` to confirm history records exist. Start another session with `study --bundle bundle_deep` and practice the same items. Query history again and confirm new records show the deep bundle. Query `SELECT tb.name, COUNT(*) FROM kc_technique_history kth JOIN technique_bundles tb ON kth.technique_bundle_id = tb.id GROUP BY tb.name` to confirm both bundles have history.


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

No revisions yet. This is the initial version of the PLANS.md-compliant ExecPlan.
