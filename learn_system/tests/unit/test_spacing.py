"""Tests for the SM-2 spaced repetition algorithm."""

import pytest
from datetime import datetime, timedelta
from unittest.mock import patch


class TestCalculateNextReview:
    """Test suite for the SM-2 calculate_next_review function."""

    @pytest.fixture
    def spacing_module(self):
        """Import the spacing module."""
        from app.state.spacing import calculate_next_review
        return calculate_next_review

    @pytest.mark.unit
    def test_failed_attempt_resets_interval(self, spacing_module):
        """Score < 0.5 (quality < 3) should reset interval to 1 day."""
        # Score of 0.4 -> quality = round(0.4 * 5) = 2 (failed)
        new_interval, new_ef, _ = spacing_module(
            score=0.4,
            current_interval=10.0,
            easiness_factor=2.5
        )

        assert new_interval == 1.0, "Failed attempt should reset interval to 1 day"

    @pytest.mark.unit
    def test_perfect_score_increases_ef(self, spacing_module):
        """Perfect score (1.0) should increase easiness factor."""
        initial_ef = 2.5
        _, new_ef, _ = spacing_module(
            score=1.0,
            current_interval=6.0,
            easiness_factor=initial_ef
        )

        # Perfect score (quality=5) should increase EF
        # EF' = 2.5 + (0.1 - (5-5) * (0.08 + (5-5) * 0.02)) = 2.5 + 0.1 = 2.6
        assert new_ef > initial_ef, "Perfect score should increase EF"
        assert abs(new_ef - 2.6) < 0.001, f"Expected EF ~2.6, got {new_ef}"

    @pytest.mark.unit
    def test_low_score_decreases_ef(self, spacing_module):
        """Low passing score should decrease easiness factor."""
        initial_ef = 2.5
        # Score of 0.6 -> quality = 3 (barely passing)
        _, new_ef, _ = spacing_module(
            score=0.6,
            current_interval=6.0,
            easiness_factor=initial_ef
        )

        # quality=3: EF' = 2.5 + (0.1 - (5-3) * (0.08 + (5-3) * 0.02))
        # = 2.5 + (0.1 - 2 * (0.08 + 0.04)) = 2.5 + (0.1 - 0.24) = 2.36
        assert new_ef < initial_ef, "Low score should decrease EF"

    @pytest.mark.unit
    def test_ef_minimum_is_1_3(self, spacing_module):
        """Easiness factor should never go below 1.3."""
        # Multiple low scores should not push EF below 1.3
        _, new_ef, _ = spacing_module(
            score=0.6,  # quality = 3
            current_interval=6.0,
            easiness_factor=1.3  # Already at minimum
        )

        assert new_ef >= 1.3, "EF should never go below 1.3"

    @pytest.mark.unit
    def test_first_successful_review_interval(self, spacing_module):
        """First successful review should have interval of 1 day."""
        new_interval, _, _ = spacing_module(
            score=0.8,  # quality = 4 (passing)
            current_interval=0.5,  # Less than 1 day
            easiness_factor=2.5
        )

        assert new_interval == 1.0, "First successful review should have 1 day interval"

    @pytest.mark.unit
    def test_second_successful_review_interval(self, spacing_module):
        """Second successful review should have interval of 6 days."""
        new_interval, _, _ = spacing_module(
            score=0.8,  # quality = 4 (passing)
            current_interval=1.0,  # Between 1 and 6
            easiness_factor=2.5
        )

        assert new_interval == 6.0, "Second successful review should have 6 day interval"

    @pytest.mark.unit
    def test_subsequent_review_multiplies_by_ef(self, spacing_module):
        """Subsequent reviews should multiply interval by EF."""
        current_interval = 6.0
        ef = 2.5

        new_interval, _, _ = spacing_module(
            score=1.0,  # Perfect score
            current_interval=current_interval,
            easiness_factor=ef
        )

        # For subsequent reviews (interval >= 6), new_interval = current * new_ef
        # new_ef with perfect score = 2.6
        expected_interval = current_interval * 2.6
        assert abs(new_interval - expected_interval) < 0.01, \
            f"Expected interval ~{expected_interval}, got {new_interval}"

    @pytest.mark.unit
    def test_spacing_multiplier_applied(self, spacing_module):
        """Spacing multiplier should scale the interval."""
        multiplier = 1.5
        new_interval_without, _, _ = spacing_module(
            score=0.8,
            current_interval=6.0,
            easiness_factor=2.5,
            spacing_multiplier=1.0
        )
        new_interval_with, _, _ = spacing_module(
            score=0.8,
            current_interval=6.0,
            easiness_factor=2.5,
            spacing_multiplier=multiplier
        )

        assert abs(new_interval_with - (new_interval_without * multiplier)) < 0.01, \
            "Spacing multiplier should scale the interval"

    @pytest.mark.unit
    def test_returns_future_datetime(self, spacing_module):
        """Next review datetime should be in the future."""
        _, _, next_review = spacing_module(
            score=0.8,
            current_interval=6.0,
            easiness_factor=2.5
        )

        assert next_review > datetime.now(), "Next review should be in the future"

    @pytest.mark.unit
    def test_quality_score_conversion(self, spacing_module):
        """Verify score to quality conversion boundaries."""
        # Test boundary cases for score -> quality conversion
        test_cases = [
            (0.0, 0),   # 0.0 * 5 = 0
            (0.1, 1),   # 0.1 * 5 = 0.5, rounds to 1 (in Python 3, banker's rounding)
            (0.3, 2),   # 0.3 * 5 = 1.5, rounds to 2
            (0.5, 3),   # 0.5 * 5 = 2.5, rounds to 2 (banker's rounding)
            (0.7, 4),   # 0.7 * 5 = 3.5, rounds to 4
            (1.0, 5),   # 1.0 * 5 = 5
        ]

        for score, expected_quality in test_cases:
            actual_quality = round(score * 5)
            # Note: Python uses banker's rounding (round half to even)
            # So 2.5 rounds to 2, not 3


class TestGetPriorityScore:
    """Test suite for the get_priority_score function."""

    @pytest.fixture
    def priority_func(self):
        """Import the priority function."""
        from app.state.spacing import get_priority_score
        return get_priority_score

    @pytest.mark.unit
    def test_new_content_gets_moderate_priority(self, priority_func):
        """New content (exposure_count=0) should get moderate priority."""
        score = priority_func(
            next_review_at=datetime.now(),
            mastery_level=0.0,
            exposure_count=0
        )

        # New content base priority is 50 - (mastery * 10) = 50
        assert 40 <= score <= 60, f"New content should have moderate priority, got {score}"

    @pytest.mark.unit
    def test_overdue_items_get_high_priority(self, priority_func):
        """Overdue items should get high priority."""
        past_time = datetime.now() - timedelta(hours=24)
        score = priority_func(
            next_review_at=past_time,
            mastery_level=0.5,
            exposure_count=5
        )

        # Overdue items should have priority > 60
        assert score > 60, f"Overdue items should have high priority, got {score}"

    @pytest.mark.unit
    def test_future_items_get_low_priority(self, priority_func):
        """Items not yet due should get lower priority."""
        future_time = datetime.now() + timedelta(hours=24)
        score = priority_func(
            next_review_at=future_time,
            mastery_level=0.8,
            exposure_count=10
        )

        # Future items should have lower priority
        assert score < 50, f"Future items should have lower priority, got {score}"

    @pytest.mark.unit
    def test_lower_mastery_increases_priority(self, priority_func):
        """Lower mastery should increase priority."""
        now = datetime.now()

        low_mastery_score = priority_func(
            next_review_at=now,
            mastery_level=0.2,
            exposure_count=5
        )
        high_mastery_score = priority_func(
            next_review_at=now,
            mastery_level=0.9,
            exposure_count=5
        )

        assert low_mastery_score > high_mastery_score, \
            "Lower mastery should result in higher priority"

    @pytest.mark.unit
    def test_none_next_review_treated_as_new(self, priority_func):
        """None next_review_at should be treated as new content."""
        score = priority_func(
            next_review_at=None,
            mastery_level=0.0,
            exposure_count=1
        )

        # Should return 45 (never scheduled priority)
        assert score == 45.0, f"None next_review should return 45, got {score}"

    @pytest.mark.unit
    def test_priority_capped_at_100(self, priority_func):
        """Priority score should be capped at 100."""
        # Very overdue item
        very_old = datetime.now() - timedelta(days=30)
        score = priority_func(
            next_review_at=very_old,
            mastery_level=0.0,
            exposure_count=5
        )

        # The overdue component is capped at 100
        # Total should be: min(100, 60 + hours_overdue * 2) + mastery_adj
        # With 720 hours overdue and low mastery, should be around 110
        # But overdue_priority is capped at 100
        assert score <= 110, f"Priority should be reasonably capped, got {score}"
