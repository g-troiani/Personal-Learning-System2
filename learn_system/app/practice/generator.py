"""Practice item generation using LLM.

Uses Groq (Qwen3 32B) for fast structured output generation.
Practice item generation is a template-following task that doesn't require
high reasoning - the KC already defines what to test.

M22: Uses ThreadPoolExecutor for parallel LLM calls across KCs.
LLM API calls are I/O-bound, so Python's GIL doesn't block during network waits.

M23: Adds retry logic with exponential backoff for transient API errors.
"""

import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
from typing import List, Dict, Any, Optional, Tuple, Callable, TypeVar

from groq import Groq

from ..config import get_groq_api_key, GROQ_MODEL, MAX_LLM_WORKERS
from ..database.queries import insert_practice_item, get_items_for_kc, get_kcs_for_source, insert_practice_items_batch
from .templates import get_prompt_for_kc_type

# Retry configuration
MAX_RETRIES = 3
RETRY_BASE_DELAY = 1.0  # seconds

T = TypeVar('T')


def call_with_retry(fn: Callable[[], T], max_retries: int = MAX_RETRIES) -> T:
    """
    Call function with exponential backoff on transient errors.

    Retries on rate limits, connection errors, and timeouts.

    Args:
        fn: Zero-argument function to call
        max_retries: Maximum number of retry attempts

    Returns:
        Result of fn()

    Raises:
        Exception: The last error after all retries exhausted
    """
    last_error = None

    for attempt in range(max_retries + 1):
        try:
            return fn()
        except Exception as e:
            error_name = type(e).__name__.lower()

            # Check if this is a retryable error (rate limit, connection, timeout)
            retryable = any(keyword in error_name for keyword in [
                'ratelimit', 'rate_limit', 'connection', 'timeout', 'apiconnection'
            ])

            if not retryable or attempt == max_retries:
                raise

            wait_time = RETRY_BASE_DELAY * (2 ** attempt)  # 1s, 2s, 4s
            print(f"  Retry {attempt + 1}/{max_retries} in {wait_time}s: {e}")
            time.sleep(wait_time)
            last_error = e

    raise last_error


def get_groq_client() -> Groq:
    """Returns configured Groq client."""
    return Groq(api_key=get_groq_api_key())


def parse_item_response(response_text: str) -> List[Dict[str, Any]]:
    """
    Parses LLM response text into a list of practice item dictionaries.

    Args:
        response_text: Raw text response from LLM

    Returns:
        List of parsed practice item dictionaries
    """
    # Clean up response text
    text = response_text.strip()

    # Remove markdown code block markers if present
    if text.startswith('```json'):
        text = text[7:]
    elif text.startswith('```'):
        text = text[3:]
    if text.endswith('```'):
        text = text[:-3]
    text = text.strip()

    # Try to find JSON array in response
    json_match = re.search(r'\[\s*\{[\s\S]*\}\s*\]', text)

    if not json_match:
        raise ValueError(f"No JSON array found in LLM response")

    json_str = json_match.group(0)

    try:
        items = json.loads(json_str)
    except json.JSONDecodeError as e:
        # Try to fix common issues
        fixed_json = re.sub(r',\s*]', ']', json_str)
        fixed_json = re.sub(r',\s*}', '}', fixed_json)
        try:
            items = json.loads(fixed_json)
        except json.JSONDecodeError:
            raise ValueError(f"Failed to parse JSON: {e}")

    if not isinstance(items, list):
        raise ValueError("Expected JSON array of practice items")

    # Validate and normalize each item
    validated_items = []
    valid_modes = {'free_recall', 'cued_recall', 'recognition', 'explanation', 'application', 'execution'}

    for item in items:
        if not isinstance(item, dict):
            continue

        # Required fields
        if 'prompt' not in item:
            continue

        # Normalize practice_mode
        mode = item.get('practice_mode', 'free_recall').lower()
        if mode not in valid_modes:
            mode = 'free_recall'

        # Normalize difficulty
        difficulty = item.get('difficulty_level', 2)
        if not isinstance(difficulty, int):
            try:
                difficulty = int(difficulty)
            except (ValueError, TypeError):
                difficulty = 2
        difficulty = min(5, max(1, difficulty))

        # Normalize hints
        hints = item.get('hints', [])
        if not isinstance(hints, list):
            hints = [str(hints)] if hints else []

        validated_items.append({
            'practice_mode': mode,
            'difficulty_level': difficulty,
            'prompt': str(item['prompt']).strip(),
            'expected_response': str(item.get('expected_response', '')).strip(),
            'hints': hints,
            'rubric': str(item.get('rubric', '')).strip(),
            'success_criteria': str(item.get('success_criteria', '')).strip(),
        })

    return validated_items


def generate_items_for_kc(kc: dict) -> List[Dict[str, Any]]:
    """
    Generates practice items appropriate for KC type using Groq.

    Uses Qwen3 32B on Groq for fast structured output generation.
    This is a template-following task with low reasoning requirements.
    Includes retry logic for transient API errors (M23).

    Args:
        kc: Knowledge component dictionary

    Returns:
        List with prompt, expected_response, hints, difficulty_level, practice_mode
    """
    prompt = get_prompt_for_kc_type(kc)

    def _call_api():
        client = get_groq_client()
        return client.chat.completions.create(
            model=GROQ_MODEL,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

    try:
        response = call_with_retry(_call_api)
        response_text = response.choices[0].message.content
        return parse_item_response(response_text)
    except Exception as e:
        print(f"Warning: Error generating items for KC '{kc.get('name', 'unknown')}': {e}")
        return []


def store_generated_items(kc_id: str, items: List[Dict[str, Any]]) -> List[str]:
    """
    Stores generated practice items in the database.

    Args:
        kc_id: ID of the knowledge component
        items: List of practice item dictionaries

    Returns:
        List of created item IDs
    """
    created_ids = []

    for item in items:
        item_id = insert_practice_item(
            kc_id=kc_id,
            practice_mode=item['practice_mode'],
            difficulty_level=item['difficulty_level'],
            prompt=item['prompt'],
            expected_response=item['expected_response'],
            hints=item['hints'],
            rubric=item.get('rubric'),
            success_criteria=item.get('success_criteria')
        )
        created_ids.append(item_id)

    return created_ids


def generate_items_for_kc_and_store(kc: dict) -> int:
    """
    Generates and stores practice items for a knowledge component.

    Args:
        kc: Knowledge component dictionary (must include 'id')

    Returns:
        Number of items created
    """
    kc_id = kc['id']

    # Check if items already exist
    existing = get_items_for_kc(kc_id)
    if existing:
        return len(existing)

    # Generate and store
    items = generate_items_for_kc(kc)
    if items:
        store_generated_items(kc_id, items)

    return len(items)


def _process_single_kc(kc: dict) -> Tuple[str, List[Dict[str, Any]], Optional[str]]:
    """
    Process a single KC for item generation (thread-safe).

    Args:
        kc: Knowledge component dictionary

    Returns:
        Tuple of (kc_id, items_list, error_or_none)
    """
    kc_id = kc['id']

    try:
        # Check if items already exist
        existing = get_items_for_kc(kc_id)
        if existing:
            return (kc_id, [], None)  # Skip, already has items

        # Generate items
        items = generate_items_for_kc(kc)

        # Add kc_id to each item
        for item in items:
            item['kc_id'] = kc_id

        return (kc_id, items, None)
    except Exception as e:
        return (kc_id, [], str(e))


def generate_all_items(source_id: str, progress_callback=None) -> int:
    """
    Generates items for all KCs in source using parallel LLM calls and batch insert.

    Uses ThreadPoolExecutor for parallel processing (M22 optimization).
    LLM API calls are I/O-bound, so Python's GIL doesn't block during network waits.
    Collects all items first, then batch inserts in 1 HTTP call.

    Args:
        source_id: ID of the source document
        progress_callback: Optional callback for progress updates

    Returns:
        Total count of items generated
    """
    kcs = get_kcs_for_source(source_id)
    if not kcs:
        return 0

    all_items = []
    errors = []
    completed = 0
    completed_lock = Lock()

    # Use ThreadPoolExecutor for parallel LLM calls
    with ThreadPoolExecutor(max_workers=MAX_LLM_WORKERS) as executor:
        # Submit all tasks
        future_to_kc = {}
        for kc in kcs:
            future = executor.submit(_process_single_kc, kc)
            future_to_kc[future] = kc

        # Process results as they complete
        for future in as_completed(future_to_kc):
            kc = future_to_kc[future]
            kc_id, items, error = future.result()

            # Update progress with thread-safe counter
            with completed_lock:
                completed += 1
                if progress_callback:
                    progress_callback(f"Generating items for KC {completed}/{len(kcs)}: {kc['name'][:40]}...")

            if items:
                all_items.extend(items)
            if error:
                errors.append(f"{kc_id}: {error}")

    # Batch insert all items at once
    if all_items:
        insert_practice_items_batch(all_items)

    if errors:
        print(f"Warnings: {len(errors)} KCs failed: {errors[:3]}...")

    return len(all_items)
