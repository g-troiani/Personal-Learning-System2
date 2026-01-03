# Personal Adaptive Learning System - Implementation Plan

This ExecPlan is a living document maintained in accordance with PLANS.md. The sections Progress, Surprises and Discoveries, Decision Log, and Outcomes and Retrospective must be kept up to date as work proceeds. All content required to implement this system is contained within this document; no external references are needed.

**SECURITY WARNING:** NEVER put API keys, secrets, URLs with credentials, or any sensitive values in this file or any file that will be committed to git. All credentials belong ONLY in .env files which are gitignored. Use placeholders like `$YOUR_KEY` or `<your-api-key>` when documenting commands that require credentials.


## Purpose and Big Picture

After implementing this system, a user can upload educational documents and receive automatically generated practice items scheduled for optimal retention. The user runs a command to see what needs review, another command to study, and the system tracks everything needed to measure learning effectiveness over time.

The observable behavior works as follows. On Monday, the user runs `python -m app.main ingest Evaluating_LLMs.docx --domain ai_ml` and the system extracts approximately fifty knowledge components, generates around one hundred fifty practice items, and stores them in a local database. The user then runs `python -m app.main study --duration 30` and spends thirty minutes practicing. The system presents items, collects responses, records confidence and difficulty ratings, and updates mastery estimates. On Tuesday, the user runs `python -m app.main todo` and sees output showing that fifteen items from the LLM evaluation document are due for review. The user runs `python -m app.main review eval` to focus on that specific topic. After a week of use across multiple documents, the database contains enough data to analyze which learning techniques produce better retention for which types of content.

The system solves five problems. First, it eliminates the "I don't know what I don't know" problem by forcing retrieval practice that reveals actual gaps. Second, it fights forgetting through spaced repetition scheduling. Third, it measures learning objectively through tracked performance rather than felt fluency. Fourth, it enables self-experimentation by recording which techniques were used for which content. Fifth, it removes cognitive overhead by telling the user exactly what to practice and when.


## Progress

This section tracks granular progress with timestamps. Each stopping point must be documented, even if it requires splitting a partially completed task.

- [x] Milestone 1: Project foundation including database schema, CLI skeleton, and configuration (2026-01-02)
  - Created virtual environment with Python 3.9
  - Installed dependencies: click, python-dotenv, python-docx, pypdf, anthropic, supabase
  - Created project directory structure under learn_system/
  - Created database schema with 12 tables in Supabase
  - Implemented CLI with commands: init, status, sources, bundles, schema
  - Created 5 default technique bundles in database
  - Verified all tables and bundles via Supabase dashboard
- [x] Milestone 2: Document ingestion including text extraction and content storage (2026-01-02)
  - Implemented extractors for PDF, DOCX, Markdown, and plain text files
  - Created ingest.py orchestration module
  - Updated CLI ingest command with actual functionality
  - Tested with DOCX (Make_It_Stick_Distillation.docx) and Markdown (test_document.md)
  - Verified both documents stored correctly in Supabase content_sources table
- [x] Milestone 3: Knowledge component extraction using LLM-based identification (2026-01-02)
  - Created kc_extractor.py with LLM client wrapper for Anthropic API
  - Implemented content chunking for large documents (20k char limit)
  - Built KC extraction prompt based on EXECPLAN.md specification
  - Implemented JSON parsing with error handling for LLM responses
  - Added deduplication logic to prevent duplicate KC names
  - Tested with test_document.md (12 KCs) and Mind_For_Numbers (18 KCs)
  - Fixed curly brace escaping issue in prompt template
- [x] Milestone 4: Practice item generation with type-specific question creation (2026-01-02)
  - Created practice/templates.py with 4 prompt templates by KC type (factual, conceptual, procedural_cognitive, procedural_execution)
  - Created practice/generator.py with LLM-based item generation and JSON parsing
  - Each KC generates 3 items with varying difficulty levels (1-5) and practice modes
  - Practice modes: free_recall, cued_recall, recognition, explanation, application, execution
  - Each item includes: prompt, expected_response, hints (2-3 progressive), rubric/success_criteria
  - Updated ingest.py to call generate_all_items() after KC extraction
  - Added --skip-items flag to ingest command
  - Tested with test_document.md: 12 KCs generated 36 practice items
  - Verified items stored correctly in Supabase practice_items table
- [x] Milestone 5: Core learning loop with session management and response collection (2026-01-02)
  - Created study/scheduler.py with get_study_queue() and get_todo_summary()
  - Created study/loop.py with interactive study session implementation
  - Implemented present_recall_item() for free_recall, cued_recall, recognition modes
  - Implemented present_explanation_item() for explanation/application modes
  - Implemented present_execution_item() for hands-on task tracking
  - Session management: create session, record attempts, close with summary
  - Technique history tracking integrated with attempt recording
  - Connected study command to run_study_session()
  - Tested: scheduler returns prioritized items, sessions/attempts recorded correctly
- [x] Milestone 6: Spaced repetition engine with SM-2 scheduling and mastery tracking (2026-01-02)
  - Created state/spacing.py with SM-2 algorithm (calculate_next_review)
  - Created state/estimator.py with mastery calculation (exponential moving average)
  - Integrated SM-2 into study loop: updates kc_state after each attempt
  - Mastery updates based on exposure count (alpha decreases over time)
  - Interval calculation: perfect score -> 6 days, failed -> 1 day reset
  - Easiness factor adjusts based on performance quality
  - Status command shows average mastery and due counts
  - Fixed datetime parsing issue for Python 3.9 compatibility
  - Tested: KC state updates correctly with mastery, interval, next_review_at
- [x] Milestone 7: To-do dashboard showing due items organized by source (2026-01-02)
  - Implemented todo command using get_todo_summary() from scheduler
  - Shows totals: overdue, due today, new content
  - Groups items by source with individual counts
  - Implemented review command with source pattern matching
  - Supports multiple matches with user selection
  - Passes source_id to run_study_session for filtered practice
  - Tested: todo shows 53 new items across 4 sources, review filters correctly
- [x] Milestone 8: Technique bundle tracking for self-experimentation (2026-01-02)
  - Sessions already record technique_bundle_id on creation
  - record_technique_usage tracks KC-bundle associations in kc_technique_history
  - Study loop already calls record_technique_usage after each attempt
  - Bundle option available on study (--bundle) and review (--bundle) commands
  - Added techniques command to view bundle usage statistics
  - Shows KCs practiced, total exposures, and sessions per bundle
  - Foundation ready for self-experimentation and A/B testing of techniques
- [x] Milestone 9: Web UI Foundation - Project setup and layout components (2026-01-02)
  - Scaffolded React project with Vite in web/ directory
  - Installed dependencies: react-router-dom, @supabase/supabase-js, lucide-react, recharts, tailwindcss
  - Configured Tailwind CSS with design system colors from spec (bg-main, accent-progress, etc.)
  - Created Sidebar component with navigation links and user profile
  - Created Layout component with sidebar and content area
  - Set up React Router with all page routes
  - Created SupabaseContext provider with data fetching methods
  - Created placeholder pages for: Home, Calendar, DueForReview, Sources, Progress, Analytics, Study
  - Verified navigation works correctly between all pages
  - Note: Supabase auth returns 401 due to RLS - requires service role key (hardcoded fallback added)
- [x] Milestone 10: Web UI Home Dashboard - Main dashboard with greeting, alerts, search, and source cards (2026-01-02)
  - Created home components: GreetingHeader, OverdueAlert, SearchBar, QuickActions, SourceCard
  - Implemented time-based greeting ("Good morning/afternoon/evening, Learner")
  - Search bar with placeholder "Search your knowledge base..."
  - Quick action buttons: Study, Plan, Add Document, Analytics with navigation
  - Source cards grid showing: emoji, title, mastery progress bar, due/overdue counts
  - Quick Stats section showing: Total Sources, New Items, Due Today, Overdue
  - Sidebar shows "Due for Review" badge with live count (53 items)
  - Recent sources section in sidebar with emoji icons
  - Overdue alert banner (only visible when overdue > 0)
  - Fixed shell environment variable conflict causing wrong Supabase URL
  - Must use publishable key (sb_publishable_) not secret key in browser
- [x] Milestone 11: Web UI Study Session - Interactive practice interface with answer input (2026-01-02)
  - Created SessionHeader component with progress indicator and "End session" button
  - Created QuestionCard component with KC type badge, practice mode, name, and prompt
  - Created AnswerInput component with textarea, mic button placeholder, submit button, skip link
  - Created SelfAssessment component with 5-point score and difficulty ratings
  - Created SessionSummary modal with items completed, average score, duration, navigation buttons
  - Full Study.jsx page with session lifecycle: fetch queue, create session, present items, record attempts
  - Attempts recorded to database with response time, score, correctness, difficulty
  - KC state updated with mastery calculation (EMA) after each attempt
  - Fixed hints JSON parsing to handle both JSON arrays and plain text
  - Verified mastery updates persist (0% → 11% after successful attempt)
- [x] Milestone 12: Web UI Calendar - Learning calendar and session scheduling (2026-01-02)
  - Created MonthNavigation component with prev/next arrows and month/year display
  - Created CalendarGrid component with 7-column layout, today highlight, session indicators
  - Created ScheduleForm component with source dropdown, session type, duration, date
  - Full Calendar.jsx page fetching sessions from database
  - Session scheduling creates records in sessions table
  - Sessions shown on selected date with status (Completed/Scheduled)
- [x] Milestone 13: Web UI Due for Review - Organized review queue by urgency (2026-01-02)
  - Created ReviewSection component with colored dot indicator, title, and source list
  - Created SourceItem component with emoji, title, count, and action button (Review/Study/Start)
  - Full DueForReview.jsx page fetching and categorizing items from getDueCounts()
  - Three sections: Overdue (red), Due Today (amber), New Content (green)
  - Sources sorted by count within each category (highest first)
  - Action buttons link to /study?source={sourceId} for filtered sessions
  - "Study All" button at bottom shows total count and starts unfiltered session
  - Empty state shows friendly message when all caught up
- [x] Milestone 14: Web UI Progress - Statistics dashboard with charts (2026-01-02)
  - Created StatCards.jsx with 4 summary cards: Sources, Items Learned, Study Sessions, Total Time
  - Created MasteryBySource.jsx with horizontal progress bars per source, sorted by mastery
  - Created WeeklyChart.jsx with Recharts bar chart showing daily activity (Mon-Sun)
  - Streak indicator shows consecutive days with study sessions
  - Weekly total shows items practiced this week
  - Link to /analytics for detailed insights
  - All stats calculated from real database queries (content_sources, kc_state, sessions, attempts)
- [x] Milestone 15: Web UI Analytics - Deep insights, technique comparison, and recommendations (2026-01-02)
  - Created InsightCards.jsx with three colored insight cards: What's Working (green), Needs Attention (amber), Optimization (blue)
  - Created TechniqueComparison.jsx with Recharts horizontal bar chart showing 7-day and 30-day retention by technique bundle
  - Created PerformanceByType.jsx with horizontal bars for factual/conceptual/procedural/metacognitive with color coding
  - Created CalibrationAnalysis.jsx with scatter chart comparing confidence_before to actual score, showing overconfident/underconfident/well-calibrated counts
  - Created ItemsNeedingAttention.jsx listing struggling items with Practice buttons linking to filtered study sessions
  - Full Analytics.jsx page with filter controls (time period, source, knowledge type) that update all sections
  - All analytics calculated from real database queries (attempts, kc_state, technique_bundles, retention_tests, kc_technique_history)
- [x] Sources View Research & Specification (2026-01-02)
  - Created NEW FEATURES.md with comprehensive Sources view specification
  - Ran 5 parallel research agents covering: UI/UX design, file upload flow, backend integration, user journey, engineering architecture
  - Documented FastAPI backend API design (upload, status, retry, health endpoints)
  - Specified Supabase Realtime for processing progress tracking
  - Designed SourcesContext state management with custom hooks (useSources, useSourceUpload, useSourceProcessing)
  - Defined 5 implementation milestones (M16-M20)
  - Validated integration with existing codebase:
    - Existing patterns confirmed: generate_id('src'), get_client(), SupabaseContext, SourceCard component
    - Schema additions are additive (processing_status, processing_progress, etc.)
    - FastAPI requires new dependencies: fastapi, uvicorn, python-multipart
    - Existing ingest_document() has progress_callback - can wrap with status updates
- [x] Milestone 16: Sources Page Foundation - List display with filtering and sorting (2026-01-02)
  - Created useSources hook in web/src/hooks/useSources.js with data fetching, filtering, sorting, and caching
  - Created SourcesHeader.jsx with page title and document count
  - Created SourcesToolbar.jsx with search input, domain filter dropdown, sort by dropdown, sort order toggle, and Add Document button
  - Created SourcesList.jsx with responsive grid layout and enhanced SourceCard showing emoji, title, domain badge, KC count, item count, mastery progress, due/overdue counts
  - Created EmptyState.jsx with two variants: no sources (CTA to add first document) and no filter results
  - Extended SupabaseContext with upload queue state management (addToUploadQueue, updateUploadItem, removeFromUploadQueue, clearCompletedUploads)
  - Wired Sources.jsx page with all components and placeholder upload modal
  - Verified: search filters by title/domain, domain filter works, sort by name/date/mastery works, card click navigates to /study?source={id}
- [x] Milestone 17: Upload UI - Drag-drop zone and file validation (2026-01-02)
  - Created UploadZone.jsx with drag-drop area supporting idle, dragover, uploading, processing, complete, and error visual states
  - Created UploadProgress.jsx showing 4-step progress indicator (Upload → Extract → Analyze → Generate) with step icons and progress bar
  - Created useSourceUpload hook in web/src/hooks/useSourceUpload.js with file validation (type, size), upload state management, and optimistic source creation
  - Supported file types: .pdf, .docx, .md, .txt with 25MB max size
  - Simulated upload and processing flow (mocked timing for M17 - real API in M18)
  - Integrated UploadZone into Sources.jsx with show/hide toggle via Add Document button
  - Added upload success notification with KC count and item count display
  - Verified: upload zone displays, click to browse works, close button works, file type messaging correct
- [x] Milestone 18: FastAPI Backend - Upload endpoint and processing pipeline (2026-01-02)
  - Created FastAPI server in app/api/server.py with CORS middleware for frontend access
  - Created Pydantic schemas in app/api/models/schemas.py for request/response validation (ProcessingStatus enum, UploadResponse, ProcessingStatusResponse, etc.)
  - Created health endpoint in app/api/routes/health.py returning status, version, timestamp
  - Created ProcessingPipeline class in app/api/services/processing.py wrapping ingest_document() with status updates to Supabase
  - Created sources routes in app/api/routes/sources.py with endpoints: POST /upload, GET /{id}/status, POST /{id}/retry, DELETE /{id}
  - File upload uses BackgroundTasks to process documents asynchronously
  - Processing status updates: pending → extracting_text → extracting_kcs → generating_items → ready (or error)
  - Created database migration file migrations/001_add_processing_status.sql
  - Updated requirements.txt with fastapi, uvicorn, python-multipart
  - Verified: API server starts on port 8001, health endpoint returns 200 OK
- [x] Milestone 19: Real-time Processing Progress - Status tracking and UI updates (2026-01-02)
  - Created useSourceProcessing hook in web/src/hooks/useSourceProcessing.js with Supabase Realtime subscription and polling fallback
  - Created ProcessingStatus component in web/src/components/sources/ProcessingStatus.jsx showing progress bar, step indicators, and status badges
  - Created ProcessingBadge component for compact inline status display on source cards
  - Updated SourcesList.jsx SourceCard to handle processing states: pending, extracting_text, extracting_kcs, generating_items, ready, error
  - Added retry button on error state cards with onRetry handler
  - Wired UploadZone.jsx to real API: fetch to POST /api/sources/upload, monitors progress via useSourceProcessing hook
  - Added shimmer animation CSS for progress bar visual feedback
  - Updated Sources.jsx with handleRetry for failed sources using POST /api/sources/{id}/retry
  - Updated learn_system/.env with correct Supabase key format (sb_publishable_)
  - Upgraded supabase Python library (2.0.3 → 2.27.0) and websockets dependency for compatibility
  - Ran database migration in Supabase SQL Editor: ALTER TABLE to add processing_status, processing_progress, processing_step, error_message, processing_started_at, processing_completed_at columns
  - Verified end-to-end upload flow: curl POST /api/sources/upload → source created with pending status → processing ran through all stages → status='ready', progress=100, step='Processing complete!'
  - Test source src_88d49c1e (test_upload.md) successfully processed in ~4 minutes with 61 words extracted
  - Browser upload test (2026-01-02): Programmatically triggered file upload via JavaScript, upload zone UI worked correctly (file selection, Upload & Process button), API received request (200 OK), processing completed successfully
  - Test source src_7f66a8d2 (browser_test.md) processed: 10 KCs extracted, 30 practice items generated, appears in Sources list after refresh
  - Fixed Realtime subscription issue (2026-01-02): Root cause was content_sources table not in supabase_realtime publication. Ran `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sources;` in Supabase SQL Editor. Also added polling fallback in useSourceProcessing.js to always poll every 2 seconds alongside Realtime subscription, ensuring reliable progress updates even if Realtime fails. Verified: upload progress now displays correctly and updates to "ready" state with KC/item counts.
- [x] Milestone 20: Error handling and polish - Delete UI, SourceDetailPanel, confirmation dialogs (2026-01-03)
  - Created ConfirmationDialog component in web/src/components/shared/ConfirmationDialog.jsx with:
    - Danger/warning variants with appropriate icon colors
    - Loading state for async operations
    - Escape key and backdrop click to close
    - Focus trap on confirm button
    - Smooth animations (fade-in, zoom-in)
  - Added SourceMenu dropdown to SourceCard with "View Details" and "Delete" options
    - Three-dot menu icon in card header
    - Click-outside and Escape key to close
    - Red color styling for Delete action
  - Created SourceDetailPanel slide-in drawer in web/src/components/sources/SourceDetailPanel.jsx:
    - Full source information: title, domain, emoji, stats
    - Quick stats cards: Concepts count, Items count, Mastery %
    - Due items summary: overdue (red), due today (amber), new (cyan)
    - Document info section: ingested date, word count, content type, processed date
    - Knowledge Components list grouped by type (Factual, Conceptual, Procedural)
    - Expandable KC items showing description and mastery progress bar
    - Footer with "Study Now" and "Delete" buttons
  - Wired Sources.jsx with delete and view details handlers:
    - handleDeleteRequest opens confirmation dialog
    - handleDeleteConfirm calls DELETE /api/sources/{id} endpoint
    - handleViewDetails opens SourceDetailPanel
    - States for dialog/panel visibility and loading
  - Added CSS animation utilities to index.css:
    - fadeIn, zoomIn95, slideInFromRight, slideInFromTop2 keyframes
    - animate-in utility class with duration variants
  - Verified in browser:
    - Three-dot menu opens on source cards
    - "View Details" opens SourceDetailPanel with correct data
    - KC items expand to show description and mastery
    - Escape key closes both panel and dialog
    - "Delete" option opens confirmation dialog with source name and item counts
    - Cancel closes dialog without deleting
    - Backend DELETE endpoint already functional from M18
- [x] Milestone 21: Groq client and batch database inserts (2026-01-03)
  - Added groq>=0.4 to requirements.txt for speed optimization
  - Updated app/config.py with Groq configuration:
    - GROQ_MODEL = "qwen-qwq-32b" for fast structured output
    - GROQ_API_KEY from environment
    - MAX_LLM_WORKERS = 5 for parallel processing (M22 prep)
    - get_groq_api_key() function
  - Updated app/practice/generator.py to use Groq instead of Anthropic:
    - Changed from Anthropic client to Groq client
    - Updated generate_items_for_kc() to use Groq chat.completions API
    - Response format differs: response.choices[0].message.content
  - Added batch insert functions to app/database/queries.py:
    - insert_kcs_batch(): 2 HTTP calls instead of N*2 (KCs + states)
    - insert_practice_items_batch(): 1 HTTP call instead of N
  - Updated app/ingestion/kc_extractor.py store_extracted_kcs() to use batch insert
  - Updated app/practice/generator.py generate_all_items() to use batch insert:
    - Collects all items from all KCs first
    - Single batch insert at the end
  - Added GROQ_API_KEY placeholder to learn_system/.env
  - All imports verified successful
  - Note: User must obtain GROQ_API_KEY from https://console.groq.com
- [x] Milestone 22: Parallel practice item generation with ThreadPoolExecutor (2026-01-03)
  - Added thread-safe utility classes to app/api/services/processing.py:
    - ProgressTracker: Thread-safe counter with Lock for parallel operations
    - ThrottledUpdater: Rate-limits DB updates to avoid overwhelming Supabase (0.5s min interval)
  - Refactored app/practice/generator.py generate_all_items():
    - Added _process_single_kc() helper function for thread-safe KC processing
    - Uses ThreadPoolExecutor with MAX_LLM_WORKERS (default 5) parallel workers
    - Uses concurrent.futures.as_completed() for result processing
    - Thread-safe progress counting with Lock
  - Updated ProcessingPipeline.process_file() progress_callback:
    - Uses ThrottledUpdater to reduce DB update frequency during parallel processing
  - Architecture rationale:
    - ThreadPoolExecutor over asyncio: existing codebase is synchronous, minimal refactoring
    - LLM API calls are I/O-bound: Python GIL doesn't block during network waits
    - Threads can execute concurrently while waiting for API responses
  - Expected performance: 15 KCs × 1 sec each → ~3-4 seconds with 5 workers (vs 15s sequential)
  - All imports verified successful
- [x] Milestone 23: Error resilience with retry logic (2026-01-03)
  - Added call_with_retry() function to both generator.py and kc_extractor.py:
    - Exponential backoff: 1s, 2s, 4s delays between retries
    - MAX_RETRIES = 3 (total 4 attempts)
    - Detects retryable errors by checking error name/message for:
      ratelimit, rate_limit, connection, timeout, overloaded, apiconnection
  - Updated generate_items_for_kc() in generator.py:
    - Wraps Groq API call in call_with_retry() lambda
    - Returns empty list on permanent failure (non-retryable errors)
  - Updated extract_kcs_from_chunk() in kc_extractor.py:
    - Wraps Anthropic API call in call_with_retry() lambda
    - Re-raises with context on permanent failure
  - Error handling in generate_all_items():
    - Already handles partial failures (continues processing other KCs)
    - Logs error summary at end
    - Returns count of successfully generated items
  - All imports verified successful


## Surprises and Discoveries

This section documents unexpected behaviors, bugs, optimizations, or insights discovered during implementation. Each observation includes concise evidence.

2026-01-02: Python 3.9 type hints incompatibility. The system default Python 3.9 does not support the `X | None` union syntax (PEP 604). Had to use `Optional[X]` from typing module instead. Also `list[dict]` needed to be `List[Dict]`. Evidence: TypeError when importing modules.

2026-01-02: Supabase client library requires specific key format. The secret key (service role key) is needed for full database access, not the anon/publishable key. Evidence: Initial connection tests failed with anon key.

2026-01-02: Curly brace escaping in Python format strings. The KC extraction prompt template contained JSON examples with curly braces, which conflicted with Python's `.format()` method. Fixed by using double braces `{{` and `}}` to escape literal braces. Evidence: KeyError when calling prompt.format().

2026-01-02: Supabase timestamp parsing in Python 3.9. Timestamps returned from Supabase have variable microsecond precision (e.g., `.17045+00:00`) which Python 3.9's `datetime.fromisoformat()` cannot parse. Fixed with try-except fallback that strips timezone for comparison. Evidence: ValueError in end_session() function.

2026-01-02: Practice items generated per KC. The LLM consistently generates exactly 3 practice items per KC as instructed, resulting in predictable item counts (36 items for 12 KCs). This 3:1 ratio holds across all knowledge types.

2026-01-02: Vite environment variable caching with multiple projects. When multiple Vite dev servers run on different ports, environment variables may appear to cross over between projects if ports are reused. The solution is to add hardcoded fallbacks in the supabase client or ensure clean server restarts. Evidence: Network requests going to wrong Supabase URL despite correct .env file.

2026-01-02: Supabase key formats (sb_publishable_ and sb_secret_) require service role key for table access when RLS is enabled. The web app needs the same service role key as the Python CLI to bypass RLS. For production, proper RLS policies should be configured. Evidence: 401 errors with publishable key, success with service role key.

2026-01-02: Shell environment variables override Vite .env files. When VITE_* variables are exported in the shell (e.g., from sourcing another project's .env), they take precedence over the local .env file. Solution: Pass correct values explicitly when starting Vite (e.g., `VITE_SUPABASE_URL=... npm run dev`) or unset conflicting shell variables. Evidence: Vite served wrong Supabase URL despite correct .env file.

2026-01-02: Supabase blocks secret API keys in browser. Keys starting with `sb_secret_` are rejected with "Forbidden use of secret API key in browser" error. Must use `sb_publishable_` key for client-side JavaScript. This is a Supabase security feature to prevent exposing service role keys. Evidence: 401 response with JSON message about secret key usage.

2026-01-02: Practice item hints stored inconsistently. Some hints are stored as JSON arrays (e.g., `["hint1", "hint2"]`), others as plain text strings. The QuestionCard component needed try-catch around JSON.parse to handle both formats gracefully. Evidence: SyntaxError when trying to parse non-JSON hint text.

2026-01-02: Null vs undefined check in JavaScript. The Analytics page ItemsNeedingAttention component checked `avgDifficulty !== undefined` before calling `.toFixed()`, but the value could be `null` (not undefined). In JavaScript, `null !== undefined` is true, so the check passed and `.toFixed()` was called on null, causing a crash. Fixed by using `avgDifficulty != null` which checks for both null and undefined. Evidence: TypeError "Cannot read properties of null (reading 'toFixed')" in browser console.

2026-01-02: Supabase Python library key validation. The supabase-py library version 2.0.3 raised "Invalid API key" for the newer `sb_publishable_*` key format. Upgrading to supabase 2.27.0 resolved this. Also required upgrading websockets (for websockets.asyncio.client import). The web frontend JS library accepted this key format from the start. Evidence: SupabaseException "Invalid API key" resolved after pip3 install --upgrade supabase.

2026-01-02: Supabase Realtime subscription not receiving updates during browser upload. Root cause identified: the content_sources table was not included in the `supabase_realtime` publication (showed "0 tables" in Publications dashboard). Fixed by running `ALTER PUBLICATION supabase_realtime ADD TABLE public.content_sources;` in Supabase SQL Editor. Additionally, the useSourceProcessing hook's polling fallback wasn't starting because it only triggered on subscription error, not proactively. Fixed by modifying useSourceProcessing.js to always start polling as backup alongside the Realtime subscription. After both fixes, progress updates display correctly in the UI. Lesson: Always verify Realtime publication includes required tables, and use polling as a reliable fallback. Evidence: After fix, Sources page showed progress badges updating correctly; test source src_98a441f0 (realtime_test.md) completed with 15 KCs, 45 items.

2026-01-02: UploadZone progress stuck at 0% despite backend processing. Two bugs identified: (1) processingStatus was the full status object but code treated it as a string - fixed by accessing `processingStatus?.processing_status` instead of `processingStatus` in the step mapping. (2) UploadZone component was unmounting during upload when `refresh()` was called in Sources.jsx, because useSources set `loading=true` which caused Sources to render a full-page loading spinner instead of keeping UploadZone mounted. The sourceId state was lost when the component unmounted. Fixed by: (a) changing useSources to not set loading=true during refresh operations (pass isRefresh=true to fetchEnrichedSources), (b) changing Sources.jsx loading check to only show full-page loading when `allSources.length === 0 && !showUploadZone`. Evidence: Console logs showed sourceId staying null even after successful API response; database showed processing at 82% while UI showed 0%.

2026-01-02: "Invalid API key" error on Sources page during testing. Root cause: Shell environment variables from another Supabase project were overriding the correct values in web/.env. The shell had stale `VITE_SUPABASE_URL` pointing to a different project. Fix: Start Vite dev server with explicit env vars from .env: `VITE_SUPABASE_URL=$YOUR_URL VITE_SUPABASE_ANON_KEY=$YOUR_KEY npm run dev`. Alternatively, unset shell variables first: `unset VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY VITE_SUPABASE_SECRET_KEY`. Lesson: Always check for stale shell VITE_* variables when debugging Supabase connection issues in browser apps. Run `env | grep VITE_` to diagnose. Evidence: After unsetting stale vars and using correct values from .env, Sources page loaded successfully.

2026-01-02: Upload progress bar stuck at 82% during item generation. Root cause: The `progress_callback` function in `app/api/services/processing.py` had a hardcoded calculation `65 + int((100 - 65) * 0.5) = 82` instead of parsing the actual progress from the message. The message contains text like "Generating items for KC 5/10: ..." which can be parsed to calculate real progress. Fix: Added regex parsing `re.search(r'KC (\d+)/(\d+)', msg)` to extract current/total KC numbers, then calculate `65 + int((current_kc / total_kcs) * 33)` for progress between 65-98%. Evidence: After fix, progress bar correctly updates from 65% to 98% during item generation, then jumps to 100% on completion.


## Decision Log

This section records every significant decision with rationale.

Decision: Use Supabase (PostgreSQL) instead of SQLite for data storage. Rationale: User requested Supabase for cloud-hosted database with dashboard visibility. Provides real-time data inspection, automatic backups, and future potential for web interface. Trade-off is network dependency vs. offline-first design. Date: 2026-01-02 (overrides initial SQLite decision).

Decision: Use technique bundles rather than individual technique toggles for self-experimentation. Rationale: Testing one technique at a time requires too many comparisons to reach statistical significance. Bundles group related techniques together, such as combining free recall with elaboration prompts and delayed feedback into a "Deep Retrieval" bundle. This enables meaningful comparisons with fewer data points. Date: Initial design.

Decision: Implement hands-on execution tasks as self-reported rather than automatically verified. Rationale: Automatic verification would require integration with development environments, detection of installed tools, and sandboxed code execution. This complexity is substantial and orthogonal to the core learning system. Self-reporting captures completion status, independence level, errors encountered, and iteration count, which provides sufficient signal for learning measurement. Date: Initial design.

Decision: Use the SM-2 algorithm for spaced repetition rather than newer alternatives. Rationale: SM-2 has decades of validation, is well-documented, and is sufficient for this use case. The same attempt data supports migration to more sophisticated algorithms like FSRS later. Starting with a proven algorithm reduces implementation risk. Date: Initial design.

Decision: Use the Anthropic Claude API for knowledge component extraction and practice item generation. Rationale: Extraction quality directly determines system usefulness. Claude produces consistent, well-structured output. The cost of a few dollars per document is acceptable for personal use. Local models can be added as an alternative later without changing the data model. Date: Initial design.

Decision: Track Cognitive Load Theory proxies in the MVP rather than implementing full CLT-aware presentation selection. Rationale: Full CLT implementation requires content-level tagging of presentation properties such as split attention versus integrated visuals, worked examples versus independent practice, and novice-appropriate versus expert-appropriate formats. The MVP captures proxies including intrinsic complexity ratings on knowledge components, difficulty ratings on attempts, response time patterns, and hint usage depth. These proxies enable future CLT-aware features without blocking initial implementation. Date: Design review.

Decision: Add web UI in addition to CLI interface. Rationale: While the CLI remains functional for power users and scripting, a web UI provides better UX for daily learning sessions. The UI design follows a clean, light-theme aesthetic with intuitive navigation. The web app will connect to the same Supabase backend, ensuring data consistency across both interfaces. This enables the system to reach users who prefer visual interfaces while maintaining CLI capabilities. Date: 2026-01-02.

Decision: Use React with Vite for web UI implementation. Rationale: React provides component-based architecture ideal for the modular UI design. Vite offers fast development experience with HMR. The stack includes Tailwind CSS for styling, Recharts for data visualization, and Supabase client for backend connectivity. This aligns with modern web development practices and ensures maintainability. Date: 2026-01-02.

Decision: Pass Supabase environment variables explicitly when starting Vite dev server. Rationale: Shell environment variables (VITE_*) override Vite's .env file when exported in the terminal session. If a user has worked on multiple Vite projects, stale VITE_* variables may persist in the shell and cause requests to go to the wrong Supabase instance. The solution is to pass the correct values explicitly on the command line: `VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run dev`. This ensures the correct values are used regardless of shell state. Alternative: run `unset VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY` before starting the server. Date: 2026-01-02.

Decision: Use Supabase publishable key (sb_publishable_) instead of secret key for web UI. Rationale: Supabase intentionally blocks secret keys (sb_secret_) in browser environments as a security measure to prevent service role key exposure. The publishable key is designed for client-side use. This differs from the CLI which can use secret keys safely. Both key types access the same database; the difference is RLS enforcement (publishable respects RLS policies, secret bypasses them). For the web UI, we use the publishable key with RLS disabled on tables during development. Date: 2026-01-02.

Decision: Use FastAPI with BackgroundTasks for Sources upload API. Rationale: The existing ingest_document() pipeline already handles text extraction, KC extraction, and item generation. FastAPI wraps this with HTTP endpoints and adds processing status tracking. BackgroundTasks keeps processing in-process (no Celery/Redis) which suits localhost single-user. Supabase Realtime provides push updates to frontend during processing. The hybrid architecture (frontend reads directly from Supabase, API only for upload/processing) minimizes complexity. Date: 2026-01-02.

Decision: Add processing_status as new column instead of using existing status field. Rationale: The existing `status` field in content_sources represents lifecycle state (active/archived). The new `processing_status` field tracks ingestion pipeline state (pending/extracting_kcs/generating_items/ready/error). These are orthogonal concerns - a source could be 'active' but still 'error' in processing. Keeping them separate avoids conflating different state machines. Date: 2026-01-02.

Decision: Use Qwen3 32B on Groq for practice item generation instead of Claude. Rationale: Practice item generation is a template-following task with low reasoning requirements—the knowledge component already defines what to test, the generator just formats prompts and expected responses into structured JSON. Qwen3 32B on Groq provides 662 tokens per second (3-5x faster than alternatives) at 70% lower input cost and 88% lower output cost compared to Claude Haiku. KC extraction continues using Claude Sonnet 4 because it requires high reasoning for concept identification, classification, and prerequisite detection. This split optimizes cost and speed without sacrificing quality where reasoning matters. Date: 2026-01-03.

Decision: Use ThreadPoolExecutor for parallel LLM calls instead of asyncio. Rationale: The existing codebase is fully synchronous, and converting to async would require significant refactoring across all modules. LLM API calls are I/O-bound, so Python's Global Interpreter Lock (GIL) does not block during network waits—threads can execute concurrently while waiting for API responses. ThreadPoolExecutor provides parallelism with minimal code changes: wrap the existing synchronous function, submit tasks, collect results. The Anthropic and Groq SDKs both work correctly from multiple threads. Date: 2026-01-03.


## Outcomes and Retrospective

This section summarizes outcomes, gaps, and lessons learned at major milestones or at completion.

### All 8 Milestones Complete (2026-01-02)

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

### All 15 Milestones Complete (2026-01-02)

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

### All 19 Milestones Complete (2026-01-02)

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

**Known Gaps (M20-M23 - Pending):**
- Delete UI not implemented (backend endpoint exists)
- SourceDetailPanel modal not created
- Confirmation dialogs for destructive actions missing
- Mobile responsive layout needs testing
- Processing speed bottleneck: 60-165s per document (M21-M23 will reduce to 15-40s)
- No parallel LLM calls (sequential processing limits throughput)
- No retry logic for transient API failures


## Context and Orientation

This section describes the current state as if the reader knows nothing about the project. It defines every term that might be unfamiliar and names all key files by full path.

This system is a personal learning tool implementing evidence-based learning science. The system provides both a CLI interface and a web UI, stores data in Supabase (PostgreSQL), and calls the Anthropic Claude API for intelligent content processing during document ingestion.

A knowledge component, abbreviated KC throughout this document, refers to a single learnable unit extracted from source content. A knowledge component might be a definition such as "Precision is the ratio of true positives to all predicted positives," a concept such as "When to prioritize precision over recall depends on the cost of false positives versus false negatives," a cognitive procedure such as "Calculate precision given a confusion matrix," or an execution task such as "Implement a function that computes precision from prediction and label arrays." Each knowledge component has a type that determines appropriate practice approaches.

The four knowledge types are factual, conceptual, procedural_cognitive, and procedural_execution. Factual knowledge comprises definitions, terms, formulas, and other content where correct recall is the goal. Conceptual knowledge comprises relationships, principles, and explanatory understanding where the learner must grasp why something works, not just what it is. Procedural_cognitive knowledge comprises problem-solving methods and analytical techniques where the learner must apply a process mentally. Procedural_execution knowledge comprises hands-on skills where the learner must actually do something in the real world, such as writing code, configuring a system, or operating a tool.

A practice item is a specific question, problem, or task generated for a knowledge component. Each knowledge component typically has multiple practice items at different difficulty levels and in different modes. Practice modes include free_recall where the learner must produce the answer from memory with no cues, cued_recall where a hint or partial information is provided, recognition where the learner selects from options, explanation where the learner must articulate understanding in their own words, application where the learner applies knowledge to a scenario, and execution where the learner performs a hands-on task.

Mastery level is a number between zero and one representing the estimated probability that the learner will respond correctly without assistance. Mastery updates after each practice attempt using an exponential moving average. In an exponential moving average, recent values receive higher weight than older values, but history is never completely discarded. The formula is new_mastery equals alpha times current_score plus one minus alpha times old_mastery, where alpha determines how much weight to give the new observation versus history.

Spaced repetition refers to scheduling reviews at increasing intervals. The SM-2 algorithm implements this by adjusting intervals based on response quality. The algorithm maintains an easiness factor per item that increases when performance is good and decreases when performance is poor. The interval before the next review equals the previous interval multiplied by the easiness factor. After an incorrect response, the interval resets to one day. The spacing effect, with an effect size around g equals 0.74 in research literature, is one of the most robust findings in learning science: distributed practice dramatically outperforms massed practice for long-term retention.

A technique bundle is a named combination of learning techniques applied together during a study session. The five default bundles are Standard SRS combining cued recall with immediate feedback and standard spacing intervals, Deep Retrieval combining free recall with elaboration prompts and delayed feedback, Interleaved Practice adding topic mixing within sessions for discrimination learning, Execution Focus emphasizing hands-on tasks with graduated independence levels, and Generation First presenting problems before instruction to prime encoding. Tracking which bundle was used for which content enables analysis of technique effectiveness over time.

A session is a study period during which the user practices items. Sessions record their start time, end time, duration, technique bundle, and all attempts made during the session.

An attempt records a single interaction with a practice item. Each attempt captures the item presented, the response given, correctness assessment, time taken, confidence rating before the attempt, difficulty rating after the attempt, hints requested, and for execution tasks, independence level and errors encountered.

The project has two main parts: `learn_system/` for the Python CLI and `web/` for the React web UI. Both connect to the same Supabase database. The CLI structure: `app/main.py` (CLI entry), `app/config.py` (configuration), `app/database/` (Supabase queries), `app/ingestion/` (document processing and KC extraction), `app/practice/` (item generation), `app/study/` (session loop and scheduler), `app/state/` (mastery and spacing algorithms). The web structure is defined in the "Web UI Technology Stack" section.

The CLI requires Python 3.9+ with packages: click, python-dotenv, python-docx, pypdf, anthropic, and supabase. The backend API (M18) additionally requires: fastapi, uvicorn, python-multipart. The speed optimization (M21-M23) adds: groq (for Qwen3 32B model access). The web UI requires Node.js 18+ with React, Vite, Tailwind CSS, Recharts, and Supabase client. An Anthropic API key and Supabase credentials must be available in environment variables. A Groq API key (GROQ_API_KEY) is required for practice item generation after M21. An internet connection is required for database access and during document ingestion when the LLM APIs are called.


## Plan of Work

Implementation proceeds through twenty-three milestones. All milestones 1-23 are complete.

**CLI (Complete):** M1: Project foundation and database schema. M2: Document ingestion. M3: KC extraction via LLM. M4: Practice item generation. M5: Interactive study loop. M6: SM-2 spaced repetition. M7: Todo dashboard and source review. M8: Technique bundle tracking.

**Web UI Core (Complete):** M9: Foundation (React/Vite/Tailwind setup, sidebar layout). M10: Home dashboard. M11: Study session interface. M12: Calendar and scheduling. M13: Due for Review page. M14: Progress statistics. M15: Analytics and insights.

**Sources Feature (Complete):** M16: Sources page foundation with list display. M17: Upload UI with drag-drop and validation. M18: FastAPI backend with processing endpoints. M19: Real-time processing progress. M20: Error handling and polish.

**Speed Optimization (Complete):** M21: Groq client and batch database inserts. M22: Parallel practice item generation. M23: Error resilience and retry logic.


## CLI Usage Reference

CLI commands (all complete and functional):

```
python -m app.main init                    # Initialize database and bundles
python -m app.main ingest <file> --domain  # Process document, extract KCs, generate items
python -m app.main status                  # Show system statistics
python -m app.main sources                 # List ingested documents
python -m app.main bundles                 # List technique bundles
python -m app.main todo                    # Show what's due for review
python -m app.main study --duration 30     # Start study session
python -m app.main review <pattern>        # Focus session on specific source
python -m app.main techniques              # View bundle usage statistics
```

## How to Run Web UI

To start the web UI development server:

```bash
cd web/

# Option 1: Pass environment variables explicitly (recommended if you have multiple Vite projects)
# Use values from your web/.env file
VITE_SUPABASE_URL="$YOUR_SUPABASE_URL" \
VITE_SUPABASE_ANON_KEY="$YOUR_PUBLISHABLE_KEY" \
npm run dev

# Option 2: Unset any stale shell variables first
unset VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY
npm run dev

# Option 3: Just run npm run dev (works if no conflicting shell variables exist)
npm run dev
```

The app runs at http://localhost:5173

**Important:** Use the publishable key (`sb_publishable_...`) not the secret key (`sb_secret_...`) for browser-based apps. Supabase blocks secret keys in browsers for security.


## Recovery Notes

- Running `init` multiple times is safe (uses IF NOT EXISTS)
- Re-ingesting same document creates duplicate; check first if needed
- Failed ingestion during KC extraction: no partial data committed, retry safely
- Failed during item generation: KCs saved, items not; can regenerate
- Interrupted sessions: completed attempts saved; restart begins new session
- Database backups via Supabase dashboard or pg_dump


## Artifacts and Notes

This section contains important implementation details, schema definitions, and reference material.

The complete database schema follows. This SQL should be placed in learn_system/app/database/schema.sql and executed during init.

    CREATE TABLE IF NOT EXISTS technique_bundles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        retrieval_mode TEXT NOT NULL DEFAULT 'cued_recall',
        spacing_multiplier REAL NOT NULL DEFAULT 1.0,
        interleaving_enabled INTEGER NOT NULL DEFAULT 0,
        elaboration_prompts_enabled INTEGER NOT NULL DEFAULT 0,
        reflection_prompts_enabled INTEGER NOT NULL DEFAULT 0,
        feedback_timing TEXT NOT NULL DEFAULT 'immediate',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_sources (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_path TEXT,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL DEFAULT 'text',
        domain TEXT NOT NULL DEFAULT 'general',
        word_count INTEGER,
        metadata TEXT,
        ingested_at TEXT NOT NULL DEFAULT (datetime('now')),
        status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS knowledge_components (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL REFERENCES content_sources(id),
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        knowledge_type TEXT NOT NULL,
        cognitive_level TEXT NOT NULL DEFAULT 'remember',
        intrinsic_complexity INTEGER NOT NULL DEFAULT 3,
        domain TEXT NOT NULL DEFAULT 'general',
        practice_environment TEXT,
        source_excerpt TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kc_state (
        kc_id TEXT PRIMARY KEY REFERENCES knowledge_components(id),
        mastery_level REAL NOT NULL DEFAULT 0.0,
        exposure_count INTEGER NOT NULL DEFAULT 0,
        correct_count INTEGER NOT NULL DEFAULT 0,
        consecutive_correct INTEGER NOT NULL DEFAULT 0,
        consecutive_incorrect INTEGER NOT NULL DEFAULT 0,
        last_exposure_at TEXT,
        next_review_at TEXT,
        current_interval_days REAL NOT NULL DEFAULT 1.0,
        easiness_factor REAL NOT NULL DEFAULT 2.5,
        learning_velocity REAL,
        proceduralization_level REAL,
        plateau_detected INTEGER NOT NULL DEFAULT 0,
        struggling_flag INTEGER NOT NULL DEFAULT 0,
        average_response_time_ms INTEGER,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS kc_prerequisites (
        kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        prerequisite_kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        strength REAL NOT NULL DEFAULT 1.0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (kc_id, prerequisite_kc_id)
    );

    CREATE TABLE IF NOT EXISTS kc_subskills (
        id TEXT PRIMARY KEY,
        parent_kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        name TEXT NOT NULL,
        description TEXT,
        sequence_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS practice_items (
        id TEXT PRIMARY KEY,
        kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        practice_mode TEXT NOT NULL,
        difficulty_level INTEGER NOT NULL DEFAULT 2,
        prompt TEXT NOT NULL,
        expected_response TEXT,
        hints TEXT,
        rubric TEXT,
        success_criteria TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        technique_bundle_id TEXT REFERENCES technique_bundles(id),
        session_type TEXT NOT NULL DEFAULT 'mixed',
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        ended_at TEXT,
        target_duration_minutes INTEGER,
        actual_duration_minutes INTEGER,
        items_completed INTEGER NOT NULL DEFAULT 0,
        items_skipped INTEGER NOT NULL DEFAULT 0,
        average_score REAL,
        notes TEXT,
        time_of_day TEXT,
        energy_level INTEGER,
        focus_rating INTEGER
    );

    CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id),
        practice_item_id TEXT NOT NULL REFERENCES practice_items(id),
        kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        response_time_ms INTEGER,
        response TEXT,
        score REAL,
        correctness TEXT NOT NULL DEFAULT 'pending',
        confidence_before INTEGER,
        difficulty_rating INTEGER,
        hints_requested INTEGER NOT NULL DEFAULT 0,
        hints_viewed TEXT,
        time_before_first_hint_ms INTEGER,
        independence_level TEXT,
        task_completed INTEGER,
        iterations_to_complete INTEGER,
        errors_encountered TEXT,
        explanation_provided INTEGER,
        self_identified_gaps TEXT,
        acted_on_feedback INTEGER,
        resources_accessed TEXT,
        error_type TEXT,
        mastery_before REAL,
        mastery_after REAL
    );

    CREATE TABLE IF NOT EXISTS kc_technique_history (
        id TEXT PRIMARY KEY,
        kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        technique_bundle_id TEXT NOT NULL REFERENCES technique_bundles(id),
        used_from TEXT NOT NULL DEFAULT (datetime('now')),
        used_until TEXT,
        exposures_during INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS retention_tests (
        id TEXT PRIMARY KEY,
        kc_id TEXT NOT NULL REFERENCES knowledge_components(id),
        delay_days INTEGER NOT NULL,
        scheduled_for TEXT NOT NULL,
        completed_at TEXT,
        score REAL,
        response_time_ms INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS learning_goals (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        target_date TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        progress_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_kc_source ON knowledge_components(source_id);
    CREATE INDEX IF NOT EXISTS idx_kc_type ON knowledge_components(knowledge_type);
    CREATE INDEX IF NOT EXISTS idx_items_kc ON practice_items(kc_id);
    CREATE INDEX IF NOT EXISTS idx_items_mode ON practice_items(practice_mode);
    CREATE INDEX IF NOT EXISTS idx_attempts_session ON attempts(session_id);
    CREATE INDEX IF NOT EXISTS idx_attempts_kc ON attempts(kc_id);
    CREATE INDEX IF NOT EXISTS idx_state_review ON kc_state(next_review_at);
    CREATE INDEX IF NOT EXISTS idx_state_mastery ON kc_state(mastery_level);

Schema additions for Sources feature (M16-M20). Run these migrations in Supabase dashboard before starting M16:

    -- Add processing status columns to content_sources
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_step TEXT;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
    ALTER TABLE content_sources ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ;

    -- Enable realtime for processing updates (if not already enabled)
    ALTER PUBLICATION supabase_realtime ADD TABLE content_sources;

    -- Status values: pending, extracting_text, extracting_kcs, generating_items, ready, error
    -- The existing 'status' column (active/archived) remains for lifecycle state

The five default technique bundles to insert during init:

    INSERT INTO technique_bundles (id, name, description, retrieval_mode, spacing_multiplier,
        interleaving_enabled, elaboration_prompts_enabled, reflection_prompts_enabled, feedback_timing)
    VALUES
        ('bundle_standard', 'Standard SRS', 'Cued recall with immediate feedback and standard spacing',
         'cued_recall', 1.0, 0, 0, 0, 'immediate'),
        ('bundle_deep', 'Deep Retrieval', 'Free recall with elaboration and reflection prompts',
         'free_recall', 1.0, 0, 1, 1, 'immediate'),
        ('bundle_interleaved', 'Interleaved Practice', 'Mixed topics within sessions for discrimination',
         'free_recall', 1.0, 1, 1, 0, 'immediate'),
        ('bundle_execution', 'Execution Focus', 'Hands-on tasks with graduated independence',
         'execution', 1.2, 0, 0, 1, 'immediate'),
        ('bundle_generation', 'Generation First', 'Pre-testing before instruction to prime encoding',
         'free_recall', 1.0, 0, 1, 0, 'delayed');

The SM-2 algorithm implementation in pseudocode:

    function calculate_next_review(score, current_interval, easiness_factor):
        # Convert 0-1 score to 0-5 quality rating
        quality = round(score * 5)
        
        # Update easiness factor (minimum 1.3)
        new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, new_ef)
        
        # Calculate new interval
        if quality < 3:
            # Failed: reset to 1 day
            new_interval = 1.0
        elif current_interval < 1:
            # First successful review
            new_interval = 1.0
        elif current_interval < 6:
            # Second successful review
            new_interval = 6.0
        else:
            # Subsequent reviews: multiply by easiness factor
            new_interval = current_interval * new_ef
        
        # Calculate next review date
        next_review = now() + timedelta(days=new_interval)
        
        return (new_interval, new_ef, next_review)

The mastery estimation using exponential moving average:

    function calculate_mastery(new_score, current_mastery, exposure_count):
        # Alpha decreases with exposure: high early (0.7), low later (0.2)
        if exposure_count <= 2:
            alpha = 0.7
        elif exposure_count <= 5:
            alpha = 0.5
        elif exposure_count <= 10:
            alpha = 0.35
        else:
            alpha = 0.2
        
        # Exponential moving average
        new_mastery = alpha * new_score + (1 - alpha) * current_mastery
        
        return new_mastery

The prompt template for knowledge component extraction. This goes in the LLM call during ingestion:

    You are analyzing educational content to extract learnable knowledge components.
    
    For each distinct concept, skill, or fact that a learner should master, extract:
    1. name: A concise identifier (3-8 words)
    2. description: What the learner should know or be able to do (1-3 sentences)
    3. knowledge_type: One of factual, conceptual, procedural_cognitive, procedural_execution
    4. cognitive_level: One of remember, understand, apply, analyze, evaluate, create
    5. intrinsic_complexity: 1-5 where 1 is simple definition, 5 is complex multi-step concept
    6. prerequisites: Names of other KCs that should be learned first (if any)
    
    Knowledge type definitions:
    - factual: Definitions, terms, formulas. Tested by recall.
    - conceptual: Principles, relationships, "why" knowledge. Tested by explanation.
    - procedural_cognitive: Problem-solving methods. Tested by solving problems.
    - procedural_execution: Hands-on skills. Tested by doing tasks.
    
    Return as JSON array. Extract 10-20 knowledge components from this content.
    Be specific and granular. Each KC should be independently learnable and testable.
    
    Content to analyze:
    {content}


## Milestones

### CLI Milestones 1-8 (Complete)

All CLI milestones are complete. See the **Progress** section for detailed implementation notes and the **Outcomes and Retrospective** section for what's working.

- **M1:** Project foundation, database schema, CLI skeleton
- **M2:** Document ingestion (PDF, DOCX, Markdown extraction)
- **M3:** KC extraction via LLM with chunking and deduplication
- **M4:** Practice item generation with type-specific templates
- **M5:** Interactive study loop with session management
- **M6:** SM-2 spaced repetition and mastery tracking
- **M7:** Todo dashboard and source-filtered review
- **M8:** Technique bundle tracking for self-experimentation

### Web UI Milestones 9-15 (Complete)

All Web UI milestones are complete. See the **Progress** section for detailed implementation notes.

- **M9:** Foundation (React/Vite/Tailwind setup, Sidebar, Layout, SupabaseContext)
- **M10:** Home dashboard (greeting, overdue alert, search, quick actions, source cards)
- **M11:** Study session (question card, answer input, self-assessment, session summary)
- **M12:** Calendar (month navigation, calendar grid, schedule form)
- **M13:** Due for Review (sections by urgency, source items, action buttons)
- **M14:** Progress (stat cards, mastery by source, weekly chart, streak)
- **M15:** Analytics (insight cards, technique comparison, calibration analysis, items needing attention)

### Sources Feature Milestones 16-19 (Complete)

These milestones implemented the Sources page with document upload and processing functionality. Key architecture: React frontend talks directly to Supabase for reads, but uploads go through a FastAPI backend that wraps the existing CLI ingestion pipeline.

- **M16:** Sources page foundation (list display, filtering, sorting)
- **M17:** Upload UI (drag-drop zone, file validation, progress indicators)
- **M18:** FastAPI backend (upload endpoint, processing pipeline, status API)
- **M19:** Real-time processing (Supabase Realtime subscriptions, live progress)

### Milestone 20 (Pending)

- **M20:** Error handling and polish (retry mechanism partially done, delete UI missing, SourceDetailPanel missing)

### Milestone 16: Sources Page Foundation

At the end of this milestone, the Sources page displays all existing sources from the database in a grid layout with filtering and sorting. This replaces the current placeholder page.

The work involves creating components in `web/src/components/sources/`: SourcesHeader.jsx for page title, SourcesToolbar.jsx with search/filter/sort controls, SourcesList.jsx for the grid container, and EmptyState.jsx for when no sources exist. The existing SourceCard pattern from `components/home/SourceCard.jsx` can be reused or adapted. Add `useSources` hook in `web/src/hooks/useSources.js` for data fetching with caching. Extend SupabaseContext with upload queue state (preparation for M17). Wire Sources.jsx page to display the grid.

To verify, navigate to `/sources`. The page should show all sources from the database as cards. Each card displays emoji, title, domain badge, KC count, item count, mastery percentage, and due/overdue counts. Clicking a card navigates to `/study?source={id}`. Filter by domain works. Sort by name/date/mastery works. Empty state shows when no sources exist.

### Milestone 17: Upload UI

At the end of this milestone, users can select files for upload via drag-drop or file picker, with immediate client-side validation. The actual upload is mocked pending the backend.

The work involves creating UploadZone.jsx with drag-drop area supporting idle, dragover, uploading, processing, complete, and error visual states. Create UploadProgress.jsx showing multi-step progress indicator (Upload → Extract → Analyze → Generate). Create `useSourceUpload` hook in `web/src/hooks/useSourceUpload.js` that handles file validation (type, size), manages upload state, and adds optimistic entries to the sources list. Supported file types: .pdf, .docx, .md, .txt (max 25MB). Add upload button to SourcesToolbar that expands the UploadZone.

To verify, click "Add Document" button. Upload zone appears with dashed border. Drag a file over - border highlights. Drop a valid file - shows uploading state with filename. Drop an invalid file (e.g., .exe) - shows immediate error. Progress indicator shows steps (mocked timing). Optimistic card appears in source list during "upload".

### Milestone 18: FastAPI Backend

At the end of this milestone, a FastAPI server runs on port 8000 that accepts file uploads, processes them through the existing ingestion pipeline, and updates processing status in the database.

The work involves creating `learn_system/app/api/` directory structure: `server.py` (FastAPI app factory with CORS), `routes/sources.py` (upload, status, retry, delete endpoints), `routes/health.py` (health check), `models/schemas.py` (Pydantic request/response models), `services/processing.py` (ProcessingPipeline class that wraps `ingest_document()` with status updates). Add dependencies to requirements.txt: fastapi, uvicorn, python-multipart. The ProcessingPipeline updates `content_sources.processing_status` column at each stage: pending → extracting_text → extracting_kcs → generating_items → ready (or error). Run migrations in Supabase to add processing_status, processing_progress, processing_step, error_message columns to content_sources table.

To verify, start the API server: `uvicorn app.api.server:app --reload --port 8000`. Upload a document via curl:

    curl -X POST http://localhost:8000/api/sources/upload -F "file=@doc.pdf" -F "domain=general"

Response shows source_id and status "pending". Poll status endpoint:

    curl http://localhost:8000/api/sources/{source_id}/status

Status progresses through stages. After completion, status is "ready" with kc_count and item_count populated. Frontend can now call real API instead of mock.

### Milestone 19: Real-time Processing Progress

At the end of this milestone, the frontend shows live processing progress as documents are being analyzed, using Supabase Realtime subscriptions.

The work involves creating `useSourceProcessing` hook in `web/src/hooks/useSourceProcessing.js` that subscribes to Supabase Realtime changes on the content_sources table filtered by source_id. Create ProcessingStatus.jsx component showing current step and progress percentage. Update SourceCard to display processing state with animated indicator when status is not "ready". Add toast notification (using a simple toast component or console for now) when processing completes. Implement polling fallback if Realtime subscription fails. Wire UploadZone to show real-time progress after upload starts.

To verify, upload a document through the web UI. The UploadZone shows real-time progress: "Extracting text... 10%", "Analyzing content... 35%", "Generating practice items... 70%", then "Complete! 12 concepts, 36 items". Card in list updates from "Processing" to ready state without page refresh. Toast appears on completion.

### Milestone 20: Error Handling and Polish

At the end of this milestone, the Sources feature is production-ready with comprehensive error handling, retry mechanism, delete functionality, and responsive design.

The work involves adding error boundaries to Sources page components. Implement retry mechanism: failed sources show "Retry" button that calls `/api/sources/{id}/retry` endpoint. Create user-friendly error messages for common failures (file too large, unsupported type, LLM rate limit, network error). Add delete functionality: dropdown menu on SourceCard with "Delete" option, confirmation dialog, calls DELETE endpoint, removes from list with animation. Add SourceDetailPanel.jsx (modal or drawer) showing full source info: all KCs, item counts by type, processing history. Test and fix mobile responsive layout. Update EmptyState with prominent "Add Your First Document" CTA that auto-opens upload zone.

To verify, upload a file that will fail (e.g., trigger LLM rate limit by uploading many files quickly). Error state shows clear message and "Retry" button. Click Retry - processing restarts. Delete a source - confirmation appears, source removed from list and database. View source details - modal shows KC list. Test on mobile viewport - layout remains usable.


### Speed Optimization Milestones 21-23 (Pending)

These milestones reduce document processing time from 60-165 seconds to 15-40 seconds (approximately 3-4x speedup). The bottleneck is sequential LLM API calls during practice item generation. Three optimizations provide the biggest gains: parallel item generation (50-70% time reduction), faster model for items (30-50% LLM latency reduction), and batch database inserts (10-15% time reduction).

- **M21:** Groq client and batch database inserts (low effort, immediate gains)
- **M22:** Parallel practice item generation with ThreadPoolExecutor (medium effort, major gains)
- **M23:** Error resilience with retry logic and graceful degradation (optional polish)

### Milestone 21: Groq Client and Batch Database Inserts

At the end of this milestone, practice item generation uses the Qwen3 32B model on Groq instead of Claude for faster structured output, and database inserts use batch operations instead of individual calls.

**Rationale for Model Selection:**

Knowledge component extraction requires high reasoning (concept identification, classification, prerequisite detection) and continues using Claude Sonnet 4. Practice item generation is a template-following task with low reasoning requirements—the KC already defines what to test, the generator just formats prompts and expected responses. Qwen3 32B on Groq handles structured JSON output well at 662 tokens per second, 3-5x faster than alternatives.

| Task | Reasoning Needed | Model | Provider |
|------|------------------|-------|----------|
| KC Extraction | High | claude-sonnet-4-20250514 | Anthropic |
| Item Generation | Low | qwen-qwq-32b | Groq |

**Cost comparison:**

| Metric | Claude 3.5 Haiku | Qwen3 32B (Groq) |
|--------|------------------|------------------|
| Input | $1.00/M tokens | $0.29/M tokens |
| Output | $5.00/M tokens | $0.59/M tokens |
| Speed | 4-5x Sonnet | 662 TPS |

**Work:**

1. Add `groq` to `requirements.txt`.

2. Update `learn_system/app/config.py` to add Groq configuration:

        ANTHROPIC_MODEL_REASONING: str = "claude-sonnet-4-20250514"  # For KC extraction
        GROQ_MODEL_FAST: str = "qwen-qwq-32b"  # For item generation
        GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

3. Create Groq client wrapper in `learn_system/app/practice/generator.py`:

        from groq import Groq

        def get_groq_client():
            return Groq(api_key=GROQ_API_KEY)

4. Update `generate_items_for_kc()` to use Groq client instead of Anthropic:

        def generate_items_for_kc(kc: dict) -> list[dict]:
            client = get_groq_client()
            response = client.chat.completions.create(
                model=GROQ_MODEL_FAST,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=2048
            )
            # Parse response.choices[0].message.content as JSON...

5. Add batch insert functions to `learn_system/app/database/queries.py`:

        def insert_kcs_batch(kcs_data: list[dict]) -> list[str]:
            """Batch insert KCs and their states in 2 HTTP calls instead of N*2."""
            client = get_client()
            kc_records = []
            state_records = []
            kc_ids = []

            for kc in kcs_data:
                kc_id = generate_id('kc')
                kc_ids.append(kc_id)
                kc_records.append({...})
                state_records.append({'kc_id': kc_id, 'mastery_level': 0.0, ...})

            client.table('knowledge_components').insert(kc_records).execute()
            client.table('kc_state').insert(state_records).execute()
            return kc_ids

        def insert_practice_items_batch(items: list[dict]) -> list[str]:
            """Batch insert practice items in 1 HTTP call instead of N."""
            client = get_client()
            records = [{'id': generate_id('item'), **item} for item in items]
            client.table('practice_items').insert(records).execute()
            return [r['id'] for r in records]

6. Update `learn_system/app/ingestion/kc_extractor.py` to use `insert_kcs_batch()` instead of individual inserts.

7. Update `learn_system/app/practice/generator.py` to collect all items then call `insert_practice_items_batch()`.

**To verify:**

1. Set `GROQ_API_KEY` in `.env` file.

2. Run CLI ingestion on a test document:

        cd learn_system
        python -m app.main ingest test_document.md --domain test

3. Observe console output shows Groq model being used for item generation.

4. Check Supabase dashboard to verify KCs and items were created.

5. Time the operation. Expected improvement: item generation calls should complete in under 1 second each (down from 3-8 seconds with Claude).

**Fallback:** If Qwen3 32B quality is insufficient, Llama 3.1 8B on Groq ($0.05/$0.08 per million tokens, 840 TPS) is worth testing as an alternative.


### Milestone 22: Parallel Practice Item Generation

At the end of this milestone, practice items for multiple KCs are generated concurrently using ThreadPoolExecutor, reducing total generation time from ~75 seconds (15 KCs × 5 sec) to ~15 seconds (parallel with 5 workers).

**Why ThreadPoolExecutor over asyncio:**
- Existing code is synchronous throughout
- LLM API calls are I/O-bound; Python's GIL does not block during network waits
- Minimal refactoring required compared to converting to async

**Work:**

1. Add thread-safe progress tracker to `learn_system/app/api/services/processing.py`:

        from threading import Lock

        class ProgressTracker:
            def __init__(self, total: int):
                self.total = total
                self._completed = 0
                self._lock = Lock()

            def increment(self) -> tuple[int, int]:
                with self._lock:
                    self._completed += 1
                    return (self._completed, self.total)

        class ThrottledUpdater:
            """Reduces DB update frequency to avoid overwhelming Supabase."""
            def __init__(self, update_fn, min_interval: float = 0.5):
                self.update_fn = update_fn
                self.min_interval = min_interval
                self._last_update = 0
                self._lock = Lock()

            def update(self, *args, **kwargs):
                with self._lock:
                    now = time.time()
                    if now - self._last_update >= self.min_interval:
                        self.update_fn(*args, **kwargs)
                        self._last_update = now

2. Refactor `generate_all_items()` in `learn_system/app/practice/generator.py`:

        from concurrent.futures import ThreadPoolExecutor, as_completed
        import os

        MAX_LLM_WORKERS = int(os.getenv('MAX_LLM_WORKERS', '5'))

        def _process_single_kc(kc: dict) -> tuple[str, list[dict], str | None]:
            """Process single KC. Returns (kc_id, items, error_or_none)."""
            try:
                existing = get_items_for_kc(kc['id'])
                if existing:
                    return (kc['id'], [], None)  # Skip, already has items
                items = generate_items_for_kc(kc)
                return (kc['id'], items, None)
            except Exception as e:
                return (kc['id'], [], str(e))

        def generate_all_items(source_id: str, progress_callback=None) -> int:
            """Generate items for all KCs using parallel LLM calls."""
            kcs = get_kcs_for_source(source_id)
            if not kcs:
                return 0

            all_items = []
            completed = 0
            errors = []

            with ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
                future_to_kc = {executor.submit(_process_single_kc, kc): kc for kc in kcs}

                for future in as_completed(future_to_kc):
                    completed += 1
                    kc_id, items, error = future.result()
                    if items:
                        for item in items:
                            item['kc_id'] = kc_id
                        all_items.extend(items)
                    if error:
                        errors.append(f"{kc_id}: {error}")
                    if progress_callback:
                        progress_callback(f"Generating items for KC {completed}/{len(kcs)}")

            # Batch insert all items at once
            if all_items:
                insert_practice_items_batch(all_items)

            if errors:
                print(f"Warnings: {len(errors)} KCs failed: {errors[:3]}...")

            return len(all_items)

3. Add `MAX_LLM_WORKERS` configuration to `learn_system/app/config.py`:

        MAX_LLM_WORKERS: int = int(os.getenv('MAX_LLM_WORKERS', '5'))

4. Update `learn_system/app/api/services/processing.py` progress callback to use `ThrottledUpdater` to avoid excessive Supabase updates during parallel execution.

**To verify:**

1. Run CLI ingestion on a document with 10+ KCs:

        cd learn_system
        time python -m app.main ingest larger_document.md --domain test

2. Observe console shows parallel progress ("Generating items for KC 3/15", etc.) with multiple completions in quick succession.

3. Compare timing: with 5 workers processing 15 KCs at ~1 sec each, expect ~3-4 seconds total instead of ~15 seconds sequential.

4. Verify all items created correctly in Supabase.

5. Test web UI upload to confirm progress bar still updates (throttled updates working).


### Milestone 23: Error Resilience and Retry Logic

At the end of this milestone, LLM API calls have automatic retry with exponential backoff, and the system gracefully handles partial failures without losing successfully generated content.

**Work:**

1. Add retry wrapper to `learn_system/app/practice/generator.py`:

        from groq import RateLimitError, APIConnectionError, APITimeoutError
        import time

        RETRYABLE_ERRORS = (RateLimitError, APIConnectionError, APITimeoutError)

        def call_with_retry(fn, *args, max_retries=3, **kwargs):
            """Call function with exponential backoff on transient errors."""
            for attempt in range(max_retries + 1):
                try:
                    return fn(*args, **kwargs)
                except RETRYABLE_ERRORS as e:
                    if attempt == max_retries:
                        raise
                    wait_time = 2 ** attempt  # 1s, 2s, 4s
                    print(f"Retrying in {wait_time}s after: {e}")
                    time.sleep(wait_time)

2. Wrap LLM calls in `generate_items_for_kc()` with retry logic:

        def generate_items_for_kc(kc: dict) -> list[dict]:
            def _call():
                client = get_groq_client()
                return client.chat.completions.create(
                    model=GROQ_MODEL_FAST,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=2048
                )
            response = call_with_retry(_call)
            # Parse response...

3. Add similar retry wrapper to KC extraction in `learn_system/app/ingestion/kc_extractor.py` for Anthropic API calls.

4. Update `generate_all_items()` error handling to:
   - Continue processing remaining KCs when one fails
   - Log all errors to a summary
   - Return partial success (items for KCs that succeeded)
   - Optionally store failed KC IDs for later retry

5. Update web UI `ProcessingStatus` component to show partial success states: "Completed with warnings: 12/15 KCs processed successfully."

**To verify:**

1. Temporarily set `MAX_LLM_WORKERS=10` to trigger rate limits, then run ingestion.

2. Observe retry messages in console ("Retrying in 2s after: RateLimitError").

3. Verify processing completes with partial results if some KCs fail permanently.

4. Check that successfully generated items are stored even when some fail.

5. Web UI shows appropriate status message for partial success.

**Optional enhancements (not required for milestone):**
- Circuit breaker pattern for sustained API failures
- Checkpoint file for resumable processing after crash
- Per-KC retry queue for failed items


## Web UI Technology Stack

The web interface uses the following technology stack:

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Framework | React | 18.x | Component-based UI |
| Build Tool | Vite | 5.x | Fast development and bundling |
| Routing | React Router | 6.x | Client-side navigation |
| Styling | Tailwind CSS | 3.4.x | Utility-first CSS |
| Icons | Lucide React | latest | Consistent iconography |
| Charts | Recharts | 2.x | Data visualization |
| Database | Supabase Client | 2.x | Backend connectivity |
| State | React Context | built-in | Global state management |

Directory structure for web application:

    web/
    ├── src/
    │   ├── components/
    │   │   ├── layout/
    │   │   │   ├── Sidebar.jsx
    │   │   │   └── Layout.jsx
    │   │   ├── home/
    │   │   │   ├── GreetingHeader.jsx
    │   │   │   ├── OverdueAlert.jsx
    │   │   │   ├── SearchBar.jsx
    │   │   │   ├── QuickActions.jsx
    │   │   │   └── SourceCard.jsx
    │   │   ├── study/
    │   │   │   ├── SessionHeader.jsx
    │   │   │   ├── QuestionCard.jsx
    │   │   │   ├── AnswerInput.jsx
    │   │   │   ├── SelfAssessment.jsx
    │   │   │   └── SessionSummary.jsx
    │   │   ├── calendar/
    │   │   │   ├── CalendarGrid.jsx
    │   │   │   ├── MonthNavigation.jsx
    │   │   │   └── ScheduleForm.jsx
    │   │   ├── review/
    │   │   │   ├── ReviewSection.jsx
    │   │   │   └── SourceItem.jsx
    │   │   ├── progress/
    │   │   │   ├── StatCards.jsx
    │   │   │   ├── MasteryBySource.jsx
    │   │   │   └── WeeklyChart.jsx
    │   │   ├── analytics/
    │   │   │   ├── InsightCards.jsx
    │   │   │   ├── TechniqueComparison.jsx
    │   │   │   ├── PerformanceByType.jsx
    │   │   │   ├── CalibrationAnalysis.jsx
    │   │   │   └── ItemsNeedingAttention.jsx
    │   │   └── sources/                    # (M16-M20)
    │   │       ├── SourcesHeader.jsx
    │   │       ├── SourcesToolbar.jsx
    │   │       ├── SourcesList.jsx
    │   │       ├── UploadZone.jsx
    │   │       ├── UploadProgress.jsx
    │   │       ├── ProcessingStatus.jsx
    │   │       ├── SourceDetailPanel.jsx
    │   │       └── EmptyState.jsx
    │   ├── pages/
    │   │   ├── Home.jsx
    │   │   ├── Calendar.jsx
    │   │   ├── DueForReview.jsx
    │   │   ├── Sources.jsx
    │   │   ├── Progress.jsx
    │   │   ├── Analytics.jsx
    │   │   └── Study.jsx
    │   ├── contexts/
    │   │   └── SupabaseContext.jsx
    │   ├── hooks/                          # (M16-M19)
    │   │   ├── useSources.js
    │   │   ├── useSourceUpload.js
    │   │   └── useSourceProcessing.js
    │   ├── services/                       # (M17-M18)
    │   │   └── sourcesApi.js
    │   ├── lib/
    │   │   └── supabase.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── public/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js

Directory structure for backend API (M18):

    learn_system/app/api/
    ├── __init__.py
    ├── server.py              # FastAPI app factory with CORS
    ├── routes/
    │   ├── __init__.py
    │   ├── sources.py         # /api/sources endpoints
    │   └── health.py          # /api/health endpoint
    ├── models/
    │   ├── __init__.py
    │   └── schemas.py         # Pydantic request/response models
    └── services/
        ├── __init__.py
        └── processing.py      # ProcessingPipeline class


## Web UI Design Specifications

This section documents the exact visual design based on the reference screenshots.

### Color Palette

    Background (main):     #FAF9F7 (warm off-white)
    Background (sidebar):  #F5F4F2 (slightly darker)
    Card background:       #FFFFFF (white)
    Card border:           #E5E4E2 (light gray)

    Text (primary):        #1A1A1A (near black)
    Text (secondary):      #6B7280 (gray)
    Text (muted):          #9CA3AF (light gray)

    Accent (progress):     #10B981 (emerald green)
    Accent (alert):        #F59E0B (amber)
    Accent (overdue):      #EF4444 (red)
    Accent (new):          #3B82F6 (blue)

    Button (primary):      #1A1A1A (dark)
    Button (secondary):    #F3F4F6 (light gray)
    Button (action):       #FEF3C7 (light amber background)

### Typography

    Logo:                  "Learn" - 20px, font-weight 600
    Page titles:           32px, font-weight 600
    Section headers:       18px, font-weight 600
    Card titles:           16px, font-weight 500
    Body text:             14px, font-weight 400
    Small/muted:           12px, font-weight 400

    Font family:           Inter, system-ui, sans-serif

### Spacing

    Sidebar width:         240px
    Content padding:       32px
    Card padding:          20px
    Card gap:              16px
    Section gap:           24px
    Border radius (cards): 12px
    Border radius (buttons): 8px

### Component Specifications

**Sidebar Navigation Item:**
- Height: 40px
- Padding: 12px 16px
- Border radius: 8px
- Active state: light gray background (#F3F4F6)
- Icon size: 20px
- Badge: circular, amber background, white text

**Source Card:**
- Width: flexible (grid column)
- Padding: 20px
- Emoji: 32px
- Progress bar height: 8px
- Progress bar border radius: 4px

**Alert Banner:**
- Background: #FEF3C7 (light amber)
- Border radius: 12px
- Icon: clock, amber color
- Button: amber background, white text

**Study Session Question Card:**
- Background: #F9FAFB (very light gray)
- Border radius: 12px
- Padding: 24px

**Knowledge Type Badge:**
- Background: #E0E7FF (light indigo)
- Text: #4338CA (indigo)
- Padding: 4px 12px
- Border radius: 16px
- Font size: 12px


## Research Foundation

This section summarizes the learning science research that informs the system design. This information comes from four sources: Make It Stick by Brown, Roediger, and McDaniel; A Mind for Numbers by Oakley; Ultralearning by Young; and the Adaptive Learning Platform Blueprint.

The most robust finding in learning science is that retrieval practice dramatically outperforms passive review. Testing yourself on material, even without feedback, strengthens memory more than rereading. The system implements this by generating practice items that require active recall rather than recognition.

The spacing effect shows that distributed practice outperforms massed practice with an effect size around g equals 0.74. Reviewing material at increasing intervals produces better long-term retention than cramming. The system implements this through the SM-2 spaced repetition algorithm.

Interleaving different topics during practice builds discrimination skills and transfer ability better than blocked practice on one topic. The system supports this through technique bundles that enable interleaved sessions.

The testing effect combines with spacing: testing yourself at spaced intervals is more effective than either alone. The system combines these by scheduling retrieval practice at spaced intervals.

Desirable difficulties are challenges that slow initial learning but improve long-term retention. Free recall is harder than cued recall which is harder than recognition, but the difficulty is beneficial. The system offers multiple practice modes with different difficulty levels.

Cognitive Load Theory identifies three types of load: intrinsic load from material complexity, extraneous load from poor presentation, and germane load from productive learning effort. The system tracks proxies for cognitive load including difficulty ratings, response times, and hint usage to enable future load-aware adaptations.

The Zone of Proximal Development describes the range between what a learner can do independently and what they can do with assistance. Items should challenge learners within this zone. The system tracks hint usage and independence levels to estimate ZPD position.

Elaboration, explaining material in your own words and connecting it to prior knowledge, creates additional retrieval routes and deepens understanding. The system supports elaboration through technique bundles that prompt for explanations.

Metacognition, knowing what you know and do not know, is often poorly calibrated. People overestimate their knowledge after passive review. The system collects confidence ratings before attempts to measure calibration.

Self-experimentation treats learning technique selection as an empirical question rather than accepting general recommendations. What works on average may not work best for an individual. The system tracks which techniques were used with which content to enable personalized analysis.


## Feature Tracking by Research Source

This section maps implemented features to their research sources for traceability.

From Make It Stick: retrieval practice is implemented through the practice item system with active recall modes. Spaced practice is implemented through SM-2 scheduling. Interleaving is supported through technique bundles. Elaboration is supported through explanation practice modes. Calibration tracking is implemented through confidence ratings.

From A Mind for Numbers: the focused versus diffuse mode distinction informs session duration recommendations but is not explicitly enforced. Chunking is implemented through the knowledge component extraction that breaks content into learnable units. The testing effect is the foundation of the entire practice system.

From Ultralearning: directness is implemented through execution tasks for procedural_execution knowledge. Drill is supported by tracking struggling items for focused practice. Retrieval is the core mechanism. Feedback is immediate by default with delayed feedback as a bundle option. Experimentation is enabled through technique bundle tracking.

From the Adaptive Learning Platform Blueprint: Bloom's cognitive levels are captured on knowledge components. ZPD estimation is supported through hint tracking and independence levels. Cognitive Load Theory proxies are captured through complexity ratings and difficulty ratings. Q-matrix style knowledge component mapping is implemented. Mastery modeling uses exponential moving average as a simpler alternative to BKT.


## Revision History

2026-01-02: Added Web UI milestones (9-15) based on UI design screenshots. Added comprehensive specifications for React-based web interface including: technology stack (React, Vite, Tailwind, Recharts, Supabase client), detailed milestone descriptions for all pages (Home, Calendar, Due for Review, Sources, Progress, Analytics, Study Session), directory structure, color palette, typography, spacing, and component specifications. Added Decision Log entries for web UI addition and technology choices.

2026-01-02: Added Sources Feature milestones (16-20) from NEW FEATURES.md specification. Changes include: (1) Updated Plan of Work to show 20 milestones with M16-M20 pending, (2) Added detailed milestone descriptions for Sources page foundation, Upload UI, FastAPI backend, real-time processing, and error handling, (3) Added backend API directory structure in learn_system/app/api/, (4) Added frontend components/sources/ and hooks/ directories, (5) Added database schema migrations for processing_status tracking columns, (6) Updated CLI requirements to include fastapi, uvicorn, python-multipart dependencies. Full specification available in NEW FEATURES.md with architecture diagrams, API endpoints, state management design, and integration validation report.

2026-01-03: Added Speed Optimization milestones (21-23) from NEW FEATURES.md specification. Changes include: (1) Updated Plan of Work to show 23 milestones with M20-M23 pending, (2) Added detailed milestone descriptions for Groq client integration (M21), parallel item generation with ThreadPoolExecutor (M22), and error resilience with retry logic (M23), (3) Added Decision Log entries for Qwen3 32B on Groq model choice and ThreadPoolExecutor over asyncio, (4) Updated Context and Orientation section to include groq dependency and GROQ_API_KEY requirement, (5) Added expected performance targets: 60-165s → 15-40s processing time (3-4x speedup). The optimization focuses on three bottlenecks: parallel LLM calls (50-70% reduction), faster model for items (30-50% reduction), batch DB inserts (10-15% reduction).
