# Implementation Patterns

**Last Updated:** 2026-01-04
**Summary:** Reusable patterns and conventions used across the codebase

## Batch Database Inserts

**Pattern:** Collect all items, then single batch insert.

**Location:** `app/database/queries.py`

**Functions:**
- `insert_kcs_batch()`: 2 HTTP calls instead of N*2 (KCs + states)
- `insert_practice_items_batch()`: 1 HTTP call instead of N

**Usage:**
```python
# Collect all items
all_items = []
for kc in kcs:
    items = generate_items_for_kc(kc)
    all_items.extend(items)

# Single batch insert at the end
insert_practice_items_batch(all_items)
```

**Benefit:** Reduces N database round-trips to 1-2.

## Progress Callbacks

**Pattern:** Pass callback function to long-running operations for status updates.

**Location:** `app/ingestion/ingest.py`, `app/api/services/processing.py`

**Usage:**
```python
def ingest_document(file_path, progress_callback=None):
    if progress_callback:
        progress_callback("extracting_text", 10)
    # ... extraction logic ...
    if progress_callback:
        progress_callback("extracting_kcs", 40)
```

**Benefit:** Enables real-time UI updates without coupling to specific UI.

## Retry with Exponential Backoff

**Pattern:** Wrap API calls in retry logic with increasing delays.

**Location:** `app/practice/generator.py`, `app/ingestion/kc_extractor.py`

**Implementation:**
```python
def call_with_retry(fn, max_retries=3):
    delays = [1, 2, 4]  # seconds
    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as e:
            if is_retryable(e) and attempt < max_retries:
                time.sleep(delays[attempt])
            else:
                raise
```

**Retryable errors:** ratelimit, rate_limit, connection, timeout, overloaded, apiconnection

## Thread-Safe Progress Tracking

**Pattern:** Use Lock for counting in parallel operations.

**Location:** `app/api/services/processing.py`

**Classes:**
- `ProgressTracker`: Thread-safe counter with Lock
- `ThrottledUpdater`: Rate-limits DB updates (0.5s min interval)

**Usage:**
```python
tracker = ProgressTracker()
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(process_item, item) for item in items]
    for future in as_completed(futures):
        tracker.increment()
```

## ID Generation

**Pattern:** Prefix-based unique IDs for easy identification.

**Location:** `app/database/utils.py`

**Function:** `generate_id(prefix)`

**Examples:**
- `src_abc123` - content sources
- `kc_def456` - knowledge components
- `item_ghi789` - practice items
- `session_jkl012` - study sessions

## Environment Configuration

**Pattern:** Single .env file in project root for all services.

**Location:** Project root `.env`

**Variables:**
```
# Python (no export prefix for python-dotenv)
SUPABASE_URL=...
SUPABASE_KEY=...
ANTHROPIC_API_KEY=...
GROQ_API_KEY=...

# Vite (VITE_ prefix required)
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

**Note:** Python config.py looks in project root first (not learn_system/).

## Supabase Realtime + Polling Fallback

**Pattern:** Always combine Realtime subscription with polling.

**Location:** `web/src/hooks/useSourceProcessing.js`

**Rationale:** Realtime can fail silently; polling ensures reliable updates.

**Implementation:**
```javascript
// Subscribe to Realtime
supabase.channel('sources').on('postgres_changes', {...}).subscribe()

// Also poll every 2 seconds
const interval = setInterval(fetchStatus, 2000)
```

## Cross-References

- Related decisions: `decisions/technology.md` (ThreadPoolExecutor rationale)
- Related milestones: `milestones/speed_optimization.md` (retry, parallel patterns)
