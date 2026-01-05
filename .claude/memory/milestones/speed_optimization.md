# Speed Optimization Milestones Archive

**Last Updated:** 2026-01-04
**Summary:** Implementation details for M21-M23 (Groq, parallel processing, retry logic) plus bug fixes

## Quick Reference

- **Groq Model:** qwen/qwen3-32b (fast structured output for practice items)
- **KC Extraction:** Still uses Anthropic Claude (higher quality for analysis)
- **Parallelism:** ThreadPoolExecutor with MAX_LLM_WORKERS=5
- **Retry Logic:** Exponential backoff (1s, 2s, 4s), MAX_RETRIES=3
- **Performance:** ~35 seconds for 15 KCs, 45 items (vs ~3+ minutes before)

## Milestone Details

### Milestone 21: Groq Client and Batch Inserts (2026-01-03)

Speed foundation with faster LLM and efficient DB writes.

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

### Milestone 22: Parallel Practice Item Generation (2026-01-03)

ThreadPoolExecutor for concurrent LLM calls.

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

### Milestone 23: Error Resilience and Retry Logic (2026-01-03)

Automatic retry with exponential backoff.

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
- Note: Single .env file in project root (not in learn_system/) contains all API keys:
  - SUPABASE_URL, SUPABASE_KEY (no export prefix for python-dotenv)
  - VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY (with VITE_ prefix for web UI)
  - ANTHROPIC_API_KEY, GROQ_API_KEY
  - Python config.py updated to look in project root first
- **Testing completed (2026-01-03):**
  - CLI test: /tmp/speed_test.md → 15 KCs, 45 items in ~35 seconds
  - Web UI test: web_upload_test.md → 12 KCs, 33 items processed successfully
  - Parallel processing verified working with Groq qwen/qwen3-32b model
  - Batch inserts confirmed (2 HTTP calls for KCs+states instead of N*2)

## Bug Fixes and Polish (2026-01-03)

Issues discovered and fixed after M23.

### Delete Source 404 Bug

- **Issue:** Delete source returning 404 due to query builder bug in `processing.py`
- **Root Cause:** `get_source_status()` was passing Supabase query builder to `.in_()` instead of list
- **Error:** `'SyncSelectRequestBuilder' object is not iterable`
- **Fix:** Extract KC IDs into list first, then pass to `.in_()`

### Stuck Upload Detection

- **Issue:** Processing sources stuck for >30 min with no way to delete
- **Fix:** Added stuck upload detection (>30 minutes)
  - Processing sources stuck for >30 min show "Failed upload - use menu to delete"
  - Pending sources stuck for >30 min also detected (checks `ingested_at`)
  - Menu enabled for stuck sources so users can delete without API access

### Stale Sidebar Data

- **Issue:** Sidebar only loaded counts once on mount, never refreshed
- **Fix:** Added `sources` dependency to useEffect so sidebar refreshes after deletes

### Empty State UI Improvements

- Added "How it works" workflow with step numbers (1, 2, 3)
- Added arrows between steps to show flow
- Centered emojis and content in workflow boxes

## Cross-References

- Related decisions: decisions/technology.md (Groq choice, ThreadPoolExecutor rationale)
- Related schemas: schemas/api.md (processing status updates)
- Related milestones: milestones/sources_feature.md (processing pipeline foundation)
