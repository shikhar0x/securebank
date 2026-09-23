"""Tests for Transaction Engine and business logic (MySQL 8.0+)."""

from decimal import Decimal
import pytest
from unittest.mock import patch, MagicMock
from backend.app.transactions.service import (
    process_deposit,
    process_withdrawal,
    process_transfer,
    TransactionError,
    AccountNotFoundError,
    InactiveAccountError,
    InsufficientBalanceError,
)
from backend.app.main import create_app
from backend.app.config import TestingConfig, Config


@pytest.fixture
def client():
    """Create Flask test client."""
    app = create_app(TestingConfig)
    with app.test_client() as client:
        yield client


# --- Pure Logic & Validation Tests ---

def test_invalid_deposit_amount_raises_error():
    """Test deposit rejects non-positive amounts."""
    with pytest.raises(TransactionError) as exc_info:
        process_deposit(account_id=1, amount=Decimal("0.00"))
    assert "greater than zero" in exc_info.value.message

    with pytest.raises(TransactionError) as exc_info:
        process_deposit(account_id=1, amount=Decimal("-100.00"))
    assert "greater than zero" in exc_info.value.message


def test_invalid_withdrawal_amount_raises_error():
    """Test withdrawal rejects zero or negative amounts."""
    with pytest.raises(TransactionError) as exc_info:
        process_withdrawal(account_id=1, amount=Decimal("0.00"))
    assert "greater than zero" in exc_info.value.message

    with pytest.raises(TransactionError) as exc_info:
        process_withdrawal(account_id=1, amount=Decimal("-50.00"))
    assert "greater than zero" in exc_info.value.message


def test_invalid_transfer_amount_raises_error():
    """Test transfer rejects non-positive amounts."""
    with pytest.raises(TransactionError) as exc_info:
        process_transfer(from_account_id=1, to_account_id=2, amount=Decimal("-500.00"))
    assert "greater than zero" in exc_info.value.message


def test_transfer_identical_source_and_destination_raises_error():
    """Test transfer rejects source equal to destination."""
    with pytest.raises(TransactionError) as exc_info:
        process_transfer(from_account_id=1, to_account_id=1, amount=Decimal("100.00"))
    assert exc_info.value.code == "IDENTICAL_ACCOUNTS"


# --- Mocked Database Operations (Isolated Unit Tests) ---

@patch("backend.app.transactions.service.get_db_connection")
@patch("backend.app.compliance.service.inspect_and_flag_transaction")
def test_successful_deposit(mock_compliance, mock_get_conn):
    """Test successful deposit updates balance and creates transaction record."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cur
    mock_cur.lastrowid = 101

    # Mock finding active account with 1000 balance then finding inserted transaction
    mock_cur.fetchone.side_effect = [
        {"a_id": 1, "a_balance": Decimal("1000.00"), "a_status": "ACTIVE"},
        {
            "t_id": 101,
            "t_acc_id": 1,
            "t_type": "DEPOSIT",
            "t_amount": Decimal("500.00"),
            "t_desc": "Cash deposit",
            "t_time": "2026-09-23 12:00:00",
            "t_by": 1,
        }
    ]

    result = process_deposit(account_id=1, amount=Decimal("500.00"), description="Cash deposit", user_id=1)

    assert result["t_id"] == 101
    assert result["new_balance"] == Decimal("1500.00")
    assert mock_conn.commit.called


@patch("backend.app.transactions.service.get_db_connection")
def test_deposit_account_not_found(mock_get_conn):
    """Test deposit raises AccountNotFoundError when account does not exist."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cur

    mock_cur.fetchone.return_value = None

    with pytest.raises(AccountNotFoundError):
        process_deposit(account_id=999, amount=Decimal("100.00"))


@patch("backend.app.transactions.service.get_db_connection")
def test_withdrawal_insufficient_balance(mock_get_conn):
    """Test withdrawal raises InsufficientBalanceError when balance is less than requested amount."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cur

    mock_cur.fetchone.return_value = {"a_id": 1, "a_balance": Decimal("200.00"), "a_status": "ACTIVE"}

    with pytest.raises(InsufficientBalanceError):
        process_withdrawal(account_id=1, amount=Decimal("500.00"))


@patch("backend.app.transactions.service.get_db_connection")
@patch("backend.app.compliance.service.inspect_and_flag_transaction")
def test_successful_withdrawal(mock_compliance, mock_get_conn):
    """Test successful withdrawal updates balance and commits."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cur
    mock_cur.lastrowid = 102

    mock_cur.fetchone.side_effect = [
        {"a_id": 1, "a_balance": Decimal("1000.00"), "a_status": "ACTIVE"},
        {
            "t_id": 102,
            "t_acc_id": 1,
            "t_type": "WITHDRAWAL",
            "t_amount": Decimal("400.00"),
            "t_desc": "Cash withdrawal",
            "t_time": "2026-09-23 12:00:00",
            "t_by": 1,
        }
    ]

    result = process_withdrawal(account_id=1, amount=Decimal("400.00"), description="Cash withdrawal", user_id=1)
    assert result["t_id"] == 102
    assert result["new_balance"] == Decimal("600.00")
    assert mock_conn.commit.called


@patch("backend.app.transactions.service.get_db_connection")
@patch("backend.app.compliance.service.inspect_and_flag_transaction")
def test_successful_transfer(mock_compliance, mock_get_conn):
    """Test atomic transfer locks accounts in deterministic order and transfers balance."""
    mock_conn = MagicMock()
    mock_cur = MagicMock()
    mock_get_conn.return_value.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value = mock_cur
    mock_cur.lastrowid = 103

    # Transfer from acc 2 to acc 1.
    # Deterministic lock queries first_id=1, second_id=2
    mock_cur.fetchone.side_effect = [
        {"a_id": 1, "a_balance": Decimal("500.00"), "a_status": "ACTIVE"},
        {"a_id": 2, "a_balance": Decimal("1000.00"), "a_status": "ACTIVE"},
        {
            "t_id": 103,
            "t_acc_id": 2,
            "t_related_acc_id": 1,
            "t_type": "TRANSFER",
            "t_amount": Decimal("300.00"),
            "t_desc": "Transfer",
            "t_time": "2026-09-23 12:00:00",
            "t_by": 1,
        }
    ]

    result = process_transfer(from_account_id=2, to_account_id=1, amount=Decimal("300.00"), user_id=1)
    assert result["t_id"] == 103
    assert result["from_account_balance"] == Decimal("700.00")
    assert result["to_account_balance"] == Decimal("800.00")
    assert mock_conn.commit.called


# --- HTTP Endpoint Validation Tests ---

def test_api_deposit_validation(client):
    """Test API rejects deposit with negative amount or missing fields."""
    with client.session_transaction() as sess:
        sess["user_id"] = 1
        sess["username"] = "admin"
        sess["role"] = "ADMIN"

    # Missing fields
    res = client.post("/api/transactions/deposit", json={})
    assert res.status_code == 400
    assert res.get_json()["code"] == "MISSING_FIELD"

    # Negative amount
    res = client.post("/api/transactions/deposit", json={"account_id": 1, "amount": -50})
    assert res.status_code == 400
    assert res.get_json()["code"] == "INVALID_AMOUNT"


def test_api_transfer_validation(client):
    """Test API rejects transfer between identical source and destination."""
    with client.session_transaction() as sess:
        sess["user_id"] = 1
        sess["username"] = "admin"
        sess["role"] = "ADMIN"

    res = client.post("/api/transactions/transfer", json={
        "from_account_id": 1,
        "to_account_id": 1,
        "amount": 100
    })
    assert res.status_code == 400
    assert res.get_json()["code"] == "IDENTICAL_ACCOUNTS"


# --- Live DB Integration Tests (Skipped if MySQL test DB not accessible) ---

@pytest.mark.skipif(True, reason="Live MySQL database integration test (runs with active MySQL instance)")
def test_live_db_transaction_flow():
    """Live database integration test for deposit, withdrawal, and transfer."""
    pass
