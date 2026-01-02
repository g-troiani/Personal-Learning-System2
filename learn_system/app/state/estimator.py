"""Mastery estimation using exponential moving average."""


def calculate_mastery(
    new_score: float,
    current_mastery: float,
    exposure_count: int
) -> float:
    """
    Computes updated mastery using exponential moving average.

    The alpha parameter varies by exposure count:
    - Early exposures (high alpha): New scores have more weight
    - Later exposures (low alpha): History has more weight

    This approach means:
    - Initial performance strongly influences early mastery estimate
    - As more attempts accumulate, the estimate becomes more stable
    - Recent performance still matters but doesn't override history

    Args:
        new_score: Score from latest attempt (0.0 to 1.0)
        current_mastery: Current mastery estimate (0.0 to 1.0)
        exposure_count: Number of previous exposures

    Returns:
        Updated mastery estimate (0.0 to 1.0)
    """
    # Alpha decreases with exposure: high early (0.7), low later (0.2)
    # This creates a decay curve that stabilizes after ~10 exposures
    if exposure_count <= 1:
        alpha = 0.7
    elif exposure_count <= 3:
        alpha = 0.5
    elif exposure_count <= 6:
        alpha = 0.35
    elif exposure_count <= 10:
        alpha = 0.25
    else:
        alpha = 0.2

    # Exponential moving average: new_mastery = alpha * new_score + (1 - alpha) * current
    new_mastery = alpha * new_score + (1 - alpha) * current_mastery

    # Clamp to [0, 1]
    return max(0.0, min(1.0, new_mastery))


def estimate_struggling(
    mastery_level: float,
    consecutive_incorrect: int,
    average_difficulty_rating: float = None
) -> bool:
    """
    Determines if the learner is struggling with a knowledge component.

    Struggling is indicated by:
    - Low mastery after multiple attempts
    - Multiple consecutive incorrect responses
    - Consistently high difficulty ratings

    Args:
        mastery_level: Current mastery estimate
        consecutive_incorrect: Number of consecutive incorrect responses
        average_difficulty_rating: Average self-reported difficulty (1-5)

    Returns:
        True if learner appears to be struggling
    """
    # Low mastery threshold
    if mastery_level < 0.3:
        # Check additional indicators
        if consecutive_incorrect >= 2:
            return True
        if average_difficulty_rating and average_difficulty_rating >= 4:
            return True

    # Multiple consecutive failures regardless of mastery
    if consecutive_incorrect >= 3:
        return True

    return False


def estimate_plateau(
    mastery_level: float,
    recent_scores: list,
    exposure_count: int
) -> bool:
    """
    Detects if learning has plateaued (progress has stalled).

    A plateau is indicated when:
    - Multiple recent attempts show consistent mastery
    - Variance in scores is low
    - Mastery isn't improving despite practice

    Args:
        mastery_level: Current mastery estimate
        recent_scores: List of recent attempt scores
        exposure_count: Total number of exposures

    Returns:
        True if a plateau is detected
    """
    if exposure_count < 5:
        # Not enough data to detect plateau
        return False

    if len(recent_scores) < 3:
        return False

    # Check if recent scores are very consistent (low variance)
    avg_recent = sum(recent_scores) / len(recent_scores)
    variance = sum((s - avg_recent) ** 2 for s in recent_scores) / len(recent_scores)

    # Plateau: low variance AND mastery stuck in middle range
    if variance < 0.05 and 0.3 < mastery_level < 0.7:
        return True

    # Plateau: scores consistently mediocre
    if all(0.4 < s < 0.7 for s in recent_scores[-5:]):
        return True

    return False
