# Speed Optimization Implementation Plan

**Status:** Research Complete | Ready for Implementation
**Last Updated:** 2026-01-03
**Target:** Reduce processing time from 60-165s to 15-40s (~3-4x speedup)

---

## Executive Summary

The document processing pipeline has sequential bottlenecks, primarily in LLM API calls. Three optimizations provide the biggest gains:

| Optimization | Impact | Effort |
|--------------|--------|--------|
| Parallel item generation | 50-70% time reduction | Medium |
| Faster model for items | 30-50% LLM latency reduction | Low |
| Batch DB inserts | 10-15% time reduction | Low |

---

## 1. Parallel Practice Item Generation

**File:** `learn_system/app/practice/generator.py`
**Problem:** 15 KCs × 5 sec/each = 75 seconds (sequential)
**Solution:** ThreadPoolExecutor with 5 workers = 15 seconds (parallel)

### Implementation

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

MAX_LLM_WORKERS = int(os.getenv('MAX_LLM_WORKERS', '5'))

def _process_single_kc(kc: dict) -> tuple[str, int, str | None]:
    """Process single KC. Returns (kc_id, item_count, error_or_none)."""
    try:
        existing = get_items_for_kc(kc['id'])
        if existing:
            return (kc['id'], len(existing), None)
        items = generate_items_for_kc(kc)
        if items:
            store_generated_items(kc['id'], items)
        return (kc['id'], len(items), None)
    except Exception as e:
        return (kc['id'], 0, str(e))

def generate_all_items(source_id: str, progress_callback=None) -> int:
    """Generate items for all KCs using parallel LLM calls."""
    kcs = get_kcs_for_source(source_id)
    if not kcs:
        return 0

    total_items = 0
    completed = 0
    errors = []

    with ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
        future_to_kc = {executor.submit(_process_single_kc, kc): kc for kc in kcs}

        for future in as_completed(future_to_kc):
            completed += 1
            kc_id, count, error = future.result()
            total_items += count
            if error:
                errors.append(error)
            if progress_callback:
                progress_callback(f"Completed {completed}/{len(kcs)} KCs")

    return total_items
```

**Why ThreadPoolExecutor over asyncio:**
- Existing code is synchronous
- Anthropic SDK sync client already in use
- LLM calls are I/O-bound, GIL doesn't block during network waits

---

## 2. Faster Model for Item Generation

**Files:** `learn_system/app/config.py`, `learn_system/app/practice/generator.py`

### Model Comparison

| Metric | Claude 3.5 Haiku | Qwen3 32B (Groq) |
|--------|------------------|------------------|
| Input | $1.00/M | $0.29/M |
| Output | $5.00/M | $0.59/M |
| Speed | 4-5x Sonnet | 662 TPS |
| Context | 200K | 131K |

### Why Qwen3 32B on Groq

1. **Template-following tasks** — Item generation is "low reasoning needed." Qwen3 32B handles structured output well.
2. **Speed** — 662 TPS on Groq's LPU infrastructure (3-5x faster than alternatives).
3. **Cost** — 70% cheaper on input, 88% cheaper on output compared to Haiku.

### Rationale

| Task | Reasoning Needed | Model | Provider |
|------|------------------|-------|----------|
| KC Extraction | High (concept identification, classification) | claude-sonnet-4 | Anthropic |
| Item Generation | Low (template-following) | qwen-qwq-32b | Groq |

### Implementation

**config.py:**
```python
# Anthropic for complex reasoning tasks
ANTHROPIC_MODEL_REASONING: str = "claude-sonnet-4-20250514"

# Groq for fast structured generation
GROQ_MODEL_FAST: str = "qwen-qwq-32b"
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
```

**generator.py — Add Groq client:**
```python
from groq import Groq

def get_groq_client():
    return Groq(api_key=GROQ_API_KEY)

def generate_items_for_kc(kc: dict) -> list[dict]:
    client = get_groq_client()
    response = client.chat.completions.create(
        model=GROQ_MODEL_FAST,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2048
    )
    # Parse response...
```

**Dependencies:**
```bash
pip install groq
```

**Expected Impact:** 3-8s → <1s per item generation call

**Fallback:** If Groq quality is insufficient, Llama 3.1 8B ($0.05/$0.08, 840 TPS) is worth testing.

---

## 3. Batch Database Inserts

**File:** `learn_system/app/database/queries.py`
**Problem:** 75+ individual HTTP calls to Supabase
**Solution:** 3 batch calls (KCs, states, items)

### Implementation

```python
def insert_kcs_batch(kcs_data: list[dict]) -> list[str]:
    """Batch insert KCs and their states."""
    if not kcs_data:
        return []

    client = get_client()
    kc_ids = []
    kc_records = []
    state_records = []

    for kc in kcs_data:
        kc_id = generate_id('kc')
        kc_ids.append(kc_id)
        kc_records.append({
            'id': kc_id,
            'source_id': kc['source_id'],
            'name': kc['name'],
            'description': kc['description'],
            'knowledge_type': kc['knowledge_type'],
            'cognitive_level': kc['cognitive_level'],
            'intrinsic_complexity': kc['intrinsic_complexity'],
            'domain': kc['domain'],
            'source_excerpt': kc.get('source_excerpt'),
            'metadata': kc.get('metadata', {})
        })
        state_records.append({
            'kc_id': kc_id,
            'mastery_level': 0.0,
            'exposure_count': 0,
            'current_interval_days': 1.0,
            'easiness_factor': 2.5
        })

    client.table('knowledge_components').insert(kc_records).execute()
    client.table('kc_state').insert(state_records).execute()
    return kc_ids

def insert_practice_items_batch(items: list[dict]) -> list[str]:
    """Batch insert practice items."""
    if not items:
        return []

    client = get_client()
    records = []
    item_ids = []

    for item in items:
        item_id = generate_id('item')
        item_ids.append(item_id)
        records.append({'id': item_id, **item})

    client.table('practice_items').insert(records).execute()
    return item_ids
```

**Impact:** 75 HTTP calls → 3 HTTP calls (96% reduction)

---

## 4. Progress Tracking for Parallel Execution

**File:** `learn_system/app/api/services/processing.py`

### Thread-Safe Counter

```python
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
```

### Throttled Updates (reduce DB calls)

```python
import time

class ThrottledUpdater:
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
```

---

## 5. Error Resilience

### Retry with Backoff

```python
from anthropic import RateLimitError, APIConnectionError, APITimeoutError
import time

RETRYABLE = (RateLimitError, APIConnectionError, APITimeoutError)

def call_with_retry(fn, *args, max_retries=3, **kwargs):
    for attempt in range(max_retries + 1):
        try:
            return fn(*args, **kwargs)
        except RETRYABLE as e:
            if attempt == max_retries:
                raise
            time.sleep(2 ** attempt)  # 1s, 2s, 4s
```

### Graceful Degradation

The parallel implementation above already collects errors without stopping:
- Successful KCs are stored
- Failed KCs are logged
- Returns total items created (partial success is valid)

---

## Implementation Order

1. **Phase 1 (Low effort, immediate gains):**
   - Add Groq client and `GROQ_MODEL_FAST` config
   - Switch item generation to Qwen3 32B on Groq
   - Add batch insert functions

2. **Phase 2 (Medium effort, major gains):**
   - Refactor `generate_all_items` to use ThreadPoolExecutor
   - Add `ProgressTracker` and `ThrottledUpdater`
   - Wire progress callback

3. **Phase 3 (Optional polish):**
   - Add retry wrapper to LLM calls
   - Add circuit breaker for API overload
   - Checkpoint file for resumable processing

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Item generation (15 KCs) | 45-120s | 9-24s |
| DB operations | 5-8s | 0.5s |
| Total processing | 60-165s | 15-40s |
| Speedup | — | **3-4x** |

---

## Files to Modify

| File | Change |
|------|--------|
| `app/config.py` | Add `GROQ_MODEL_FAST`, `GROQ_API_KEY` |
| `app/practice/generator.py` | Add Groq client, parallel execution |
| `app/database/queries.py` | Add batch insert functions |
| `app/api/services/processing.py` | Thread-safe progress tracking |
| `app/ingestion/kc_extractor.py` | Use batch KC insert |
| `requirements.txt` | Add `groq` dependency |

---

*This plan is ready for implementation. Each section is independent and can be implemented incrementally.*
