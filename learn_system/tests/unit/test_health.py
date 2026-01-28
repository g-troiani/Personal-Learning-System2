"""Tests for the health check endpoint."""

import pytest
from datetime import datetime


class TestHealthEndpoint:
    """Test suite for the /api/health endpoint."""

    @pytest.mark.unit
    def test_health_check_returns_200(self, client):
        """Health endpoint should return 200 status code."""
        response = client.get("/api/health")
        assert response.status_code == 200

    @pytest.mark.unit
    def test_health_check_returns_healthy_status(self, client):
        """Health endpoint should return status='healthy'."""
        response = client.get("/api/health")
        data = response.json()
        assert data["status"] == "healthy"

    @pytest.mark.unit
    def test_health_check_returns_version(self, client):
        """Health endpoint should return the API version."""
        response = client.get("/api/health")
        data = response.json()
        assert "version" in data
        assert data["version"] == "1.0.0"

    @pytest.mark.unit
    def test_health_check_returns_timestamp(self, client):
        """Health endpoint should return a timestamp."""
        response = client.get("/api/health")
        data = response.json()
        assert "timestamp" in data
        # Verify timestamp is a valid ISO format
        timestamp = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
        assert isinstance(timestamp, datetime)

    @pytest.mark.unit
    def test_health_check_response_structure(self, client):
        """Health endpoint should return all expected fields."""
        response = client.get("/api/health")
        data = response.json()

        # Verify all required fields are present
        required_fields = ["status", "version", "timestamp"]
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
