# Upload Speed Bottlenecks Analysis

## Executive Summary

The document processing pipeline has **significant sequential bottlenecks**, primarily in LLM API calls. The current architecture processes everything serially, making multiple blocking API calls that could be parallelized.

**Estimated time breakdown for a typical 5,000-word document with 15 KCs:**
- Text extraction: ~1-5 seconds (negligible)
- KC extraction: ~10-30 seconds (1 LLM call)
- Practice item generation: ~45-90 seconds (15 sequential LLM calls)
- **Total: ~60-120 seconds**

The **biggest bottleneck is practice item generation**, which makes one LLM call per KC sequentially.

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

### 1. Practice Item Generation (CRITICAL - 70-80% of total time)

**Location:** `/learn_system/app/practice/generator.py` - `generate_all_items()`

**Problem:** For each KC, makes a separate LLM API call sequentially:

```python
# Lines 193-216 in generator.py
def generate_all_items(source_id: str, progress_callback=None) -> int:
    kcs = get_kcs_for_source(source_id)
    total_items = 0
    for i, kc in enumerate(kcs):  # ← SEQUENTIAL LOOP
        count = generate_items_for_kc_and_store(kc)  # ← Blocks on LLM call
        total_items += count
    return total_items
```

**Impact:**
- 15 KCs = 15 sequential LLM calls
- Each call: 3-8 seconds
- Total: 45-120 seconds just for this stage

**Parallelization Potential:** HIGH
- Each KC is independent
- Could use `asyncio.gather()` or `concurrent.futures.ThreadPoolExecutor`
- Limited by API rate limits (typically 50-100 requests/minute for Claude)

### 2. KC Extraction from Multiple Chunks (MODERATE)

**Location:** `/learn_system/app/ingestion/kc_extractor.py` - `extract_kcs()`

**Problem:** Large documents are chunked and each chunk processed sequentially:

```python
# Lines 221-257 in kc_extractor.py
def extract_kcs(source_id: str, content: str, domain: str) -> List[Dict[str, Any]]:
    chunks = chunk_content(content)  # Split at 20k chars
    all_kcs = []
    for i, chunk in enumerate(chunks):  # ← SEQUENTIAL LOOP
        chunk_kcs = extract_kcs_from_chunk(client, chunk, domain)  # ← Blocks
        # ... deduplication
    return all_kcs
```

**Impact:**
- Most documents fit in one chunk (<20k chars)
- Large PDFs might have 2-5 chunks
- Per chunk: 10-30 seconds

**Parallelization Potential:** MEDIUM
- Chunks are independent for extraction
- Deduplication needs merge step afterward
- Could process chunks in parallel, then merge/dedupe

### 3. Database Operations (LOW - but cumulative)

**Location:** `/learn_system/app/database/queries.py`

**Problem:** Each insert is a separate HTTP call to Supabase:

```python
# insert_kc calls init_kc_state - 2 DB calls per KC
def insert_kc(...) -> str:
    client.table('knowledge_components').insert(data).execute()  # Call 1
    init_kc_state(kc_id)  # Call 2 (inserts into kc_state)
    return kc_id

# insert_practice_item - 1 call per item (3 items per KC = 3 calls per KC)
def insert_practice_item(...) -> str:
    client.table('practice_items').insert(data).execute()
    return item_id
```

**Impact:**
- 15 KCs with 3 items each = 15*2 + 15*3 = 75 individual DB calls
- Each call: ~50-100ms
- Total: 4-8 seconds

**Parallelization Potential:** HIGH
- Supabase supports batch inserts
- Could collect all KCs/items and insert in single call
- Example: `client.table('practice_items').insert([item1, item2, ...]).execute()`

### 4. Status Updates (NEGLIGIBLE but frequent)

**Location:** `/learn_system/app/api/services/processing.py` - `update_status()`

**Problem:** Multiple status updates during processing, each a DB call:

```python
# Called ~10+ times during processing
self.update_status("extracting_kcs", 35, "Analyzing content...")
```

**Impact:** Minor (~500ms total), but adds latency at each step.

**Optimization:** Could batch or debounce status updates.

---

## Parallelization Opportunities

### High Priority: Parallel Practice Item Generation

**Current Implementation:**
```python
for kc in kcs:
    generate_items_for_kc_and_store(kc)  # Sequential
```

**Recommended Implementation:**
```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def generate_all_items_parallel(source_id: str, max_concurrent: int = 5):
    kcs = get_kcs_for_source(source_id)

    with ThreadPoolExecutor(max_workers=max_concurrent) as executor:
        loop = asyncio.get_event_loop()
        tasks = [
            loop.run_in_executor(executor, generate_items_for_kc_and_store, kc)
            for kc in kcs
        ]
        results = await asyncio.gather(*tasks)

    return sum(results)
```

**Expected Improvement:**
- Current: 15 KCs * 5 sec = 75 seconds
- With 5 concurrent: 15 KCs / 5 workers * 5 sec = 15 seconds
- **5x speedup on the slowest stage**

### Medium Priority: Batch Database Inserts

**Current Implementation:**
```python
for kc in kcs:
    insert_kc(...)  # Individual insert
```

**Recommended Implementation:**
```python
def batch_insert_kcs(kcs: List[dict]) -> List[str]:
    client = get_client()
    data = [format_kc_data(kc) for kc in kcs]
    client.table('knowledge_components').insert(data).execute()

    # Batch insert states
    states = [format_state_data(kc['id']) for kc in kcs]
    client.table('kc_state').insert(states).execute()
```

**Expected Improvement:**
- Current: 75 DB calls * 75ms = 5.6 seconds
- With batching: 4-6 calls * 100ms = 0.5 seconds
- **10x speedup on DB operations**

### Lower Priority: Parallel Chunk Processing

Only beneficial for very large documents (>60k characters). Most documents are single-chunk.

---

## Time Budget Analysis

### Current (Sequential) - 15 KCs, Single Chunk Document

| Stage | Operations | Time (estimated) |
|-------|-----------|------------------|
| Upload & Validation | File read, validation | 0.1-0.5s |
| Create Pending Source | 1 DB insert | 0.1s |
| Text Extraction | PDF/DOCX parsing | 1-5s |
| Update Source | 1 DB update | 0.1s |
| KC Extraction | 1 LLM call | 10-30s |
| Store KCs | 15 * 2 DB inserts | 1.5-3s |
| Item Generation | 15 * LLM call (sequential) | 45-120s |
| Store Items | 45 DB inserts | 2-4s |
| Status Updates | ~10 DB updates | 0.5-1s |
| **TOTAL** | | **60-165 seconds** |

### Optimized (Parallel) - Same Document

| Stage | Operations | Time (estimated) |
|-------|-----------|------------------|
| Upload & Validation | File read, validation | 0.1-0.5s |
| Create Pending Source | 1 DB insert | 0.1s |
| Text Extraction | PDF/DOCX parsing | 1-5s |
| Update Source | 1 DB update | 0.1s |
| KC Extraction | 1 LLM call | 10-30s |
| Store KCs | 1 batch insert | 0.2s |
| Item Generation | 15 LLM calls (5 concurrent) | 15-40s |
| Store Items | 1 batch insert | 0.2s |
| Status Updates | Batched | 0.2s |
| **TOTAL** | | **27-76 seconds** |

**Potential Improvement: 2-3x faster**

---

## Implementation Recommendations

### Phase 1: Quick Wins (Estimated: 2-4 hours)

1. **Batch Database Inserts**
   - Modify `store_extracted_kcs()` to use batch insert
   - Modify `store_generated_items()` to use batch insert
   - Expected: 10-15% overall time reduction

2. **Reduce Status Update Frequency**
   - Update every 5 KCs instead of every KC
   - Expected: 1-2% overall time reduction

### Phase 2: Major Optimization (Estimated: 4-8 hours)

1. **Parallelize Practice Item Generation**
   - Add `asyncio` or `ThreadPoolExecutor` to `generate_all_items()`
   - Implement rate limiting (respect Claude API limits)
   - Handle partial failures gracefully
   - Expected: 50-70% reduction in item generation time

2. **Use Faster Model for Simple Tasks**
   - Consider `claude-3-haiku` for practice item generation (much faster)
   - Keep `claude-sonnet-4` for KC extraction (needs more reasoning)
   - Expected: 30-50% reduction in LLM latency

### Phase 3: Advanced Optimization (Estimated: 8-16 hours)

1. **Streaming LLM Responses**
   - Process and store items as they stream in
   - Provides earlier progress feedback

2. **Background Queue with Priority**
   - Use Celery or similar for robust background processing
   - Allow multiple documents to process in parallel
   - Implement retry logic for failed LLM calls

3. **Caching**
   - Cache similar KC extractions (content hash)
   - Pre-generate common practice item templates

---

## Summary

| Bottleneck | Severity | Current Impact | Parallelizable | Fix Effort |
|------------|----------|----------------|----------------|------------|
| Sequential Practice Item Generation | CRITICAL | 70-80% of time | Yes | Medium |
| Sequential KC Chunk Processing | Moderate | 10-20% for large docs | Yes | Low |
| Individual DB Inserts | Low | 5-10% of time | Yes (batch) | Low |
| Status Updates | Negligible | 1-2% of time | N/A | Low |

**Bottom Line:** Parallelizing practice item generation alone would cut total processing time by ~50%. Combined with batch DB inserts and using a faster model for item generation, processing time could be reduced from 60-165 seconds to 15-40 seconds.

---

## Additional Findings

### LLM API Call Statistics

| Phase | API Calls | Model | Max Tokens | Latency |
|-------|-----------|-------|------------|---------|
| KC Extraction | 1 per 20K chars | claude-sonnet-4 | 4,096 | 5-15 sec |
| Item Generation | 1 per KC | claude-sonnet-4 | 2,048 | 3-8 sec |

**Total API calls for typical document (50K chars, 15 KCs):**
- KC extraction: 3 calls
- Item generation: 15 calls
- **Total: 18 sequential API calls**

### Database Operations Count

**Formula:** `Total DB Calls = 10 + 4N + N*M`
- N = number of KCs
- M = items per KC (typically 3)

**Examples:**
- Small (5 KCs): 10 + 20 + 15 = **45 calls**
- Medium (15 KCs): 10 + 60 + 45 = **115 calls**
- Large (25 KCs): 10 + 100 + 75 = **185 calls**

### Text Extraction Performance

| File Type | Method | Performance |
|-----------|--------|-------------|
| PDF | pypdf page-by-page | O(pages) - sequential |
| DOCX | python-docx | O(paragraphs + table cells) |
| MD/TXT | file.read() | O(1) - optimal |

### Files to Modify for Optimization

| File | Change | Priority |
|------|--------|----------|
| `app/practice/generator.py` | ThreadPoolExecutor for parallel item gen | HIGH |
| `app/ingestion/kc_extractor.py` | Parallel chunk processing | MEDIUM |
| `app/database/queries.py` | Batch insert functions | MEDIUM |
| `app/api/services/processing.py` | Reduce status update frequency | LOW |
| `app/config.py` | Add model selection options | LOW |

---

## Quick Reference: Code Locations

```
SEQUENTIAL BOTTLENECK #1 (CRITICAL):
  File: learn_system/app/practice/generator.py
  Lines: 193-216 (generate_all_items)
  Issue: for loop over KCs with blocking LLM calls

SEQUENTIAL BOTTLENECK #2 (MODERATE):
  File: learn_system/app/ingestion/kc_extractor.py
  Lines: 239-255 (extract_kcs)
  Issue: for loop over chunks with blocking LLM calls

DB INEFFICIENCY #1:
  File: learn_system/app/database/queries.py
  Lines: 85-110 (insert_kc)
  Issue: Individual inserts instead of batch

DB INEFFICIENCY #2:
  File: learn_system/app/practice/generator.py
  Lines: 139-165 (store_generated_items)
  Issue: Individual inserts instead of batch
```
