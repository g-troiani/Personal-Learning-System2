# Agent Memory System - M24-M29

**Status:** Complete (2026-01-04)
**Purpose:** Implement tiered memory to manage EXECPLAN complexity

## Overview

These milestones adapted MemGPT's "LLM as Operating System" pattern for file-based Claude Code: core memory (always loaded) plus external memory (retrieved on demand). Result: EXECPLAN shrank from ~1500 lines to ~500 lines while preserving full historical access.

## Architecture

```
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
```

## Milestone Details

### M24: Create Memory Directory Structure

Created `.claude/memory/` with subdirs:
- `milestones/` - archived milestone implementation details
- `decisions/` - architectural and technology choices
- `schemas/` - database, API, component specifications
- `reference/` - research, context, retrospectives

Created `INDEX.md` as navigation hub.

### M25: Extract Completed Milestones to Archive

Moved M1-M23 details to 4 milestone files:
- `cli_foundation.md` (M1-M8)
- `webui_core.md` (M9-M15)
- `sources_feature.md` (M16-M20)
- `speed_optimization.md` (M21-M23)

Trimmed Progress section to one-line summaries with links.

### M26: Extract Decisions and Schemas

Created 6 files:
- `decisions/architecture.md` - Supabase, hybrid CLI/web, FastAPI
- `decisions/technology.md` - Claude/Groq, SM-2, React stack
- `decisions/patterns.md` - batch inserts, retry logic, progress callbacks
- `schemas/database.md` - full Supabase schema (12 tables)
- `schemas/api.md` - FastAPI endpoints, Pydantic models
- `schemas/components.md` - React component hierarchy

Trimmed Decision Log and Artifacts sections.

### M27: Extract Reference Material

Created 3 files:
- `reference/research.md` - learning science sources and findings
- `reference/context.md` - glossary, project structure
- `reference/retrospective.md` - what worked, gaps, lessons

Trimmed Research Foundation section.

### M28: Slim EXECPLAN to Active Content Only

Target: under 500 lines. Achieved: 502 lines.

Sections kept (with targets):
- Purpose and Big Picture (20)
- Progress - summaries only (50)
- Active Milestones - full detail (200)
- Known Issues (30)
- Surprises and Discoveries - recent only (20)
- Memory Index - new section (30)
- CLI and Web Usage Reference (50)
- Recovery Notes (15)

Sections archived/removed:
- Completed milestone details → milestones/
- Full Decision Log → decisions/
- Outcomes and Retrospective → reference/
- Context and Orientation → reference/
- Full Artifacts → schemas/

### M29: Update CLAUDE.md with Memory Access Instructions

Added Memory System section to CLAUDE.md:
- Core vs External memory explanation
- Table of memory files with "Read When" triggers
- Starting New Work Protocol (proactive reads)
- 3 scout subagent pattern for complex milestones
- Reactive Retrieval Triggers
- Memory Update Protocol

## Key Decisions

- **Decision:** Use file-based memory over database storage
  **Rationale:** Git-tracked, readable, editable, no additional infrastructure

- **Decision:** Require 3 scout subagents before any milestone
  **Rationale:** Prevents breaking changes from incomplete context; parallelizes research

- **Decision:** Keep EXECPLAN under 500 lines
  **Rationale:** Fits in context window with code; forces archival discipline

## Files Created

| Path | Purpose |
|------|---------|
| `.claude/memory/INDEX.md` | Navigation hub |
| `.claude/memory/milestones/*.md` | 4 files for M1-M23 |
| `.claude/memory/decisions/*.md` | 3 architecture/tech/pattern files |
| `.claude/memory/schemas/*.md` | 3 database/API/component files |
| `.claude/memory/reference/*.md` | 3 research/context/retro files |
