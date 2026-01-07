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
   - Document Reader (M30-M40) → `.claude/memory/milestones/document_reader.md`
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

**Document Reader Feature (M30-M37):** After these milestones, users can read uploaded documents directly in the browser before starting practice. The workflow becomes: upload → read/study → practice, with documents always one click away. Users navigate to `/reader/:sourceId` to view PDFs or Markdown with a Table of Contents in the sidebar, take notes, highlight text, and ask AI questions about the content.

**Document Viewer Fidelity (M38):** This milestone fixes a critical gap where DOCX files render as plain text, losing all formatting. After M38, uploaded DOCX files display with full visual fidelity—headings, tables, images, colors, and formatting preserved—using the `docx-preview` library for client-side rendering.

**PDF Highlighting (M39):** This milestone implements PDF-specific highlighting. Currently, highlights save to the database but don't render in PDFs because the prop isn't passed and the positioning system is incompatible. After M39, users can highlight PDF text and see those highlights persist across sessions using page-based percentage coordinates.

**PowerPoint Support (M40):** This milestone adds PowerPoint (.pptx) document support. After M40, users can upload PowerPoint presentations and view them in the document reader with full visual fidelity. The system extracts text using python-pptx for KC generation, converts PPTX to PDF using LibreOffice + unoserver for display, and reuses the existing PDFRenderer for viewing. Highlights work on the converted PDF.

**Authentication & Multi-User (M41-M46):** These milestones transform the single-user localhost system into a secure multi-user web deployment. After M46, users can sign up with email/password, log in, and have their data completely isolated from other users. The system uses Supabase Auth for authentication, Row-Level Security (RLS) for data isolation, and JWT validation in the FastAPI backend. Existing data is migrated to the first registered user. The architecture supports deployment to Vercel (frontend) + Railway (backend) + Supabase (database).


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

**Document Reader Feature (M30-M37)** - See `.claude/memory/milestones/document_reader.md`
- [x] Research phase - 6 parallel agents, NEW FEATURES.md consolidated spec (2026-01-05)
- [x] M30: Core infrastructure - database migration, Supabase Storage, /reader route (2026-01-05)
- [x] M31: Sidebar TOC integration - TableOfContentsSection, route detection (2026-01-05)
- [x] M32: Document rendering - PDF, Markdown, text viewers (2026-01-05)
- [x] M33: Navigation entry points - Read buttons, upload redirect (2026-01-05)
- [x] M34: Text selection and highlights - SelectionTooltip, annotations (2026-01-05)
- [x] M35: Assistant panel - notes, AI chat tabs (2026-01-05)
- [x] M36: Reading progress - position tracking, completion percentage (2026-01-05)
- [x] M37: Polish and performance - zen mode, memoization, deep linking (2026-01-05)

**Document Viewer Fidelity (M38)** - Complete
- [x] M38 Research: 6 parallel worktrees, docx-preview recommendation (2026-01-06)
- [x] M38 Implementation: DOCX high-fidelity rendering with docx-preview (2026-01-06)

**PDF Highlighting (M39)** - Complete
- [x] M39 Research: 6 parallel worktrees, validated architecture (2026-01-06)
- [x] M39 Implementation: PDF page-based highlighting with PDFHighlightLayer (2026-01-06)
  - Phase 0: Wired up highlights prop to PDFRenderer in ReaderContent.jsx
  - Phase 1: Database migration added position_type and pdf_rects columns
  - Phase 2: Updated useTextSelection for PDF-aware page-based selection
  - Phase 3: Updated PDFRenderer with data-page-number attributes
  - Phase 4: Created PDFHighlightLayer component for overlay rendering
  - Phase 5: Updated useAnnotations to handle PDF position type and sorting

**PowerPoint Support (M40)** - Complete
- [x] M40 Research: 6 parallel worktrees, consolidated spec in NEW FEATURES.md (2026-01-06)
- [x] M40 Phase 1: Backend text extraction with python-pptx (2026-01-06)
- [x] M40 Phase 2: PPTX→PDF conversion with LibreOffice (local, no Docker required) (2026-01-06)
- [x] M40 Phase 3: Database schema (slide_count, converted_pdf_path columns) (2026-01-06)
- [x] M40 Phase 4: Frontend content type detection and routing (2026-01-06)
- [x] M40 Phase 5: API endpoint for converted PDF URL (2026-01-06)

**Authentication & Multi-User (M41-M46)** - Complete
- [x] M41-M46 Research: 6 parallel worktrees, consolidated spec in NEW FEATURES.md (2026-01-06)
- [x] M41: Supabase Auth Configuration - email enabled, Site URL/Redirects configured, JWT=3600s, env vars added (2026-01-06)
- [x] M42: Database Schema Migration - user_id UUID column on 12 tables, 12 single-column indexes, 8 compound indexes for query patterns (2026-01-06)
- [x] M43: Backend Auth Middleware - PyJWT, auth package (schemas, jwt_utils, dependencies, ownership), CurrentUser on all routes, CORS expose X-Token-Expiring-Soon (2026-01-06)
- [x] M44: Frontend Auth Flow - AuthContext, ProtectedRoute, login/signup/reset forms, api.js with auth headers, Sidebar logout (2026-01-07)
- [x] M45: Row-Level Security Policies - RLS enabled on 14 tables, 46+ table policies, 4 storage policies for documents bucket (2026-01-07)
- [x] M46: Data Migration & Deployment - first_user_migration.py, m46_enforce_auth.sql, migration API endpoints, CORS env config (2026-01-07)

**RLS/Display Bug Investigation** - Complete
- [x] RLS/Sources Research: 10 parallel agents, root cause analysis in NEW FEATURES.md (2026-01-07)
  - Identified practice_items RLS issue (complex nested EXISTS fails, fix in fix_practice_items_rls.sql)
  - Identified Study page bug (redundant user_id filter in migration.py)
  - Confirmed Sources view fully implemented (M16-M20, no placeholder)
  - Verified .env files correctly gitignored (no security issue)
- [x] Apply Study page fix - removed redundant `.eq('user_id')` from migration.py (2026-01-07)
  - Line 36: practice-items-count endpoint - now queries via KC ownership only
  - Line 56: all-practice-items endpoint - now queries via KC IDs first
  - Line 94: study-items endpoint - now queries via KC ownership only
- [x] Verified: Sources page shows 117 Practice Items correctly
- [x] Verified: Study page loads items (1 of 20) correctly
- [x] **RLS POLICY FIX APPLIED (2026-01-07):** Ran `migrations/fix_practice_items_rls.sql` in Supabase
  - Simplified practice_items RLS policy to `auth.uid() = user_id OR user_id IS NULL`
  - Updated useSources.js to use direct Supabase queries (removed backend workaround)
  - All pages tested and working with direct queries
- [x] **REGRESSION TEST COMPLETE (2026-01-07):** All core functionality verified after migration.py changes:
  - [x] Sources page → 117 Practice Items displayed correctly
  - [x] Study page (no filter) → loads items (1 of 20)
  - [x] Study page with source filter → loads items correctly
  - [x] Due for Review page → 40 items shown (39 after practice)
  - [x] Progress page → mastery by source, weekly chart working (mastery 0%→1% after practice)
  - [x] Analytics page → insights, technique bundles, calibration sections all load
  - [x] Study session → completed 1 item, recorded attempt, session stats correct (60% score, 1m56s)
  - [x] No regressions detected - all pages functional


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
- **M39 PDF Positioning:** PDF highlights use percentage-based coordinates (x%, y%, width%, height%) relative to page dimensions to survive zoom/scale changes. Character offsets from Markdown/Text are incompatible with PDF's multi-page structure.

**Python 3.9 Compatibility:**
- Use `Optional[X]` instead of `X | None`, `List[Dict]` instead of `list[dict]`
- Timestamp parsing needs try-except for variable microsecond precision

**LLM APIs:**
- Groq model `qwen-qwq-32b` deprecated → use `qwen/qwen3-32b`
- Groq rate limits can cause stuck processing - retry logic helps but timeouts needed
- Practice items: 3 per KC consistently (predictable 3:1 ratio)

**Supabase Auth (M41-M46):**
- Never use API keys as access tokens - use `session.access_token`, not anon key
- Don't modify auth schema - never add RLS to `auth.users` or modify its columns
- getSession() is fast but doesn't verify; getUser() verifies with server
- Service role key bypasses RLS - use only server-side, never expose
- Email tracking breaks confirmation links - disable tracking in SMTP provider
- Clock skew causes random auth failures - don't set JWT expiry < 1 hour
- Foreign keys need `ON DELETE CASCADE` on auth.users references

**M46 Data Migration:**
- Not all tables have `id` column (kc_state, kc_prerequisites use composite keys) - use `user_id` for count queries
- Orphaned data can exist in child tables even if parent is migrated - check ALL tables, not just content_sources
- Auth token stored in localStorage as `sb-{project-ref}-auth-token`
- Migration endpoint requires service role key (bypasses RLS) to update rows regardless of current user_id
- CORS origins can be configured via `CORS_ORIGINS` env var (comma-separated list)

**Pre-existing Display Bugs (discovered during M46 testing, NOT caused by M46):**
- Sources page shows "0 Practice Items" despite API returning 117 - frontend display logic issue
- Study page shows "No items to study" even with 40 new items - frontend item selection logic issue
- Both issues existed before M46 changes and are unrelated to authentication

**RLS/Display Bug Root Cause Analysis (2026-01-07 research):**
- **practice_items RLS issue:** M45 policy has complex nested EXISTS that fails silently. Workaround in useSources.js (lines 47-63) fetches via backend API. Fix: Run `migrations/fix_practice_items_rls.sql` to simplify policy.
- **Study page "No items" bug:** migration.py endpoints (lines 36, 56, 87) double-filter on user_id. KC ownership filter is sufficient; redundant `.eq('user_id', current_user.id)` excludes orphaned items. Fix: Remove redundant filter.
- See `NEW FEATURES.md` "Sources View & RLS Fix Research" section for full analysis and diagnostic queries.


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

- **Decision:** Use upsert with onConflict for reading_progress records
  **Rationale:** Prevents duplicate records from race conditions when debounced saves fire before initial insert completes; source_id has unique constraint
  **Date:** 2026-01-05

- **Decision:** Remove Highlight-to-Generate milestone (formerly M37)
  **Rationale:** Misaligned with VISION.md - manual question creation contradicts "I should not have to manually create flashcards" and reintroduces cognitive overhead. Learners are poor judges of what they need to practice; automatic KC extraction addresses this.
  **Date:** 2026-01-05

- **Decision:** Defer M37 advanced optimizations (mobile layouts, virtualization, caching)
  **Rationale:** Core polish items (zen mode, memoization, deep linking) deliver most value. Mobile responsive, 100+ page PDF virtualization, and offline caching are lower priority for single-user desktop tool. Dependencies installed for future use.
  **Date:** 2026-01-05

- **Decision:** Use docx-preview library for DOCX rendering (client-side) over server-side LibreOffice PDF conversion
  **Rationale:** (1) No server infrastructure changes required - works with Netlify + Supabase architecture. (2) 1-2 day implementation vs 3-5 days for server PDF. (3) Native HTML output enables text selection and existing AnnotationLayer. (4) ~1.7MB bundle addition acceptable for document viewer. (5) 168 projects use it in production. Server-side LibreOffice option remains as fallback if fidelity insufficient.
  **Date:** 2026-01-06

- **Decision:** Use page-based percentage coordinates for PDF highlights instead of character offsets
  **Rationale:** (1) Character offsets are unstable for PDFs - text layer ordering can change between PDF.js versions. (2) Each PDF page is an isolated DOM subtree, making cumulative offsets impossible. (3) Percentage-based coordinates survive zoom/scale changes. (4) Existing AnnotationLayer with TreeWalker is incompatible with PDF's absolute-positioned text layer.
  **Date:** 2026-01-06

- **Decision:** Use LibreOffice + unoserver for PPTX rendering instead of client-side pptx2html
  **Rationale:** (1) pptx2html is abandoned (8 years, no updates) with unpatched XSS vulnerability - DO NOT USE. (2) LibreOffice produces high-fidelity PDF output. (3) Reuses existing PDFRenderer, no new frontend bundle. (4) Existing PDF highlighting works on converted output. (5) PPTXjs is fallback option if Docker unavailable.
  **Date:** 2026-01-06

- **Decision:** Extract PPTX text with python-pptx for KC generation
  **Rationale:** (1) Pure Python, no native dependencies. (2) Extracts text from shapes, tables, and speaker notes. (3) Speaker notes are valuable learning material often missed. (4) SmartArt limitation accepted (python-pptx doesn't support it).
  **Date:** 2026-01-06

- **Decision:** Use Supabase Auth for authentication instead of custom JWT implementation
  **Rationale:** (1) Battle-tested, built-in JWT handling with automatic token refresh. (2) Already using Supabase for database. (3) Email/password first, OAuth can be added later. (4) Built-in password reset, email confirmation flows. (5) Reduces security surface area vs custom implementation.
  **Date:** 2026-01-06

- **Decision:** Use Row-Level Security (RLS) for data isolation instead of application-level filtering
  **Rationale:** (1) Database-level enforcement - can't be bypassed by application bugs. (2) Works with direct database access (Supabase client). (3) auth.uid() function provides user context automatically. (4) 48 policies across 11 user-owned tables. (5) Storage policies use same pattern for file isolation.
  **Date:** 2026-01-06

- **Decision:** Zero-downtime migration with phased approach
  **Rationale:** (1) Phase 1 adds nullable user_id columns (non-breaking). (2) Phase 2 deploys auth code (backwards compatible). (3) Phase 3 migrates existing data to first user. (4) Phase 4 enforces NOT NULL + RLS (breaking for unauthenticated). (5) Each phase has rollback scripts.
  **Date:** 2026-01-06

- **Decision:** Deploy to Vercel (frontend) + Railway (backend) + Supabase (database)
  **Rationale:** (1) Vercel has excellent Vite support with free tier. (2) Railway supports Docker for LibreOffice container. (3) Supabase already in use. (4) API keys (Claude/Groq) only in Railway environment - never exposed to frontend.
  **Date:** 2026-01-06


## Outcomes and Retrospective

**Full archive:** `.claude/memory/reference/retrospective.md`

Retrospectives for M1-M8 (CLI), M9-M15 (Web UI), M16-M19 (Sources). Key outcomes: complete document pipeline, LLM-based KC extraction, SM-2 scheduling, web UI with feature parity, real-time upload processing. See archive for detailed what worked/gaps/lessons.


## Context and Orientation

**Full archive:** `.claude/memory/reference/context.md`

This is a personal learning tool: CLI + Web UI, Supabase (PostgreSQL), Claude API for ingestion, Groq for item generation. Key concepts: Knowledge Component (KC), practice items, mastery level (EMA), SM-2 spaced repetition, technique bundles. Project structure: `learn_system/` (Python CLI) and `web/` (React). See archive for complete glossary.


## Plan of Work

Implementation proceeds through forty-six milestones. M1-M40 are complete. M41-M46 implement authentication and multi-user support.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI Core (Complete):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.

**Sources Feature (Complete):** M16: Sources page foundation with list display. M17: Upload UI with drag-drop and validation. M18: FastAPI backend with processing endpoints. M19: Real-time processing progress. M20: Error handling and polish.

**Speed Optimization (Complete):** M21: Groq client and batch database inserts. M22: Parallel practice item generation. M23: Error resilience and retry logic.

**Agent Memory System (Complete):** M24: Create memory directory structure. M25: Extract completed milestones to archive. M26: Extract decisions and schemas. M27: Extract reference material. M28: Slim EXECPLAN to active content only. M29: Update CLAUDE.md with memory access instructions.

**Document Reader Feature (Complete):** M30: Core infrastructure (database, storage, route). M31: Sidebar TOC integration. M32: Document rendering (PDF, Markdown, text). M33: Navigation entry points. M34: Text selection and highlights. M35: Assistant panel (notes, AI chat). M36: Reading progress tracking. M37: Polish and performance.

**Document Viewer Fidelity (Complete):** M38: DOCX high-fidelity rendering with docx-preview (client-side).

**PDF Highlighting (Complete):** M39: Page-based PDF highlighting with percentage coordinates.

**PowerPoint Support (Complete):** M40: PPTX document support with LibreOffice conversion. Upload PowerPoint presentations, view as PDF, highlight text, generate KCs from slides.

**Authentication & Multi-User (Pending):** M41: Supabase Auth configuration (email provider, JWT settings). M42: Database schema migration (user_id columns, indexes). M43: Backend auth middleware (JWT validation, ownership checks). M44: Frontend auth flow (AuthContext, ProtectedRoute, login/signup forms). M45: Row-Level Security policies (48 RLS policies, storage policies). M46: Data migration and deployment (first user migration, go-live).


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

External memory in `.claude/memory/` (16 files):

| Category | Files |
|----------|-------|
| `milestones/` | cli_foundation.md, webui_core.md, sources_feature.md, speed_optimization.md, agent_memory.md, document_reader.md |
| `decisions/` | architecture.md, technology.md, patterns.md, memory_system.md |
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

All completed milestones are archived in `.claude/memory/milestones/`. See Progress section for dates.

### Agent Memory System Milestones

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

- Extract completed milestones to archive
- Extract decisions and schemas
- Extract reference material
- Slim EXECPLAN to active content only
- Update CLAUDE.md with memory access instructions


### Slim EXECPLAN to Active Content Only (OPERATIONAL POLICY - DO NOT DELETE)

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


### Memory Access Protocols (OPERATIONAL POLICY - DO NOT DELETE)

This section defines how to use the memory system. These protocols are ACTIVE and must be followed by every session.

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


### Document Reader Feature M30-M40 (Complete)

**Full specs:** `.claude/memory/milestones/document_reader.md`

AlphaXiv-style document reader. Flow: upload → read/study → practice. Supports PDF, DOCX (docx-preview), PPTX (LibreOffice→PDF), Markdown, text. Features: sidebar TOC, text selection, highlights (character-based for text, page-based % coords for PDF), AI chat, notes, reading progress, zen mode.


### Authentication & Multi-User Feature M41-M46 (Pending)

**Full specs:** `NEW FEATURES.md` (Authentication & Multi-User Implementation Plan)

Transform single-user localhost system into secure multi-user web deployment.

**Architecture:**

    ┌─────────────────────────────────────────────────────────────────────────────┐
    │  FRONTEND (React + Vite)                                                     │
    │  ├─ AuthContext manages session state                                        │
    │  ├─ ProtectedRoute guards authenticated pages                               │
    │  └─ Auth header attached to all API calls                                   │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │  BACKEND (FastAPI)                                                           │
    │  ├─ Auth middleware validates JWT from Authorization header                 │
    │  ├─ get_current_user() dependency injects user into endpoints               │
    │  └─ API keys (Claude/Groq) kept server-side only                            │
    ├─────────────────────────────────────────────────────────────────────────────┤
    │  DATABASE (Supabase PostgreSQL)                                              │
    │  ├─ auth.users managed by Supabase Auth                                     │
    │  ├─ user_id FK on all user-owned tables                                     │
    │  └─ RLS policies enforce data isolation                                     │
    └─────────────────────────────────────────────────────────────────────────────┘

**M41: Supabase Auth Configuration**
At the end of this milestone, Supabase Auth is configured for email/password authentication with JWT settings, email templates, and environment variables.

Work:
1. Enable email provider in Supabase Dashboard (Auth > Providers > Email)
2. Configure Site URL: `http://localhost:5173` (dev)
3. Configure Redirect URLs: `http://localhost:5173/**`
4. Set JWT expiry to 3600 seconds (1 hour)
5. Add `SUPABASE_JWT_SECRET` to backend environment
6. Add `SUPABASE_SERVICE_ROLE_KEY` to backend environment

Verification: Auth endpoints accessible at Supabase project URL. Environment variables set in backend.

**M42: Database Schema Migration**
At the end of this milestone, all user-owned tables have nullable user_id columns with indexes, preserving backwards compatibility.

Work:
1. Create `migrations/m42_auth_schema.sql`
2. Add user_id UUID column to: content_sources, knowledge_components, kc_state, kc_prerequisites, kc_subskills, practice_items, sessions, attempts, kc_technique_history, retention_tests, learning_goals
3. Create indexes on user_id columns
4. Create compound indexes for common queries
5. Run migration on Supabase

Verification: `SELECT column_name FROM information_schema.columns WHERE table_name='content_sources' AND column_name='user_id'` returns row.

**M43: Backend Auth Middleware**
At the end of this milestone, all API endpoints require valid JWT and return 401 for unauthenticated requests.

Work:
1. Add `PyJWT>=2.8.0` to requirements.txt
2. Create `learn_system/app/api/auth/` package with: `__init__.py`, `schemas.py`, `exceptions.py`, `jwt_utils.py`, `dependencies.py`, `ownership.py`
3. Implement `get_current_user()` FastAPI dependency
4. Add `CurrentUser` dependency to all routes in `sources.py` and `ai.py`
5. Update `processing.py` to include user_id when creating sources
6. Configure CORS to expose `X-Token-Expiring-Soon` header

Verification: `curl http://localhost:8001/api/sources` returns 401. With valid token, returns 200.

**M44: Frontend Auth Flow**
At the end of this milestone, users can sign up, log in, reset password, and access protected routes.

Work:
1. Create `web/src/contexts/AuthContext.jsx` with signIn, signUp, signOut, resetPassword
2. Create `web/src/components/auth/ProtectedRoute.jsx`
3. Create `web/src/components/auth/LoginForm.jsx`, `SignupForm.jsx`, `ForgotPasswordForm.jsx`, `ResetPasswordForm.jsx`
4. Create `web/src/pages/Login.jsx`, `Signup.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`
5. Update `App.jsx` with AuthProvider and protected routes
6. Update `web/src/lib/api.js` to include auth headers and handle 401
7. Add logout button to Sidebar

Verification: Navigate to `/` unauthenticated → redirects to `/login`. Sign up → create account. Sign in → access app.

**M45: Row-Level Security Policies**
At the end of this milestone, RLS policies enforce data isolation at database level.

Work:
1. Create `migrations/m45_rls_policies.sql`
2. Enable RLS on all user-owned tables
3. Create SELECT/INSERT/UPDATE/DELETE policies for each table using `auth.uid() = user_id`
4. Create storage policies for documents bucket with path `documents/{user_id}/*`
5. technique_bundles: users can view system bundles (user_id IS NULL) + own bundles
6. Run migration on Supabase

Verification: User A cannot SELECT rows where user_id != their UUID. Direct SQL test in Supabase.

**M46: Data Migration & Deployment**
At the end of this milestone, system is deployed with first user owning all existing data.

Work:
1. Create `learn_system/app/auth/first_user_migration.py` with `migrate_existing_data_to_user()` and `check_is_first_user()`
2. Create `migrations/m46_enforce_auth.sql` to add NOT NULL constraints (run after first user registers)
3. Set up Vercel project for frontend with environment variables
4. Set up Railway project for backend with environment variables
5. Configure production CORS origins
6. Deploy and verify first user registration triggers data migration
7. Run m46_enforce_auth.sql after data migrated

Verification: Sign up as first user → all existing sources appear in list. Second user → sees empty source list.


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
- 2026-01-05: M30-M37 Document Reader feature complete (AlphaXiv-style reader with zen mode, AI chat, highlights, reading progress)
- 2026-01-06: M38 Complete - Document Viewer Fidelity (DOCX high-fidelity rendering with docx-preview, text selection, highlights)
- 2026-01-06: M39 Complete - PDF Highlighting (page-based percentage coordinates, PDFHighlightLayer component)
- 2026-01-06: M40 Complete - PowerPoint Support (PPTX with LibreOffice conversion, python-pptx text extraction, converted PDF viewing)
- 2026-01-06: M41-M46 Research Complete - Authentication & Multi-User (6 parallel worktrees, consolidated spec, Supabase Auth, RLS, JWT middleware, frontend auth flow, deployment strategy)
- 2026-01-07: M41-M44 Complete - Supabase Auth config, database schema migration (user_id on 12 tables, 20 indexes), backend auth middleware (JWT validation, ownership checks), frontend auth flow (AuthContext, ProtectedRoute, login/signup/reset forms, logout)
- 2026-01-07: M45 Complete + Auth Testing - RLS policies (46+ table + 4 storage), comprehensive auth testing validated: signup (email confirmation), login (redirect to home), protected routes (data visible), API auth (sources load), upload UI (modal works), logout (redirect to login, routes blocked)
- 2026-01-07: M46 Complete - Data Migration & Deployment (first_user_migration.py with check_has_orphaned_data/migrate_existing_data_to_user, m46_enforce_auth.sql for NOT NULL constraints, /api/migration/status and /api/migration/trigger endpoints, CORS_ORIGINS env var support). Authentication & Multi-User feature complete (M41-M46).
- 2026-01-07: RLS/Display Bug Fix - Removed redundant user_id filters from migration.py (lines 36, 56, 94). Full regression test passed: all pages functional, study sessions recording correctly, no regressions.
- 2026-01-07: RLS Policy Proper Fix - Applied fix_practice_items_rls.sql via Supabase Dashboard. Updated useSources.js to use direct Supabase queries instead of backend workaround. Technical debt reduced.
