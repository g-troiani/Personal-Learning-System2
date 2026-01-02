"""Scheduler for selecting practice items for study sessions."""

import random
from datetime import datetime
from typing import List, Dict, Any, Optional

from ..database.connection import get_client
from ..database.queries import get_all_items, get_kc_state, get_kc


def get_study_queue(source_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
    """
    Returns practice items ordered by priority for study.

    For now (before SM-2 is implemented), returns a randomized selection.
    Later will prioritize by: overdue > due today > new content.

    Args:
        source_id: Optional filter to specific source
        limit: Maximum number of items to return

    Returns:
        List of practice items with KC info attached
    """
    client = get_client()
    now = datetime.now()

    # Build query for practice items with their KC info
    if source_id:
        # Filter to specific source
        items_query = (client.table('practice_items')
                      .select('*, knowledge_components!inner(*)')
                      .eq('knowledge_components.source_id', source_id))
    else:
        items_query = client.table('practice_items').select('*, knowledge_components(*)')

    items_result = items_query.limit(limit * 2).execute()  # Get more than needed for filtering

    if not items_result.data:
        return []

    items = items_result.data

    # Get KC states for prioritization
    kc_ids = list(set(item['kc_id'] for item in items))
    states_result = client.table('kc_state').select('*').in_('kc_id', kc_ids).execute()
    states_by_kc = {s['kc_id']: s for s in (states_result.data or [])}

    # Categorize items
    overdue = []
    due_today = []
    new_content = []
    future = []

    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    for item in items:
        kc_id = item['kc_id']
        state = states_by_kc.get(kc_id, {})
        next_review = state.get('next_review_at')
        exposure_count = state.get('exposure_count', 0)

        if exposure_count == 0 or next_review is None:
            # Never practiced - new content
            new_content.append(item)
        else:
            # Parse the review date
            try:
                if isinstance(next_review, str):
                    review_dt = datetime.fromisoformat(next_review.replace('Z', '+00:00'))
                    # Remove timezone for comparison
                    review_dt = review_dt.replace(tzinfo=None)
                else:
                    review_dt = next_review

                if review_dt < today_start:
                    overdue.append(item)
                elif review_dt <= today_end:
                    due_today.append(item)
                else:
                    future.append(item)
            except (ValueError, TypeError):
                new_content.append(item)

    # Shuffle within categories
    random.shuffle(overdue)
    random.shuffle(due_today)
    random.shuffle(new_content)

    # Combine with priority: overdue > due today > new content
    # For initial implementation, include some new content even if there are due items
    result = []
    result.extend(overdue)
    result.extend(due_today)
    result.extend(new_content)

    # Attach KC state to each item for display
    for item in result:
        item['_kc_state'] = states_by_kc.get(item['kc_id'], {})

    return result[:limit]


def get_todo_summary() -> Dict[str, Any]:
    """
    Returns summary of items organized by source for the todo dashboard.

    Returns:
        Dictionary with sources and their item counts by category
    """
    client = get_client()
    now = datetime.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Get all sources with their KCs
    sources_result = client.table('content_sources').select('id, title').execute()
    sources = sources_result.data or []

    summary = {
        'sources': [],
        'total_overdue': 0,
        'total_due_today': 0,
        'total_new': 0
    }

    for source in sources:
        source_id = source['id']

        # Get KCs for this source
        kcs_result = client.table('knowledge_components').select('id').eq('source_id', source_id).execute()
        kc_ids = [kc['id'] for kc in (kcs_result.data or [])]

        if not kc_ids:
            continue

        # Get KC states
        states_result = client.table('kc_state').select('*').in_('kc_id', kc_ids).execute()

        overdue = 0
        due_today = 0
        new_content = 0

        for state in (states_result.data or []):
            next_review = state.get('next_review_at')
            exposure_count = state.get('exposure_count', 0)

            if exposure_count == 0 or next_review is None:
                new_content += 1
            else:
                try:
                    if isinstance(next_review, str):
                        review_dt = datetime.fromisoformat(next_review.replace('Z', '+00:00'))
                        review_dt = review_dt.replace(tzinfo=None)
                    else:
                        review_dt = next_review

                    if review_dt < today_start:
                        overdue += 1
                    elif review_dt <= now:
                        due_today += 1
                except (ValueError, TypeError):
                    new_content += 1

        if overdue > 0 or due_today > 0 or new_content > 0:
            summary['sources'].append({
                'id': source_id,
                'title': source['title'],
                'overdue': overdue,
                'due_today': due_today,
                'new': new_content
            })
            summary['total_overdue'] += overdue
            summary['total_due_today'] += due_today
            summary['total_new'] += new_content

    return summary
