"""API security, RBAC, and business logic tests."""

from decimal import Decimal
import pytest
from backend.app.main import create_app
from backend.app.config import TestingConfig
from backend.app.security.utils import hash_password, verify_password
from backend.app.loans.service import calculate_emi_py
from backend.app.beneficiaries.service import validate_ifsc


@pytest.fixture
def client():
    """Create Flask test client."""
    app = create_app(TestingConfig)
    with app.test_client() as client:
        yield client


# --- Security & Password Tests ---

def test_password_hashing():
    """Test password hashing produces secure hashes and verifies properly."""
    password = "SuperSecretPassword123"
    hashed = hash_password(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False


# --- Unauthenticated / Unauthorized Access Tests ---

def test_unauthenticated_access_rejected(client):
    """Test protected endpoints return 401 UNAUTHENTICATED when not logged in."""
    endpoints = [
        ("GET", "/api/auth/me"),
        ("GET", "/api/customers"),
        ("GET", "/api/accounts"),
        ("POST", "/api/transactions/deposit"),
        ("GET", "/api/audit/logs"),
        ("GET", "/api/compliance/suspicious"),
        ("GET", "/api/reports/customer-accounts"),
    ]

    for method, url in endpoints:
        if method == "GET":
            response = client.get(url)
        else:
            response = client.post(url, json={})

        assert response.status_code == 401
        json_data = response.get_json()
        assert json_data["success"] is False
        assert json_data["code"] == "UNAUTHENTICATED"


def test_rbac_forbidden_access(client):
    """Test role_required returns 403 FORBIDDEN when user lacks required role."""
    # Log in as CUSTOMER role
    with client.session_transaction() as sess:
        sess["user_id"] = 5
        sess["username"] = "customer1"
        sess["role"] = "CUSTOMER"
        sess["customer_id"] = 1

    # Customer trying to access admin audit logs
    response = client.get("/api/audit/logs")
    assert response.status_code == 403
    json_data = response.get_json()
    assert json_data["success"] is False
    assert json_data["code"] == "FORBIDDEN"

    # Customer trying to access compliance suspicious transactions
    response = client.get("/api/compliance/suspicious")
    assert response.status_code == 403
    json_data = response.get_json()
    assert json_data["code"] == "FORBIDDEN"


# --- Beneficiary Validation Tests ---

def test_ifsc_validation():
    """Test IFSC format validator."""
    assert validate_ifsc("SBIN0000001") is True
    assert validate_ifsc("HDFC0001234") is True
    assert validate_ifsc("invalid") is False
    assert validate_ifsc("SBIN000") is False
    assert validate_ifsc("") is False


# --- Loan EMI Mathematical Calculation Tests ---

def test_emi_calculation():
    """Test EMI formula against known banking standard values."""
    # Principal 100,000 at 12% annual rate for 12 months
    # Formula: 100000 * 0.01 * (1.01^12) / (1.01^12 - 1) = 8884.88
    emi = calculate_emi_py(
        principal=Decimal("100000.00"),
        annual_rate=Decimal("12.00"),
        tenure_months=12
    )
    assert emi == Decimal("8884.88")

    # Zero interest rate loan: 120,000 / 12 = 10,000
    zero_emi = calculate_emi_py(
        principal=Decimal("120000.00"),
        annual_rate=Decimal("0.00"),
        tenure_months=12
    )
    assert zero_emi == Decimal("10000.00")

    # Invalid tenure or principal raises ValueError
    with pytest.raises(ValueError):
        calculate_emi_py(Decimal("-500"), Decimal("10"), 12)

    with pytest.raises(ValueError):
        calculate_emi_py(Decimal("1000"), Decimal("10"), 0)
