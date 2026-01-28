# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Personal Adaptive Learning System**—a deployed web application (with optional CLI) that automates the logistics of learning using cognitive science principles (spaced repetition, retrieval practice, interleaving).

**Production URLs:**
- Frontend: https://personalized-learning-system.netlify.app/
- Backend: AWS EC2 with Docker (http://3.215.170.154/api)

**Current Status:** The system supports document upload (PDF, DOCX, PPTX, Markdown), AI-powered knowledge extraction, spaced repetition practice, multi-user auth with RLS, and session continuity.

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in PLANS.md) from design to implementation.

### Source of Truth

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in PLANS.md) from design to implementation. Keep EXECPLAN.md updated as it is the source of truth and living document for this project. 

  ## Living Documentation

  EXECPLAN.md is the single source of truth for this project. You MUST:

  1. **Read EXECPLAN.md at session start** - Always read it first to understand current state
  2. **Update Progress section** - After completing any task, add a timestamped entry
  3. **Update Surprises and Discoveries** - Document any bugs, unexpected behaviors, or workarounds found
  4. **Update Decision Log** - Record any significant implementation decisions with rationale
  5. **Update Outcomes and Retrospective** - At major stopping points, summarize what's working, what's not, and lessons learned

  Never use temporary todo lists as the primary tracking mechanism. All progress must be recorded in EXECPLAN.md so the next session (or a new conversation) can pick up exactly where we left off.

  When resuming work:
  1. Read EXECPLAN.md first
  2. Check the Progress section for incomplete milestones
  3. Check Surprises and Discoveries for known issues
  4. Continue from documented stopping point

All specifications and design decisions are documented in:
- `VISION.md` — Core requirements, design philosophy, success criteria
- `EXECPLAN.md` — Active milestones, known issues, progress tracking
- `.claude/memory/` — External memory (archived milestones, decisions, schemas, reference)


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
| `milestones/document_reader.md` | M30-M40 details | Document viewing |
| `milestones/auth_multiuser.md` | M41-M47 details | Auth/RLS issues |
| `milestones/infrastructure_deployment.md` | I1-I4 details | Deployment issues |
| `decisions/architecture.md` | Structural choices | Proposing changes |
| `decisions/technology.md` | Stack choices | Evaluating alternatives |
| `decisions/patterns.md` | Implementation patterns | Adding features |
| `schemas/database.md` | Supabase schema | Database work |
| `schemas/api.md` | FastAPI specs | API modifications |
| `schemas/components.md` | React components | UI work |
| `reference/research.md` | Learning science | Justifying features |
| `reference/context.md` | Glossary, structure | Onboarding |
| `reference/retrospective.md` | What worked, lessons | Planning |

### Starting New Work Protocol

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
   - Document reader → `milestones/document_reader.md`
   - Auth/RLS/Admin → `milestones/auth_multiuser.md`
   - Infrastructure/Deployment → `milestones/infrastructure_deployment.md`
   - Database changes → `schemas/database.md`
   - API changes → `schemas/api.md`
   - New features → `reference/research.md` (learning science basis)

3. **Check for patterns:**
   - Similar past milestones for implementation patterns
   - Related decisions for constraints and trade-offs
   - Known issues that may affect new work

4. **ALWAYS spawn 3 scout subagents before implementing:**

   **This is mandatory for EVERY milestone.** Spawn 3 parallel subagents to search archived memory before writing any code. Failing to understand the memory system will break the repo.

   | Agent | Focus | Searches | Returns |
   |-------|-------|----------|---------|
   | **Decisions Scout** | Constraints & trade-offs | `decisions/*.md` | Relevant constraints, past rationale |
   | **Patterns Scout** | Implementation precedents | `milestones/*.md` | Similar past work, patterns, gotchas |
   | **Schema Scout** | Data structures & APIs | `schemas/*.md`, `reference/*.md` | Affected tables, endpoints, types |

   **Do NOT skip this step.** The scouts ensure you understand existing patterns before making changes.

### Reactive Retrieval Triggers

Also read external memory when:
1. User asks about completed features
2. You encounter unexpected behavior
3. You're unsure about prior decisions
4. Debugging requires implementation context

### Memory Update Protocol

   **This is mandatory for EVERY milestone.** 

After completing work:
1. Archive detailed notes to appropriate memory file
2. Update EXECPLAN.md Progress (keep concise - link to archive)
3. Update INDEX.md if new file created
4. Add new decisions to decisions/*.md with rationale

**Writing style for memory:** Be concise. Sacrifice grammar for brevity but explain the system thoroughly and preserve full meaning. Use tables, bullet points, code snippets over prose. Link to source files with line numbers. Future sessions need context, not narrative.


## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | React 18 + Vite 5 | Tailwind CSS, React Router 6, Recharts |
| Backend | Python 3.11+ FastAPI | Docker, LibreOffice for PPTX conversion |
| Database | Supabase | PostgreSQL, Auth, Storage, RLS |
| Hosting | Netlify + AWS EC2 | Frontend CDN, Backend Docker container |
| LLM | Claude API + Groq | KC extraction (Claude), practice items (Groq) |
| Document Processing | LibreOffice | PDF, DOCX, PPTX, Markdown |


## Infrastructure

For deployment and operational procedures, see **`INFRA.md`**.

### Deployment Overview

| Component | Host | Deploy Method |
|-----------|------|---------------|
| Frontend | Netlify | Auto-deploy on push to main |
| Backend | AWS EC2 | Manual via SSH + docker-compose |
| Database | Supabase | Managed service |

### Before Deploying

1. Run `npm run build` in `web/` to verify production build
2. Run `npm run lint` to catch lint errors
3. Check `INFRA.md` for environment-specific requirements
4. Verify all environment variables are set

### Key Infrastructure Files

- `INFRA.md` — Full deployment documentation, credentials reference, runbooks
- `learn_system/Dockerfile` — Backend container definition
- `learn_system/docker-compose.yml` — Container orchestration
- `web/netlify.toml` — Frontend deployment configuration

### Common Operations

| Task | Command/Location |
|------|------------------|
| Deploy backend | See INFRA.md "Deploy Backend Updates" section |
| View production logs | `ssh learning-prod` → `docker compose logs -f` |
| Check health | `curl https://api.yourdomain.com/api/health` |
| Rollback backend | See INFRA.md "Rollback Backend" section |
| Rollback frontend | Netlify Dashboard > Deploys > Publish previous |

### Infrastructure Changes

When making infrastructure changes:
1. Update `INFRA.md` first (documentation-first)
2. Test in development environment
3. Deploy to production
4. Verify with post-deployment checks

Never modify production infrastructure without:
- Documented rollback procedure
- Access to monitoring/logs
- Understanding of `INFRA.md` content

## Development Commands

```bash
# Web UI (primary interface)
cd web/
npm install              # Install dependencies
npm run dev              # Development server at http://localhost:5173
npm run build            # Production build
npm run lint             # Lint code
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run test:coverage    # Run tests with coverage

# Backend API
cd learn_system/
pip install -r requirements.txt
uvicorn app.api.server:app --port 8001 --reload  # API at http://localhost:8001
pytest -v                # Run all tests
pytest --cov=app -v      # Run tests with coverage
pytest tests/unit/       # Run only unit tests

# CLI (optional, all commands functional)
python -m app.main init                    # Initialize database and bundles
python -m app.main ingest <file> --domain  # Process document, extract KCs
python -m app.main status                  # Show system statistics
python -m app.main sources                 # List ingested documents
python -m app.main todo                    # Show what's due for review
python -m app.main study --duration 30     # Start study session
python -m app.main review <pattern>        # Focus session on specific source
```

## Key Architectural Decisions

- **Multi-user with RLS** (Supabase Auth, email/password, Row-Level Security)
- **Approved users whitelist** (upload requires approval, admins manage via /admin)
- **Web UI primary, CLI secondary** (both share same Supabase backend)
- **Supabase database** (cloud PostgreSQL with 46+ RLS policies)
- **LLM for ingestion only** (not during practice sessions)
- **EC2 over Lambda** (LLM timeouts exceed API Gateway 29s limit)

## Design Philosophy

These principles guide all implementation decisions:

1. **Evidence-Based** — Implement techniques validated by cognitive science:
   - Retrieval practice over passive review
   - Spaced repetition over massed practice
   - Interleaving over blocked practice
   - Desirable difficulties over easy fluency

2. **Measurement Over Intuition** — Track actual performance, not felt fluency:
   - Confidence ratings before attempts
   - Difficulty ratings after attempts
   - Objective correctness where possible
   - Self-assessment with rubrics otherwise

3. **Automation Over Willpower** — Make the right choice the default:
   - Present what's due, not what's easy
   - Enforce spacing even when user wants to cram
   - Track everything automatically

## Core Capabilities

1. **Automatic Content Processing** — Extract knowledge components from documents (PDF, DOCX, PPTX, Markdown), classify by type, generate practice items grounded in source material
2. **Document Reader** — Read uploaded documents with TOC navigation, highlights, notes, and AI chat before practicing
3. **Intelligent Scheduling** — Spaced repetition (SM-2), overdue tracking, struggle detection
4. **Mode-Specific Practice** — Recognition (multiple choice), cued recall (hints), execution (checklists), explanation/application (rubrics)
5. **Session Continuity** — Resume practice sessions after page reload, browser restart, or WiFi change
6. **Measurement & Tracking** — Correctness, confidence, timing, attempts, hints used
7. **Multi-User with Approval** — Email/password auth, RLS isolation, admin-controlled upload whitelist

## Testing Instructions

**TDD is mandatory for EVERY milestone.** No milestone is complete without passing tests. Use two test types: **Logic Tests** (automated) and **UI Tests** (browser automation).

### Agent Separation Policy (MANDATORY)

**The agent that writes tests MUST be different from the agent that implements the solution.** This prevents bias. For every milestone:
1. Spawn **Test Agent** first to write failing tests based on requirements
2. Spawn **Implementation Agent** to write code that passes the tests
3. Test Agent reviews coverage and adds edge cases

### Logic Tests (Automated)

| Tool | Location | Run Command |
|------|----------|-------------|
| pytest | `learn_system/tests/` | `cd learn_system && pytest -v` |
| Vitest | `web/src/**/*.test.js` | `cd web && npm run test:run` |

**What to test with Logic Tests:**
- Backend: API endpoints, SM-2 algorithm, JWT validation, data transformations
- Frontend: Hook logic, utility functions, state management, form validation

**Run before every commit:**
```bash
cd learn_system && pytest -v              # Backend tests
cd web && npm run test:run                 # Frontend tests
```

### UI Tests (Browser Automation)

Use Chrome extension for visual verification and user flow testing.

**What to test with UI Tests:**
- Visual rendering: Does the page look correct?
- User flows: login → upload → study workflow
- Component interactions: buttons, forms, modals
- Responsive design: 375px, 768px, 1024px, 1440px viewports

**UI Test Protocol:**
1. Start dev server: `cd web && npm run dev`
2. Navigate to http://localhost:5173
3. Take screenshots of affected pages
4. Test user interactions (click, type, submit)
5. Test at mobile viewport (375px width)

### Pre-Commit Checklist

- [ ] `npm run lint` passes in `web/`
- [ ] `npm run build` succeeds in `web/`
- [ ] `pytest -v` passes in `learn_system/`
- [ ] `npm run test:run` passes in `web/`
- [ ] UI visually verified for any UI changes

## Git Workflow

- Branch naming: `feature/<component>` or `fix/<issue>`
- Commit messages: Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Commit after completing each milestone in an ExecPlan

## Coding Constraints

**Do:**
- Follow the design philosophy above
- Track all variables defined in the variable taxonomy
- Handle document processing errors gracefully
- Maintain RLS policies when adding database features
- Test auth flows (login, approved user checks)
- Write tests BEFORE implementing new features (TDD)
- Run `pytest` and `npm run test:run` before committing
- Add test coverage for new backend endpoints and frontend hooks
- Use UI tests for visual changes and user flow verification

**Do Not:**
- Call LLM during practice sessions (only during ingestion)
- Add gamification elements (badges, streaks, points)
- Bypass RLS with service role key in frontend
- Store secrets in code or CLAUDE.md/EXECPLAN.md
- Skip tests when implementing new features
- Mark milestones complete without passing tests
- Use real API keys or database connections in tests

## Success Metrics

The system succeeds if:
1. Overhead is low enough for consistent daily use
2. Time-to-mastery improves vs. unstructured learning
3. Retention at 7 and 30 days is measurably better
4. Self-experimentation yields actionable insights
5. The Home dashboard replaces manual study planning
