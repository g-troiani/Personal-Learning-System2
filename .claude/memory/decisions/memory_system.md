# Memory System Design

**Last Updated:** 2026-01-05
**Purpose:** Document how the tiered memory system works, why it exists, how to use it

## Problem

EXECPLAN.md grew to ~1500 lines. Claude Code loads CLAUDE.md + EXECPLAN.md every session. Large context = slower responses, higher cost, agents lose focus on active work buried in historical detail.

## Solution

Tiered memory adapting MemGPT "LLM as Operating System" pattern:

```
┌─────────────────────────────────────────┐
│           CORE MEMORY                   │
│        (Always in context)              │
├─────────────────────────────────────────┤
│  CLAUDE.md        │  EXECPLAN.md        │
│  - Instructions   │  - Active state     │
│  - Memory access  │  - Current work     │
│  - Conventions    │  - Known issues     │
│  ~200 lines       │  ~500 lines         │
└─────────────────────────────────────────┘
              │
              │ Agent reads on demand
              ▼
┌─────────────────────────────────────────┐
│         EXTERNAL MEMORY                 │
│       (.claude/memory/)                 │
├─────────────────────────────────────────┤
│ milestones/  │ decisions/  │ schemas/  │
│ reference/   │ INDEX.md    │           │
│ ~1800 lines across 14 files             │
└─────────────────────────────────────────┘
```

## What Lives Where

### EXECPLAN.md (Core Memory)
- Current milestone specs (active work only)
- Progress summaries (one line per milestone, links to archives)
- Known issues and blockers
- Recovery notes
- Memory Index (quick reference to external files)

**Rule:** If milestone complete → archive details to memory, keep one-line summary

### .claude/memory/ (External Memory)
- `milestones/` — Full implementation details for completed milestones
- `decisions/` — Architectural choices, technology rationale, patterns
- `schemas/` — Database tables, API endpoints, React components
- `reference/` — Research, glossary, retrospectives
- `INDEX.md` — Navigation table for all files

**Rule:** Historical detail, reference material, anything not needed every session

## How Lookups Work

### When Agent Starts New Work

1. **Read INDEX.md** — See what memory exists
2. **Read relevant decisions/** — Understand constraints before proposing changes
3. **Read relevant milestones/** — See how similar work was done before
4. **Read relevant schemas/** — Know data structures being modified

### Lookup Decision Tree

```
Need to understand...
├── Past implementation? → milestones/*.md
├── Why something was built that way? → decisions/*.md
├── Database structure? → schemas/database.md
├── API endpoints? → schemas/api.md
├── React components? → schemas/components.md
├── Learning science basis? → reference/research.md
├── Terminology/glossary? → reference/context.md
└── What worked/failed before? → reference/retrospective.md
```

### Scout Subagents (Mandatory)

Before ANY milestone, spawn 3 parallel agents:

| Scout | Searches | Purpose |
|-------|----------|---------|
| Decisions Scout | `decisions/*.md` | Find constraints, past rationale |
| Patterns Scout | `milestones/*.md` | Find similar work, reusable patterns |
| Schema Scout | `schemas/*.md`, `reference/*.md` | Find affected tables, endpoints |

Scouts return summaries. Main agent synthesizes before coding.

## Extraction Process

When milestone completes:

1. **Identify archivable content** in EXECPLAN.md:
   - Detailed implementation steps
   - Verification commands
   - Code snippets
   - Debugging notes

2. **Create/update memory file:**
   ```
   .claude/memory/milestones/{feature_name}.md
   ```
   Format:
   ```markdown
   # {Feature} Milestones Archive

   **Last Updated:** YYYY-MM-DD
   **Summary:** One sentence

   ## Quick Reference
   - Key commands
   - Critical dependencies

   ## Milestone Details
   [Full extracted content]

   ## Cross-References
   - Related: decisions/*.md, schemas/*.md
   ```

3. **Trim EXECPLAN.md:**
   - Replace detailed content with one-line summary
   - Add link: `See .claude/memory/milestones/{file}.md`

4. **Update INDEX.md:**
   - Increment file count
   - Add row to file summaries table

5. **Extract decisions** to `decisions/*.md`:
   - Technology choices with rationale
   - Architectural patterns
   - Trade-offs considered

6. **Update schemas** if structure changed:
   - New tables → `schemas/database.md`
   - New endpoints → `schemas/api.md`
   - New components → `schemas/components.md`

## Maintenance Protocol

### After Each Milestone
- Archive completed work immediately
- Don't let EXECPLAN.md grow past ~600 lines
- Update cross-references in archived files

### Periodic Cleanup (Every 5-10 Milestones)
- Review INDEX.md accuracy
- Consolidate related decisions
- Remove obsolete content from archives
- Verify all cross-references valid

### Signs Memory Needs Maintenance
- EXECPLAN.md exceeds 600 lines
- Agents making decisions that contradict archived decisions
- Duplicate information across files
- Broken cross-reference links

## File Naming Conventions

```
milestones/
  {category}_{feature}.md     # e.g., cli_foundation.md, webui_core.md

decisions/
  {topic}.md                  # e.g., architecture.md, technology.md

schemas/
  {type}.md                   # e.g., database.md, api.md, components.md

reference/
  {content_type}.md           # e.g., research.md, context.md
```

## Theory of Operation

1. **Session starts** → Agent loads CLAUDE.md + EXECPLAN.md (~700 lines)
2. **Work begins** → Agent spawns 3 scouts to read relevant memory
3. **Scouts return** → Agent has full context without loading everything
4. **Implementation** → Agent works with lean context, references memory as needed
5. **Work completes** → Agent archives details, trims EXECPLAN.md
6. **Next session** → Starts fresh with slim core, scouts retrieve what's needed

This mimics human memory: working memory (core) + long-term memory (external) with retrieval cues (scouts).

## Why MemGPT Pattern

Alternatives considered:
- **Single large file:** Hits context limits, slow, expensive
- **Database storage:** Requires tooling, complex retrieval
- **Multiple EXECPLAN files:** Hard to know which to read

MemGPT pattern wins because:
- File-based (works with Claude Code natively)
- Hierarchical (INDEX.md → category → specific file)
- Explicit retrieval (scouts force intentional lookup)
- Human-readable (can browse in IDE)

## Cross-References

- CLAUDE.md "Memory System" section — Usage protocol
- EXECPLAN.md "Before Starting Any Work" — Quick reference
- reference/context.md — Glossary including memory terms
