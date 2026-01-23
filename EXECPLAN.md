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
   - Auth/RLS/Admin (M41-M47) → `.claude/memory/milestones/auth_multiuser.md`
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

**Approved Users Whitelist (M47):** This milestone restricts document upload (which triggers expensive Claude and Groq API calls) to a whitelist of approved users. Non-approved users can log in and view existing data but receive a 403 Forbidden error when attempting to upload. Hardcoded admin emails can access an Admin page at `/admin` to manage the whitelist—adding or removing approved users. This prevents runaway API costs from unauthorized usage while preserving read access for all authenticated users.

**Source-Grounded Practice Items (M49):** This milestone fixes a critical quality issue where practice items test concepts not present in the source document. Currently, the LLM generates items from its general knowledge rather than the uploaded content, creating questions that require knowledge the user has no way of having learned. After M49, each Knowledge Component will include the verbatim source excerpt it was derived from, and practice item generation will be constrained to only test concepts derivable from the source + reasonable domain prerequisites. This is NOT pure memorization—items may require reasoning, inference, and application—but they must be answerable by someone who has read the material and has appropriate foundational knowledge. No database changes required—the `source_excerpt` field already exists but was never populated.

**Practice Mode UI Differentiation (M50):** This milestone transforms the study interface to render practice items differently based on their `practice_mode` type. Currently, `AnswerInput.jsx` renders ALL practice modes (free_recall, cued_recall, recognition, explanation, application, execution) as identical textareas. After M50, each mode has appropriate UI: recognition shows clickable multiple-choice buttons with auto-grading, cued_recall shows progressive hint reveals, execution shows task checklists with completion tracking, and explanation/application show rubric previews. This is a **pure frontend enhancement**—the backend already stores and returns all necessary data (`practice_mode`, `hints`, `rubric`, `success_criteria`). No database or API changes required.

**Session Continuity Across Page Reloads (M51):** This milestone persists study session progress so users can resume where they left off after page reload, WiFi change, or browser restart. Currently, `Study.jsx` creates a NEW session ID on every page load (`sess_${Date.now()}`), abandoning any incomplete session. User's completed attempts are saved in the database but inaccessible because React state resets. After M51, the system checks for incomplete sessions on load, offers to resume or start fresh via a modal dialog, and maintains progress across interruptions. Session state uses hybrid storage: localStorage for fast cache + database as source of truth. Requires database migration (5 new columns on `sessions` table) and new API endpoint (`POST /api/sessions/pause` for sendBeacon on tab close).

**Infrastructure Deployment (I1-I4):** These milestones deploy the Personal Learning System from localhost to production. After I4, users can access the system from any device via the web. The architecture uses Netlify for the React frontend (free tier), AWS EC2 for the FastAPI backend with Docker and LibreOffice for PPTX conversion, Nginx as reverse proxy with Let's Encrypt SSL, and Supabase for the database (already cloud-hosted). EC2 was chosen over Lambda due to API Gateway timeout limits (29s max vs. 30-60s LLM processing), LibreOffice size constraints, and SSE streaming requirements. Estimated cost: $1-18/month (mostly Claude API).


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

**RLS/Display Bug Investigation** - Complete (2026-01-07)
- Root cause: practice_items RLS policy too complex; migration.py had redundant user_id filters
- Fix: `fix_practice_items_rls.sql` + updated useSources.js/Study.jsx to direct Supabase queries
- All pages regression tested and verified functional. See `.claude/memory/milestones/auth_multiuser.md` for details.

**Approved Users Whitelist (M47)** - Complete
- [x] M47 Phase 1: Database migration - approved_users table with RLS (2026-01-11)
- [x] M47 Phase 2: Backend approval logic - is_user_approved, is_admin, require_approved_user (2026-01-11)
- [x] M47 Phase 3: Protect upload endpoint - ApprovedUser dependency (2026-01-11)
- [x] M47 Phase 4: Admin API endpoints - list, add, remove approved users (2026-01-11)
- [x] M47 Phase 5: Frontend AdminRoute guard and useIsAdmin hook (2026-01-11)
- [x] M47 Phase 6: Admin page UI - table, add form, remove button (2026-01-11)
- [x] M47 Phase 7: Upload error handling - user-friendly 403 message (2026-01-11)
- [x] M47 Phase 8: Integration testing - all flows verified in Chrome (2026-01-11)

**Persistent Zoom Preference (M48)** - Complete
- [x] M48 Phase 1: Database migration - user_preferences table with RLS (2026-01-18)
- [x] M48 Phase 2: useZoomPreference hook - load/save with 500ms debounce (2026-01-18)
- [x] M48 Phase 3: Lift zoom state to ReaderContent.jsx (2026-01-18)
- [x] M48 Phase 4: Update PDFRenderer and DOCXRenderer to accept zoom props (2026-01-18)
- [x] M48 Phase 5: Bug fix - SupabaseContext missing session; added auth state tracking (2026-01-18)
- [x] M48 Testing: Verified zoom persists across page refresh (130% → 150% → refresh → 150%) (2026-01-18)

**Source-Grounded Practice Items (M49)** - Complete
- [x] M49 Research: 6 parallel worktrees, comprehensive investigation (2026-01-19)
- [x] M49 Phase 1: Update KC extraction prompt to request source_excerpt (2026-01-19)
- [x] M49 Phase 2: Update parse_llm_response() to extract source_excerpt (2026-01-19)
- [x] M49 Phase 3: Update store_extracted_kcs() to pass source_excerpt to DB (2026-01-19)
- [x] M49 Phase 4: Update all 4 practice item templates with grounding constraints (2026-01-19)
- [x] M49 Testing: Verified excerpts populated, grounding constraints in prompts, backward compatible with NULL excerpts (2026-01-19)

**Practice Mode UI Differentiation (M50)** - Complete
- [x] M50 Research: 6 parallel worktrees, consolidated spec in NEW FEATURES.md (2026-01-19)
- [x] M50 Phase 1: Infrastructure - Created inputs/ and shared/ directories, TextArea/SubmitButton/SkipButton primitives, FreeRecallInput (2026-01-19)
- [x] M50 Phase 2: Dispatcher Refactor - AnswerInput.jsx now dispatches to mode-specific components, Study.jsx passes practiceMode and item (2026-01-19)
- [x] M50 Phase 3: Recognition Mode - RecognitionInput.jsx with A/B/C/D buttons, auto-grading, skips SelfAssessment (2026-01-19)
- [x] M50 Phase 4: Cued Recall - CuedRecallInput.jsx with progressive hint reveal, amber styling, tracks hintsUsed (2026-01-19)
- [x] M50 Phase 5: Execution Mode - ExecutionInput.jsx with Start Task → Record Results flow, success_criteria checklist, independence/iterations tracking (2026-01-19)
- [x] M50 Phase 6: Explanation/Application - ExplanationInput.jsx with rubric preview (blue), ApplicationInput.jsx with scenario styling (purple), word count (2026-01-19)
- [x] M50 Testing: ExplanationInput and ApplicationInput verified in Chrome (blue rubric, word count, scenario placeholder). Recognition/CuedRecall/Execution not in current study queue but code verified (2026-01-19)

**Session Continuity Across Page Reloads (M51)** - Complete
- [x] M51 Research: 6 parallel worktrees (ui-ux, data-model, study-jsx, lifecycle, storage, edge-cases), consolidated spec in NEW FEATURES.md (2026-01-19)
- [x] M51 Phase 1: Database migration (m51_session_continuity.sql) - add status, current_item_index, queue_item_ids, paused_at, last_activity_at columns to sessions table (2026-01-19)
- [x] M51 Phase 2: useSessionPersistence hook - localStorage cache + DB sync logic (2026-01-19)
- [x] M51 Phase 3: SessionRecoveryDialog component - resume/start-fresh modal (2026-01-19)
- [x] M51 Phase 4: Study.jsx integration - recovery check on mount, save-on-answer (2026-01-19)
- [x] M51 Phase 5: BeforeUnload handler (integrated in Study.jsx, pauseSession on unload) (2026-01-19)
- [x] M51 Phase 6: SaveIndicator component in SessionHeader (2026-01-19)
- [x] M51 Phase 7: Multiple tab prevention (localStorage lock) (2026-01-19)
- [x] M51 RLS Fix: Added SELECT policy "Users can select own sessions" on sessions table (2026-01-19)
- [x] M51 Testing: Reload mid-session → recovery dialog shows correct progress (1/20) → resume works (2026-01-19)

**Infrastructure Deployment (I1-I4)** - See `.claude/memory/milestones/infrastructure_deployment.md`
- [x] Infrastructure Research: 6 parallel worktrees (ec2, docker, nginx-ssl, netlify, docs, integration), consolidated NEW FEATURES.md (2026-01-23)
- [ ] I1: EC2 instance setup + security groups + SSH
- [ ] I2: Docker + docker-compose configuration with LibreOffice
- [ ] I3: Nginx reverse proxy + SSL (Let's Encrypt)
- [ ] I4: Netlify frontend deployment


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

**M47 Dependencies:**
- Pydantic `EmailStr` requires `email-validator` package: `pip install email-validator`
- Backend won't start without it if any route model uses EmailStr

**M48 SupabaseContext Missing Session:**
- SupabaseContext.jsx didn't track or expose auth session state
- Hooks like useZoomPreference that need `session.user.id` silently failed (userId was undefined)
- Fix: Added `const [session, setSession] = useState(null)` + auth listener + expose `session` in context value
- Pattern: Any hook needing user ID must get it from `useSupabase()` context's session, not localStorage

**RLS/Display Bug (FIXED 2026-01-07):**
- Root cause: complex RLS policy + redundant user_id filters + wrong API port
- Fix applied: `fix_practice_items_rls.sql`, removed redundant filters, fixed port
- Full analysis archived in `.claude/memory/milestones/auth_multiuser.md`

**M51 Sessions SELECT Policy (FIXED 2026-01-19):**
- Issue: Sessions table had INSERT/UPDATE/DELETE policies but NO SELECT policy
- Symptom: `useSessionPersistence` query returned 0 sessions despite data existing (admin could see via postgres role)
- Fix: `CREATE POLICY "Users can select own sessions" ON sessions FOR SELECT USING (auth.uid() = user_id)`
- Lesson: Always verify all CRUD operations have corresponding RLS policies


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
- `architecture.md` - Supabase, hybrid CLI/web, FastAPI, RLS, auth, deployment
- `technology.md` - Claude/Groq, SM-2, React/Vite, ThreadPoolExecutor, document rendering
- `patterns.md` - Batch inserts, retry logic, progress callbacks

All decisions are archived with full rationale. See memory files for details.


## Outcomes and Retrospective

**Full archive:** `.claude/memory/reference/retrospective.md`

Retrospectives for M1-M8 (CLI), M9-M15 (Web UI), M16-M19 (Sources). Key outcomes: complete document pipeline, LLM-based KC extraction, SM-2 scheduling, web UI with feature parity, real-time upload processing. See archive for detailed what worked/gaps/lessons.


## Context and Orientation

**Full archive:** `.claude/memory/reference/context.md`

This is a personal learning tool: CLI + Web UI, Supabase (PostgreSQL), Claude API for ingestion, Groq for item generation. Key concepts: Knowledge Component (KC), practice items, mastery level (EMA), SM-2 spaced repetition, technique bundles. Project structure: `learn_system/` (Python CLI) and `web/` (React). See archive for complete glossary.


## Plan of Work

Implementation proceeds through fifty-one milestones plus four infrastructure milestones. M1-M51 are complete. I1-I4 are ready for implementation.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI Core (Complete):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.

**Sources Feature (Complete):** M16: Sources page foundation with list display. M17: Upload UI with drag-drop and validation. M18: FastAPI backend with processing endpoints. M19: Real-time processing progress. M20: Error handling and polish.

**Speed Optimization (Complete):** M21: Groq client and batch database inserts. M22: Parallel practice item generation. M23: Error resilience and retry logic.

**Agent Memory System (Complete):** M24: Create memory directory structure. M25: Extract completed milestones to archive. M26: Extract decisions and schemas. M27: Extract reference material. M28: Slim EXECPLAN to active content only. M29: Update CLAUDE.md with memory access instructions.

**Document Reader Feature (Complete):** M30: Core infrastructure (database, storage, route). M31: Sidebar TOC integration. M32: Document rendering (PDF, Markdown, text). M33: Navigation entry points. M34: Text selection and highlights. M35: Assistant panel (notes, AI chat). M36: Reading progress tracking. M37: Polish and performance.

**Document Viewer Fidelity (Complete):** M38: DOCX high-fidelity rendering with docx-preview (client-side).

**PDF Highlighting (Complete):** M39: Page-based PDF highlighting with percentage coordinates.

**PowerPoint Support (Complete):** M40: PPTX document support with LibreOffice conversion. Upload PowerPoint presentations, view as PDF, highlight text, generate KCs from slides.

**Authentication & Multi-User (Complete):** M41: Supabase Auth configuration. M42: Database schema migration. M43: Backend auth middleware. M44: Frontend auth flow. M45: RLS policies. M46: Data migration. See `.claude/memory/milestones/auth_multiuser.md`.

**Approved Users Whitelist (Complete):** M47: Restricted document upload to approved users. Database migration for approved_users table with deny-all RLS, backend approval logic (ApprovedUser dependency) and admin endpoints, frontend AdminRoute guard with useIsAdmin hook, Admin page for managing whitelist, upload error handling for 403.

**Persistent Zoom Preference (Complete):** M48: Remember user's zoom level in document reader across sessions. Database-backed per-user preferences.

**Source-Grounded Practice Items (Complete):** M49: Practice items now grounded in source documents. KC extraction populates `source_excerpt` with verbatim quotes, templates include GROUNDING RULES that constrain items to test only concepts derivable from source + reasonable domain prerequisites. No database migrations needed - field already existed.

**Practice Mode UI Differentiation (Complete):** M50: Render practice items with mode-appropriate UI. Recognition shows multiple choice buttons with auto-grading, cued_recall shows progressive hints, execution shows task checklists, explanation/application show rubric previews with word count. Pure frontend work - no backend changes. See `.claude/memory/milestones/webui_core.md` for implementation details.

**Session Continuity (Complete):** M51: Persist study session progress across page reloads. Database migration adds 5 columns to sessions table (status, current_item_index, queue_item_ids, paused_at, last_activity_at). Hybrid storage: localStorage cache + database source of truth. New components: useSessionPersistence hook, SessionRecoveryDialog, SaveIndicator. BeforeUnload with sendBeacon for crash resilience. Multiple tab prevention via localStorage lock.

**Infrastructure Deployment (Ready):** I1: EC2 instance setup (Ubuntu 24.04 t3.micro, security groups, SSH). I2: Docker configuration (Dockerfile with LibreOffice, docker-compose.yml). I3: Nginx reverse proxy with SSL (Let's Encrypt, 300s timeouts for LLM endpoints). I4: Netlify frontend deployment (netlify.toml, environment variables). See `.claude/memory/milestones/infrastructure_deployment.md`.


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

External memory in `.claude/memory/` (17 files):

| Category | Files |
|----------|-------|
| `milestones/` | cli_foundation.md, webui_core.md, sources_feature.md, speed_optimization.md, agent_memory.md, document_reader.md, auth_multiuser.md, infrastructure_deployment.md |
| `decisions/` | architecture.md, technology.md, patterns.md, memory_system.md |
| `schemas/` | database.md, api.md, components.md |
| `reference/` | research.md, context.md, retrospective.md |

See `.claude/memory/INDEX.md` for full summaries and cross-references.


## Infrastructure Reference

**Full specs:** `.claude/memory/milestones/infrastructure_deployment.md`

Deploy to production: Netlify (frontend) + EC2 (backend with Docker/LibreOffice/Nginx/SSL) + Supabase (database). Cost: $1-18/month.

### Infrastructure Milestones

| ID | Description | Status |
|----|-------------|--------|
| I1 | EC2 instance setup + security groups + SSH | Pending |
| I2 | Docker + docker-compose configuration with LibreOffice | Pending |
| I3 | Nginx reverse proxy + SSL (Let's Encrypt) | Pending |
| I4 | Netlify frontend deployment | Pending |

### Deployment Prerequisites

Before deploying (all documented in memory file):
- [ ] CORS_ORIGINS configured for production domain
- [ ] Supabase RLS policies applied (already complete - M45)
- [ ] Admin users added to approved_users table (already complete - M47)
- [ ] EC2 SSH key created and secured
- [ ] Domain DNS configured (or use Netlify subdomain)


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


## Operational Policies (DO NOT DELETE)

These policies are ACTIVE and must be followed by every session. They are not milestones—they define ongoing operational behavior.


### Memory System Architecture

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


### Cleanup Loop (repeat after each milestone)

    Work → Archive → Slim → Repeat

After completing ANY milestone:
1. Archive detailed implementation notes to `.claude/memory/milestones/`
2. Extract new decisions to `decisions/*.md`
3. Update schemas if structure changed
4. Slim EXECPLAN.md - replace archived content with one-liner + link
5. Update INDEX.md if new files created

Target: Keep EXECPLAN.md under ~650 lines. If it grows larger, archive completed work immediately.


### Slim EXECPLAN to Active Content Only (OPERATIONAL POLICY - DO NOT DELETE)

EXECPLAN.md should contain only active work content. Target: ~500-650 lines.

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


---

## Milestones

All completed milestones are archived in `.claude/memory/milestones/`. See Progress section for dates.


### Document Reader Feature M30-M40 (Complete)

**Full specs:** `.claude/memory/milestones/document_reader.md`

AlphaXiv-style document reader. Flow: upload → read/study → practice. Supports PDF, DOCX (docx-preview), PPTX (LibreOffice→PDF), Markdown, text. Features: sidebar TOC, text selection, highlights (character-based for text, page-based % coords for PDF), AI chat, notes, reading progress, zen mode.


### Authentication & Multi-User Feature M41-M46 (Complete)

**Full specs:** `.claude/memory/milestones/auth_multiuser.md`

Supabase Auth, email/password, JWT validation, 46+ RLS policies, data migration, deployment config (Vercel + Railway + Supabase). See memory archive for implementation details.


### Approved Users Whitelist Feature M47 (Complete)

**Full specs:** `.claude/memory/milestones/auth_multiuser.md`

Restricts document upload to whitelisted users. Non-approved users get 403 Forbidden. Admins manage whitelist via `/admin` page. Hardcoded admin emails: gianmariatroiani@gmail.com, gtroiani@equilibriaconsulting.net. Key components: approved_users table with deny-all RLS, ApprovedUser dependency for protected endpoints, AdminRoute guard, Admin page UI.


### Persistent Zoom Preference M48 (Complete)

**Full specs:** `.claude/memory/milestones/document_reader.md`

User's zoom level persists across sessions. Database-backed user_preferences table with RLS, useZoomPreference hook with debounced saves, zoom state lifted from renderers to ReaderContent.jsx.


### Source-Grounded Practice Items M49 (Complete)

**Full specs:** `.claude/memory/milestones/sources_feature.md`

Practice items grounded in source documents rather than LLM general knowledge. KC extraction populates `source_excerpt` with verbatim quotes (50-200 words). Templates include GROUNDING RULES constraining items to test only concepts derivable from source + reasonable domain prerequisites. Backward compatible with NULL excerpts.


### Practice Mode UI Differentiation M50 (Complete)

**Full specs:** `.claude/memory/milestones/webui_core.md`

Practice items now render with mode-appropriate UI. Recognition shows A/B/C/D buttons with auto-grading, cued_recall has progressive hints, execution has task checklists. Pure frontend: AnswerInput.jsx dispatches to mode-specific components in `inputs/` directory.


### Session Continuity Across Page Reloads M51 (Complete)

**Full specs:** `.claude/memory/milestones/webui_core.md`

Persist study session progress so users can resume after page reload, WiFi change, or browser restart. Hybrid storage: localStorage cache for fast access + database as source of truth. Recovery dialog shows progress and offers resume/start-fresh choice.

**Key Components:**
- `web/src/hooks/useSessionPersistence.js` - Checks for incomplete sessions on mount, debounced DB saves, localStorage cache
- `web/src/components/study/SessionRecoveryDialog.jsx` - Resume/start-fresh modal with progress display
- `web/src/components/study/SaveIndicator.jsx` - Cloud save status icon in header
- `web/src/components/study/SessionHeader.jsx` - Updated to show SaveIndicator

**Critical Fix:** Added SELECT RLS policy for sessions table - users could INSERT/UPDATE/DELETE but not SELECT their own sessions.

**Validation Rules:**
- Session age < 7 days: valid, show resume dialog
- Session age > 7 days: auto-mark abandoned, start fresh


### Infrastructure Deployment I1-I4 (Ready)

**Full specs:** `.claude/memory/milestones/infrastructure_deployment.md`

Deploy to production: EC2 (backend) + Netlify (frontend) + Supabase (database).

**Architecture:** User → Netlify (React SPA) → HTTPS → Nginx (reverse proxy + SSL) → FastAPI (Docker + LibreOffice) → Supabase/Claude/Groq APIs.

**Why EC2 over Lambda:**
- API Gateway timeout: 29s max vs. 30-60s LLM processing
- LibreOffice: 500MB+ doesn't fit Lambda layers
- SSE streaming: API Gateway doesn't support
- Background tasks: Lambda dies after response

**Milestones:**

**I1: EC2 Instance Setup**
- Goal: Provision AWS EC2 with SSH access
- Work: Launch Ubuntu 24.04 t3.micro, configure security groups (22/80/443/8001), allocate Elastic IP, setup SSH config
- Verification: SSH to instance, Docker hello-world runs

**I2: Docker Configuration**
- Goal: Containerize FastAPI with LibreOffice
- Work: Create Dockerfile (python:3.11-slim + libreoffice-impress), docker-compose.yml, .dockerignore
- Verification: `curl http://localhost:8001/api/health` returns healthy

**I3: Nginx Reverse Proxy + SSL**
- Goal: HTTPS with Let's Encrypt
- Work: Configure Nginx upstream, rate limiting, 300s timeout for upload/SSE endpoints, certbot SSL
- Verification: `curl -I https://api.yourdomain.com/api/health` returns 200 with SSL

**I4: Netlify Frontend Deployment**
- Goal: Deploy React SPA
- Work: Create netlify.toml, configure environment variables (VITE_SUPABASE_URL, VITE_API_URL), link repo
- Verification: Frontend loads, login works, sources page shows data

**Cost:** $1-18/month (t3.micro $0-8, Claude API $1-10, everything else free tier)


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
- 2026-01-07: RLS Policy Proper Fix - Applied fix_practice_items_rls.sql via Supabase Dashboard. Updated useSources.js and Study.jsx to use direct Supabase queries instead of backend workaround. Technical debt reduced. Full study flow verified: question display, answer submission, self-assessment, next question transition.
- 2026-01-07: API Port Fix - Fixed api.js using wrong port (8000 instead of 8001). Document reader now works correctly. Root cause found via 3 parallel research agents investigating backend, frontend, and storage/RLS.
- 2026-01-11: M47 Spec Added - Approved Users Whitelist feature integrated into EXECPLAN. Restricts document upload to whitelisted users, admin page for management. 8 implementation phases defined.
- 2026-01-11: M47 Complete - Approved Users Whitelist feature fully implemented and tested. Database migration (approved_users table with RLS), backend approval logic (ApprovedUser dependency), protected upload endpoint, admin API endpoints (list/add/remove), AdminRoute guard with useIsAdmin hook, Admin page UI (table, add form, remove with confirmation), 403 error handling for non-approved uploads. Integration testing verified: admin link visibility, admin page CRUD operations, upload zone access for approved users. Required `pip install email-validator` for Pydantic EmailStr validation.
- 2026-01-18: M48 Complete - Persistent Zoom Preference. User's zoom level in document reader now persists across sessions. Created user_preferences table with RLS, useZoomPreference hook with debounced saves, lifted zoom state from PDFRenderer/DOCXRenderer to ReaderContent.
- 2026-01-19: M49 Spec Added - Source-Grounded Practice Items. Research complete via 6 parallel worktrees. Problem: source_excerpt field exists but never populated, causing practice items to test concepts not in source. Solution: 2-phase fix (KC extraction + templates), no DB migrations needed.
- 2026-01-19: M49 Complete - Source-Grounded Practice Items. KC extraction now populates source_excerpt with verbatim quotes (kc_extractor.py). Templates include GROUNDING RULES constraining items to test only concepts derivable from source + domain prerequisites (templates.py). Backward compatible with NULL excerpts.
- 2026-01-19: M50 Spec Added - Practice Mode UI Differentiation. Research complete via 6 parallel worktrees (NEW FEATURES.md). Pure frontend enhancement: render practice items with mode-appropriate UI (recognition as MCQ buttons, cued_recall with hints, execution with checklists). 6 implementation phases defined. No backend changes required.
- 2026-01-19: M50 Complete - Practice Mode UI Differentiation. Created inputs/ directory with 6 mode-specific components (FreeRecallInput, RecognitionInput, CuedRecallInput, ExecutionInput, ExplanationInput, ApplicationInput) and shared/ directory with primitives (TextArea, SubmitButton, SkipButton). AnswerInput refactored as dispatcher. Study.jsx updated with userResponse state and mode-specific handling (recognition auto-grades, execution calculates independence score). Live testing verified ExplanationInput (blue rubric, word count) and ApplicationInput (scenario placeholder).
- 2026-01-19: M51 Spec Added - Session Continuity Across Page Reloads. Research complete via 6 parallel worktrees (ui-ux, data-model, study-jsx, lifecycle, storage, edge-cases). Problem: Study.jsx creates new session on every load, abandoning incomplete sessions. Solution: hybrid storage (localStorage cache + DB source of truth), SessionRecoveryDialog on mount, beforeunload with sendBeacon, multiple tab prevention. Database migration adds 5 columns to sessions table. 7 implementation phases defined.
- 2026-01-19: M51 Complete - Session Continuity Across Page Reloads. Implemented useSessionPersistence hook (async auth check, debounced DB saves), SessionRecoveryDialog with progress display (X/20, last activity timestamp), SaveIndicator with cloud icon. Critical fix: added SELECT RLS policy "Users can select own sessions" on sessions table - original RLS only had INSERT/UPDATE/DELETE but not SELECT. Live testing verified: complete item → reload → recovery dialog shows 1/20 progress → resume works.
- 2026-01-23: Infrastructure Deployment Research Complete - 6 parallel worktrees created (infra/ec2-setup, infra/docker-config, infra/nginx-ssl, infra/netlify-frontend, infra/deployment-docs, infra/system-integration). Consolidated into NEW FEATURES.md covering EC2, Docker, Nginx/SSL, Netlify, credentials, operational procedures, troubleshooting.
- 2026-01-23: Infrastructure Deployment Integrated into EXECPLAN - Created `.claude/memory/milestones/infrastructure_deployment.md` with full deployment specs. Added I1-I4 milestones to Progress section. Added detailed milestone descriptions. Updated Purpose/Big Picture, Plan of Work, Infrastructure Reference, Memory Index. EXECPLAN now fully self-contained for infrastructure deployment following PLANS.md conventions.
