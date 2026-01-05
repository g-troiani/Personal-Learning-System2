# NEW FEATURES.md - Agent Memory System Research

This document contains research writeups from six parallel investigation tracks, culminating in a consolidated implementation plan for an agent memory system designed to handle increasing EXECPLAN complexity.

---

## Worktree 1: Core Memory Architecture

**Branch:** `research/core-memory-architecture`
**Focus:** What stays in-context always vs. what gets externalized

### Problem Statement

The EXECPLAN.md has grown to ~1500 lines. Each Claude session loads this entire document, but most content is historical—completed milestones, archived decisions, reference schemas. This creates three problems:

1. **Context bloat**: Valuable context window space consumed by inactive content
2. **Retrieval difficulty**: Important current-state information buried in historical detail
3. **Cognitive load**: Harder to maintain mental model when everything is equally weighted

### Architecture Design

The solution mirrors the MemGPT "LLM as Operating System" pattern, adapted for file-based Claude Code:

```
┌─────────────────────────────────────────────────────────┐
│                    CORE MEMORY                          │
│              (Always in context)                        │
├─────────────────────────────────────────────────────────┤
│  CLAUDE.md          │  EXECPLAN.md (slim)               │
│  - Instructions     │  - Active state                   │
│  - Memory access    │  - Current milestones             │
│  - Conventions      │  - Known issues                   │
│                     │  - Recovery notes                 │
└─────────────────────────────────────────────────────────┘
                              │
                              │ Read on demand
                              ▼
┌─────────────────────────────────────────────────────────┐
│                  EXTERNAL MEMORY                        │
│              (.claude/memory/)                          │
├─────────────────────────────────────────────────────────┤
│  milestones_completed.md  │  decisions_archive.md       │
│  schema_reference.md      │  research_foundation.md     │
│  context_original.md      │  retrospectives.md          │
└─────────────────────────────────────────────────────────┘
```

### Core Memory Contents (~400 lines target)

| Section | Content | Lines |
|---------|---------|-------|
| Purpose | Big picture, user value | 20 |
| Active Progress | Last 5 milestone entries only | 50 |
| Current Milestones | Pending work with full detail | 150 |
| Known Issues | Active bugs and risks | 30 |
| Recovery Notes | How to restart/retry | 20 |
| Memory Index | Pointers to external files with summaries | 50 |
| Usage Reference | CLI commands, web start | 80 |

### Implementation Specification

**Core memory blocks (always loaded):**
- `current_state`: Active milestone ID, known issues, last session summary
- `memory_index`: Map of external file paths with content summaries
- `access_patterns`: Instructions for when to retrieve each external file

**Block character limits (following MemGPT pattern):**
- current_state: 2000 characters
- memory_index: 1500 characters
- Full EXECPLAN.md: Target 15,000 characters (down from ~60,000)

### Verification Criteria

After implementation:
1. EXECPLAN.md is under 500 lines
2. All completed milestone details accessible via `.claude/memory/`
3. New sessions can resume work without reading full history
4. Historical queries trigger appropriate file reads

---

## Worktree 2: External Memory Retrieval

**Branch:** `research/external-memory-retrieval`
**Focus:** How to structure archived content for efficient on-demand retrieval

### Retrieval Architecture

External memory uses a simple file-based approach suited to Claude Code's capabilities:

```
.claude/
└── memory/
    ├── INDEX.md                    # Master index with summaries
    ├── milestones/
    │   ├── cli_m1_m8.md           # CLI milestones 1-8
    │   ├── webui_m9_m15.md        # Web UI milestones 9-15
    │   ├── sources_m16_m20.md     # Sources feature milestones
    │   └── speed_m21_m23.md       # Speed optimization milestones
    ├── decisions/
    │   ├── architecture.md        # Architectural decisions
    │   ├── technology.md          # Technology choices
    │   └── patterns.md            # Implementation patterns
    ├── schemas/
    │   ├── database.md            # Full Supabase schema
    │   ├── api.md                 # FastAPI endpoints
    │   └── components.md          # React component specs
    └── reference/
        ├── research.md            # Learning science research
        └── context.md             # Original context/orientation
```

### Retrieval Triggers

Based on the MemGPT and A-MEM research, retrieval should be triggered by:

| Trigger | Example User Input | File to Retrieve |
|---------|-------------------|------------------|
| Historical reference | "How was upload implemented?" | milestones/sources_m16_m20.md |
| Schema query | "What's the attempts table schema?" | schemas/database.md |
| Decision context | "Why did we use Groq?" | decisions/technology.md |
| Research backing | "What's the spacing effect?" | reference/research.md |
| Debug context | "Why is processing slow?" | milestones/speed_m21_m23.md |

### File Format Specification

Each external memory file follows this structure:

```markdown
# [Topic] Memory Archive

**Last Updated:** YYYY-MM-DD
**Summary:** One-line description for INDEX.md

## Quick Reference
[Most commonly needed facts, 5-10 bullet points]

## Detailed Content
[Full archived content organized by subtopic]

## Cross-References
[Links to related memory files]
```

### Retrieval Protocol

1. **Check INDEX.md first**: Contains summaries of all memory files
2. **Read specific file**: Only when detailed content needed
3. **Limit scope**: Read one section at a time for large files
4. **Update if stale**: Flag content that may need refresh

### Search Efficiency

For text-based retrieval without vector embeddings:
- Each file has a clear topic scope
- INDEX.md provides semantic summary for quick matching
- File names are descriptive and searchable
- Cross-references enable multi-hop lookup

---

## Worktree 3: EXECPLAN Decomposition

**Branch:** `research/execplan-decomposition`
**Focus:** How to split the current EXECPLAN into memory units

### Current EXECPLAN Analysis

| Section | Current Lines | Disposition |
|---------|---------------|-------------|
| Purpose and Big Picture | 20 | KEEP (core) |
| Progress | 150 | TRIM to 50 (last 5 entries) |
| Surprises and Discoveries | 25 | KEEP (active learnings) |
| Known Issues | 25 | KEEP (critical) |
| Decision Log | 60 | ARCHIVE (stable) |
| Outcomes and Retrospective | 100 | ARCHIVE (historical) |
| Context and Orientation | 50 | ARCHIVE (stable reference) |
| Plan of Work | 20 | KEEP (roadmap) |
| CLI Usage Reference | 20 | KEEP (essential) |
| Web UI How to Run | 30 | KEEP (essential) |
| Recovery Notes | 15 | KEEP (always needed) |
| Milestones 1-23 (Complete) | 500 | ARCHIVE (historical) |
| Speed Optimization Detail | 200 | ARCHIVE (reference) |
| Web UI Design Specs | 100 | ARCHIVE (stable) |
| Schema/Algorithms | 200 | ARCHIVE (reference) |
| Research Foundation | 80 | ARCHIVE (reference) |

### Target Slim EXECPLAN Structure

```markdown
# EXECPLAN.md (Slim Version ~400 lines)

## Purpose and Big Picture
[Keep as-is, 20 lines]

## Progress
[Last 5 milestone entries only, 50 lines]
[Link to .claude/memory/milestones/ for full history]

## Active Work
[Current milestone in full detail, 100 lines]

## Known Issues and Future Improvements
[Keep as-is, 30 lines]

## Surprises and Discoveries
[Keep recent/relevant, 20 lines]
[Link to full archive]

## Memory Index
[New section: summaries and paths to all external memory, 50 lines]

## CLI and Web Usage
[Consolidated usage reference, 50 lines]

## Recovery Notes
[Keep as-is, 15 lines]
```

### Migration Steps

1. Create `.claude/memory/` directory structure
2. Extract completed milestones to `milestones/*.md`
3. Extract decisions to `decisions/*.md`
4. Extract schemas to `schemas/*.md`
5. Extract research to `reference/*.md`
6. Create INDEX.md with summaries
7. Rewrite EXECPLAN.md with slim structure
8. Add memory access instructions to CLAUDE.md
9. Update EXECPLAN.md header to reference memory system

### Content Extraction Rules

**Archive if:**
- Status is "complete" or "done"
- Content is reference material (schemas, algorithms)
- Historical context (original design rationale)
- No active dependencies on exact text

**Keep if:**
- Active work in progress
- Known issues affecting current work
- Recovery procedures
- Essential usage commands

---

## Worktree 4: Memory Access Instructions

**Branch:** `research/memory-access-instructions`
**Focus:** CLAUDE.md updates for memory access patterns

### CLAUDE.md Addition

Add the following section to CLAUDE.md:

```markdown
## Memory System

This project uses a tiered memory system to manage complexity. The full implementation history and reference material are stored in `.claude/memory/` to keep EXECPLAN.md focused on active work.

### Core Memory (Always Loaded)
- `EXECPLAN.md`: Active state, current milestones, known issues
- `CLAUDE.md`: This file - instructions, conventions, memory access

### External Memory (Read on Demand)
Stored in `.claude/memory/`:

| File | Contains | Read When |
|------|----------|-----------|
| `INDEX.md` | Summary of all memory files | Starting new topic, unsure what exists |
| `milestones/cli_m1_m8.md` | CLI foundation milestones | Debugging CLI, understanding data flow |
| `milestones/webui_m9_m15.md` | Web UI implementation | Modifying UI components |
| `milestones/sources_m16_m20.md` | Upload/processing feature | Working on Sources page |
| `milestones/speed_m21_m23.md` | Speed optimizations | Performance issues |
| `decisions/architecture.md` | Why things are structured this way | Proposing structural changes |
| `decisions/technology.md` | Technology choices (Groq, Supabase, etc.) | Evaluating alternatives |
| `schemas/database.md` | Full Supabase schema with indices | Database work |
| `schemas/api.md` | FastAPI endpoint specs | API modifications |
| `reference/research.md` | Learning science foundation | Justifying features |

### Retrieval Protocol

1. **Start with INDEX.md** if unsure which file contains needed information
2. **Read specific file** when you know what you need
3. **Use offset/limit** for large files - read sections, not entire files
4. **Cross-reference** using links in each memory file

### Retrieval Triggers

Read external memory when:
- User asks about completed features ("how was X implemented?")
- You need schema details for new database work
- You're unsure about prior architectural decisions
- User references historical work or past sessions
- Debugging requires understanding original implementation
- You need to verify consistency with established patterns

### Memory Update Protocol

After completing work:
1. Archive detailed implementation notes to appropriate `.claude/memory/` file
2. Update EXECPLAN.md Progress section (keep concise - link to archive)
3. If new decision made, add to `decisions/` with rationale and date
4. Update INDEX.md if new memory file created

### Do NOT Archive
- Active work in progress
- Known issues still being addressed
- Recovery procedures (always keep in EXECPLAN.md)
- Essential usage commands
```

### Integration with Existing CLAUDE.md

The memory section should be placed after the "ExecPlans" section and before "Technology Stack". This positions it as a core operational instruction that applies to all work on the project.

---

## Worktree 5: Memory Consolidation

**Branch:** `research/memory-consolidation`
**Focus:** Lifecycle management of memories

### Consolidation Workflow

Based on the research (particularly A-MEM and MemGPT patterns), memory consolidation follows this lifecycle:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   ACTIVE    │───▶│  COMPLETED  │───▶│  ARCHIVED   │
│  (Working)  │    │ (Validate)  │    │ (Reference) │
└─────────────┘    └─────────────┘    └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
  EXECPLAN.md        Summarize &         .claude/memory/
  full detail        extract key              files
                     learnings
```

### Consolidation Triggers

| Trigger | Action |
|---------|--------|
| Milestone complete | Archive to milestones/, summarize in Progress |
| Major decision made | Add to decisions/ with full rationale |
| Bug discovered & fixed | Add to Surprises, archive pattern to decisions/ |
| Schema change | Update schemas/database.md |
| New component added | Update schemas/components.md |

### Memory Update Protocol (Detailed)

**On Milestone Completion:**

```markdown
1. In EXECPLAN.md:
   - Mark milestone complete with date
   - Add one-line summary to Progress
   - Remove detailed implementation steps
   - Keep only: "See .claude/memory/milestones/X.md for details"

2. In .claude/memory/milestones/[category].md:
   - Add full milestone documentation
   - Include: what was done, key files changed, verification steps
   - Include: surprises, decisions made, lessons learned

3. In .claude/memory/INDEX.md:
   - Update last-modified date
   - Add entry if new file created
```

**On Decision Made:**

```markdown
1. In EXECPLAN.md Decision Log:
   - Add brief entry: "Decision: X. Rationale: Y. See decisions/Z.md"

2. In .claude/memory/decisions/[category].md:
   - Add full decision record with:
     - Context (what prompted the decision)
     - Options considered
     - Choice made and why
     - Trade-offs accepted
     - Date and author
```

### Forgetting/Pruning Rules

Unlike the research systems with vector DBs, this file-based approach uses explicit pruning:

1. **Never delete** - Archive instead
2. **Consolidate duplicates** - If same topic appears in multiple places, merge
3. **Date everything** - Enables staleness detection
4. **Flag superseded** - Mark outdated decisions as "SUPERSEDED BY: [decision]"

### Cross-Reference Maintenance

Each memory file maintains a "Cross-References" section linking related files. When updating one file, check if cross-references need updating.

---

## Worktree 6: Implementation Patterns

**Branch:** `research/implementation-patterns`
**Focus:** Concrete file structure and commands for this specific system

### Directory Structure

```
Personal Learning System/
├── .claude/
│   └── memory/
│       ├── INDEX.md                    # Master index
│       ├── milestones/
│       │   ├── cli_foundation.md       # M1-M8: CLI and core loop
│       │   ├── webui_core.md           # M9-M15: React web UI
│       │   ├── sources_feature.md      # M16-M20: Upload and processing
│       │   └── speed_optimization.md   # M21-M23: Parallel processing
│       ├── decisions/
│       │   ├── architecture.md         # System design decisions
│       │   ├── technology.md           # Stack choices
│       │   └── patterns.md             # Implementation patterns
│       ├── schemas/
│       │   ├── database.md             # Supabase tables and indices
│       │   ├── api.md                  # FastAPI routes and models
│       │   └── components.md           # React component hierarchy
│       └── reference/
│           ├── research.md             # Learning science foundation
│           └── context.md              # Original vision and context
├── CLAUDE.md                           # Updated with memory instructions
├── EXECPLAN.md                         # Slim active version
├── PLANS.md                            # Unchanged
├── VISION.md                           # Unchanged
└── ...existing project files...
```

### INDEX.md Template

```markdown
# Memory System Index

**Last Updated:** YYYY-MM-DD
**Total Files:** N

## Quick Navigation

| Category | Files | Key Topics |
|----------|-------|------------|
| Milestones | 4 | Implementation history for M1-M23 |
| Decisions | 3 | Architectural and technology choices |
| Schemas | 3 | Database, API, components |
| Reference | 2 | Research and original context |

## File Summaries

### milestones/cli_foundation.md
M1-M8 implementation details. CLI commands, database schema creation, ingestion pipeline, study loop, SM-2 algorithm, todo dashboard.

### milestones/webui_core.md
M9-M15 implementation details. React/Vite setup, all page components, Supabase integration, Recharts analytics.

### milestones/sources_feature.md
M16-M20 implementation details. Upload zone, FastAPI backend, real-time processing, error handling, delete UI.

### milestones/speed_optimization.md
M21-M23 implementation details. Groq integration, parallel processing, retry logic, batch inserts.

### decisions/architecture.md
Key decisions: Supabase over SQLite, technique bundles, SM-2 algorithm, FastAPI for upload, hybrid architecture.

### decisions/technology.md
Stack choices: React/Vite, Groq for items, Claude for KCs, ThreadPoolExecutor over asyncio.

### decisions/patterns.md
Patterns: batch inserts, progress callbacks, realtime with polling fallback, throttled updates.

### schemas/database.md
Full 12-table Supabase schema with processing status columns and indices.

### schemas/api.md
FastAPI endpoints: /upload, /status, /retry, /delete, /health.

### schemas/components.md
React component hierarchy for all pages with props and state.

### reference/research.md
Learning science: retrieval practice, spaced repetition, interleaving, desirable difficulties.

### reference/context.md
Original vision, problem statement, success criteria, what this is not.
```

### Migration Script Outline

```bash
#!/bin/bash
# migrate_to_memory_system.sh

# Create directory structure
mkdir -p .claude/memory/{milestones,decisions,schemas,reference}

# Files will be created by extracting from EXECPLAN.md
# Each file follows the standard template with:
# - Last Updated date
# - Summary
# - Quick Reference section
# - Detailed Content
# - Cross-References
```

### Verification Checklist

After migration:
- [ ] EXECPLAN.md under 500 lines
- [ ] INDEX.md contains summaries of all memory files
- [ ] CLAUDE.md has memory access instructions
- [ ] All completed milestones accessible via .claude/memory/milestones/
- [ ] All decisions accessible via .claude/memory/decisions/
- [ ] Schemas extracted and current
- [ ] New session can resume work reading only EXECPLAN.md
- [ ] Historical query correctly triggers file read

---

# Consolidated Implementation Plan

## Overview

This memory system adapts the MemGPT "LLM as Operating System" pattern for file-based Claude Code context management. The goal is to reduce EXECPLAN.md from ~1500 lines to ~400 lines of active content while preserving full access to historical context on demand.

## Architecture Summary

```
┌────────────────────────────────────────────────────────────────┐
│                       CLAUDE CODE CONTEXT                       │
├────────────────────────────────────────────────────────────────┤
│  ALWAYS LOADED              │  READ ON DEMAND                  │
│  ────────────────           │  ─────────────────               │
│  CLAUDE.md                  │  .claude/memory/INDEX.md         │
│  - Project instructions     │  - File summaries                │
│  - Memory access protocol   │                                  │
│  - Conventions              │  .claude/memory/milestones/      │
│                             │  - cli_foundation.md             │
│  EXECPLAN.md (slim)         │  - webui_core.md                 │
│  - Active milestones        │  - sources_feature.md            │
│  - Current progress         │  - speed_optimization.md         │
│  - Known issues             │                                  │
│  - Memory index pointers    │  .claude/memory/decisions/       │
│  - Usage reference          │  .claude/memory/schemas/         │
│  - Recovery notes           │  .claude/memory/reference/       │
└────────────────────────────────────────────────────────────────┘
```

## Implementation Milestones

### Milestone M-MEM-1: Create Memory Directory Structure

Create `.claude/memory/` with subdirectories and INDEX.md template.

**Files to create:**
- `.claude/memory/INDEX.md`
- `.claude/memory/milestones/.gitkeep`
- `.claude/memory/decisions/.gitkeep`
- `.claude/memory/schemas/.gitkeep`
- `.claude/memory/reference/.gitkeep`

**Verification:** Directory structure exists with INDEX.md containing section headers.

### Milestone M-MEM-2: Extract Completed Milestones

Move M1-M23 detailed documentation from EXECPLAN.md to memory files.

**Work:**
1. Create `milestones/cli_foundation.md` with M1-M8 details
2. Create `milestones/webui_core.md` with M9-M15 details
3. Create `milestones/sources_feature.md` with M16-M20 details
4. Create `milestones/speed_optimization.md` with M21-M23 details
5. Update INDEX.md with summaries

**Verification:** All milestone details accessible via memory files. EXECPLAN.md Milestones section reduced to links.

### Milestone M-MEM-3: Extract Decisions and Schemas

Move stable reference content to memory files.

**Work:**
1. Create `decisions/architecture.md` with architectural decisions
2. Create `decisions/technology.md` with technology choices
3. Create `decisions/patterns.md` with implementation patterns
4. Create `schemas/database.md` with full Supabase schema
5. Create `schemas/api.md` with FastAPI endpoint specs
6. Create `schemas/components.md` with React component hierarchy
7. Update INDEX.md

**Verification:** Decision Log in EXECPLAN.md reduced to recent entries with links. Schema section removed from EXECPLAN.md.

### Milestone M-MEM-4: Extract Reference Material

Move research and context to memory files.

**Work:**
1. Create `reference/research.md` with learning science research
2. Create `reference/context.md` with original context/orientation
3. Update INDEX.md

**Verification:** Research and Context sections removed from EXECPLAN.md.

### Milestone M-MEM-5: Slim EXECPLAN.md

Rewrite EXECPLAN.md to slim active format.

**Work:**
1. Keep: Purpose, Active Progress (last 5), Current Milestones, Known Issues, Usage, Recovery
2. Add: Memory Index section with pointers
3. Remove: All archived content (replaced with links)
4. Target: Under 500 lines

**Verification:** EXECPLAN.md under 500 lines. All content still accessible.

### Milestone M-MEM-6: Update CLAUDE.md

Add memory access instructions to CLAUDE.md.

**Work:**
1. Add Memory System section after ExecPlans section
2. Include: Core Memory description, External Memory table, Retrieval Protocol, Retrieval Triggers, Update Protocol
3. Reference INDEX.md for navigation

**Verification:** CLAUDE.md contains complete memory access instructions. New session understands how to access memories.

## Expected Outcomes

After implementation:
- **EXECPLAN.md**: ~400 lines (down from ~1500)
- **Context efficiency**: Active content always visible, historical on-demand
- **Session startup**: Faster loading, focused on current work
- **Historical access**: Full details preserved and accessible
- **Maintenance**: Clear protocol for archiving completed work

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Memory files become stale | Date stamps + cross-reference checks |
| Unclear what to archive | Explicit rules in CLAUDE.md |
| Lost context during retrieval | INDEX.md provides navigation |
| Over-fragmentation | Logical grouping by topic, not by date |

## Revision Notes

- 2026-01-04: Initial consolidated plan from 6 worktree research tracks
