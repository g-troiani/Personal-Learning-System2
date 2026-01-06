# Outcomes and Retrospective Archive

**Last Updated:** 2026-01-04
**Summary:** Major milestone retrospectives documenting what worked, gaps, and lessons learned

## All 8 Milestones Complete (2026-01-02) - CLI Foundation

**What's Working:**
- Complete document ingestion pipeline: PDF, DOCX, Markdown, text extraction
- LLM-based knowledge component extraction with type classification
- Automatic practice item generation with type-specific prompts (3 items per KC)
- Interactive study sessions with confidence/difficulty ratings
- SM-2 spaced repetition algorithm with mastery tracking
- Todo dashboard showing overdue, due today, and new items by source
- Source-filtered review sessions
- Technique bundle tracking for self-experimentation

**CLI Commands Available:**
- `init` - Initialize database and default bundles
- `ingest <file>` - Process documents, extract KCs, generate items
- `status` - Show system statistics and due counts
- `sources` - List ingested documents
- `bundles` - List technique bundles
- `todo` - Show what needs review
- `study` - Start interactive practice session
- `review <pattern>` - Focus session on specific source
- `techniques` - View bundle usage statistics

**Technical Decisions That Worked Well:**
- Using Supabase instead of SQLite provided real-time visibility into data
- Click framework made CLI development straightforward
- Separating scheduler, loop, spacing, and estimator modules kept code organized
- Progress callbacks during ingestion provided good user feedback

**Known Gaps for Future Work:**
- No automated correctness verification (relies on self-assessment)
- No interleaving implementation within sessions (just bundle tracking)
- No retention test scheduling (structure exists but not implemented)
- No learning goals tracking (table exists but not used)

## All 15 Milestones Complete (2026-01-02) - Web UI Core

**Web UI Implementation Complete:**
- React/Vite/Tailwind web application with full feature parity to CLI
- Home dashboard with greeting, overdue alerts, source cards with mastery progress
- Interactive study sessions with question cards, answer input, self-assessment, session summary
- Calendar page with month navigation, session scheduling form
- Due for Review page with items organized by urgency (overdue/due today/new)
- Progress page with stat cards, mastery by source, weekly activity chart, streak tracking
- Analytics page with deep insights including:
  - Three insight cards (What's Working, Needs Attention, Optimization)
  - Technique bundle effectiveness comparison with 7-day/30-day retention bars
  - Performance by knowledge type with color-coded horizontal bars
  - Calibration analysis scatter chart comparing confidence vs actual scores
  - Items needing attention list with practice buttons

**Web UI Pages Available:**
- `/` - Home dashboard with source cards and quick actions
- `/calendar` - Learning calendar and session scheduling
- `/review` - Due for review items organized by urgency
- `/sources` - Source library with upload, filtering, and real-time processing
- `/progress` - Statistics dashboard with charts
- `/analytics` - Deep insights and recommendations
- `/study` - Interactive study session (full-screen)

**Technical Decisions That Worked Well:**
- Recharts for data visualization provided clean, responsive charts
- Supabase client in React matched CLI data access patterns
- Filter controls with useCallback avoided infinite re-render loops
- Moving tooltip components outside main function avoided React hook warnings

## All 19 Milestones Complete (2026-01-02) - Sources Feature

**Sources Feature Implementation Complete (M16-M19):**
- Sources page with grid layout, search, domain filtering, and sorting by name/date/mastery
- Drag-and-drop upload zone with file validation (PDF, DOCX, MD, TXT up to 25MB)
- FastAPI backend on port 8001 wrapping CLI ingestion pipeline
- Real-time processing progress via Supabase Realtime with polling fallback
- Processing status tracking: pending → extracting_text → extracting_kcs → generating_items → ready
- Retry mechanism for failed sources (backend + frontend wiring)

**What's Working:**
- End-to-end document upload flow from browser to processed practice items
- Progress bar updates correctly during all processing stages
- Source cards show processing state with animated indicators
- Realtime subscription with reliable polling fallback

**Known Gaps (addressed in M20-M23):**
- Delete UI not implemented (backend endpoint exists)
- SourceDetailPanel modal not created
- Confirmation dialogs for destructive actions missing
- Mobile responsive layout needs testing
- ~~Processing speed bottleneck: 60-165s per document~~ ✅ Fixed M21-M23
- ~~No parallel LLM calls~~ ✅ Fixed M22
- ~~No retry logic for transient API failures~~ ✅ Fixed M23

## All 23 Milestones Complete (2026-01-03) - Speed Optimization

**Speed Optimization Implementation Complete (M21-M23):**
- M21: Groq client for practice items, batch DB inserts
- M22: ThreadPoolExecutor parallel processing (5 workers)
- M23: Retry logic with exponential backoff (1s, 2s, 4s)

**Performance Results:**
- Before: 60-165 seconds per document
- After: ~25-55 seconds (~35s typical for 15 KCs, 45 items)
- ~3x overall speedup

**What's Working:**
- Parallel LLM calls via ThreadPoolExecutor (I/O bound, GIL doesn't block)
- Groq qwen/qwen3-32b for fast practice item generation
- Batch inserts: 3 DB calls instead of N*4
- ThrottledUpdater reduces status update frequency
- Retry handles rate limits, timeouts, connection errors

**Technical Decisions:**
- ThreadPoolExecutor over asyncio: existing codebase sync, minimal refactor
- Groq over Anthropic for items: faster, items are template-following (low reasoning)
- Keep Anthropic for KC extraction: needs reasoning for content analysis

**Not Implemented (deferred):**
- Parallel KC chunk processing: most docs single-chunk, low ROI
- Streaming responses: not needed at current speed
- Celery queue: overkill for single-user

## Cross-References

- Related milestones: `milestones/cli_foundation.md`, `milestones/webui_core.md`, `milestones/sources_feature.md`, `milestones/speed_optimization.md`
- Related decisions: `decisions/architecture.md`, `decisions/technology.md`
- Analysis document: `UPLOAD SPEED BOTTLENECKS.md` (project root)
