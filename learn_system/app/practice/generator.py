"""Practice item generation using LLM."""

import json
import re
from typing import List, Dict, Any

from anthropic import Anthropic

from ..config import get_api_key, ANTHROPIC_MODEL
from ..database.queries import insert_practice_item, get_items_for_kc, get_kcs_for_source
from .templates import get_prompt_for_kc_type


def get_anthropic_client() -> Anthropic:
    """Returns configured Anthropic client."""
    return Anthropic(api_key=get_api_key())


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
    Generates practice items appropriate for KC type.

    Args:
        kc: Knowledge component dictionary

    Returns:
        List with prompt, expected_response, hints, difficulty_level, practice_mode
    """
    client = get_anthropic_client()
    prompt = get_prompt_for_kc_type(kc)

    try:
        message = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=2048,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        response_text = message.content[0].text
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


def generate_all_items(source_id: str, progress_callback=None) -> int:
    """
    Generates items for all KCs in source.

    Args:
        source_id: ID of the source document
        progress_callback: Optional callback for progress updates

    Returns:
        Total count of items generated
    """
    kcs = get_kcs_for_source(source_id)
    if not kcs:
        return 0

    total_items = 0
    for i, kc in enumerate(kcs):
        if progress_callback:
            progress_callback(f"Generating items for KC {i+1}/{len(kcs)}: {kc['name'][:40]}...")

        count = generate_items_for_kc_and_store(kc)
        total_items += count

    return total_items
