# Context and Orientation

**Last Updated:** 2026-01-04
**Summary:** Complete glossary and project structure for the Personal Adaptive Learning System

## System Overview

This is a personal learning tool implementing evidence-based learning science. The system provides:
- **CLI interface** for power users and scripting
- **Web UI** for daily learning sessions
- **Supabase (PostgreSQL)** for data storage
- **Anthropic Claude API** for intelligent content processing during ingestion
- **Groq (Qwen3 32B)** for fast practice item generation

## Glossary

### Knowledge Component (KC)
A single learnable unit extracted from source content. Examples:
- **Definition:** "Precision is the ratio of true positives to all predicted positives"
- **Concept:** "When to prioritize precision over recall depends on cost of false positives vs false negatives"
- **Cognitive procedure:** "Calculate precision given a confusion matrix"
- **Execution task:** "Implement a function that computes precision from prediction and label arrays"

### Knowledge Types

| Type | Description | Testing Approach |
|------|-------------|-----------------|
| `factual` | Definitions, terms, formulas | Correct recall |
| `conceptual` | Relationships, principles, "why" | Grasp understanding |
| `procedural_cognitive` | Problem-solving methods | Apply process mentally |
| `procedural_execution` | Hands-on skills | Actually do something |

### Practice Item
A specific question, problem, or task generated for a KC. Each KC typically has multiple items at different difficulty levels (1-5) and in different modes.

### Practice Modes

| Mode | Description |
|------|-------------|
| `free_recall` | Produce answer from memory, no cues |
| `cued_recall` | Hint or partial information provided |
| `recognition` | Select from options |
| `explanation` | Articulate understanding in own words |
| `application` | Apply knowledge to a scenario |
| `execution` | Perform hands-on task |

### Mastery Level
Number between 0-1 representing estimated probability of correct response without assistance. Updated after each attempt using exponential moving average (EMA):
```
new_mastery = alpha * current_score + (1 - alpha) * old_mastery
```
Alpha decreases with exposure: 0.7 (early) → 0.2 (later)

### Spaced Repetition (SM-2)
Scheduling reviews at increasing intervals based on response quality:
- Maintains easiness factor per item (increases when good, decreases when poor)
- New interval = previous interval × easiness factor
- Incorrect response resets interval to 1 day
- Effect size g ≈ 0.74 (one of most robust findings in learning science)

### Technique Bundle
Named combination of learning techniques applied during a session:

| Bundle | Components |
|--------|------------|
| Standard SRS | Cued recall, immediate feedback, standard spacing |
| Deep Retrieval | Free recall, elaboration prompts, delayed feedback |
| Interleaved Practice | Topic mixing, discrimination learning |
| Execution Focus | Hands-on tasks, graduated independence |
| Generation First | Problems before instruction (primes encoding) |

### Session
A study period with: start/end time, duration, technique bundle, and all attempts.

### Attempt
Single interaction with a practice item capturing: item, response, correctness, time, confidence (before), difficulty (after), hints, independence level, errors.

## Project Structure

### Python CLI (`learn_system/`)

```
learn_system/
├── app/
│   ├── main.py          # CLI entry point
│   ├── config.py        # Configuration
│   ├── database/        # Supabase queries
│   ├── ingestion/       # Document processing, KC extraction
│   ├── practice/        # Item generation
│   ├── study/           # Session loop, scheduler
│   ├── state/           # Mastery and spacing algorithms
│   └── api/             # FastAPI server (M18+)
└── requirements.txt
```

### React Web UI (`web/`)

```
web/
├── src/
│   ├── components/      # UI components by feature
│   ├── pages/           # Page-level components
│   ├── contexts/        # SupabaseContext
│   ├── hooks/           # useSources, useSourceUpload, etc.
│   └── lib/             # Supabase client
└── package.json
```

## Requirements

### Python CLI
- Python 3.9+
- Packages: click, python-dotenv, python-docx, pypdf, anthropic, supabase
- API dependencies: fastapi, uvicorn, python-multipart (M18+)
- Speed optimization: groq (M21+)

### Web UI
- Node.js 18+
- React, Vite, Tailwind CSS, Recharts, Supabase client

### Environment Variables
All in project root `.env`:
```
SUPABASE_URL=...
SUPABASE_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Memory System

The project uses a tiered memory system to manage EXECPLAN complexity:
- **Core memory:** CLAUDE.md + slim EXECPLAN.md (always loaded)
- **External memory:** `.claude/memory/` (read on demand)
  - `milestones/` - Implementation history
  - `decisions/` - Architectural choices
  - `schemas/` - Database, API, components
  - `reference/` - Research and context

This adapts the MemGPT "LLM as Operating System" pattern for file-based Claude Code.

## Cross-References

- Related schemas: `schemas/database.md`, `schemas/components.md`
- Related decisions: `decisions/architecture.md`
- Related research: `reference/research.md`
