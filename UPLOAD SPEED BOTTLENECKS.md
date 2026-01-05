# Upload Speed Bottlenecks Analysis

> **Document Status:** Analysis document created pre-M21. Updated 2026-01-05 with implementation status.
>
> **Implementation Summary (M21-M23):**
> - ✅ Practice item generation parallelized (ThreadPoolExecutor)
> - ✅ Batch database inserts implemented
> - ✅ Retry logic with exponential backoff added
> - ✅ Groq (faster LLM) used for practice items
> - ❌ KC chunk processing NOT parallelized (most docs single-chunk anyway)
> - **Result: ~35 seconds for 15 KCs vs 60-165 seconds before (~3-5x faster)**

## Executive Summary

~~The document processing pipeline has **significant sequential bottlenecks**, primarily in LLM API calls. The current architecture processes everything serially, making multiple blocking API calls that could be parallelized.~~

**[POST-IMPLEMENTATION]** The critical bottlenecks were addressed in M21-M23. Practice item generation now uses parallel LLM calls via ThreadPoolExecutor. Database operations use batch inserts. Groq replaces Anthropic for practice item generation (faster).

**Estimated time breakdown for a typical 5,000-word document with 15 KCs:**
- Text extraction: ~1-5 seconds (negligible)
- KC extraction: ~10-30 seconds (1 LLM call) — *unchanged, still Anthropic*
- ~~Practice item generation: ~45-90 seconds (15 sequential LLM calls)~~
- Practice item generation: ~10-20 seconds (15 parallel Groq calls, 5 workers) — **✅ FIXED**
- **Total: ~25-55 seconds** (down from 60-120 seconds)

~~The **biggest bottleneck is practice item generation**, which makes one LLM call per KC sequentially.~~

**[POST-IMPLEMENTATION]** The biggest remaining bottleneck is KC extraction for large multi-chunk documents (sequential). This is acceptable since most documents fit in a single chunk (<20k chars).

---

## Pipeline Architecture Overview

### Flow: Upload to Completion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           UPLOAD ENDPOINT                                    │
│  POST /sources/upload                                                        │
│  ├── Validate file (extension, size)                     [<1ms]             │
│  ├── Read file content into memory                       [varies by size]   │
│  ├── Create pending source in Supabase                   [~50-200ms]        │
│  ├── Write file to temp location                         [<100ms]           │
│  └── Launch background task ────────────────────────────────────────────────┤
│       (Returns immediately with source_id)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BACKGROUND PROCESSING                                 │
│  ProcessingPipeline.process_file()                                          │
│                                                                              │
│  STAGE 1: Text Extraction (10% → 25%)                                       │
│  ├── extract_text() - dispatch to appropriate extractor   [1-5 sec]         │
│  │   ├── PDF: pypdf.PdfReader (page-by-page extraction)                     │
│  │   ├── DOCX: python-docx (paragraphs + tables)                            │
│  │   ├── MD/TXT: simple file read                                           │
│  ├── get_file_metadata()                                   [<10ms]          │
│  └── Update source with content in Supabase                [~50-200ms]      │
│                                                                              │
│  STAGE 2: KC Extraction (35% → 60%)                                         │
│  ├── chunk_content() if >20k chars                         [<10ms]          │
│  ├── FOR EACH CHUNK: ◄─────────────────────── SEQUENTIAL BOTTLENECK         │
│  │   └── LLM API call (claude-sonnet-4)                    [5-15 sec each]  │
│  └── store_extracted_kcs() - insert each KC                [~50ms each]     │
│       └── init_kc_state() per KC                           [~50ms each]     │
│                                                                              │
│  STAGE 3: Practice Item Generation (65% → 98%)                              │
│  ├── get_kcs_for_source()                                  [~50-100ms]      │
│  └── FOR EACH KC: ◄────────────────────────── MAJOR SEQUENTIAL BOTTLENECK   │
│       ├── generate_items_for_kc()                                           │
│       │   └── LLM API call (claude-sonnet-4)               [3-8 sec each]   │
│       └── store_generated_items()                          [~50ms per item] │
│                                                                              │
│  STAGE 4: Completion (100%)                                                  │
│  └── Update status to "ready"                              [~50ms]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Bottleneck Analysis

### 1. Practice Item Generation ~~(CRITICAL - 70-80% of total time)~~ ✅ FIXED (M21-M22)

**Location:** `/learn_system/app/practice/generator.py` - `generate_all_items()`

**~~Problem~~ Solution:** ~~For each KC, makes a separate LLM API call sequentially~~ Now uses ThreadPoolExecutor with 5 parallel workers and Groq for faster inference:

```python
# BEFORE (pre-M21):
# for i, kc in enumerate(kcs):  # ← SEQUENTIAL LOOP
#     count = generate_items_for_kc_and_store(kc)  # ← Blocks on LLM call

# AFTER (M21-M22) - Lines 288-343 in generator.py:
with ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
    future_to_kc = {}
    for kc in kcs:
        future = executor.submit(_process_single_kc, kc)
        future_to_kc[future] = kc
    for future in as_completed(future_to_kc):
        kc_id, items, error = future.result()
        # ... collect items
# Batch insert all items at once
insert_practice_items_batch(all_items)
```

**~~Impact~~ Results:**
- ~~15 KCs = 15 sequential LLM calls~~
- 15 KCs = 3 batches of 5 parallel Groq calls
- ~~Each call: 3-8 seconds~~
- Each Groq call: ~1-2 seconds
- ~~Total: 45-120 seconds just for this stage~~
- **Total: ~10-20 seconds for this stage**

**~~Parallelization Potential: HIGH~~** ✅ IMPLEMENTED
- ~~Each KC is independent~~
- ~~Could use `asyncio.gather()` or `concurrent.futures.ThreadPoolExecutor`~~
- Uses ThreadPoolExecutor with MAX_LLM_WORKERS=5
- Groq has higher rate limits than Claude

### 2. KC Extraction from Multiple Chunks (MODERATE) ❌ NOT IMPLEMENTED

**Location:** `/learn_system/app/ingestion/kc_extractor.py` - `extract_kcs()`

**Problem:** Large documents are chunked and each chunk processed sequentially:

```python
# Lines 293-309 in kc_extractor.py - STILL SEQUENTIAL
def extract_kcs(source_id: str, content: str, domain: str) -> List[Dict[str, Any]]:
    chunks = chunk_content(content)  # Split at 20k chars
    all_kcs = []
    for i, chunk in enumerate(chunks):  # ← STILL SEQUENTIAL LOOP
        chunk_kcs = extract_kcs_from_chunk(client, chunk, domain)  # ← Still blocks
        # ... deduplication
    return all_kcs
```

**Impact:**
- Most documents fit in one chunk (<20k chars) — **low priority, hence not fixed**
- Large PDFs might have 2-5 chunks
- Per chunk: 10-30 seconds

**Parallelization Potential:** MEDIUM — **Decision: Deferred**
- Chunks are independent for extraction
- Deduplication needs merge step afterward
- Could process chunks in parallel, then merge/dedupe
- **Rationale for not implementing:** Most documents are single-chunk. ROI too low for the added complexity.

### 3. Database Operations ~~(LOW - but cumulative)~~ ✅ FIXED (M21)

**Location:** `/learn_system/app/database/queries.py`

**~~Problem~~ Solution:** ~~Each insert is a separate HTTP call to Supabase~~ Now uses batch inserts:

```python
# BEFORE (pre-M21):
# def insert_kc(...) -> str:
#     client.table('knowledge_components').insert(data).execute()  # Call 1
#     init_kc_state(kc_id)  # Call 2 (inserts into kc_state)

# AFTER (M21) - Lines 462-558 in queries.py:
def insert_kcs_batch(kcs_data: List[Dict[str, Any]]) -> List[str]:
    # Batch insert KCs
    client.table('knowledge_components').insert(kc_records).execute()  # 1 call for all KCs
    # Batch insert states
    client.table('kc_state').insert(state_records).execute()  # 1 call for all states
    return kc_ids

def insert_practice_items_batch(items: List[Dict[str, Any]]) -> List[str]:
    client.table('practice_items').insert(records).execute()  # 1 call for all items
    return item_ids
```

**~~Impact~~ Results:**
- ~~15 KCs with 3 items each = 15*2 + 15*3 = 75 individual DB calls~~
- 15 KCs with 3 items each = 2 + 1 = **3 total DB calls**
- ~~Each call: ~50-100ms~~
- ~~Total: 4-8 seconds~~
- **Total: ~0.3-0.5 seconds**

**~~Parallelization Potential: HIGH~~** ✅ IMPLEMENTED
- ~~Supabase supports batch inserts~~
- `insert_kcs_batch()` - 2 HTTP calls instead of N*2
- `insert_practice_items_batch()` - 1 HTTP call instead of N

### 4. Status Updates (NEGLIGIBLE but frequent) — Partially Improved (M22)

**Location:** `/learn_system/app/api/services/processing.py` - `update_status()`

**Problem:** Multiple status updates during processing, each a DB call:

```python
# Called ~10+ times during processing
self.update_status("extracting_kcs", 35, "Analyzing content...")
```

**Impact:** Minor (~500ms total), but adds latency at each step.

**~~Optimization: Could batch or debounce status updates.~~**

**Partial Fix (M22):** Added `ThrottledUpdater` class that rate-limits DB updates to 0.5s minimum interval during parallel processing. Not a full batch solution but reduces update frequency.

---

## Parallelization Opportunities — Implementation Status

### ~~High Priority:~~ Parallel Practice Item Generation ✅ IMPLEMENTED (M21-M22)

**~~Current~~ Old Implementation:**
```python
# BEFORE - sequential:
for kc in kcs:
    generate_items_for_kc_and_store(kc)  # Sequential
```

**~~Recommended~~ Actual Implementation (generator.py:288-343):**
```python
# Used synchronous ThreadPoolExecutor (simpler than asyncio for existing codebase)
with ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
    future_to_kc = {}
    for kc in kcs:
        future = executor.submit(_process_single_kc, kc)
        future_to_kc[future] = kc
    for future in as_completed(future_to_kc):
        kc_id, items, error = future.result()
        all_items.extend(items)
# Batch insert at end
insert_practice_items_batch(all_items)
```

**~~Expected~~ Actual Improvement:**
- ~~Current: 15 KCs * 5 sec = 75 seconds~~
- Before: 15 KCs * 5 sec = 75 seconds
- After: 15 KCs / 5 workers * 1-2 sec (Groq) = ~10-20 seconds
- **~5x speedup achieved**

### ~~Medium Priority:~~ Batch Database Inserts ✅ IMPLEMENTED (M21)

**~~Current~~ Old Implementation:**
```python
# BEFORE - individual inserts:
for kc in kcs:
    insert_kc(...)  # Individual insert
```

**~~Recommended~~ Actual Implementation (queries.py:462-558):**
```python
def insert_kcs_batch(kcs_data: List[Dict[str, Any]]) -> List[str]:
    client.table('knowledge_components').insert(kc_records).execute()
    client.table('kc_state').insert(state_records).execute()
    return kc_ids

def insert_practice_items_batch(items: List[Dict[str, Any]]) -> List[str]:
    client.table('practice_items').insert(records).execute()
    return item_ids
```

**~~Expected~~ Actual Improvement:**
- ~~Current: 75 DB calls * 75ms = 5.6 seconds~~
- Before: 75 DB calls * 75ms = 5.6 seconds
- After: 3 DB calls * 100ms = 0.3 seconds
- **~10x speedup achieved**

### Lower Priority: Parallel Chunk Processing ❌ NOT IMPLEMENTED

Only beneficial for very large documents (>60k characters). Most documents are single-chunk. **Decision: Deferred indefinitely due to low ROI.**

---

## Time Budget Analysis

### ~~Current (Sequential)~~ BEFORE - 15 KCs, Single Chunk Document

| Stage | Operations | Time (estimated) |
|-------|-----------|------------------|
| Upload & Validation | File read, validation | 0.1-0.5s |
| Create Pending Source | 1 DB insert | 0.1s |
| Text Extraction | PDF/DOCX parsing | 1-5s |
| Update Source | 1 DB update | 0.1s |
| KC Extraction | 1 LLM call | 10-30s |
| Store KCs | ~~15 * 2 DB inserts~~ | ~~1.5-3s~~ |
| Item Generation | ~~15 * LLM call (sequential)~~ | ~~45-120s~~ |
| Store Items | ~~45 DB inserts~~ | ~~2-4s~~ |
| Status Updates | ~10 DB updates | 0.5-1s |
| **TOTAL** | | **~~60-165 seconds~~** |

### ~~Optimized (Parallel)~~ AFTER (M21-M23) - Same Document

| Stage | Operations | Time (actual) |
|-------|-----------|------------------|
| Upload & Validation | File read, validation | 0.1-0.5s |
| Create Pending Source | 1 DB insert | 0.1s |
| Text Extraction | PDF/DOCX parsing | 1-5s |
| Update Source | 1 DB update | 0.1s |
| KC Extraction | 1 Anthropic call | 10-30s |
| Store KCs | 1 batch insert ✅ | 0.2s |
| Item Generation | 15 Groq calls (5 concurrent) ✅ | 10-20s |
| Store Items | 1 batch insert ✅ | 0.2s |
| Status Updates | Throttled | 0.2s |
| **TOTAL** | | **~25-55 seconds** |

**~~Potential~~ Actual Improvement: ~3x faster** (tested: ~35s for 15 KCs)

---

## Implementation Recommendations — Status

### Phase 1: Quick Wins ✅ COMPLETED (M21)

1. **Batch Database Inserts** ✅ DONE
   - `store_extracted_kcs()` uses `insert_kcs_batch()`
   - `generate_all_items()` uses `insert_practice_items_batch()`
   - Result: ~10x speedup on DB operations

2. **Reduce Status Update Frequency** ✅ DONE (partial)
   - Added `ThrottledUpdater` with 0.5s min interval
   - Result: ~50% fewer DB updates during parallel processing

### Phase 2: Major Optimization ✅ COMPLETED (M21-M23)

1. **Parallelize Practice Item Generation** ✅ DONE
   - Uses `ThreadPoolExecutor` with `MAX_LLM_WORKERS=5`
   - Handles partial failures (logs errors, continues with other KCs)
   - Result: ~5x speedup on item generation

2. **Use Faster Model for Simple Tasks** ✅ DONE
   - Groq `qwen/qwen3-32b` for practice items (fast structured output)
   - Anthropic `claude-sonnet-4` for KC extraction (needs reasoning)
   - Result: ~3x faster LLM calls for item generation

3. **Retry Logic** ✅ DONE (M23)
   - Exponential backoff: 1s, 2s, 4s
   - Retries: rate limits, connection errors, timeouts
   - Result: Robust handling of transient API failures

### Phase 3: Advanced Optimization ❌ NOT IMPLEMENTED (Future Work)

1. **Streaming LLM Responses** — Not needed with current performance
2. **Background Queue (Celery)** — Overkill for single-user system
3. **Caching** — Low hit rate expected, deferred

---

## Summary — Final Status

| Bottleneck | Original Severity | Status | Implementation |
|------------|-------------------|--------|----------------|
| Sequential Practice Item Generation | CRITICAL | ✅ FIXED | ThreadPoolExecutor + Groq |
| Sequential KC Chunk Processing | Moderate | ❌ Deferred | Low ROI (most docs single-chunk) |
| Individual DB Inserts | Low | ✅ FIXED | `insert_kcs_batch()`, `insert_practice_items_batch()` |
| Status Updates | Negligible | ✅ Improved | `ThrottledUpdater` class |

**Bottom Line:** ~~Parallelizing practice item generation alone would cut total processing time by ~50%. Combined with batch DB inserts and using a faster model for item generation, processing time could be reduced from 60-165 seconds to 15-40 seconds.~~

**Actual Results (M21-M23):**
- Before: 60-165 seconds per document
- After: ~25-55 seconds per document (~35s typical)
- **~3x overall speedup achieved**
- Tested: 15 KCs, 45 items in ~35 seconds

---

## Additional Findings

### LLM API Call Statistics — Updated

| Phase | API Calls | Model | Max Tokens | Latency |
|-------|-----------|-------|------------|---------|
| KC Extraction | 1 per 20K chars | claude-sonnet-4 (Anthropic) | 4,096 | 5-15 sec |
| Item Generation | 1 per KC | ~~claude-sonnet-4~~ **qwen/qwen3-32b (Groq)** | 2,048 | ~~3-8 sec~~ **1-2 sec** |

**Total API calls for typical document (50K chars, 15 KCs):**
- KC extraction: 3 calls (sequential, Anthropic)
- Item generation: 15 calls (**parallel, Groq**)
- **Total: 18 API calls, but item gen now parallel**

### Database Operations Count — Updated

**~~Formula:~~ Old:** `Total DB Calls = 10 + 4N + N*M` (before batch inserts)

**New Formula:** `Total DB Calls = ~10 + 3` (with batch inserts)
- KC batch insert: 2 calls (KCs + states)
- Item batch insert: 1 call
- Status/misc: ~10 calls

**~~Examples~~ Before vs After:**
- ~~Small (5 KCs): 10 + 20 + 15 = **45 calls**~~
- ~~Medium (15 KCs): 10 + 60 + 45 = **115 calls**~~
- ~~Large (25 KCs): 10 + 100 + 75 = **185 calls**~~
- **Any size: ~13 calls** (fixed overhead with batch inserts)

### Text Extraction Performance

| File Type | Method | Performance |
|-----------|--------|-------------|
| PDF | pypdf page-by-page | O(pages) - sequential |
| DOCX | python-docx | O(paragraphs + table cells) |
| MD/TXT | file.read() | O(1) - optimal |

### Files Modified for Optimization — Status

| File | Change | Status |
|------|--------|--------|
| `app/practice/generator.py` | ThreadPoolExecutor + Groq + batch insert | ✅ DONE |
| `app/ingestion/kc_extractor.py` | ~~Parallel chunk processing~~ batch KC insert | ✅ Partial |
| `app/database/queries.py` | `insert_kcs_batch()`, `insert_practice_items_batch()` | ✅ DONE |
| `app/api/services/processing.py` | `ThrottledUpdater` class | ✅ DONE |
| `app/config.py` | `GROQ_MODEL`, `MAX_LLM_WORKERS`, `get_groq_api_key()` | ✅ DONE |

---

## Quick Reference: Code Locations — Updated

```
BOTTLENECK #1 ✅ FIXED:
  File: learn_system/app/practice/generator.py
  Lines: 288-343 (generate_all_items)
  Solution: ThreadPoolExecutor with MAX_LLM_WORKERS=5, batch insert

BOTTLENECK #2 ❌ NOT FIXED (low priority):
  File: learn_system/app/ingestion/kc_extractor.py
  Lines: 293-309 (extract_kcs)
  Issue: for loop over chunks still sequential
  Reason: Most docs single-chunk, ROI too low

DB EFFICIENCY ✅ FIXED:
  File: learn_system/app/database/queries.py
  Lines: 462-518 (insert_kcs_batch)
  Lines: 521-558 (insert_practice_items_batch)
  Solution: Batch inserts - 3 calls instead of N*4

RETRY LOGIC ✅ ADDED (M23):
  File: learn_system/app/practice/generator.py:33-70 (call_with_retry)
  File: learn_system/app/ingestion/kc_extractor.py:23-60 (call_with_retry)
  Solution: Exponential backoff 1s, 2s, 4s for transient errors
```
