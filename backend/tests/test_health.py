"""Tests for application health and error routing."""

import pytest
from backend.app.main import create_app
from backend.app.config import TestingConfig


@pytest.fixture
def client():
    """Create Flask test client."""
    app = create_app(TestingConfig)
    with app.test_client() as client:
        yield client


def test_health_check(client):
    """Test /api/health endpoint returns 200 OK and valid status JSON."""
    response = client.get("/api/health")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True
    assert json_data["data"]["status"] == "ok"
    assert "SecureBank API" in json_data["data"]["app"]


def test_root_endpoint(client):
    """Test root endpoint returns welcome message."""
    response = client.get("/")
    assert response.status_code == 200
    json_data = response.get_json()
    assert json_data["success"] is True


def test_not_found_endpoint(client):
    """Test 404 returns structured JSON error rather than HTML."""
    response = client.get("/api/nonexistent-endpoint-12345")
    assert response.status_code == 404
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["code"] == "NOT_FOUND"
