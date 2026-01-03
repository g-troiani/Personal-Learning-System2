# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is the **Personal Adaptive Learning System**—a localhost CLI tool that automates the logistics of learning using cognitive science principles (spaced repetition, retrieval practice, interleaving).

**Current Status:** Planning/Design phase. No source code exists yet; the repository contains vision and specification documents.

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
- Reference materials (to be added): Research synthesis, variable taxonomy, system specification

## Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Language | Python | 3.11+ |
| Database | Supabase | PostgreSQL, cloud-hosted |
| Interface | CLI | Command-line, scriptable |
| LLM | Claude API | Content processing during ingestion |
| Document Processing | TBD | PDF, DOCX, Markdown parsing |

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
