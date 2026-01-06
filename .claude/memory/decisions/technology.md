# Technology Decisions

**Last Updated:** 2026-01-04
**Summary:** Stack choices for the Personal Adaptive Learning System

## LLM: Claude for KC Extraction, Groq for Practice Items

**Decision:** Use Anthropic Claude API for knowledge component extraction, Groq for practice item generation.

**Rationale:**
- KC extraction quality directly determines system usefulness - Claude produces consistent, well-structured output
- Practice item generation is more formulaic, speed matters more - Groq is faster
- Groq model: `qwen/qwen3-32b` (note: `qwen-qwq-32b` deprecated)
- Cost of a few dollars per document is acceptable for personal use
- Local models can be added as alternative later without changing data model

**Date:** Initial design (Groq added M21)

## Spaced Repetition: SM-2 Algorithm

**Decision:** Use the SM-2 algorithm rather than newer alternatives.

**Rationale:**
- SM-2 has decades of validation and is well-documented
- Sufficient for this use case
- Same attempt data supports migration to more sophisticated algorithms like FSRS later
- Starting with proven algorithm reduces implementation risk

**Date:** Initial design

## Web Frontend: React + Vite + Tailwind

**Decision:** Use React with Vite for web UI implementation.

**Rationale:**
- React provides component-based architecture ideal for modular UI design
- Vite offers fast development experience with HMR
- Tailwind CSS for styling (utility-first, no CSS-in-JS)
- Recharts for data visualization
- Supabase client for backend connectivity
- Aligns with modern web development practices

**Stack:**
| Layer | Technology | Version |
|-------|------------|---------|
| Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Routing | React Router | 6.x |
| Styling | Tailwind CSS | 3.4.x |
| Icons | Lucide React | latest |
| Charts | Recharts | 2.x |
| Database | Supabase Client | 2.x |

**Date:** 2026-01-02

## Parallelism: ThreadPoolExecutor

**Decision:** Use ThreadPoolExecutor over asyncio for parallel LLM calls.

**Rationale:**
- Existing codebase is synchronous - minimal refactoring required
- LLM API calls are I/O-bound - Python GIL doesn't block during network waits
- Threads can execute concurrently while waiting for API responses
- MAX_LLM_WORKERS = 5 parallel workers (configurable)

**Performance:** 15 KCs × 1 sec each → ~3-4 seconds with 5 workers (vs 15s sequential)

**Date:** 2026-01-03 (M22)

## Technique Bundles vs Individual Toggles

**Decision:** Use technique bundles rather than individual technique toggles for self-experimentation.

**Rationale:**
- Testing one technique at a time requires too many comparisons to reach statistical significance
- Bundles group related techniques together (e.g., free recall + elaboration prompts + delayed feedback = "Deep Retrieval")
- Enables meaningful comparisons with fewer data points

**Date:** Initial design

## Python Version: 3.9 Compatibility

**Decision:** Maintain Python 3.9 compatibility.

**Patterns:**
- Use `Optional[X]` instead of `X | None`
- Use `List[Dict]` instead of `list[dict]`
- Timestamp parsing needs try-except for variable microsecond precision

**Date:** 2026-01-02

## Cross-References

- Related architecture: `decisions/architecture.md`
- Related patterns: `decisions/patterns.md`
- Related milestones: `milestones/speed_optimization.md` (Groq, threading)
