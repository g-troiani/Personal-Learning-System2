# Optional Memory Types - Extended Implementation Ideas

Future extensions beyond the base M-MEM plan (core + archival).

---

## 1. Episodic Memory

**Purpose:** Track "what happened when" across sessions.

**Implementation:**
```
.claude/memory/episodes/
├── 2026-01-04_session.md
├── 2026-01-03_session.md
└── ...
```

**File format:**
```markdown
# Session: 2026-01-04

## Summary
Implemented upload retry logic, fixed Groq rate limiting.

## Key Events
- 14:30: Started M23 error resilience
- 15:45: Discovered Groq model deprecated, switched to qwen3-32b
- 16:20: Completed retry wrapper, tested with rate limit simulation

## Decisions Made
- Used exponential backoff (1s, 2s, 4s) for retries

## Files Changed
- app/practice/generator.py
- app/ingestion/kc_extractor.py

## Unfinished
- Need to test web UI upload with new retry logic
```

**Retrieval trigger:** "What did we do last session?" / "When did we change X?"

**Auto-generation:** End-of-session hook summarizes conversation.

---

## 2. Semantic Memory

**Purpose:** Structured facts about user, project, preferences.

**Implementation:**
```
.claude/memory/semantic/
├── user_preferences.md
├── project_facts.md
└── domain_knowledge.md
```

**user_preferences.md:**
```markdown
# User Preferences

## Communication
- Prefers concise responses
- Likes tables over prose for comparisons
- Wants code comments minimal

## Coding Style
- Python: type hints, docstrings Google style
- React: functional components, hooks
- Tailwind: utility classes, no CSS-in-JS

## Work Patterns
- Usually works evenings
- Prefers completing features in single sessions
- Wants commits after each milestone
```

**project_facts.md:**
```markdown
# Project Facts

## Architecture
- Backend: Python CLI + FastAPI
- Frontend: React/Vite/Tailwind
- Database: Supabase (PostgreSQL)
- LLM: Claude for KC extraction, Groq for items

## Key Constraints
- Single user, localhost
- No gamification
- Evidence-based learning science only

## Current State
- 23 milestones complete
- Web UI functional
- Processing time ~35s per document
```

**Update protocol:** Extract facts from conversations, consolidate periodically.

---

## 3. Procedural Memory

**Purpose:** Reusable workflows, not just static instructions.

**Implementation:**
```
.claude/memory/procedures/
├── add_new_milestone.md
├── debug_upload_failure.md
├── update_database_schema.md
└── deploy_changes.md
```

**add_new_milestone.md:**
```markdown
# Procedure: Add New Milestone

## When to Use
Adding a new feature milestone to EXECPLAN.md

## Steps
1. Add milestone to Plan of Work section
2. Create detailed milestone description with:
   - "At the end of this milestone..." statement
   - Work items
   - Verification criteria
3. Update Context and Orientation if new terms introduced
4. Add to Progress section as pending

## Verification
- Milestone is self-contained per PLANS.md
- All terms defined
- Acceptance criteria are observable behaviors

## Common Mistakes
- Forgetting to update Plan of Work summary
- Not defining new technical terms
```

**Retrieval trigger:** "How do I add a milestone?" / Starting specific task type.

---

## 4. Recall Memory

**Purpose:** Searchable conversation history across sessions.

**Implementation:**
```
.claude/memory/recall/
├── conversations/
│   ├── 2026-01-04_upload_fix.md
│   ├── 2026-01-03_speed_optimization.md
│   └── ...
└── INDEX.md
```

**Conversation format:**
```markdown
# Conversation: Upload Fix (2026-01-04)

**Topic:** Fixing stuck uploads and delete functionality
**Duration:** ~2 hours
**Outcome:** M20 completed

## Key Exchanges

### User asked about stuck uploads
User wanted to delete sources stuck in "processing" state.
Solution: Added 30-minute timeout detection, enabled menu for stuck sources.

### Delete returning 404
Root cause: Query builder passed to .in_() instead of list.
Fix: Extract KC IDs to list first.

## Artifacts Created
- ConfirmationDialog component
- SourceDetailPanel component
```

**Search:** Grep-based or INDEX.md summaries.

---

## 5. Self-Editing Memory (Advanced)

**Purpose:** Claude updates memory programmatically during sessions.

**Challenge:** Claude Code doesn't have persistent tool state like MemGPT agents.

**Workaround approach:**

Add to CLAUDE.md:
```markdown
## Memory Update Commands

When you learn something worth persisting, output a memory update block:

\`\`\`memory-update
file: semantic/user_preferences.md
action: append
content: |
  - Prefers Groq over Claude for speed-critical tasks
\`\`\`

I will manually apply these, or a hook could auto-apply them.
```

**Hook implementation (future):**
```bash
# .claude/hooks/post-response.sh
# Parse response for memory-update blocks
# Apply changes to .claude/memory/ files
```

---

## 6. Working Memory Scratchpad

**Purpose:** Temporary notes within a session, discarded after.

**Implementation:** Section in EXECPLAN.md or separate file:

```markdown
## Scratchpad (Session-Only)

Current task: Implementing M-MEM-2
Blocking issue: None
Next step: Extract M1-M8 to cli_foundation.md

Notes:
- Remember to update INDEX.md after each file
- User prefers tables for milestone summaries
```

**Cleared:** Start of each new session or manually.

---

## Implementation Priority

| Memory Type | Effort | Value | Priority |
|-------------|--------|-------|----------|
| Episodic | Low | Medium | P2 |
| Semantic | Medium | High | P1 |
| Procedural | Low | Medium | P2 |
| Recall | High | Medium | P3 |
| Self-Editing | High | High | P3 (needs hooks) |
| Scratchpad | Low | Low | P4 |

**Recommended next step:** Add semantic memory (user_preferences.md, project_facts.md) after base M-MEM complete.

---

## Integration with Base M-MEM

These optional types slot into the existing structure:

```
.claude/memory/
├── INDEX.md
├── milestones/          # Base M-MEM
├── decisions/           # Base M-MEM
├── schemas/             # Base M-MEM
├── reference/           # Base M-MEM
├── episodes/            # Optional: Episodic
├── semantic/            # Optional: Semantic
├── procedures/          # Optional: Procedural
└── recall/              # Optional: Recall
```

CLAUDE.md memory access instructions would expand to include new retrieval triggers for each type.
