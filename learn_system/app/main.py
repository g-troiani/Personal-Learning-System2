"""CLI entry point for the Personal Adaptive Learning System."""

import click
from pathlib import Path

from .database.connection import init_database, init_default_bundles, get_schema_sql
from .database.queries import (
    get_all_bundles, get_all_sources, get_system_stats,
    search_sources, get_bundle_by_name, get_kcs_for_source, get_items_for_kc
)
from .ingestion.ingest import ingest_document


@click.group()
@click.version_option(version='0.1.0')
def cli():
    """Personal Adaptive Learning System - Learn smarter with cognitive science."""
    pass


@cli.command()
def init():
    """Initialize the database and default technique bundles."""
    click.echo("Initializing Personal Learning System...")

    # Test database connection
    if init_database():
        click.echo("Database connection verified.")
    else:
        click.echo("Warning: Could not verify database tables.")
        click.echo("You may need to create tables manually in Supabase.")
        click.echo("\nTo create tables, run the SQL from:")
        click.echo("  python -m app.main schema")
        return

    # Initialize default bundles
    bundles_created = init_default_bundles()
    if bundles_created > 0:
        click.echo(f"Created {bundles_created} default technique bundles")
    else:
        bundles = get_all_bundles()
        click.echo(f"Found {len(bundles)} existing technique bundles")

    click.echo("\nInitialization complete!")


@cli.command()
def schema():
    """Display the database schema SQL for manual execution in Supabase."""
    sql = get_schema_sql()
    click.echo("-- Copy and paste this SQL into Supabase SQL Editor:")
    click.echo("-- (Dashboard -> SQL Editor -> New Query)")
    click.echo("")
    click.echo(sql)


@cli.command()
def status():
    """Show system status including source count, KC count, mastery summary."""
    stats = get_system_stats()

    click.echo("\n=== Learning System Status ===\n")
    click.echo(f"Sources: {stats['source_count']}")
    click.echo(f"Knowledge Components: {stats['kc_count']}")
    click.echo(f"Practice Items: {stats['item_count']}")
    click.echo("")
    click.echo(f"Mastery: {stats['average_mastery']*100:.1f}% average across all KCs")
    click.echo(f"Due today: {stats['due_count']} items")
    click.echo(f"Overdue: {stats['overdue_count']} items")


@cli.command()
def sources():
    """List all ingested sources with item counts."""
    all_sources = get_all_sources()

    if not all_sources:
        click.echo("No sources ingested yet.")
        click.echo("Use 'python -m app.main ingest <file>' to add documents.")
        return

    click.echo("\n=== Ingested Sources ===\n")
    for source in all_sources:
        click.echo(f"  [{source['id']}] {source['title']}")
        click.echo(f"      Domain: {source['domain']} | Words: {source['word_count']}")
        click.echo(f"      Ingested: {source['ingested_at'][:10]}")
        click.echo("")


@cli.command()
def bundles():
    """List all technique bundles."""
    all_bundles = get_all_bundles()

    if not all_bundles:
        click.echo("No technique bundles found.")
        click.echo("Run 'python -m app.main init' to create default bundles.")
        return

    click.echo("\n=== Technique Bundles ===\n")
    for bundle in all_bundles:
        click.echo(f"  [{bundle['id']}] {bundle['name']}")
        click.echo(f"      {bundle['description']}")
        click.echo(f"      Mode: {bundle['retrieval_mode']} | Spacing: {bundle['spacing_multiplier']}x")
        features = []
        if bundle['interleaving_enabled']:
            features.append('interleaving')
        if bundle['elaboration_prompts_enabled']:
            features.append('elaboration')
        if bundle['reflection_prompts_enabled']:
            features.append('reflection')
        if features:
            click.echo(f"      Features: {', '.join(features)}")
        click.echo("")


@cli.command()
@click.argument('file_path', type=click.Path(exists=True))
@click.option('--domain', default='general', help='Knowledge domain for categorization')
@click.option('--skip-kc', is_flag=True, help='Skip knowledge component extraction')
@click.option('--skip-items', is_flag=True, help='Skip practice item generation')
def ingest(file_path: str, domain: str, skip_kc: bool, skip_items: bool):
    """Ingest a document, extract KCs, and generate practice items."""
    filename = Path(file_path).name
    click.echo(f"Ingesting: {filename}")

    def progress_callback(message: str):
        click.echo(message)

    try:
        result = ingest_document(
            file_path,
            domain,
            extract_kcs=not skip_kc,
            generate_items=not skip_items and not skip_kc,
            progress_callback=progress_callback
        )
        click.echo(f"Extracted {result['char_count']} characters ({result['word_count']} words)")
        click.echo(f"Stored as source: {result['title']} (id: {result['source_id']})")

        if result.get('kc_count', 0) > 0:
            click.echo(f"Extracted {result['kc_count']} knowledge components")

            if result.get('item_count', 0) > 0:
                click.echo(f"Generated {result['item_count']} practice items")
                click.echo("Done. Source ready for study.")
            elif skip_items:
                click.echo("Item generation skipped (use without --skip-items to generate)")
            else:
                click.echo("Warning: No practice items generated")
        elif not skip_kc:
            click.echo("Warning: No knowledge components extracted")
        else:
            click.echo("KC extraction skipped (use without --skip-kc to extract)")

    except FileNotFoundError as e:
        click.echo(f"Error: {e}", err=True)
    except ValueError as e:
        click.echo(f"Error: {e}", err=True)
    except Exception as e:
        click.echo(f"Error during ingestion: {e}", err=True)
        import traceback
        traceback.print_exc()


# Study commands


@cli.command()
@click.option('--duration', default=30, help='Session duration in minutes')
@click.option('--bundle', default='Standard SRS', help='Technique bundle to use')
def study(duration: int, bundle: str):
    """Start a study session with specified duration and technique bundle."""
    from .study.loop import run_study_session
    run_study_session(duration_minutes=duration, bundle_name=bundle)


@cli.command()
def todo():
    """Show what's due for review organized by source."""
    from .study.scheduler import get_todo_summary

    summary = get_todo_summary()

    click.echo("\n=== What's Due for Review ===\n")

    if summary['total_overdue'] == 0 and summary['total_due_today'] == 0 and summary['total_new'] == 0:
        click.echo("Nothing to review! Great job staying on top of your learning.")
        return

    # Show totals
    click.echo(f"Total: {summary['total_overdue']} overdue | {summary['total_due_today']} due today | {summary['total_new']} new\n")

    # Show by source
    for source in summary['sources']:
        click.echo(f"[{source['id'][:12]}] {source['title']}")

        items = []
        if source['overdue'] > 0:
            items.append(f"!{source['overdue']} overdue")
        if source['due_today'] > 0:
            items.append(f"{source['due_today']} due")
        if source['new'] > 0:
            items.append(f"{source['new']} new")

        click.echo(f"    {' | '.join(items)}")
        click.echo()

    click.echo("Use 'python -m app.main study' to start a practice session")
    click.echo("Use 'python -m app.main review <source>' to focus on a specific topic")


@cli.command()
@click.argument('source_pattern')
@click.option('--duration', default=30, help='Session duration in minutes')
@click.option('--bundle', default='Standard SRS', help='Technique bundle to use')
def review(source_pattern: str, duration: int, bundle: str):
    """Start a review session filtered to matching sources."""
    sources = search_sources(source_pattern)

    if not sources:
        click.echo(f"No sources found matching: {source_pattern}")
        click.echo("Use 'python -m app.main sources' to see all available sources.")
        return

    # If multiple matches, let user choose
    if len(sources) > 1:
        click.echo(f"\nFound {len(sources)} matching sources:")
        for i, source in enumerate(sources):
            click.echo(f"  [{i + 1}] {source['title']}")

        choice = click.prompt(
            "Enter number to select (or 0 to cancel)",
            type=click.IntRange(0, len(sources)),
            default=1
        )

        if choice == 0:
            click.echo("Cancelled.")
            return

        selected_source = sources[choice - 1]
    else:
        selected_source = sources[0]

    click.echo(f"\nReviewing: {selected_source['title']}")

    from .study.loop import run_study_session
    run_study_session(
        duration_minutes=duration,
        bundle_name=bundle,
        source_id=selected_source['id']
    )


@cli.command()
def techniques():
    """Show technique bundle usage statistics for self-experimentation."""
    from .database.connection import get_client

    client = get_client()

    # Get bundle usage counts
    bundles = client.table('technique_bundles').select('id, name').execute()
    bundle_map = {b['id']: b['name'] for b in bundles.data}

    # Get history grouped by bundle
    history = client.table('kc_technique_history').select('technique_bundle_id, exposures_during').execute()

    bundle_stats = {}
    for record in (history.data or []):
        bundle_id = record['technique_bundle_id']
        if bundle_id not in bundle_stats:
            bundle_stats[bundle_id] = {'kcs': 0, 'exposures': 0}
        bundle_stats[bundle_id]['kcs'] += 1
        bundle_stats[bundle_id]['exposures'] += record['exposures_during']

    click.echo("\n=== Technique Bundle Usage ===\n")

    if not bundle_stats:
        click.echo("No technique history recorded yet.")
        click.echo("Complete some study sessions to start tracking.")
        return

    for bundle_id, stats in bundle_stats.items():
        bundle_name = bundle_map.get(bundle_id, bundle_id)
        click.echo(f"{bundle_name}:")
        click.echo(f"  KCs practiced: {stats['kcs']}")
        click.echo(f"  Total exposures: {stats['exposures']}")
        click.echo()

    # Show session counts per bundle
    sessions = client.table('sessions').select('technique_bundle_id').execute()
    session_counts = {}
    for s in (sessions.data or []):
        bid = s.get('technique_bundle_id')
        if bid:
            session_counts[bid] = session_counts.get(bid, 0) + 1

    click.echo("Sessions by bundle:")
    for bundle_id, count in session_counts.items():
        bundle_name = bundle_map.get(bundle_id, bundle_id)
        click.echo(f"  {bundle_name}: {count} sessions")


if __name__ == '__main__':
    cli()
