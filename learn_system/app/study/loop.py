"""Interactive study session loop."""

import time
from datetime import datetime
from typing import Dict, Any, Optional, List

import click

from ..database.queries import (
    insert_session, end_session, insert_attempt, get_kc_state,
    get_bundle_by_name, get_bundle, record_technique_usage, update_kc_state
)
from ..state.spacing import calculate_next_review
from ..state.estimator import calculate_mastery
from .scheduler import get_study_queue


def present_recall_item(item: Dict[str, Any], bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Presents a free_recall or cued_recall item and collects response.

    Args:
        item: Practice item dictionary
        bundle: Technique bundle for this session

    Returns:
        Dictionary with response data
    """
    start_time = time.time()
    hints_used = 0
    hints = item.get('hints', []) or []

    # Get confidence before attempt
    click.echo("\n" + "=" * 60)
    click.echo(f"Mode: {item['practice_mode'].upper()}")

    if item.get('knowledge_components'):
        kc = item['knowledge_components']
        click.echo(f"Topic: {kc.get('name', 'Unknown')}")

    click.echo("=" * 60)

    # Ask for confidence rating before showing question
    confidence = click.prompt(
        "\nHow confident are you about this topic? (1=unsure, 5=very confident)",
        type=click.IntRange(1, 5),
        default=3
    )

    # Show the prompt
    click.echo("\n" + "-" * 40)
    click.echo(f"\n{item['prompt']}\n")
    click.echo("-" * 40)

    # For cued_recall mode, show a hint if available
    if item['practice_mode'] == 'cued_recall' and hints:
        click.echo(f"\nHint: {hints[0]}")
        hints_used = 1

    # Collect response
    response = click.prompt("\nYour answer", default="", show_default=False)

    # Allow requesting additional hints
    while hints_used < len(hints) and not response.strip():
        if click.confirm(f"Would you like a hint? ({len(hints) - hints_used} remaining)"):
            click.echo(f"\nHint {hints_used + 1}: {hints[hints_used]}")
            hints_used += 1
            response = click.prompt("\nYour answer", default="", show_default=False)
        else:
            break

    response_time_ms = int((time.time() - start_time) * 1000)

    # Show expected response
    click.echo("\n" + "=" * 40)
    click.echo("EXPECTED ANSWER:")
    click.echo("=" * 40)
    click.echo(f"\n{item.get('expected_response', 'No expected response available.')}\n")

    if item.get('rubric'):
        click.echo("-" * 40)
        click.echo("Rubric:")
        click.echo(item['rubric'])
        click.echo("-" * 40)

    # Self-assessment
    score = click.prompt(
        "\nRate your answer (0=wrong, 1=partial, 2=close, 3=correct)",
        type=click.IntRange(0, 3),
        default=2
    )

    # Convert to 0-1 scale
    score_normalized = score / 3.0

    # Difficulty rating
    difficulty = click.prompt(
        "How difficult was this? (1=easy, 5=very hard)",
        type=click.IntRange(1, 5),
        default=3
    )

    return {
        'response': response,
        'score': score_normalized,
        'correctness': 'correct' if score >= 2 else ('partial' if score == 1 else 'incorrect'),
        'confidence_before': confidence,
        'difficulty_rating': difficulty,
        'response_time_ms': response_time_ms,
        'hints_requested': hints_used
    }


def present_explanation_item(item: Dict[str, Any], bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Presents an explanation or application item for multi-line response.

    Args:
        item: Practice item dictionary
        bundle: Technique bundle

    Returns:
        Dictionary with response data
    """
    start_time = time.time()
    hints = item.get('hints', []) or []
    hints_used = 0

    click.echo("\n" + "=" * 60)
    click.echo(f"Mode: {item['practice_mode'].upper()}")

    if item.get('knowledge_components'):
        kc = item['knowledge_components']
        click.echo(f"Topic: {kc.get('name', 'Unknown')}")

    click.echo("=" * 60)

    # Confidence before
    confidence = click.prompt(
        "\nHow confident are you about this topic? (1=unsure, 5=very confident)",
        type=click.IntRange(1, 5),
        default=3
    )

    # Show prompt
    click.echo("\n" + "-" * 40)
    click.echo(f"\n{item['prompt']}\n")
    click.echo("-" * 40)

    # Collect multi-line response
    click.echo("\nEnter your explanation (type 'done' on a new line when finished):")

    lines = []
    while True:
        line = click.prompt("", default="", show_default=False, prompt_suffix="")
        if line.lower().strip() == 'done':
            break
        lines.append(line)

    response = '\n'.join(lines)
    response_time_ms = int((time.time() - start_time) * 1000)

    # Show expected response and rubric
    click.echo("\n" + "=" * 40)
    click.echo("KEY POINTS TO COVER:")
    click.echo("=" * 40)
    click.echo(f"\n{item.get('expected_response', 'No expected response available.')}\n")

    if item.get('rubric'):
        click.echo("-" * 40)
        click.echo("Rubric for self-assessment:")
        click.echo(item['rubric'])
        click.echo("-" * 40)

    # Self-assessment
    score = click.prompt(
        "\nRate your explanation (0=wrong, 1=partial, 2=close, 3=complete)",
        type=click.IntRange(0, 3),
        default=2
    )

    score_normalized = score / 3.0

    difficulty = click.prompt(
        "How difficult was this? (1=easy, 5=very hard)",
        type=click.IntRange(1, 5),
        default=3
    )

    return {
        'response': response,
        'score': score_normalized,
        'correctness': 'correct' if score >= 2 else ('partial' if score == 1 else 'incorrect'),
        'confidence_before': confidence,
        'difficulty_rating': difficulty,
        'response_time_ms': response_time_ms,
        'hints_requested': hints_used
    }


def present_execution_item(item: Dict[str, Any], bundle: Dict[str, Any]) -> Dict[str, Any]:
    """
    Presents an execution task and collects completion metadata.

    Args:
        item: Practice item dictionary
        bundle: Technique bundle

    Returns:
        Dictionary with response data
    """
    start_time = time.time()

    click.echo("\n" + "=" * 60)
    click.echo(f"Mode: EXECUTION TASK")

    if item.get('knowledge_components'):
        kc = item['knowledge_components']
        click.echo(f"Topic: {kc.get('name', 'Unknown')}")

    click.echo("=" * 60)

    # Confidence before
    confidence = click.prompt(
        "\nHow confident are you about completing this task? (1=unsure, 5=very confident)",
        type=click.IntRange(1, 5),
        default=3
    )

    # Show task description
    click.echo("\n" + "-" * 40)
    click.echo("TASK:")
    click.echo(f"\n{item['prompt']}\n")
    click.echo("-" * 40)

    if item.get('success_criteria'):
        click.echo("\nSuccess Criteria:")
        click.echo(item['success_criteria'])

    click.echo("\n[Complete the task in your environment, then return here]")
    click.pause("Press any key when you've attempted the task...")

    response_time_ms = int((time.time() - start_time) * 1000)

    # Collect completion data
    completed = click.confirm("Did you complete the task?", default=True)

    if completed:
        independence = click.prompt(
            "How independently? (1=needed lots of help, 5=completely alone)",
            type=click.IntRange(1, 5),
            default=3
        )
        score = (independence - 1) / 4.0  # Convert 1-5 to 0-1

        iterations = click.prompt(
            "How many attempts/iterations did it take?",
            type=click.IntRange(1, 10),
            default=1
        )

        errors = click.prompt(
            "Any errors encountered? (describe briefly, or 'none')",
            default="none",
            show_default=True
        )
    else:
        score = 0.0
        independence = 1
        iterations = 0
        errors = click.prompt("What blocked you?", default="")

    difficulty = click.prompt(
        "How difficult was this task? (1=easy, 5=very hard)",
        type=click.IntRange(1, 5),
        default=3
    )

    return {
        'response': f"Completed: {completed}, Independence: {independence}/5, Iterations: {iterations}",
        'score': score,
        'correctness': 'correct' if completed and independence >= 3 else ('partial' if completed else 'incorrect'),
        'confidence_before': confidence,
        'difficulty_rating': difficulty,
        'response_time_ms': response_time_ms,
        'hints_requested': 0,
        'task_completed': completed,
        'independence_level': independence,
        'iterations': iterations,
        'errors': errors if errors != 'none' else None
    }


def run_study_session(duration_minutes: int, bundle_name: str = 'Standard SRS',
                     source_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Runs an interactive study session.

    Args:
        duration_minutes: Target session duration
        bundle_name: Name of technique bundle to use
        source_id: Optional filter to specific source

    Returns:
        Session summary dictionary
    """
    # Get bundle
    bundle = get_bundle_by_name(bundle_name)
    if not bundle:
        # Try exact match
        bundle = get_bundle(bundle_name)
    if not bundle:
        click.echo(f"Warning: Bundle '{bundle_name}' not found, using defaults")
        bundle = {'id': 'bundle_standard', 'name': 'Standard SRS'}

    # Get study queue
    items = get_study_queue(source_id=source_id, limit=50)

    if not items:
        click.echo("\nNo items available for study.")
        click.echo("Ingest a document first with: python -m app.main ingest <file>")
        return {'items_completed': 0, 'cancelled': True}

    # Create session
    session_id = insert_session(
        technique_bundle_id=bundle['id'],
        session_type='review' if source_id else 'mixed',
        target_duration_minutes=duration_minutes
    )

    click.echo(f"\nStarting study session ({duration_minutes} minutes, bundle: {bundle['name']})")
    click.echo(f"Session ID: {session_id}")
    click.echo(f"\n{len(items)} items available for practice")
    click.echo("\nPress Ctrl+C at any time to end the session early.\n")

    session_start = time.time()
    items_completed = 0
    scores = []

    try:
        for i, item in enumerate(items):
            # Check if time is up
            elapsed = (time.time() - session_start) / 60
            if elapsed >= duration_minutes:
                click.echo(f"\n\nTime's up! Session duration reached ({duration_minutes} minutes)")
                break

            remaining = duration_minutes - elapsed
            click.echo(f"\n[Item {i + 1}/{len(items)}] ({remaining:.1f} min remaining)")

            # Get current mastery before attempt
            kc_state = get_kc_state(item['kc_id'])
            mastery_before = kc_state.get('mastery_level', 0.0) if kc_state else 0.0

            # Present item based on practice mode
            practice_mode = item['practice_mode']

            if practice_mode in ('free_recall', 'cued_recall', 'recognition'):
                result = present_recall_item(item, bundle)
            elif practice_mode in ('explanation', 'application'):
                result = present_explanation_item(item, bundle)
            elif practice_mode == 'execution':
                result = present_execution_item(item, bundle)
            else:
                # Default to recall
                result = present_recall_item(item, bundle)

            # Get current KC state for SM-2 calculation
            current_interval = kc_state.get('current_interval_days', 1.0) if kc_state else 1.0
            easiness_factor = kc_state.get('easiness_factor', 2.5) if kc_state else 2.5
            exposure_count = kc_state.get('exposure_count', 0) if kc_state else 0
            correct_count = kc_state.get('correct_count', 0) if kc_state else 0
            consecutive_correct = kc_state.get('consecutive_correct', 0) if kc_state else 0
            consecutive_incorrect = kc_state.get('consecutive_incorrect', 0) if kc_state else 0

            # Calculate new mastery using exponential moving average
            new_mastery = calculate_mastery(
                new_score=result['score'],
                current_mastery=mastery_before,
                exposure_count=exposure_count
            )

            # Calculate next review using SM-2 algorithm
            spacing_multiplier = bundle.get('spacing_multiplier', 1.0)
            new_interval, new_ef, next_review = calculate_next_review(
                score=result['score'],
                current_interval=current_interval,
                easiness_factor=easiness_factor,
                spacing_multiplier=spacing_multiplier
            )

            # Update consecutive counts
            new_exposure_count = exposure_count + 1
            if result['score'] >= 0.6:  # Considered correct
                new_correct_count = correct_count + 1
                new_consecutive_correct = consecutive_correct + 1
                new_consecutive_incorrect = 0
            else:
                new_correct_count = correct_count
                new_consecutive_correct = 0
                new_consecutive_incorrect = consecutive_incorrect + 1

            # Update KC state with SM-2 results
            update_kc_state(
                kc_id=item['kc_id'],
                mastery_level=new_mastery,
                next_review_at=next_review,
                interval_days=new_interval,
                easiness_factor=new_ef,
                exposure_count=new_exposure_count,
                correct_count=new_correct_count,
                consecutive_correct=new_consecutive_correct,
                consecutive_incorrect=new_consecutive_incorrect
            )

            # Record attempt with mastery changes
            insert_attempt(
                session_id=session_id,
                practice_item_id=item['id'],
                kc_id=item['kc_id'],
                response=result['response'],
                score=result['score'],
                correctness=result['correctness'],
                confidence_before=result['confidence_before'],
                difficulty_rating=result['difficulty_rating'],
                response_time_ms=result['response_time_ms'],
                hints_requested=result['hints_requested'],
                mastery_before=mastery_before,
                mastery_after=new_mastery
            )

            # Record technique usage
            record_technique_usage(item['kc_id'], bundle['id'])

            items_completed += 1
            scores.append(result['score'])

            # Show feedback with mastery update
            if result['correctness'] == 'correct':
                click.echo(f"\nCorrect! Mastery: {mastery_before*100:.0f}% -> {new_mastery*100:.0f}%")
                click.echo(f"Next review in {new_interval:.1f} days")
            else:
                click.echo(f"\nKeep practicing! Mastery: {mastery_before*100:.0f}% -> {new_mastery*100:.0f}%")
                click.echo(f"Review again in {new_interval:.1f} days")

    except KeyboardInterrupt:
        click.echo("\n\nSession ended early by user.")
    except Exception as e:
        click.echo(f"\n\nError during session: {e}")

    # Calculate session summary
    session_duration = (time.time() - session_start) / 60
    average_score = sum(scores) / len(scores) if scores else 0.0

    # End session
    end_session(
        session_id=session_id,
        items_completed=items_completed,
        average_score=average_score
    )

    # Display summary
    click.echo("\n" + "=" * 60)
    click.echo("SESSION SUMMARY")
    click.echo("=" * 60)
    click.echo(f"Duration: {session_duration:.1f} minutes")
    click.echo(f"Items completed: {items_completed}")
    click.echo(f"Average score: {average_score * 100:.0f}%")

    if scores:
        correct = sum(1 for s in scores if s >= 0.66)
        partial = sum(1 for s in scores if 0.33 <= s < 0.66)
        incorrect = sum(1 for s in scores if s < 0.33)
        click.echo(f"Correct: {correct} | Partial: {partial} | Incorrect: {incorrect}")

    click.echo("=" * 60)

    return {
        'session_id': session_id,
        'duration_minutes': session_duration,
        'items_completed': items_completed,
        'average_score': average_score,
        'cancelled': False
    }
