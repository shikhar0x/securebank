"""Compliance Service (MySQL 8.0+).

Implements deterministic suspicious-transaction detection rules and review workflows.
Uses exact schema columns: s_id, s_txn_id, s_reason, s_status, s_created.
"""

from decimal import Decimal
from typing import Optional, Any
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_COMPLIANCE_STATUSES = {"PENDING", "REVIEWED", "CLEARED", "CONFIRMED"}

# Thresholds for deterministic compliance simulation
LARGE_AMOUNT_THRESHOLD = Decimal("200000.00")
RAPID_COUNT_THRESHOLD = 3
RAPID_WINDOW_MINUTES = 10


def inspect_and_flag_transaction(
    transaction_id: int,
    account_id: int,
    amount: Decimal,
    transaction_type: str,
) -> Optional[dict[str, Any]]:
    """Evaluate deterministic rules against a committed transaction and flag if suspicious."""
    reason = None

    # Rule 1: Large amount
    if amount >= LARGE_AMOUNT_THRESHOLD:
        reason = f"LARGE_AMOUNT: Transaction amount {amount} exceeds large transaction threshold ({LARGE_AMOUNT_THRESHOLD})."

    # Rule 2: Rapid successive transactions on the same account
    if not reason:
        try:
            recent_count_row = fetch_one(
                """
                SELECT COUNT(*) AS count
                FROM transactions
                WHERE t_acc_id = %s
                  AND t_time >= CURRENT_TIMESTAMP - INTERVAL 10 MINUTE;
                """,
                (account_id,)
            )
            count = recent_count_row["count"] if recent_count_row else 0
            if count > RAPID_COUNT_THRESHOLD:
                reason = f"RAPID_TRANSACTIONS: Account {account_id} executed {count} transactions within {RAPID_WINDOW_MINUTES} minutes."
        except Exception:
            pass

    # Rule 3: High value round sum
    if not reason and amount >= Decimal("50000.00") and (amount % Decimal("10000.00") == 0):
        reason = f"ROUND_SUM_PATTERN: Transaction amount {amount} matches round-sum structured pattern."

    if not reason:
        return None

    query = """
        INSERT IGNORE INTO suspicious_transactions (
            s_txn_id,
            s_reason,
            s_status
        )
        VALUES (%s, %s, 'PENDING');
    """
    try:
        suspicious_id = execute_insert(query, (transaction_id, reason))
        if suspicious_id:
            return get_suspicious_transaction_by_id(suspicious_id)
        row = fetch_one("SELECT s_id FROM suspicious_transactions WHERE s_txn_id = %s;", (transaction_id,))
        return get_suspicious_transaction_by_id(row["s_id"]) if row else None
    except Exception:
        return None


def get_suspicious_transactions(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve paginated suspicious transactions with transaction context."""
    params: list[Any] = []
    where_clauses: list[str] = []

    if status:
        where_clauses.append("st.s_status = %s")
        params.append(status)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
        SELECT
            st.s_id,
            st.s_txn_id,
            t.t_acc_id,
            t.t_type,
            t.t_amount,
            st.s_reason,
            st.s_status,
            st.s_created
        FROM suspicious_transactions st
        JOIN transactions t ON st.s_txn_id = t.t_id
        {where_sql}
        ORDER BY st.s_id DESC
        LIMIT %s OFFSET %s;
    """
    params.extend([limit, offset])
    return fetch_all(query, params)


def get_suspicious_transaction_by_id(suspicious_id: int) -> Optional[dict[str, Any]]:
    """Retrieve details of a single suspicious transaction."""
    query = """
        SELECT
            st.s_id,
            st.s_txn_id,
            t.t_acc_id,
            t.t_type,
            t.t_amount,
            st.s_reason,
            st.s_status,
            st.s_created
        FROM suspicious_transactions st
        JOIN transactions t ON st.s_txn_id = t.t_id
        WHERE st.s_id = %s;
    """
    return fetch_one(query, (suspicious_id,))


def review_suspicious_transaction(
    suspicious_id: int,
    new_status: str,
    reviewer_user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Review and update the status of a suspicious transaction."""
    new_status = new_status.upper().strip()
    if new_status not in VALID_COMPLIANCE_STATUSES:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {VALID_COMPLIANCE_STATUSES}")

    query = """
        UPDATE suspicious_transactions
        SET s_status = %s
        WHERE s_id = %s;
    """
    execute_commit(query, (new_status, suspicious_id))
    result = get_suspicious_transaction_by_id(suspicious_id)
    if not result:
        raise ValueError(f"Suspicious transaction record {suspicious_id} not found.")
    return result
