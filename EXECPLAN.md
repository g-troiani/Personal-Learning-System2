# Personal Adaptive Learning System - Implementation Plan

This ExecPlan is a living document maintained in accordance with PLANS.md. The sections Progress, Surprises and Discoveries, Decision Log, and Outcomes and Retrospective must be kept up to date as work proceeds. All content required to implement this system is contained within this document; no external references are needed.

**SECURITY WARNING:** NEVER put API keys, secrets, URLs with credentials, or any sensitive values in this file or any file that will be committed to git. All credentials belong ONLY in .env files which are gitignored. Use placeholders like `$YOUR_KEY` or `<your-api-key>` when documenting commands that require credentials.


## IMPORTANT: Before Starting Any Work

**You MUST read the external memory before implementing any milestone or making changes.**

1. **Always read first:**
   - `.claude/memory/INDEX.md` — Overview of all archived content
   - `.claude/memory/decisions/architecture.md` — Architectural constraints
   - `.claude/memory/decisions/technology.md` — Stack choices and rationale

2. **Then read based on your task:**
   - CLI work → `.claude/memory/milestones/cli_foundation.md`
   - Web UI work → `.claude/memory/milestones/webui_core.md`
   - Upload/processing → `.claude/memory/milestones/sources_feature.md`
   - Performance issues → `.claude/memory/milestones/speed_optimization.md`
   - Database changes → `.claude/memory/schemas/database.md`
   - API changes → `.claude/memory/schemas/api.md`

3. **Why this matters:** This EXECPLAN is intentionally slim (~500 lines). Full implementation details, decisions, and patterns are archived in `.claude/memory/`. Reading the archives prevents repeating mistakes and ensures consistency with past decisions.

4. **ALWAYS spawn 3 scout subagents before implementing ANY milestone:**

   | Agent | Focus | Searches |
   |-------|-------|----------|
   | **Decisions Scout** | Constraints & trade-offs | `decisions/*.md` |
   | **Patterns Scout** | Implementation precedents | `milestones/*.md` |
   | **Schema Scout** | Data structures & APIs | `schemas/*.md`, `reference/*.md` |

   **This is mandatory. Do NOT skip.** Failing to understand the memory will break the repo.

See CLAUDE.md "Memory System" section for complete protocol.


## Purpose and Big Picture

After implementing this system, a user can upload educational documents and receive automatically generated practice items scheduled for optimal retention. The user runs a command to see what needs review, another command to study, and the system tracks everything needed to measure learning effectiveness over time.

The observable behavior works as follows. On Monday, the user runs `python -m app.main ingest Evaluating_LLMs.docx --domain ai_ml` and the system extracts approximately fifty knowledge components, generates around one hundred fifty practice items, and stores them in a local database. The user then runs `python -m app.main study --duration 30` and spends thirty minutes practicing. The system presents items, collects responses, records confidence and difficulty ratings, and updates mastery estimates. On Tuesday, the user runs `python -m app.main todo` and sees output showing that fifteen items from the LLM evaluation document are due for review. The user runs `python -m app.main review eval` to focus on that specific topic. After a week of use across multiple documents, the database contains enough data to analyze which learning techniques produce better retention for which types of content.

The system solves five problems. First, it eliminates the "I don't know what I don't know" problem by forcing retrieval practice that reveals actual gaps. Second, it fights forgetting through spaced repetition scheduling. Third, it measures learning objectively through tracked performance rather than felt fluency. Fourth, it enables self-experimentation by recording which techniques were used for which content. Fifth, it removes cognitive overhead by telling the user exactly what to practice and when.


## Progress

This section tracks granular progress with timestamps. Each stopping point must be documented, even if it requires splitting a partially completed task.

**CLI Foundation (M1-M8)** - See `.claude/memory/milestones/cli_foundation.md`
- [x] M1: Project foundation - database schema, CLI skeleton, configuration (2026-01-02)
- [x] M2: Document ingestion - text extraction, content storage (2026-01-02)
- [x] M3: KC extraction - LLM-based identification, chunking, deduplication (2026-01-02)
- [x] M4: Practice items - type-specific generation, hints, rubrics (2026-01-02)
- [x] M5: Study loop - session management, response collection (2026-01-02)
- [x] M6: Spaced repetition - SM-2 scheduling, mastery tracking (2026-01-02)
- [x] M7: Todo dashboard - due items by source (2026-01-02)
- [x] M8: Technique bundles - self-experimentation foundation (2026-01-02)

**Web UI Core (M9-M15)** - See `.claude/memory/milestones/webui_core.md`
- [x] M9: Web foundation - React/Vite scaffold, routing, SupabaseContext (2026-01-02)
- [x] M10: Home dashboard - greeting, alerts, source cards, quick stats (2026-01-02)
- [x] M11: Study session - question cards, answer input, self-assessment (2026-01-02)
- [x] M12: Calendar - month navigation, session scheduling (2026-01-02)
- [x] M13: Due for review - urgency sections, filtered study links (2026-01-02)
- [x] M14: Progress - stat cards, mastery by source, weekly chart (2026-01-02)
- [x] M15: Analytics - technique comparison, calibration analysis, recommendations (2026-01-02)

**Sources Feature (M16-M20)** - See `.claude/memory/milestones/sources_feature.md`
- [x] Sources research - 5 parallel agents, NEW FEATURES.md spec (2026-01-02)
- [x] M16: Sources page - list display, filtering, sorting (2026-01-02)
- [x] M17: Upload UI - drag-drop zone, file validation (2026-01-02)
- [x] M18: FastAPI backend - upload endpoint, processing pipeline (2026-01-02)
- [x] M19: Real-time progress - Supabase Realtime, polling fallback (2026-01-02)
- [x] M20: Error handling - delete UI, SourceDetailPanel, confirmation dialogs (2026-01-03)

**Speed Optimization (M21-M23)** - See `.claude/memory/milestones/speed_optimization.md`
- [x] M21: Groq client - fast LLM, batch database inserts (2026-01-03)
- [x] M22: Parallel processing - ThreadPoolExecutor, 5 workers (2026-01-03)
- [x] M23: Error resilience - retry logic, exponential backoff (2026-01-03)
- Bug fixes: delete 404, stuck upload detection, stale sidebar, empty state UI (2026-01-03)

**Agent Memory System (M24-M29)** - Complete
- [x] M24: Memory directory structure - `.claude/memory/` with subdirs (2026-01-04)
- [x] M25: Extract milestones to archive - 4 files created (2026-01-04)
- [x] M26: Extract decisions and schemas - 6 files created, Decision Log trimmed (2026-01-04)
- [x] M27: Extract reference material - 3 files created, Research Foundation trimmed (2026-01-04)
- [x] M28: Slim EXECPLAN - reduced from 1500 to 502 lines (2026-01-04)
- [x] M29: Update CLAUDE.md - memory access instructions added (2026-01-04)


## Surprises and Discoveries

Key lessons learned during implementation:

**Environment & Configuration:**
- Single `.env` file in project root serves both Python (no `export` prefix) and Vite (`VITE_` prefix required)
- Shell env vars override `.env` files - run `env | grep VITE_` to diagnose connection issues
- API server must run on port 8001 to match frontend: `uvicorn app.api.server:app --port 8001`

**Supabase:**
- Use `sb_publishable_` keys in browser (secret keys are blocked)
- Realtime requires: `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sources;`
- Always use polling fallback alongside Realtime subscriptions
- Python library v2.27.0+ required for newer key formats

**Python 3.9 Compatibility:**
- Use `Optional[X]` instead of `X | None`, `List[Dict]` instead of `list[dict]`
- Timestamp parsing needs try-except for variable microsecond precision

**LLM APIs:**
- Groq model `qwen-qwq-32b` deprecated → use `qwen/qwen3-32b`
- Groq rate limits can cause stuck processing - retry logic helps but timeouts needed
- Practice items: 3 per KC consistently (predictable 3:1 ratio)


## Known Issues and Future Improvements

**CRITICAL: Large Upload Reliability**
- **Issue:** System can get stuck indefinitely when processing large documents if Groq API rate limits are hit or responses are slow
- **Risk:** User uploads content, sees partial progress, then processing hangs forever with no timeout
- **Current mitigations:**
  - Retry logic with exponential backoff (M23)
  - Parallel processing reduces total time (M22)
  - Progress polling shows status updates
- **Recommended improvements:**
  1. Add per-KC timeout (e.g., 60 seconds) - if a single KC generation fails, skip it and continue
  2. Add overall job timeout (e.g., 10 minutes) - mark as error if not complete
  3. Add "partial completion" status - allow documents with some failed KCs to be marked as ready with a warning
  4. Consider queuing large documents for background processing with email/notification on completion
  5. Add retry button on stuck/stale processing jobs (>5 minutes without progress update)

**Processing Speed Requirements (CRITICAL for user retention):**
- **Target: <1 minute for standard uploads** - users abandon if processing takes too long
- Only very large content (entire books) should exceed 1 minute
- Current performance is too slow and needs optimization:
  - KC extraction with Claude is the main bottleneck
  - Consider switching KC extraction to Groq for speed
  - Consider generating fewer items per KC initially (1-2 instead of 3)
  - Consider on-demand item generation during practice sessions
- Progress updates throttled to 0.5s intervals to avoid overwhelming Supabase


## Decision Log

**Full decision archive:** `.claude/memory/decisions/`
- `architecture.md` - Supabase, hybrid CLI/web, FastAPI, processing status
- `technology.md` - Claude/Groq, SM-2, React/Vite, ThreadPoolExecutor
- `patterns.md` - Batch inserts, retry logic, progress callbacks

Recent decisions only below. See archives for full rationale.

(No new decisions since M26 archive created 2026-01-04)


## Outcomes and Retrospective

**Full archive:** `.claude/memory/reference/retrospective.md`

Retrospectives for M1-M8 (CLI), M9-M15 (Web UI), M16-M19 (Sources). Key outcomes: complete document pipeline, LLM-based KC extraction, SM-2 scheduling, web UI with feature parity, real-time upload processing. See archive for detailed what worked/gaps/lessons.


## Context and Orientation

**Full archive:** `.claude/memory/reference/context.md`

This is a personal learning tool: CLI + Web UI, Supabase (PostgreSQL), Claude API for ingestion, Groq for item generation. Key concepts: Knowledge Component (KC), practice items, mastery level (EMA), SM-2 spaced repetition, technique bundles. Project structure: `learn_system/` (Python CLI) and `web/` (React). See archive for complete glossary.


## Plan of Work

Implementation proceeds through twenty-three milestones. All milestones 1-23 are complete.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI Core (Complete):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.

**Sources Feature (Complete):** M16: Sources page foundation with list display. M17: Upload UI with drag-drop and validation. M18: FastAPI backend with processing endpoints. M19: Real-time processing progress. M20: Error handling and polish.

**Speed Optimization (Complete):** M21: Groq client and batch database inserts. M22: Parallel practice item generation. M23: Error resilience and retry logic.

**Agent Memory System (Pending):** M24: Create memory directory structure. M25: Extract completed milestones to archive. M26: Extract decisions and schemas. M27: Extract reference material. M28: Slim EXECPLAN to active content only. M29: Update CLAUDE.md with memory access instructions.


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
# Use values from your web/.env file
VITE_SUPABASE_URL="$YOUR_SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$YOUR_PUBLISHABLE_KEY" \
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


## Memory Index

External memory in `.claude/memory/` (13 files):

| Category | Files |
|----------|-------|
| `milestones/` | cli_foundation.md, webui_core.md, sources_feature.md, speed_optimization.md |
| `decisions/` | architecture.md, technology.md, patterns.md |
| `schemas/` | database.md, api.md, components.md |
| `reference/` | research.md, context.md, retrospective.md |

See `.claude/memory/INDEX.md` for full summaries and cross-references.


## Artifacts and Notes

**Full schema archive:** `.claude/memory/schemas/`
- `database.md` - Full Supabase schema (12 tables), indexes, migrations, default bundles
- `api.md` - FastAPI endpoints, Pydantic models, processing pipeline
- `components.md` - React component hierarchy, hooks, contexts

**SM-2 Algorithm Quick Reference:**
- Score < 3: Reset interval to 1 day
- Score >= 3: Multiply interval by easiness factor (min 1.3)
- Full pseudocode in `schemas/database.md`

**Processing Status Values:**
- pending → extracting_text → extracting_kcs → generating_items → ready (or error)


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

### Web UI Milestones 9-15 (Complete)

All Web UI milestones are complete. See the **Progress** section for detailed implementation notes.

- **M9:** Foundation (React/Vite/Tailwind setup, Sidebar, Layout, SupabaseContext)
- **M10:** Home dashboard (greeting, overdue alert, search, quick actions, source cards)
- **M11:** Study session (question card, answer input, self-assessment, session summary)
- **M12:** Calendar (month navigation, calendar grid, schedule form)
- **M13:** Due for Review (sections by urgency, source items, action buttons)
- **M14:** Progress (stat cards, mastery by source, weekly chart, streak)
- **M15:** Analytics (insight cards, technique comparison, calibration analysis, items needing attention)

### Sources Feature Milestones 16-20 (Complete)

**Full specs:** `.claude/memory/milestones/sources_feature.md`

M16-M20 implemented Sources page with document upload, FastAPI backend, real-time processing progress, delete/detail panels. Complete with all features working.


### Speed Optimization Milestones 21-23 (Complete)

**Full specs:** `.claude/memory/milestones/speed_optimization.md`

M21-M23 reduced processing time from 60-165s to 15-40s (~4x speedup). Groq (Qwen3 32B) for item generation, ThreadPoolExecutor (5 workers) for parallel processing, retry logic with exponential backoff.


### Agent Memory System Milestones 24-29 (Pending)

These milestones implement a tiered memory system to manage EXECPLAN complexity. The pattern adapts MemGPT's "LLM as Operating System" architecture for file-based Claude Code: core memory (always loaded) plus external memory (retrieved on demand). After completion, EXECPLAN.md shrinks from ~1500 lines to ~400 lines of active content while preserving full historical access.

**Architecture:**

    ┌─────────────────────────────────────────────────────────┐
    │                    CORE MEMORY                          │
    │              (Always in context)                        │
    ├─────────────────────────────────────────────────────────┤
    │  CLAUDE.md          │  EXECPLAN.md (slim)               │
    │  - Instructions     │  - Active state                   │
    │  - Memory access    │  - Current milestones             │
    │  - Conventions      │  - Known issues                   │
    └─────────────────────────────────────────────────────────┘
                              │
                              │ Read on demand
                              ▼
    ┌─────────────────────────────────────────────────────────┐
    │                  EXTERNAL MEMORY                        │
    │              (.claude/memory/)                          │
    ├─────────────────────────────────────────────────────────┤
    │  milestones/          │  decisions/                     │
    │  schemas/             │  reference/                     │
    └─────────────────────────────────────────────────────────┘

- **M24:** Create memory directory structure
- **M25:** Extract completed milestones to archive
- **M26:** Extract decisions and schemas
- **M27:** Extract reference material
- **M28:** Slim EXECPLAN to active content only
- **M29:** Update CLAUDE.md with memory access instructions


### Milestones 24-27 (Complete)

All directory structure and content extraction complete:
- M24: Created `.claude/memory/{milestones,decisions,schemas,reference}/` with INDEX.md
- M25: Archived M1-M23 to 4 milestone files, trimmed Progress section
- M26: Created 6 decision/schema files, trimmed Decision Log and Artifacts
- M27: Created 3 reference files, trimmed Research Foundation section


### Milestone 28: Slim EXECPLAN to Active Content Only

At the end of this milestone, EXECPLAN.md is under 500 lines containing only active work content.

**Sections to keep (with target lines):**
- Purpose and Big Picture (20)
- Progress - summaries only (50)
- Active Milestones - M24-M29 full detail (200)
- Known Issues and Future Improvements (30)
- Surprises and Discoveries - recent only (20)
- Memory Index - new section (30)
- CLI and Web Usage Reference (50)
- Recovery Notes (15)

**Sections to archive or remove:**
- Completed milestone details → already in milestones/
- Full Decision Log → already in decisions/
- Outcomes and Retrospective → archive to reference/
- Context and Orientation → already in reference/
- Full Artifacts → already in schemas/
- Web UI Design Specifications → archive to schemas/
- Research Foundation → already in reference/

**Work:**

1. Add Memory Index section pointing to all `.claude/memory/` files
2. Remove archived content, replace with one-line links
3. Consolidate redundant sections
4. Verify all information still accessible

**Verification:** EXECPLAN.md under 500 lines. `wc -l EXECPLAN.md` returns < 500. All content still accessible via memory files.


### Milestone 29: Update CLAUDE.md with Memory Access Instructions

At the end of this milestone, CLAUDE.md contains complete instructions for accessing the memory system, including proactive lookups before starting new work.

**Work:**

Add Memory System section to CLAUDE.md after ExecPlans section:

    ## Memory System

    This project uses a tiered memory system to manage complexity.

    ### Core Memory (Always Loaded)
    - `EXECPLAN.md`: Active state, current milestones, known issues
    - `CLAUDE.md`: This file - instructions, conventions, memory access

    ### External Memory (Read on Demand)
    Stored in `.claude/memory/`:

    | File | Contains | Read When |
    |------|----------|-----------|
    | `INDEX.md` | Summary of all memory files | Starting new topic |
    | `milestones/cli_foundation.md` | M1-M8 details | Debugging CLI |
    | `milestones/webui_core.md` | M9-M15 details | Modifying UI |
    | `milestones/sources_feature.md` | M16-M20 details | Upload issues |
    | `milestones/speed_optimization.md` | M21-M23 details | Performance |
    | `decisions/architecture.md` | Structural choices | Proposing changes |
    | `decisions/technology.md` | Stack choices | Evaluating alternatives |
    | `schemas/database.md` | Supabase schema | Database work |
    | `schemas/api.md` | FastAPI specs | API modifications |
    | `reference/research.md` | Learning science | Justifying features |

    ### Starting New Work Protocol (IMPORTANT)

    Before implementing a new milestone, PROACTIVELY read relevant memory:

    1. **Always read first:**
       - `.claude/memory/INDEX.md` - orient to available memory
       - `decisions/architecture.md` - check architectural constraints
       - `decisions/technology.md` - verify stack choices still apply

    2. **Read based on work type:**
       - CLI work → `milestones/cli_foundation.md`
       - Web UI work → `milestones/webui_core.md`
       - Upload/processing → `milestones/sources_feature.md`
       - Performance → `milestones/speed_optimization.md`
       - Database changes → `schemas/database.md`
       - API changes → `schemas/api.md`
       - New features → `reference/research.md` (learning science basis)

    3. **Check for patterns:**
       - Similar past milestones for implementation patterns
       - Related decisions for constraints and trade-offs
       - Known issues that may affect new work

    4. **Spawn scout subagents (for complex milestones):**

       For milestones with 3+ work items or cross-cutting concerns, spawn 3 parallel subagents to search archived memory. Each agent receives the milestone goal and work items.

       | Agent | Focus | Searches | Returns |
       |-------|-------|----------|---------|
       | **Decisions Scout** | Constraints & trade-offs | `decisions/*.md` | Relevant constraints, past rationale |
       | **Patterns Scout** | Implementation precedents | `milestones/*.md` | Similar past work, reusable patterns, gotchas |
       | **Schema Scout** | Data structures & APIs | `schemas/*.md`, `reference/*.md` | Affected tables, endpoints, type definitions |

       **Subagent prompt template:**
       ```
       MILESTONE: [ID and title]
       GOAL: [the "At the end of this milestone..." statement]
       WORK ITEMS: [list of tasks]

       Search .claude/memory/[your-area]/ and return:
       1. RELEVANT: Items that directly affect this milestone
       2. CONSTRAINTS: Rules/decisions we must follow
       3. PATTERNS: Similar past implementations to reference
       4. RISKS: Potential conflicts or issues to watch for

       Be specific. Quote file paths and line references.
       ```

       **Workflow:**
       1. Read EXECPLAN.md milestone description
       2. Spawn 3 scouts in parallel (single message, multiple Task calls)
       3. Wait for all results
       4. Synthesize: conflicts? missing info? clear to proceed?
       5. If clear → implement with focused context
       6. If conflicts → resolve before coding

    **Example: Starting M30 (hypothetical new CLI command)**

    Step 1 - Quick reads:
    → Read INDEX.md for orientation
    → Read decisions/architecture.md for CLI design principles

    Step 2 - Spawn scouts (parallel):
    ```
    Scout 1 (Decisions): "M30 adds `learn export` command. Search decisions/*.md
    for CLI design principles, output format decisions, any constraints on new commands."

    Scout 2 (Patterns): "M30 adds `learn export` command. Search milestones/*.md
    for how previous CLI commands were implemented, error handling patterns, testing approach."

    Scout 3 (Schemas): "M30 adds `learn export` command. Search schemas/*.md
    for data structures needed for export, any API endpoints that might be affected."
    ```

    Step 3 - Synthesize scout results, resolve conflicts, then implement

    ### Reactive Retrieval Triggers

    Also read external memory when:
    1. User asks about completed features
    2. You encounter unexpected behavior
    3. You're unsure about prior decisions
    4. Debugging requires implementation context

    ### Memory Update Protocol

    After completing work:
    1. Archive detailed notes to appropriate memory file
    2. Update EXECPLAN.md Progress (keep concise - link to archive)
    3. Update INDEX.md if new file created
    4. Add new decisions to decisions/*.md with rationale

**Verification:** CLAUDE.md contains Memory System section with both proactive and reactive protocols. New session starting a milestone reads relevant archives before implementation.


## Web UI Reference

**Full specs:** `.claude/memory/schemas/components.md`

Stack: React 18, Vite 5, Tailwind CSS 3.4, React Router 6, Recharts 2, Supabase Client 2.
Structure: `web/src/{components,pages,contexts,hooks,services,lib}` and `learn_system/app/api/`.
Design: Inter font, #FAF9F7 background, #10B981 progress accent. See archive for full specs.


## Research Foundation

**Full archive:** `.claude/memory/reference/research.md`

Learning science research (Make It Stick, A Mind for Numbers, Ultralearning, Adaptive Learning Platform Blueprint) informs all system design. Key findings: retrieval practice, spacing effect (g ≈ 0.74), interleaving, desirable difficulties, cognitive load theory, ZPD, elaboration, metacognition, self-experimentation. See archive for feature mapping by source.


## Revision History

- 2026-01-02: M1-M8 CLI, M9-M15 Web UI completed
- 2026-01-02: M16-M19 Sources feature with FastAPI backend
- 2026-01-03: M20-M23 Error handling, speed optimization (Groq, parallel processing)
- 2026-01-04: M24-M29 Agent memory system implementation
