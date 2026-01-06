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
   - Document Reader (M30-M38) → `NEW FEATURES.md` (full specs)
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

**Document Reader Feature (M30-M38):** After these milestones, users can read uploaded documents directly in the browser before starting practice. The workflow becomes: upload → read/study → practice, with documents always one click away. Users navigate to `/reader/:sourceId` to view PDFs or Markdown with a Table of Contents in the sidebar, take notes, highlight text, and ask AI questions about the content. They can generate practice questions from highlighted text, creating a seamless learning loop.


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

**Document Reader Feature (M30-M38)** - In Progress
- [x] Research phase - 6 parallel agents, NEW FEATURES.md consolidated spec (2026-01-05)
- [x] M30: Core infrastructure - database migration, Supabase Storage, /reader route (2026-01-05)
  - Added storage_path, original_filename, file_size_bytes, mime_type to content_sources
  - Created reading_progress, annotations, document_sections tables
  - Created "documents" bucket in Supabase Storage with RLS policies
  - Modified upload endpoint to store files in Storage
  - Added /api/sources/{id}/file-url and /api/sources/{id}/sections endpoints
  - Created DocumentReader.jsx page with header, document viewer, assistant panel placeholder
- [x] M31: Sidebar TOC integration - TableOfContentsSection, route detection (2026-01-05)
  - Created `useDocumentSections.js` hook fetching from `/api/sources/{id}/sections`
  - Created `TableOfContentsSection.jsx` with collapse/expand, hierarchy indentation
  - Modified `Sidebar.jsx` with route detection via `useLocation()`, conditional TOC rendering
  - Added `scroll-to-section` custom event listener in DocumentReader.jsx
  - TOC shows only on `/reader/:sourceId`, disappears on other routes
- [x] M32: Document rendering - PDF, Markdown, text viewers (2026-01-05)
  - Installed react-pdf, react-markdown, remark-gfm, rehype-highlight, @tailwindcss/typography
  - Created `PDFRenderer.jsx` with page navigation, zoom controls, scroll-to-page listener
  - Created `MarkdownRenderer.jsx` with GFM support, syntax highlighting, scroll-to-heading
  - Created `TextRenderer.jsx` for plain text with line numbers
  - Created `ReaderContent.jsx` container selecting renderer by content type
  - Added `/api/sources/{id}/content` endpoint for extracted text
  - Updated getContentType() to check filename extension (more reliable than mime_type)
  - Fixed Tailwind config to use ESM import for typography plugin
- [x] M33: Navigation entry points - Read buttons, upload redirect (2026-01-05)
  - Added "Read" button to `SourceCard.jsx` in Home page with BookOpen icon
  - Added "Read" button to `SourceDetailPanel.jsx` footer (alongside Study and Delete)
  - Updated Sidebar recent sources to link to `/reader/:id` instead of sources page
  - Added navigate redirect in `Sources.jsx` handleProcessingComplete after upload
- [x] M34: Text selection and highlights - SelectionTooltip, annotations (2026-01-05)
  - Created `useTextSelection.js` hook with character offset calculation
  - Created `SelectionTooltip.jsx` with Ask AI, Highlight, Generate, Copy buttons
  - Created `useAnnotations.js` hook with Supabase CRUD and optimistic updates
  - Created `AnnotationLayer.jsx` rendering highlights via DOM text node wrapping
  - Updated `DocumentReader.jsx` to integrate selection and highlights
  - **VERIFIED:** Highlights persist to database and display after page refresh
  - Fixed: Required legacy JWT-format anon key in web/.env (not sb_publishable_ format)
- [x] M35: Assistant panel - notes, AI chat tabs (2026-01-05)
  - Created `AssistantPanel.jsx` with Notes, AI, and KCs tabs
  - Created `NotesList.jsx` and `NoteEditor.jsx` for note management
  - Created `AIChatPanel.jsx` with message input and chat history
  - Created `KCsPanel.jsx` displaying extracted knowledge components
  - Added `POST /api/ai/chat` endpoint with Groq/Claude fallback
  - Wired "Ask AI" from SelectionTooltip to pre-fill chat with selected text
- [x] M36: Reading progress - position tracking, completion percentage (2026-01-05)
  - Created `useReadingProgress.js` hook with debounced sync (500ms)
  - Tracks scroll_position, current_page, total_pages, last_read_at
  - Calculates completion percentage locally (from page or scroll position)
  - Shows progress indicator with percentage and progress bar in header
  - Uses upsert to prevent duplicate records
  - Restores scroll position for non-PDF, page number for PDF on return
- [ ] M37: Highlight-to-generate - practice questions from selected text
- [ ] M38: Polish and performance - caching, virtualization, responsive


## Surprises and Discoveries

Key lessons learned during implementation:

**Environment & Configuration:**
- Single `.env` file in project root serves both Python (no `export` prefix) and Vite (`VITE_` prefix required)
- Shell env vars override `.env` files - run `env | grep VITE_` to diagnose connection issues
- API server must run on port 8001 to match frontend: `uvicorn app.api.server:app --port 8001`

**Supabase:**
- **CRITICAL:** Supabase JS client requires legacy JWT-format anon key (starts with `eyJhbG...`), NOT the new `sb_publishable_` format keys
- To get legacy key: Supabase Dashboard → Settings → API Keys → "Legacy anon, service_role API keys" tab
- Realtime requires: `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sources;`
- Always use polling fallback alongside Realtime subscriptions
- Python library v2.27.0+ required for newer key formats
- **M30 Migration:** The `migrations/m30_document_reader.sql` must be fully applied for annotations to persist.

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

- **Decision:** Document Reader uses existing Sidebar with conditional TOC section (not separate panel)
  **Rationale:** Reuses existing UI patterns, avoids redundant navigation, TOC in teal color differentiates from nav items
  **Date:** 2026-01-05

- **Decision:** Store uploaded files in Supabase Storage, not blob columns
  **Rationale:** CDN delivery, signed URLs with expiry, separate storage from database, 50MB file limit
  **Date:** 2026-01-05

- **Decision:** TOC communicates with DocumentReader via custom events
  **Rationale:** Decoupled components across different parts of component tree, no prop drilling needed
  **Date:** 2026-01-05


## Outcomes and Retrospective

**Full archive:** `.claude/memory/reference/retrospective.md`

Retrospectives for M1-M8 (CLI), M9-M15 (Web UI), M16-M19 (Sources). Key outcomes: complete document pipeline, LLM-based KC extraction, SM-2 scheduling, web UI with feature parity, real-time upload processing. See archive for detailed what worked/gaps/lessons.


## Context and Orientation

**Full archive:** `.claude/memory/reference/context.md`

This is a personal learning tool: CLI + Web UI, Supabase (PostgreSQL), Claude API for ingestion, Groq for item generation. Key concepts: Knowledge Component (KC), practice items, mastery level (EMA), SM-2 spaced repetition, technique bundles. Project structure: `learn_system/` (Python CLI) and `web/` (React). See archive for complete glossary.


## Plan of Work

Implementation proceeds through thirty-eight milestones. Milestones 1-29 are complete. Milestones 30-38 implement the AlphaXiv-style Document Reader feature.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI Core (Complete):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.

**Sources Feature (Complete):** M16: Sources page foundation with list display. M17: Upload UI with drag-drop and validation. M18: FastAPI backend with processing endpoints. M19: Real-time processing progress. M20: Error handling and polish.

**Speed Optimization (Complete):** M21: Groq client and batch database inserts. M22: Parallel practice item generation. M23: Error resilience and retry logic.

**Agent Memory System (Complete):** M24: Create memory directory structure. M25: Extract completed milestones to archive. M26: Extract decisions and schemas. M27: Extract reference material. M28: Slim EXECPLAN to active content only. M29: Update CLAUDE.md with memory access instructions.

**Document Reader Feature (Pending):** M30: Core infrastructure (database, storage, route). M31: Sidebar TOC integration. M32: Document rendering (PDF, Markdown, text). M33: Navigation entry points. M34: Text selection and highlights. M35: Assistant panel (notes, AI chat). M36: Reading progress tracking. M37: Highlight-to-generate practice questions. M38: Polish and performance.


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

    **Writing style for memory:** Be concise. Sacrifice grammar for brevity but explain the system thoroughly and preserve full meaning. Use tables, bullet points, code snippets over prose. Link to source files with line numbers. Future sessions need context, not narrative.

**Verification:** CLAUDE.md contains Memory System section with both proactive and reactive protocols. New session starting a milestone reads relevant archives before implementation.


### Document Reader Feature Milestones 30-38 (Pending)

These milestones implement an AlphaXiv-style document reader that enables users to read uploaded documents before practice. The core flow becomes: upload → read/study → practice (source always one click away).

**Full specs:** `NEW FEATURES.md` (root directory)

**Architecture:** The reader reuses the existing Sidebar and Layout components. A conditional Table of Contents section appears in the sidebar only when viewing `/reader/:sourceId`. The document view includes a collapsible right-side Assistant panel for notes and AI chat.

    ┌─────────────────────────────────────────────────────────────────┐
    │  ← Back   📖 Title   [PDF|Blog]   [Zen]   [Start Practice]      │
    ├────────────┬────────────────────────────────────────────────────┤
    │  SIDEBAR   │   DOCUMENT AREA          │   ASSISTANT PANEL      │
    │  (existing)│                          │   (collapsible)        │
    │            │   [PDF/Markdown/Text]    │                        │
    │  Home      │                          │   [Notes | AI | KCs]   │
    │  Calendar  │   Selection → Tooltip    │                        │
    │  ...       │   • Ask AI               │   Chat with AI...      │
    │            │   • Highlight            │                        │
    │  Recent    │   • Copy                 │                        │
    │            │                          │                        │
    │  ▼ CONTENTS│ ← Only in /reader/:id   │                        │
    │  (teal)    │                          │                        │
    │  • Ch 1    │                          │                        │
    └────────────┴────────────────────────────────────────────────────┘


### Milestone 30: Core Infrastructure

At the end of this milestone, the database has new tables for reading progress and annotations, files are stored in Supabase Storage, and a basic `/reader/:sourceId` route exists.

**Database Migration:**

    -- Run in Supabase SQL Editor

    -- Extend content_sources for file storage
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS storage_path TEXT;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS original_filename TEXT;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS mime_type TEXT;

    -- Reading progress tracking
    CREATE TABLE IF NOT EXISTS reading_progress (
        id TEXT PRIMARY KEY DEFAULT ('rp_' || substr(md5(random()::text), 1, 12)),
        source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
        last_page INTEGER,
        last_scroll_position REAL,
        total_pages INTEGER,
        pages_viewed TEXT,
        completion_percentage REAL DEFAULT 0.0,
        first_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        total_reading_time_seconds INTEGER DEFAULT 0,
        UNIQUE(source_id)
    );

    -- Annotations (highlights, notes, bookmarks)
    CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY DEFAULT ('ann_' || substr(md5(random()::text), 1, 12)),
        source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
        annotation_type TEXT NOT NULL DEFAULT 'highlight',
        start_offset INTEGER NOT NULL,
        end_offset INTEGER NOT NULL,
        anchor_text TEXT,
        page_number INTEGER,
        note_text TEXT,
        color TEXT DEFAULT '#FFEB3B',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Document sections for TOC
    CREATE TABLE IF NOT EXISTS document_sections (
        id TEXT PRIMARY KEY DEFAULT ('sec_' || substr(md5(random()::text), 1, 12)),
        source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1,
        start_line INTEGER NOT NULL,
        end_line INTEGER,
        sequence_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- Storage bucket
    INSERT INTO storage.buckets (id, name, public, file_size_limit)
    VALUES ('documents', 'documents', false, 52428800);

**Work:**

1. Run database migration in Supabase SQL Editor
2. Modify upload endpoint to store files in Supabase Storage instead of deleting after text extraction
3. Add `GET /api/sources/{id}/file-url` endpoint returning signed URL
4. Add `GET /api/sources/{id}/sections` endpoint returning document TOC
5. Add `/reader/:sourceId` route to `App.jsx` using existing Layout
6. Create basic `DocumentReader.jsx` page shell

**Verification:** Navigate to `/reader/{sourceId}` and see a basic page layout. Upload a new document and confirm the file appears in Supabase Storage dashboard under "documents" bucket.


### Milestone 31: Sidebar TOC Integration

At the end of this milestone, when viewing `/reader/:sourceId`, a teal-colored "CONTENTS" section appears in the sidebar with collapsible document sections.

**Work:**

1. Create `TableOfContentsSection.jsx` in `web/src/components/reader/`
2. Create `useDocumentSections.js` hook to fetch sections from API
3. Modify `Sidebar.jsx` to detect `/reader/:sourceId` route via `useLocation()`
4. Conditionally render TOC section with accent color (`text-accent-progress`)
5. Implement collapse/expand toggle with ChevronDown/ChevronRight icons
6. Wire TOC clicks to dispatch `scroll-to-section` custom event

**Verification:** Navigate to `/reader/{sourceId}`. The sidebar shows normal nav items plus a teal "CONTENTS" section below "Recent". Click a section title and observe the custom event in browser console. Navigate to `/sources` and confirm TOC section disappears.


### Milestone 32: Document Rendering

At the end of this milestone, PDF, Markdown, and plain text documents render correctly in the document area with page navigation for PDFs.

**Dependencies:**

    cd web && npm install react-pdf pdfjs-dist react-markdown remark-gfm rehype-highlight highlight.js

**Work:**

1. Create `PDFRenderer.jsx` using react-pdf with text layer enabled
2. Create `MarkdownRenderer.jsx` using react-markdown with syntax highlighting
3. Create `TextRenderer.jsx` for plain text display
4. Create `ReaderHeader.jsx` with title, view mode tabs (PDF|Blog), and Start Practice button
5. Create `ReaderContent.jsx` container that selects renderer based on content_type
6. Implement PDF page navigation (prev/next, page number input, zoom)
7. Listen for `scroll-to-section` events and scroll document to matching section

**Verification:** Upload a PDF and navigate to reader - see rendered pages with selectable text. Upload a Markdown file and see formatted content with syntax-highlighted code blocks. Click TOC items and observe document scrolling.


### Milestone 33: Navigation Entry Points

At the end of this milestone, users can access the document reader from Sources page, Home page, Sidebar recent, and post-upload redirect.

**Work:**

1. Add "Read" button to `SourceCard.jsx` → `navigate(/reader/${id})`
2. Add "Read Document" button to `SourceDetailPanel.jsx`
3. Update Sidebar recent sources to link to `/reader/:id` instead of `/sources/:id`
4. Modify `UploadZone.jsx` to redirect to `/reader/:id` after successful upload
5. Add "Start Practice" button in `ReaderHeader.jsx` → `navigate(/study?source=${id})`

**Verification:** From Sources page, click "Read" on a source card - opens reader. From Home page, click recent source - opens reader. Upload new document - redirected to reader after processing. Click "Start Practice" in reader - starts practice session filtered to that source.


### Milestone 34: Text Selection and Highlights

At the end of this milestone, users can select text in documents and see a tooltip with actions (Ask AI, Highlight, Copy). Highlights persist to database.

**Work:**

1. Create `SelectionTooltip.jsx` component with three action buttons
2. Create `useTextSelection.js` hook detecting selection via `window.getSelection()`
3. Position tooltip above selection using `getBoundingClientRect()`
4. Create `useAnnotations.js` hook with CRUD operations to annotations table
5. Add annotations API endpoints (GET, POST, PUT, DELETE)
6. Create `AnnotationLayer.jsx` overlay rendering saved highlights
7. Implement optimistic updates for smooth UX

**Verification:** Select text in document - tooltip appears. Click "Highlight" - text turns yellow. Refresh page - highlight persists. Check annotations table in Supabase - record exists.


### Milestone 35: Assistant Panel

At the end of this milestone, a collapsible right-side panel shows Notes, AI Chat, and KCs tabs.

**Work:**

1. Create `AssistantPanel.jsx` with three tabs (Notes | AI | KCs)
2. Create `NotesList.jsx` displaying user notes for this source
3. Create `NoteEditor.jsx` for creating/editing notes
4. Add notes API endpoints using annotations table with type='note'
5. Create `AIChatPanel.jsx` with message input and chat history
6. Add `POST /api/ai/chat` endpoint integrating Claude API for document Q&A
7. Wire "Ask AI" action from SelectionTooltip to pre-fill chat with selected text

**Verification:** Click Notes tab - see list of notes. Create note - appears in list. Click AI tab - type question - receive answer about document content. Select text, click "Ask AI" - chat opens with selected text quoted.


### Milestone 36: Reading Progress

At the end of this milestone, reading position and completion percentage are tracked and restored on return.

**Work:**

1. Create `useReadingProgress.js` hook tracking scroll position and pages viewed
2. Add `GET/PUT /api/sources/{id}/progress` endpoints
3. Implement debounced sync (500ms) to avoid overwhelming database
4. Restore scroll position when returning to previously-read document
5. Show completion percentage in ReaderHeader ("45% read")
6. Update reading_progress.last_opened_at on each visit

**Verification:** Read half a document, navigate away, return - scroll position restored. Check reading_progress table - completion_percentage updated. See "45% read" in header.


### Milestone 37: Highlight-to-Generate

At the end of this milestone, users can generate practice questions from highlighted text.

**Work:**

1. Add "Generate Question" button to SelectionTooltip
2. Create `GenerateQuestionModal.jsx` with question type selection (definition, explanation, application)
3. Add `POST /api/items/generate-from-text` endpoint calling Groq to generate practice item
4. Modify KC extraction prompt to populate `source_excerpt` field
5. Link generated items to source via kc_id with source_excerpt
6. Show success toast with option to practice immediately

**Verification:** Select text, click "Generate Question", select type, submit - new practice item created. Check practice_items table - linked to source. Start practice - see the generated question with source context.


### Milestone 38: Polish and Performance

At the end of this milestone, the reader is production-ready with caching, virtualization, and responsive layouts.

**Work:**

1. Implement IndexedDB caching for documents using `idb` library
2. Add PDF page virtualization using `@tanstack/react-virtual` for large documents
3. Create Zen mode (hide sidebar and assistant panel, toggle via header button)
4. Add responsive layouts: tablet (assistant as drawer), mobile (assistant as bottom sheet)
5. Performance optimization: lazy loading, React.memo, useMemo for expensive computations
6. Deep linking: update URL on section scroll, restore on page load

**Verification:** Open 100-page PDF - pages load progressively without freezing. Toggle Zen mode - only document visible. Resize browser to mobile - assistant becomes bottom sheet. Offline: previously-viewed document loads from cache.


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
- 2026-01-05: M30-M38 Document Reader feature added (AlphaXiv-style, 6 research agents, consolidated spec)
