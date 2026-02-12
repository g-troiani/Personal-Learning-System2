"""Shared pytest fixtures for the Personal Learning System tests."""

import os
import sys
from datetime import datetime, timedelta
from typing import Optional, Generator
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

# Add the app directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# App Fixtures
# ============================================================================

@pytest.fixture(scope="session")
def app():
    """Create a FastAPI test application."""
    from app.api.server import create_app
    return create_app()


@pytest.fixture(scope="function")
def client(app) -> Generator[TestClient, None, None]:
    """Create a test client for the FastAPI app."""
    with TestClient(app) as test_client:
        yield test_client


# ============================================================================
# Mock Supabase Client Fixtures
# ============================================================================

@pytest.fixture
def mock_supabase_client():
    """Create a mock Supabase client."""
    mock_client = MagicMock()

    # Mock table operations
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Mock select operations
    mock_table.select.return_value = mock_table
    mock_table.insert.return_value = mock_table
    mock_table.update.return_value = mock_table
    mock_table.delete.return_value = mock_table
    mock_table.eq.return_value = mock_table
    mock_table.single.return_value = mock_table
    mock_table.execute.return_value = MagicMock(data=[], count=0)

    return mock_client


@pytest.fixture
def mock_supabase(mock_supabase_client, monkeypatch):
    """Patch the global Supabase client with a mock."""
    # Patch the get_client function to return our mock
    monkeypatch.setattr(
        "app.database.connection.get_client",
        lambda: mock_supabase_client
    )
    return mock_supabase_client


# ============================================================================
# Authentication Fixtures
# ============================================================================

@pytest.fixture
def test_user_id() -> str:
    """Return a test user ID."""
    return "test-user-uuid-12345"


@pytest.fixture
def test_user_email() -> str:
    """Return a test user email."""
    return "test@example.com"


@pytest.fixture
def mock_auth_user(test_user_id, test_user_email):
    """Create a mock authenticated user object."""
    class MockUser:
        def __init__(self):
            self.id = test_user_id
            self.email = test_user_email
            self.access_token = "mock-access-token-xyz"

    return MockUser()


@pytest.fixture
def auth_headers() -> dict:
    """Return authorization headers for authenticated requests."""
    return {"Authorization": "Bearer mock-jwt-token"}


@pytest.fixture
def mock_jwt_decode(test_user_id, test_user_email, monkeypatch):
    """Mock JWT decoding to return a valid user."""
    def mock_decode(token, *args, **kwargs):
        return {
            "sub": test_user_id,
            "email": test_user_email,
            "exp": (datetime.utcnow() + timedelta(hours=1)).timestamp()
        }

    monkeypatch.setattr("jwt.decode", mock_decode)


# ============================================================================
# Time Fixtures
# ============================================================================

@pytest.fixture
def fixed_now():
    """Return a fixed datetime for consistent testing."""
    return datetime(2026, 1, 28, 12, 0, 0)


@pytest.fixture
def mock_datetime_now(fixed_now):
    """Patch datetime.now() to return a fixed time."""
    with patch("app.state.spacing.datetime") as mock_dt:
        mock_dt.now.return_value = fixed_now
        mock_dt.side_effect = lambda *args, **kwargs: datetime(*args, **kwargs)
        yield mock_dt


# ============================================================================
# Sample Data Fixtures
# ============================================================================

@pytest.fixture
def sample_kc_state():
    """Return sample KC state data for testing."""
    return {
        "kc_id": "kc_test123",
        "user_id": "test-user-uuid-12345",
        "mastery_level": 0.5,
        "easiness_factor": 2.5,
        "current_interval_days": 1.0,
        "exposure_count": 3,
        "consecutive_correct": 1,
        "consecutive_incorrect": 0,
        "next_review_at": datetime(2026, 1, 29, 12, 0, 0).isoformat()
    }


@pytest.fixture
def sample_source():
    """Return sample source data for testing."""
    return {
        "id": "src_test123",
        "user_id": "test-user-uuid-12345",
        "title": "Test Document",
        "domain": "testing",
        "content_type": "application/pdf",
        "word_count": 1000,
        "status": "ready",
        "processing_status": "ready",
        "processing_progress": 100,
        "ingested_at": datetime(2026, 1, 27, 10, 0, 0).isoformat()
    }
