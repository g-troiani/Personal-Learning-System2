"""Supabase database connection and initialization."""

from typing import Optional
from supabase import create_client, Client
from pathlib import Path
from ..config import get_supabase_url, get_supabase_key
import os

_client: Optional[Client] = None


def get_client() -> Client:
    """Returns Supabase client, creating it if needed."""
    global _client
    if _client is None:
        _client = create_client(get_supabase_url(), get_supabase_key())
    return _client


def get_user_client(access_token: str) -> Client:
    """
    Create a Supabase client authenticated as a specific user.

    This is needed for operations that must pass RLS policies that check auth.uid().
    The client uses the anon key but sets the user's access token in the Authorization header.

    Args:
        access_token: The user's JWT access token

    Returns:
        Supabase client authenticated as the user
    """
    url = get_supabase_url()
    # Use anon key (publishable key) - the access token provides user context for RLS
    anon_key = os.getenv('VITE_SUPABASE_PUBLISHABLE_KEY', os.getenv('SUPABASE_KEY', ''))

    # Create a new client and set the user's access token
    client = create_client(url, anon_key)

    # Set the access token for this client's postgrest requests
    # This makes auth.uid() return the user's ID in RLS policies
    client.postgrest.auth(access_token)

    return client


def init_database() -> bool:
    """
    Initialize database tables.

    Note: For Supabase, tables should be created via the Supabase dashboard
    or through migrations. This function verifies the connection and returns
    True if successful.
    """
    try:
        client = get_client()
        # Test connection by checking if technique_bundles table exists
        # If tables don't exist, they need to be created in Supabase dashboard
        result = client.table('technique_bundles').select('id').limit(1).execute()
        return True
    except Exception as e:
        # Tables may not exist yet
        print(f"Database connection test: {e}")
        return False


def init_default_bundles() -> int:
    """
    Insert default technique bundles if none exist.
    Returns number of bundles inserted.
    """
    client = get_client()

    # Check if bundles already exist
    result = client.table('technique_bundles').select('id').execute()
    if result.data and len(result.data) > 0:
        return 0

    # Default bundles from EXECPLAN.md
    bundles = [
        {
            'id': 'bundle_standard',
            'name': 'Standard SRS',
            'description': 'Cued recall with immediate feedback and standard spacing',
            'retrieval_mode': 'cued_recall',
            'spacing_multiplier': 1.0,
            'interleaving_enabled': False,
            'elaboration_prompts_enabled': False,
            'reflection_prompts_enabled': False,
            'feedback_timing': 'immediate'
        },
        {
            'id': 'bundle_deep',
            'name': 'Deep Retrieval',
            'description': 'Free recall with elaboration and reflection prompts',
            'retrieval_mode': 'free_recall',
            'spacing_multiplier': 1.0,
            'interleaving_enabled': False,
            'elaboration_prompts_enabled': True,
            'reflection_prompts_enabled': True,
            'feedback_timing': 'immediate'
        },
        {
            'id': 'bundle_interleaved',
            'name': 'Interleaved Practice',
            'description': 'Mixed topics within sessions for discrimination',
            'retrieval_mode': 'free_recall',
            'spacing_multiplier': 1.0,
            'interleaving_enabled': True,
            'elaboration_prompts_enabled': True,
            'reflection_prompts_enabled': False,
            'feedback_timing': 'immediate'
        },
        {
            'id': 'bundle_execution',
            'name': 'Execution Focus',
            'description': 'Hands-on tasks with graduated independence',
            'retrieval_mode': 'execution',
            'spacing_multiplier': 1.2,
            'interleaving_enabled': False,
            'elaboration_prompts_enabled': False,
            'reflection_prompts_enabled': True,
            'feedback_timing': 'immediate'
        },
        {
            'id': 'bundle_generation',
            'name': 'Generation First',
            'description': 'Pre-testing before instruction to prime encoding',
            'retrieval_mode': 'free_recall',
            'spacing_multiplier': 1.0,
            'interleaving_enabled': False,
            'elaboration_prompts_enabled': True,
            'reflection_prompts_enabled': False,
            'feedback_timing': 'delayed'
        }
    ]

    # Insert bundles
    result = client.table('technique_bundles').insert(bundles).execute()
    return len(result.data) if result.data else 0


def get_schema_sql() -> str:
    """Returns the schema SQL for reference or manual execution."""
    schema_path = Path(__file__).parent / 'schema.sql'
    with open(schema_path, 'r') as f:
        return f.read()
