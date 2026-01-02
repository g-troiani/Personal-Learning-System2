"""Database query functions for the learning system."""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from .connection import get_client


def generate_id(prefix: str = '') -> str:
    """Generate a unique ID with optional prefix."""
    uid = str(uuid.uuid4())[:8]
    return f"{prefix}_{uid}" if prefix else uid


# ============== Technique Bundles ==============

def get_all_bundles() -> List[Dict[str, Any]]:
    """Returns all technique bundles."""
    client = get_client()
    result = client.table('technique_bundles').select('*').execute()
    return result.data if result.data else []


def get_bundle(bundle_id: str) -> Optional[Dict[str, Any]]:
    """Returns a specific bundle by ID."""
    client = get_client()
    result = client.table('technique_bundles').select('*').eq('id', bundle_id).execute()
    return result.data[0] if result.data else None


def get_bundle_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Returns a bundle by name (case-insensitive partial match)."""
    client = get_client()
    result = client.table('technique_bundles').select('*').ilike('name', f'%{name}%').execute()
    return result.data[0] if result.data else None


# ============== Content Sources ==============

def insert_source(title: str, content: str, domain: str, metadata: dict, file_path: str = None) -> str:
    """Inserts a content source, returns generated ID."""
    client = get_client()
    source_id = generate_id('src')
    word_count = len(content.split())

    data = {
        'id': source_id,
        'title': title,
        'file_path': file_path,
        'content': content,
        'content_type': 'text',
        'domain': domain,
        'word_count': word_count,
        'metadata': metadata,
        'status': 'active'
    }

    result = client.table('content_sources').insert(data).execute()
    return source_id


def get_source(source_id: str) -> Optional[Dict[str, Any]]:
    """Returns source record or None if not found."""
    client = get_client()
    result = client.table('content_sources').select('*').eq('id', source_id).execute()
    return result.data[0] if result.data else None


def get_all_sources() -> List[Dict[str, Any]]:
    """Returns all content sources."""
    client = get_client()
    result = client.table('content_sources').select('*').order('ingested_at', desc=True).execute()
    return result.data if result.data else []


def search_sources(pattern: str) -> List[Dict[str, Any]]:
    """Returns sources matching a title pattern."""
    client = get_client()
    result = client.table('content_sources').select('*').ilike('title', f'%{pattern}%').execute()
    return result.data if result.data else []


# ============== Knowledge Components ==============

def insert_kc(source_id: str, name: str, description: str, knowledge_type: str,
              cognitive_level: str, intrinsic_complexity: int, domain: str,
              source_excerpt: str = None, metadata: dict = None) -> str:
    """Inserts a knowledge component, returns generated ID."""
    client = get_client()
    kc_id = generate_id('kc')

    data = {
        'id': kc_id,
        'source_id': source_id,
        'name': name,
        'description': description,
        'knowledge_type': knowledge_type,
        'cognitive_level': cognitive_level,
        'intrinsic_complexity': intrinsic_complexity,
        'domain': domain,
        'source_excerpt': source_excerpt,
        'metadata': metadata or {}
    }

    client.table('knowledge_components').insert(data).execute()

    # Initialize KC state
    init_kc_state(kc_id)

    return kc_id


def init_kc_state(kc_id: str) -> None:
    """Initialize state for a knowledge component."""
    client = get_client()
    data = {
        'kc_id': kc_id,
        'mastery_level': 0.0,
        'exposure_count': 0,
        'correct_count': 0,
        'consecutive_correct': 0,
        'consecutive_incorrect': 0,
        'current_interval_days': 1.0,
        'easiness_factor': 2.5,
        'plateau_detected': False,
        'struggling_flag': False
    }
    client.table('kc_state').insert(data).execute()


def get_kc(kc_id: str) -> Optional[Dict[str, Any]]:
    """Returns a knowledge component by ID."""
    client = get_client()
    result = client.table('knowledge_components').select('*').eq('id', kc_id).execute()
    return result.data[0] if result.data else None


def get_kcs_for_source(source_id: str) -> List[Dict[str, Any]]:
    """Returns all knowledge components for a source."""
    client = get_client()
    result = client.table('knowledge_components').select('*').eq('source_id', source_id).execute()
    return result.data if result.data else []


def get_all_kcs() -> List[Dict[str, Any]]:
    """Returns all knowledge components."""
    client = get_client()
    result = client.table('knowledge_components').select('*').execute()
    return result.data if result.data else []


# ============== Practice Items ==============

def insert_practice_item(kc_id: str, practice_mode: str, difficulty_level: int,
                        prompt: str, expected_response: str, hints: List[str],
                        rubric: str = None, success_criteria: str = None) -> str:
    """Inserts a practice item, returns generated ID."""
    client = get_client()
    item_id = generate_id('item')

    data = {
        'id': item_id,
        'kc_id': kc_id,
        'practice_mode': practice_mode,
        'difficulty_level': difficulty_level,
        'prompt': prompt,
        'expected_response': expected_response,
        'hints': hints,
        'rubric': rubric,
        'success_criteria': success_criteria
    }

    client.table('practice_items').insert(data).execute()
    return item_id


def get_items_for_kc(kc_id: str) -> List[Dict[str, Any]]:
    """Returns all practice items for a knowledge component."""
    client = get_client()
    result = client.table('practice_items').select('*').eq('kc_id', kc_id).execute()
    return result.data if result.data else []


def get_all_items() -> List[Dict[str, Any]]:
    """Returns all practice items."""
    client = get_client()
    result = client.table('practice_items').select('*').execute()
    return result.data if result.data else []


def get_due_items(as_of: datetime = None) -> List[Dict[str, Any]]:
    """Returns items where next_review_at <= as_of, ordered by urgency."""
    if as_of is None:
        as_of = datetime.now()

    client = get_client()

    # Get KC states that are due
    states_result = client.table('kc_state').select('kc_id').lte('next_review_at', as_of.isoformat()).execute()

    if not states_result.data:
        return []

    kc_ids = [s['kc_id'] for s in states_result.data]

    # Get practice items for those KCs
    items_result = client.table('practice_items').select('*, knowledge_components(*)').in_('kc_id', kc_ids).execute()

    return items_result.data if items_result.data else []


def get_due_items_for_source(source_id: str, as_of: datetime = None) -> List[Dict[str, Any]]:
    """Returns due items filtered to specific source."""
    if as_of is None:
        as_of = datetime.now()

    client = get_client()

    # Get KCs for this source
    kcs = get_kcs_for_source(source_id)
    if not kcs:
        return []

    kc_ids = [kc['id'] for kc in kcs]

    # Get states that are due
    states_result = client.table('kc_state').select('kc_id').in_('kc_id', kc_ids).lte('next_review_at', as_of.isoformat()).execute()

    if not states_result.data:
        return []

    due_kc_ids = [s['kc_id'] for s in states_result.data]

    # Get practice items
    items_result = client.table('practice_items').select('*').in_('kc_id', due_kc_ids).execute()

    return items_result.data if items_result.data else []


# ============== Sessions ==============

def insert_session(technique_bundle_id: str, session_type: str = 'mixed',
                  target_duration_minutes: int = None) -> str:
    """Creates session record, returns generated ID."""
    client = get_client()
    session_id = generate_id('sess')

    data = {
        'id': session_id,
        'technique_bundle_id': technique_bundle_id,
        'session_type': session_type,
        'target_duration_minutes': target_duration_minutes,
        'items_completed': 0,
        'items_skipped': 0
    }

    client.table('sessions').insert(data).execute()
    return session_id


def end_session(session_id: str, items_completed: int, notes: str = None,
               average_score: float = None) -> None:
    """Updates session with end time and summary."""
    client = get_client()

    # Calculate actual duration
    session = client.table('sessions').select('started_at').eq('id', session_id).execute()
    actual_minutes = None
    if session.data:
        try:
            started_str = session.data[0]['started_at']
            # Handle various ISO format variations from Supabase
            if 'Z' in started_str:
                started_str = started_str.replace('Z', '+00:00')
            # Parse with try-except for Python 3.9 compatibility
            try:
                started_at = datetime.fromisoformat(started_str)
            except ValueError:
                # Fallback: try parsing just the datetime part
                if '+' in started_str:
                    dt_part = started_str.split('+')[0]
                    started_at = datetime.fromisoformat(dt_part)
                else:
                    started_at = datetime.now()

            # Calculate minutes
            now = datetime.now()
            if started_at.tzinfo is not None:
                # Remove timezone for comparison if started_at has timezone
                started_at = started_at.replace(tzinfo=None)
            actual_minutes = int((now - started_at).total_seconds() / 60)
        except Exception:
            actual_minutes = None

    data = {
        'ended_at': datetime.now().isoformat(),
        'items_completed': items_completed,
        'actual_duration_minutes': actual_minutes,
        'notes': notes,
        'average_score': average_score
    }

    client.table('sessions').update(data).eq('id', session_id).execute()


def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Returns a session by ID."""
    client = get_client()
    result = client.table('sessions').select('*').eq('id', session_id).execute()
    return result.data[0] if result.data else None


# ============== Attempts ==============

def insert_attempt(session_id: str, practice_item_id: str, kc_id: str,
                  response: str, score: float, correctness: str,
                  confidence_before: int, difficulty_rating: int,
                  response_time_ms: int, hints_requested: int,
                  mastery_before: float = None, mastery_after: float = None) -> str:
    """Records attempt, returns generated ID."""
    client = get_client()
    attempt_id = generate_id('att')

    data = {
        'id': attempt_id,
        'session_id': session_id,
        'practice_item_id': practice_item_id,
        'kc_id': kc_id,
        'completed_at': datetime.now().isoformat(),
        'response': response,
        'score': score,
        'correctness': correctness,
        'confidence_before': confidence_before,
        'difficulty_rating': difficulty_rating,
        'response_time_ms': response_time_ms,
        'hints_requested': hints_requested,
        'mastery_before': mastery_before,
        'mastery_after': mastery_after
    }

    client.table('attempts').insert(data).execute()
    return attempt_id


def get_attempts_for_session(session_id: str) -> List[Dict[str, Any]]:
    """Returns all attempts for a session."""
    client = get_client()
    result = client.table('attempts').select('*').eq('session_id', session_id).execute()
    return result.data if result.data else []


def get_attempts_for_kc(kc_id: str) -> List[Dict[str, Any]]:
    """Returns all attempts for a knowledge component."""
    client = get_client()
    result = client.table('attempts').select('*').eq('kc_id', kc_id).order('started_at', desc=True).execute()
    return result.data if result.data else []


# ============== KC State ==============

def get_kc_state(kc_id: str) -> Optional[Dict[str, Any]]:
    """Returns current state for knowledge component."""
    client = get_client()
    result = client.table('kc_state').select('*').eq('kc_id', kc_id).execute()
    return result.data[0] if result.data else None


def update_kc_state(kc_id: str, mastery_level: float, next_review_at: datetime,
                   interval_days: float, easiness_factor: float,
                   exposure_count: int = None, correct_count: int = None,
                   consecutive_correct: int = None, consecutive_incorrect: int = None) -> None:
    """Updates state after attempt."""
    client = get_client()

    data = {
        'mastery_level': mastery_level,
        'next_review_at': next_review_at.isoformat() if next_review_at else None,
        'current_interval_days': interval_days,
        'easiness_factor': easiness_factor,
        'last_exposure_at': datetime.now().isoformat(),
        'updated_at': datetime.now().isoformat()
    }

    if exposure_count is not None:
        data['exposure_count'] = exposure_count
    if correct_count is not None:
        data['correct_count'] = correct_count
    if consecutive_correct is not None:
        data['consecutive_correct'] = consecutive_correct
    if consecutive_incorrect is not None:
        data['consecutive_incorrect'] = consecutive_incorrect

    client.table('kc_state').update(data).eq('kc_id', kc_id).execute()


# ============== Technique History ==============

def record_technique_usage(kc_id: str, bundle_id: str) -> str:
    """Records that KC was practiced with given bundle."""
    client = get_client()
    history_id = generate_id('hist')

    # Check for existing active record
    existing = client.table('kc_technique_history').select('id', 'exposures_during').eq('kc_id', kc_id).eq('technique_bundle_id', bundle_id).is_('used_until', 'null').execute()

    if existing.data:
        # Update existing record
        record = existing.data[0]
        client.table('kc_technique_history').update({
            'exposures_during': record['exposures_during'] + 1
        }).eq('id', record['id']).execute()
        return record['id']
    else:
        # Create new record
        data = {
            'id': history_id,
            'kc_id': kc_id,
            'technique_bundle_id': bundle_id,
            'exposures_during': 1
        }
        client.table('kc_technique_history').insert(data).execute()
        return history_id


# ============== Statistics ==============

def get_system_stats() -> Dict[str, Any]:
    """Returns overall system statistics."""
    client = get_client()

    sources = client.table('content_sources').select('id', count='exact').execute()
    kcs = client.table('knowledge_components').select('id', count='exact').execute()
    items = client.table('practice_items').select('id', count='exact').execute()

    # Average mastery
    mastery_result = client.table('kc_state').select('mastery_level').execute()
    if mastery_result.data:
        avg_mastery = sum(s['mastery_level'] for s in mastery_result.data) / len(mastery_result.data)
    else:
        avg_mastery = 0.0

    # Due items
    now = datetime.now()
    due_result = client.table('kc_state').select('kc_id', count='exact').lte('next_review_at', now.isoformat()).execute()

    # Overdue items (due before today)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    overdue_result = client.table('kc_state').select('kc_id', count='exact').lt('next_review_at', today_start.isoformat()).execute()

    return {
        'source_count': sources.count if sources.count else 0,
        'kc_count': kcs.count if kcs.count else 0,
        'item_count': items.count if items.count else 0,
        'average_mastery': avg_mastery,
        'due_count': due_result.count if due_result.count else 0,
        'overdue_count': overdue_result.count if overdue_result.count else 0
    }
