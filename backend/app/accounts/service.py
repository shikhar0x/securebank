"""Account Service (MySQL 8.0+).

Handles account lifecycles, balance checks, status transitions, and queries.
"""

import random
from typing import Optional, Any
from decimal import Decimal
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_ACCOUNT_TYPES = {"SAVINGS", "CURRENT"}
VALID_ACCOUNT_STATUSES = {"ACTIVE", "FROZEN", "CLOSED"}


def generate_unique_account_number() -> str:
    """Generate a standard 10-character alphanumeric account number prefixed with SB."""
    digits = "".join([str(random.randint(0, 9)) for _ in range(8)])
    return f"SB{digits}"


def get_all_accounts(
    limit: int = 50,
    offset: int = 0,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve accounts with optional filtering by customer and status."""
    params: list[Any] = []
    where_clauses: list[str] = []

    if customer_id is not None:
        where_clauses.append("a.a_cust_id = %s")
        params.append(customer_id)

    if status:
        where_clauses.append("a.a_status = %s")
        params.append(status)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
        SELECT
            a.a_id,
            a.a_cust_id,
            c.c_name,
            a.a_branch_id,
            b.b_name,
            a.a_number,
            a.a_type,
            a.a_balance,
            a.a_status,
            a.a_created
        FROM accounts a
        JOIN customers c ON a.a_cust_id = c.c_id
        JOIN branches b ON a.a_branch_id = b.b_id
        {where_sql}
        ORDER BY a.a_id ASC
        LIMIT %s OFFSET %s;
    """
    params.extend([limit, offset])
    return fetch_all(query, params)


def get_account_by_id(account_id: int) -> Optional[dict[str, Any]]:
    """Retrieve an account by its primary key with customer and branch details."""
    query = """
        SELECT
            a.a_id,
            a.a_cust_id,
            c.c_name,
            a.a_branch_id,
            b.b_name,
            b.b_code,
            a.a_number,
            a.a_type,
            a.a_balance,
            a.a_status,
            a.a_created
        FROM accounts a
        JOIN customers c ON a.a_cust_id = c.c_id
        JOIN branches b ON a.a_branch_id = b.b_id
        WHERE a.a_id = %s;
    """
    return fetch_one(query, (account_id,))


def get_accounts_by_customer(customer_id: int) -> list[dict[str, Any]]:
    """Retrieve all accounts associated with a specific customer."""
    query = """
        SELECT
            a.a_id,
            a.a_cust_id,
            a.a_branch_id,
            b.b_name,
            b.b_code,
            a.a_number,
            a.a_type,
            a.a_balance,
            a.a_status,
            a.a_created
        FROM accounts a
        JOIN branches b ON a.a_branch_id = b.b_id
        WHERE a.a_cust_id = %s
        ORDER BY a.a_id ASC;
    """
    return fetch_all(query, (customer_id,))


def create_account(
    customer_id: int,
    branch_id: int,
    account_type: str,
    initial_deposit: Decimal = Decimal("0.00"),
) -> dict[str, Any]:
    """Create a new bank account with active status and validated account type."""
    account_type = account_type.upper().strip()
    if account_type not in VALID_ACCOUNT_TYPES:
        raise ValueError(f"Invalid account type: {account_type}. Must be one of {VALID_ACCOUNT_TYPES}")

    if initial_deposit < 0:
        raise ValueError("Initial deposit cannot be negative.")

    account_number = generate_unique_account_number()

    query = """
        INSERT INTO accounts (
            a_cust_id,
            a_branch_id,
            a_number,
            a_type,
            a_balance,
            a_status
        )
        VALUES (%s, %s, %s, %s, %s, 'ACTIVE');
    """
    account_id = execute_insert(query, (customer_id, branch_id, account_number, account_type, initial_deposit))
    return get_account_by_id(account_id)


def update_account_status(account_id: int, new_status: str) -> dict[str, Any]:
    """Update status of an account enforcing state transition rules."""
    new_status = new_status.upper().strip()
    if new_status not in VALID_ACCOUNT_STATUSES:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {VALID_ACCOUNT_STATUSES}")

    account = get_account_by_id(account_id)
    if not account:
        raise ValueError(f"Account {account_id} not found.")

    current_status = account["a_status"]
    balance = Decimal(str(account["a_balance"]))

    if current_status == new_status:
        return account

    if current_status == "CLOSED":
        raise ValueError("Cannot modify status of a CLOSED account.")

    if new_status == "CLOSED" and balance > Decimal("0.00"):
        raise ValueError(f"Cannot close account with positive balance ({balance}). Withdraw funds first.")

    query = """
        UPDATE accounts
        SET a_status = %s
        WHERE a_id = %s;
    """
    execute_commit(query, (new_status, account_id))
    return get_account_by_id(account_id)
