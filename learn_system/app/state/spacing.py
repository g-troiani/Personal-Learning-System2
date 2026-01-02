"""SM-2 Spaced Repetition Algorithm implementation."""

from datetime import datetime, timedelta
from typing import Tuple


def calculate_next_review(
    score: float,
    current_interval: float,
    easiness_factor: float,
    spacing_multiplier: float = 1.0
) -> Tuple[float, float, datetime]:
    """
    Implements the SM-2 algorithm for spaced repetition scheduling.

    The SM-2 algorithm adjusts review intervals based on performance:
    - Failed attempts reset the interval
    - Successful attempts extend the interval by the easiness factor
    - The easiness factor adjusts based on performance quality

    Args:
        score: Performance score from 0.0 to 1.0
        current_interval: Current interval in days
        easiness_factor: Current easiness factor (minimum 1.3)
        spacing_multiplier: Bundle-specific spacing adjustment (default 1.0)

    Returns:
        Tuple of (new_interval_days, new_easiness_factor, next_review_datetime)
    """
    # Convert 0-1 score to 0-5 quality rating (SM-2 uses 0-5 scale)
    quality = round(score * 5)

    # Update easiness factor
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = easiness_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    # Minimum easiness factor is 1.3
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

    # Apply spacing multiplier from technique bundle
    new_interval *= spacing_multiplier

    # Calculate next review date
    next_review = datetime.now() + timedelta(days=new_interval)

    return (new_interval, new_ef, next_review)


def get_priority_score(
    next_review_at: datetime,
    mastery_level: float,
    exposure_count: int
) -> float:
    """
    Calculates a priority score for scheduling items in the study queue.

    Higher score = higher priority (should be shown sooner).

    Priority factors:
    - Overdue items get highest priority
    - Lower mastery items get higher priority
    - New items (never practiced) get moderate priority

    Args:
        next_review_at: When the item is due for review
        mastery_level: Current mastery estimate (0.0 to 1.0)
        exposure_count: Number of times item has been practiced

    Returns:
        Priority score (higher = more urgent)
    """
    now = datetime.now()

    if exposure_count == 0:
        # New content - moderate priority
        return 50.0 - (mastery_level * 10)

    if next_review_at is None:
        # Never scheduled - treat as new
        return 45.0

    # Calculate overdue factor
    time_diff = (now - next_review_at).total_seconds()
    hours_overdue = time_diff / 3600

    if hours_overdue > 0:
        # Overdue: priority increases with time overdue
        # Cap at 100 to prevent extreme values
        overdue_priority = min(100, 60 + hours_overdue * 2)
    else:
        # Not yet due: lower priority the further in future
        overdue_priority = max(0, 40 + hours_overdue * 0.5)

    # Adjust for mastery (lower mastery = higher priority)
    mastery_adjustment = (1 - mastery_level) * 10

    return overdue_priority + mastery_adjustment
