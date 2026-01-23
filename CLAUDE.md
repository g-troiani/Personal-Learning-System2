# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Personal Adaptive Learning System**—a localhost CLI tool that automates the logistics of learning using cognitive science principles (spaced repetition, retrieval practice, interleaving).

**Current Status:** Fully implemented through M23 (CLI + Web UI + FastAPI backend). M24-M29 implemented the tiered memory system to manage EXECPLAN complexity.

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

After completing work:
1. Archive detailed notes to appropriate memory file
2. Update EXECPLAN.md Progress (keep concise - link to archive)
3. Update INDEX.md if new file created
4. Add new decisions to decisions/*.md with rationale

**Writing style for memory:** Be concise. Sacrifice grammar for brevity but explain the system thoroughly and preserve full meaning. Use tables, bullet points, code snippets over prose. Link to source files with line numbers. Future sessions need context, not narrative.


## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | Python | 3.11+ |
| Database | Supabase | PostgreSQL, cloud-hosted |
| Interface | CLI + Web UI | Command-line and React SPA |
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
# TBD - Commands will be defined as implementation begins
python -m learn todo      # Show what's due for practice
python -m learn ingest    # Process a new document
python -m learn practice  # Start a practice session
python -m learn stats     # View learning analytics
```

## Key Architectural Decisions

- **Single user** (no auth, no multi-tenancy)
- **CLI + Web UI** (both interfaces share same Supabase backend)
- **Supabase database** (cloud PostgreSQL)
- **LLM for ingestion only** (not during practice sessions)

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

1. **Automatic Content Processing** — Extract knowledge components from documents, classify by type, generate practice items
2. **Intelligent Scheduling** — Spaced repetition, overdue tracking, struggle detection
3. **Measurement & Tracking** — Correctness, confidence, timing, attempts, hints used
4. **Self-Experimentation** — A/B testing of learning techniques with controlled variables
5. **Source-Specific Review** — Per-document tracking and topic-focused sessions

## Testing Instructions

- Run linting before commits
- Test with sample documents of each type (PDF, DOCX, Markdown)
- Verify database migrations work on existing data
- Test spaced repetition algorithm with simulated time progression

## Git Workflow

- Branch naming: `feature/<component>` or `fix/<issue>`
- Commit messages: Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)
- Commit after completing each milestone in an ExecPlan

## Coding Constraints

**Do:**
- Follow the design philosophy above
- Track all variables defined in the variable taxonomy
- Handle document processing errors gracefully
- Make CLI output clear and actionable

**Do Not:**
- Call LLM during practice sessions (only during ingestion)
- Add gamification elements (badges, streaks, points)

## Success Metrics

The system succeeds if:
1. Overhead is low enough for consistent daily use
2. Time-to-mastery improves vs. unstructured learning
3. Retention at 7 and 30 days is measurably better
4. Self-experimentation yields actionable insights
5. `learn todo` replaces manual study planning
