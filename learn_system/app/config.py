"""Configuration constants and environment management."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file in project root
# Try project root first, fall back to learn_system/.env
project_root = Path(__file__).parent.parent.parent
env_path = project_root / '.env'
if not env_path.exists():
    env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Database configuration (Supabase)
SUPABASE_URL: str = os.getenv('SUPABASE_URL', '')
# Use legacy JWT service_role key for backend (bypasses RLS - backend validates JWT separately)
# Priority: Legacy JWT key > new secret key > anon key
SUPABASE_KEY: str = os.getenv('SUPABASE_SERVICE_ROLE_JWT',
                              os.getenv('SUPABASE_SERVICE_ROLE_KEY',
                                       os.getenv('SUPABASE_KEY', '')))

# LLM configuration
# Claude for high-reasoning tasks (KC extraction)
ANTHROPIC_MODEL: str = "claude-sonnet-4-20250514"

# Groq for fast structured output tasks (practice item generation)
# Note: qwen-qwq-32b was deprecated, using qwen/qwen3-32b instead
GROQ_MODEL: str = "qwen/qwen3-32b"
GROQ_API_KEY: str = os.getenv('GROQ_API_KEY', '')

# Parallelism configuration
MAX_LLM_WORKERS: int = int(os.getenv('MAX_LLM_WORKERS', '5'))

# Local data path for any local files
DATA_PATH: str = str(Path(__file__).parent.parent / 'data')


def get_supabase_url() -> str:
    """Returns Supabase project URL."""
    url = os.getenv('SUPABASE_URL', SUPABASE_URL)
    if not url:
        raise ValueError("SUPABASE_URL environment variable is not set")
    return url


def get_supabase_key() -> str:
    """Returns Supabase API key."""
    key = os.getenv('SUPABASE_KEY', SUPABASE_KEY)
    if not key:
        raise ValueError("SUPABASE_KEY environment variable is not set")
    return key


def get_api_key() -> str:
    """Returns Anthropic API key from environment, raises if not set."""
    key = os.getenv('ANTHROPIC_API_KEY', '')
    if not key:
        raise ValueError("ANTHROPIC_API_KEY environment variable is not set")
    return key


def get_groq_api_key() -> str:
    """Returns Groq API key from environment, raises if not set."""
    key = os.getenv('GROQ_API_KEY', GROQ_API_KEY)
    if not key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    return key


def get_data_path() -> str:
    """Returns absolute path to local data directory."""
    path = Path(DATA_PATH)
    path.mkdir(parents=True, exist_ok=True)
    return str(path)
