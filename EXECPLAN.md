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

Users upload educational documents and receive automatically generated practice items scheduled for optimal retention. The system extracts knowledge components, generates practice items, and uses SM-2 spaced repetition to schedule reviews.

**Core workflow:** Upload document → Read in browser → Practice with spaced repetition → Track mastery

**Problems solved:** (1) Forces retrieval practice to reveal gaps, (2) Fights forgetting via spaced repetition, (3) Measures learning objectively, (4) Enables self-experimentation, (5) Removes cognitive overhead.

**Key features (all implemented):**
- Document reader with PDF/DOCX/PPTX/Markdown support, highlights, notes, AI chat
- Multi-user auth with RLS, approved users whitelist for upload access
- Mode-specific practice UI (recognition, cued recall, execution, explanation, application)
- Session continuity across page reloads
- Production deployment on Netlify + EC2 + Supabase


## Progress

**M1-M51, I1-I4, T1-T6 complete.** For detailed notes, see `.claude/memory/milestones/` and `.claude/memory/quality/`.

| Phase | Milestones | Date | Archive |
|-------|------------|------|---------|
| CLI Foundation | M1-M8 | 2026-01-02 | `cli_foundation.md` |
| Web UI Core | M9-M15 | 2026-01-02 | `webui_core.md` |
| Sources Feature | M16-M20 | 2026-01-02/03 | `sources_feature.md` |
| Speed Optimization | M21-M23 | 2026-01-03 | `speed_optimization.md` |
| Agent Memory System | M24-M29 | 2026-01-04 | `agent_memory.md` |
| Document Reader | M30-M37 | 2026-01-05 | `document_reader.md` |
| DOCX Fidelity | M38 | 2026-01-06 | `document_reader.md` |
| PDF Highlighting | M39 | 2026-01-06 | `document_reader.md` |
| PowerPoint Support | M40 | 2026-01-06 | `document_reader.md` |
| Auth & Multi-User | M41-M46 | 2026-01-06/07 | `auth_multiuser.md` |
| Approved Users | M47 | 2026-01-11 | `auth_multiuser.md` |
| Zoom Preference | M48 | 2026-01-18 | `document_reader.md` |
| Source Grounding | M49 | 2026-01-19 | `sources_feature.md` |
| Practice Mode UI | M50 | 2026-01-19 | `webui_core.md` |
| Session Continuity | M51 | 2026-01-19 | `webui_core.md` |
| Infrastructure | I1-I4 | 2026-01-23 | `infrastructure_deployment.md` |
| TDD Foundation | T1-T6 | 2026-01-28 | `quality/testing.md` |

### T1-T6: TDD Foundation (Complete)

Test-Driven Development infrastructure with two test types: **Logic Tests** (pytest/Vitest) and **UI Tests** (Chrome extension).

**Results:** 21 backend tests, 24 frontend tests, UI protocol validated.

**Full archive:** `.claude/memory/quality/testing.md`


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

**Infrastructure Deployment (I1-I4) - 2026-01-23:**
- **Terraform for EC2:** Created `infrastructure/main.tf` with full EC2 provisioning (instance, security group, elastic IP, SSH key pair). User_data script installs Docker and Nginx automatically.
- **netlify.toml location:** Must be in repo root, not in `web/` subdirectory. Netlify ignores toml files in subdirectories.
- **CORS for production:** EC2 `.env` needs `CORS_ORIGINS=http://localhost:5173,https://your-app.netlify.app` (comma-separated, no spaces)
- **Elastic IP cost:** Free when associated with running instance; ~$3.60/month if instance stopped. Keep instance running or release EIP.
- **docker-compose version warning:** "version attribute is obsolete" warning is harmless, can be ignored or remove `version: '3.8'` line
- **CRITICAL - Mixed content blocking:** HTTPS frontend (Netlify) cannot make HTTP requests to backend (EC2 without SSL). Browser blocks these as mixed content. **Solution:** Add Netlify proxy in netlify.toml: `[[redirects]] from="/api/*" to="http://EC2-IP/api/:splat" status=200 force=true`. Set `VITE_API_URL=/api` (relative path). Requests go HTTPS→Netlify→HTTP→EC2.
- **docker-compose restart vs recreate:** `docker compose restart` does NOT reload `.env` file. Must use `docker compose down && docker compose up -d` to pick up env var changes.


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

**Full archive:** `.claude/memory/decisions/`

| Decision | Rationale | Archive |
|----------|-----------|---------|
| EC2 over Lambda | 29s timeout insufficient, LibreOffice too large, SSE unsupported | `architecture.md` |
| Netlify frontend | Free tier, Vite support, simple SPA config | `architecture.md` |
| Docker backend | Encapsulates LibreOffice, consistent env | `technology.md` |
| Nginx 300s timeout | LLM requests need 30-60s+, SSE buffering | `infrastructure_deployment.md` |
| Supabase + RLS | Auth, PostgreSQL, row-level security | `architecture.md` |
| Claude + Groq | KC extraction (Claude), practice items (Groq) | `technology.md` |
| **Vitest over Jest** | Native Vite integration, 5-10x faster, zero config | `quality/testing.md` |
| **TDD mandatory** | 0% coverage = high regression risk, TDD ensures design clarity | `quality/testing.md` |


## Outcomes and Retrospective

**Full archive:** `.claude/memory/reference/retrospective.md`

Retrospectives for M1-M8 (CLI), M9-M15 (Web UI), M16-M19 (Sources). Key outcomes: complete document pipeline, LLM-based KC extraction, SM-2 scheduling, web UI with feature parity, real-time upload processing. See archive for detailed what worked/gaps/lessons.


## Context and Orientation

**Full archive:** `.claude/memory/reference/context.md`

This is a personal learning tool: CLI + Web UI, Supabase (PostgreSQL), Claude API for ingestion, Groq for item generation. Key concepts: Knowledge Component (KC), practice items, mastery level (EMA), SM-2 spaced repetition, technique bundles. Project structure: `learn_system/` (Python CLI) and `web/` (React). See archive for complete glossary.


## Milestone Quick Reference

**61 milestones complete (M1-M51, I1-I4, T1-T6).** Production: https://personalized-learning-system.netlify.app/

| Range | Feature | Key Components |
|-------|---------|----------------|
| M1-M8 | CLI Foundation | DB schema, ingestion, KC extraction, practice items, SM-2, todo |
| M9-M15 | Web UI Core | React/Vite, Home, Study, Calendar, Due, Progress, Analytics |
| M16-M20 | Sources | Sources page, upload UI, FastAPI, realtime progress, error handling |
| M21-M23 | Speed | Groq client, parallel processing, retry logic |
| M24-M29 | Memory System | `.claude/memory/` structure, archive extraction, slim EXECPLAN |
| M30-M37 | Document Reader | PDF/Markdown viewers, TOC, highlights, notes, AI chat, progress |
| M38 | DOCX Fidelity | docx-preview library, client-side rendering |
| M39 | PDF Highlighting | Page-based % coordinates, PDFHighlightLayer |
| M40 | PowerPoint | python-pptx extraction, LibreOffice→PDF conversion |
| M41-M46 | Auth/Multi-User | Supabase Auth, user_id columns, JWT middleware, RLS (46+ policies) |
| M47 | Approved Users | Upload whitelist, admin page at `/admin`, 403 handling |
| M48 | Zoom Preference | user_preferences table, useZoomPreference hook |
| M49 | Source Grounding | KC source_excerpt field, GROUNDING RULES in templates |
| M50 | Practice Mode UI | Recognition/CuedRecall/Execution/Explanation input components |
| M51 | Session Continuity | sessions table columns, useSessionPersistence, recovery dialog |
| I1-I4 | Infrastructure | EC2 + Docker + Nginx + Netlify deployment |
| T1-T6 | TDD Foundation | pytest (21 tests), Vitest (24 tests), Chrome UI tests, agent separation |


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

External memory in `.claude/memory/` (18+ files):

| Category | Files |
|----------|-------|
| `milestones/` | cli_foundation.md, webui_core.md, sources_feature.md, speed_optimization.md, agent_memory.md, document_reader.md, auth_multiuser.md, infrastructure_deployment.md |
| `decisions/` | architecture.md, technology.md, patterns.md, memory_system.md |
| `schemas/` | database.md, api.md, components.md |
| `reference/` | research.md, context.md, retrospective.md |
| `quality/` | testing.md |

See `.claude/memory/INDEX.md` for full summaries and cross-references.


## Infrastructure Reference

**Full specs:** See "Infrastructure Deployment I1-I4" in Milestones section below (self-contained, no external files needed).

Deploy to production: Netlify (frontend) + EC2 (backend with Docker/LibreOffice/Nginx/SSL) + Supabase (database). Cost: $1-18/month.

### Infrastructure Milestones

| ID | Description | Status |
|----|-------------|--------|
| I1 | EC2 instance setup + security groups + SSH | ✅ Complete (Terraform) |
| I2 | Docker + docker-compose configuration with LibreOffice | ✅ Complete |
| I3 | Nginx reverse proxy + SSL (Let's Encrypt) | ✅ Complete (SSL pending domain) |
| I4 | Netlify frontend deployment | ✅ Complete |

**Production URLs:**
- Frontend: https://personalized-learning-system.netlify.app/
- Backend: http://3.215.170.154/api

### Deployment Prerequisites

All prerequisites complete:
- [x] CORS_ORIGINS configured for production domain
- [x] Supabase RLS policies applied (M45)
- [x] Admin users added to approved_users table (M47)
- [x] EC2 SSH key created and secured
- [x] Using Netlify subdomain (custom domain optional)


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

**Sections to keep:**
- Purpose and Big Picture (concise system description)
- Progress (summary table with links to memory)
- Known Issues and Future Improvements (active guidance)
- Surprises and Discoveries (operational knowledge)
- Memory Index (links to all `.claude/memory/` files)
- CLI and Web Usage Reference (operational docs)
- Recovery Notes (operational docs)
- Operational Policies (this section and Memory Access Protocols)
- Infrastructure Reference (deployment procedures)

**Sections to archive:**
- Detailed milestone phase-by-phase notes → `milestones/*.md`
- Full Decision Log → `decisions/*.md`
- Detailed Outcomes and Retrospective → `reference/retrospective.md`
- Full Context and Orientation → `reference/context.md`
- Full schema details → `schemas/*.md`

**When adding new milestones:**
1. Add full detail during active development
2. After completion, archive to appropriate memory file
3. Replace with one-line summary + link to archive
4. Update Memory Index if new files created

**Verification:** Keep EXECPLAN.md under 650 lines. Run `wc -l EXECPLAN.md` to check.


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


### Test-Driven Development (OPERATIONAL POLICY - DO NOT DELETE)

**TDD is mandatory for EVERY milestone.** No milestone is complete without passing tests. Write tests BEFORE implementing features. Use two test types: **Logic Tests** (automated) and **UI Tests** (browser automation).

**Agent Separation Policy (MANDATORY):**
The agent that writes tests MUST be different from the agent that implements the solution. This prevents bias. For every milestone:
1. Spawn **Test Agent** first to write failing tests based on requirements
2. Spawn **Implementation Agent** to write code that passes the tests
3. Test Agent reviews coverage and adds edge cases

**Two Test Types:**

| Type | Tool | Purpose | When Required |
|------|------|---------|---------------|
| **Logic Tests** | pytest, Vitest | Verify business logic, APIs, hooks, data transformations | Every code change |
| **UI Tests** | Chrome extension | Verify visual rendering, user flows, interactions | Every UI change |

**UI Testing Permission:** The system has standing permission to use Chrome browser automation for UI testing without additional approval.

**Modified Cleanup Loop:**

    Work → Logic Test → UI Test → Archive → Slim → Repeat
                 ↑           ↑
                 └───────────┴─ Both required before completion

**When to use each test type:**

| Change Type | Logic Tests | UI Tests |
|-------------|-------------|----------|
| Backend API endpoint | ✅ Required | ❌ Not needed |
| Business logic (spacing, parsing) | ✅ Required | ❌ Not needed |
| React hook logic | ✅ Required | ❌ Not needed |
| New UI component | ✅ Required (logic) | ✅ Required (visual) |
| Styling/layout change | ❌ Not needed | ✅ Required |
| User flow change | ✅ Required (logic) | ✅ Required (flow) |
| Bug fix (backend) | ✅ Required | ❌ Not needed |
| Bug fix (UI) | ⚠️ If logic involved | ✅ Required |

**Pre-Completion Verification:**

Before marking ANY milestone complete:

    # 1. Logic Tests
    cd learn_system/ && pytest --cov=app -v    # Backend
    cd web/ && npm run test:run                 # Frontend

    # 2. UI Tests (if UI changed)
    - Start dev server: cd web/ && npm run dev
    - Use Chrome extension to navigate to affected pages
    - Take screenshots, verify visual correctness
    - Test user interactions (click, type, submit)
    - Test at mobile viewport if responsive

**Requirements:**
1. Logic tests pass (no failures, no skips without rationale)
2. Coverage meets targets: ≥70% frontend, ≥75% backend critical modules
3. UI tests verify visual correctness (screenshots reviewed)
4. User flows complete successfully in browser

**Failure Handling:**

If tests don't pass:
- ✗ DO NOT mark milestone complete in Progress table
- ✗ DO NOT run Archive step of Cleanup Loop
- ✓ DO document issue in "Known Issues and Future Improvements"
- ✓ DO keep milestone "in-progress" until tests pass

**Memory Integration:**

When archiving to `.claude/memory/milestones/[feature].md`, include "Testing Approach" section:

    ## Testing Approach (MXX)

    **Logic Tests:**
    - Files: paths/to/test/files
    - Coverage: XX%
    - Key cases: list

    **UI Tests:**
    - Pages tested: /login, /upload, etc.
    - Flows verified: login → upload → study
    - Viewports: desktop, mobile
    - Issues found: none / list

**Verification:** Run `pytest`, `npm run test:run`, and Chrome UI verification before any milestone completion.


---

## Completed Milestones Summary

All milestones archived in `.claude/memory/milestones/`. Key highlights:

| Feature | Archive | Notes |
|---------|---------|-------|
| Document Reader (M30-M40) | `document_reader.md` | PDF/DOCX/PPTX/Markdown, TOC, highlights, AI chat, zen mode |
| Auth & Multi-User (M41-M46) | `auth_multiuser.md` | Supabase Auth, 46+ RLS policies, JWT validation |
| Approved Users (M47) | `auth_multiuser.md` | Whitelist for uploads, admin page at `/admin` |
| Zoom Preference (M48) | `document_reader.md` | Persists across sessions, user_preferences table |
| Source Grounding (M49) | `sources_feature.md` | KC source_excerpt, grounding rules in templates |
| Practice Mode UI (M50) | `webui_core.md` | Recognition/cued_recall/execution/explanation modes |
| Session Continuity (M51) | `webui_core.md` | Resume after reload, hybrid localStorage + DB |


### Infrastructure Deployment I1-I4 (Complete)

Deploy the Personal Learning System from localhost to production. After I4 completion, users can access the system from any device via the web.

**Architecture:**

    User Browser
         │ HTTPS
         ▼
    ┌─────────────┐                    ┌─────────────────────┐
    │   Netlify   │ ──── HTTPS ─────▶  │     Supabase        │
    │  (Frontend) │                    │  PostgreSQL + Auth  │
    │  React SPA  │                    │  Storage (Documents)│
    └──────┬──────┘                    └─────────────────────┘
           │ HTTPS
           ▼
    ┌─────────────┐                    ┌─────────────────────┐
    │   Nginx     │ ──── HTTPS ─────▶  │   External APIs     │
    │  (Reverse   │                    │  Anthropic (Claude) │
    │   Proxy)    │                    │  Groq (Fast LLM)    │
    │  SSL/TLS    │                    └─────────────────────┘
    └──────┬──────┘
           │ HTTP (localhost only)
           ▼
    ┌─────────────┐
    │  FastAPI    │
    │  (Docker)   │
    │  LibreOffice│
    └─────────────┘
    [AWS EC2 t3.micro]

**Why EC2 over Lambda (CRITICAL):**
- API Gateway timeout: 29s max — LLM processing takes 30-60+ seconds
- LibreOffice: 500MB+ doesn't fit Lambda layers (500MB limit)
- SSE streaming: API Gateway doesn't support Server-Sent Events
- Background tasks: Lambda dies after response

**Cost Estimate:** $1-18/month (t3.micro $0-8 after free tier, Claude API $1-10, Netlify/Supabase/Groq free tier)

---

#### Credentials Reference (NEVER commit to git)

| Credential | Where to Store | How to Get |
|------------|----------------|------------|
| Supabase URL | EC2 `.env`, Netlify vars | Supabase Dashboard → Settings → API |
| Supabase Anon Key | EC2 `.env`, Netlify vars | Supabase Dashboard → Settings → API → **Legacy tab** (must start with `eyJhbG...`) |
| Supabase Service Role Key | EC2 `.env` ONLY | Supabase Dashboard → Settings → API (bypasses RLS, never expose to frontend) |
| Anthropic API Key | EC2 `.env` | console.anthropic.com |
| Groq API Key | EC2 `.env` | console.groq.com |
| EC2 SSH Key | Local `~/.ssh/` | AWS Console (created during EC2 launch) |

**Backend .env template (create on EC2 at `/home/ubuntu/app/learn_system/.env`):**

    ENVIRONMENT=production
    SUPABASE_URL=https://xxx.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
    ANTHROPIC_API_KEY=sk-ant-...
    GROQ_API_KEY=gsk_...
    CORS_ORIGINS=https://your-app.netlify.app

**Netlify Environment Variables (set in Netlify Dashboard → Site settings → Environment variables):**

    VITE_SUPABASE_URL=https://xxx.supabase.co
    VITE_SUPABASE_ANON_KEY=eyJhbGc...
    VITE_API_URL=https://api.yourdomain.com/api

---

#### Setup Instructions (Archived)

**For detailed I1-I4 setup steps, see:** `.claude/memory/milestones/infrastructure_deployment.md`

This includes: EC2 instance setup, Docker configuration, Nginx/SSL configuration, Netlify deployment, and deployment checklist.

---

#### Operational Procedures

**Deploy Backend Updates:**

    ssh learning-prod
    cd /home/ubuntu/app
    git pull
    cd learn_system
    docker compose down
    docker compose up -d --build
    curl http://localhost:8001/api/health

**Rollback Backend:**

    ssh learning-prod
    cd /home/ubuntu/app
    git log --oneline -10  # Find previous commit
    git checkout <previous-commit>
    cd learn_system
    docker compose down
    docker compose up -d --build

**Rollback Frontend (Netlify):**
1. Netlify Dashboard → Site → Deploys
2. Click previous successful deploy
3. Click "Publish deploy"

**View Logs:**

    # Backend logs
    ssh learning-prod
    docker compose -f /home/ubuntu/app/learn_system/docker-compose.yml logs -f --tail=100

    # Nginx logs
    ssh learning-prod
    sudo tail -f /var/log/nginx/error.log

**Force SSL Renewal (if needed):**

    ssh learning-prod
    sudo certbot renew --force-renewal
    sudo systemctl reload nginx

---

#### Troubleshooting Guide

**API Returns 502 Bad Gateway:**
1. Check container: `docker compose ps`
2. Check logs: `docker compose logs --tail=50`
3. Restart: `docker compose restart`

**CORS Errors:**
1. Verify `CORS_ORIGINS` in backend `.env` matches Netlify domain exactly (including `https://`)
2. Verify `VITE_API_URL` in Netlify matches backend domain exactly
3. Restart container: `docker compose down && docker compose up -d`

**Container Won't Start:**

    docker compose logs --tail=100
    # Common issues:
    # - Missing .env file
    # - Port 8001 in use: sudo lsof -i :8001
    # - Out of disk space: df -h

**SSL Certificate Expired:**

    sudo certbot renew --force-renewal
    sudo systemctl reload nginx


## Web UI Reference

**Full specs:** `.claude/memory/schemas/components.md`

Stack: React 18, Vite 5, Tailwind CSS 3.4, React Router 6, Recharts 2, Supabase Client 2.
Structure: `web/src/{components,pages,contexts,hooks,services,lib}` and `learn_system/app/api/`.
Design: Inter font, #FAF9F7 background, #10B981 progress accent. See archive for full specs.


## Research Foundation

**Full archive:** `.claude/memory/reference/research.md`

Learning science research (Make It Stick, A Mind for Numbers, Ultralearning, Adaptive Learning Platform Blueprint) informs all system design. Key findings: retrieval practice, spacing effect (g ≈ 0.74), interleaving, desirable difficulties, cognitive load theory, ZPD, elaboration, metacognition, self-experimentation. See archive for feature mapping by source.


## Revision History

**Full changelog:** See `.claude/memory/reference/retrospective.md`

Key milestones: M1-M51 (CLI, Web UI, Sources, Speed, Memory, Document Reader, Auth, Whitelist, Zoom, Grounding, Practice Mode UI, Session Continuity) + I1-I4 (Infrastructure Deployment). All complete as of 2026-01-23.

**2026-01-28:** Completed T1-T6 (TDD Foundation). Added TDD Operational Policy with agent separation. Infrastructure: pytest (21 tests), Vitest (24 tests), Chrome UI testing.
