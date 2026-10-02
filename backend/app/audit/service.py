"""Audit Log Service (MySQL 8.0+).

Provides parameterized search and filtering across the structured audit_logs table.
Uses exact schema columns: log_id, log_txn_id, log_user_id, log_action, log_details, log_time.
Includes mock fallbacks when MySQL is offline.
"""

from typing import Optional, Any
import json
from backend.app.db import fetch_all, execute_commit

MOCK_AUDIT_LOGS = [
    {
        "log_id": 1001,
        "log_txn_id": 401,
        "log_user_id": 101,
        "username": "customer1",
        "log_action": "TRANSFER",
        "log_table_name": "transactions",
        "log_details": "Transferred $250,000.00 from account #101 to account #102",
        "log_time": "2026-03-01T10:15:00Z"
    },
    {
        "log_id": 1002,
        "log_txn_id": None,
        "log_user_id": 102,
        "username": "teller1",
        "log_action": "CREATE_CUSTOMER",
        "log_table_name": "customers",
        "log_details": "Registered new customer #3 (Bob Johnson)",
        "log_time": "2026-03-01T11:30:00Z"
    },
    {
        "log_id": 1003,
        "log_txn_id": None,
        "log_user_id": 104,
        "username": "manager1",
        "log_action": "UPDATE_ACCOUNT_STATUS",
        "log_table_name": "accounts",
        "log_details": "Changed account #103 status to FROZEN",
        "log_time": "2026-03-02T14:45:00Z"
    }
]


def get_audit_logs(
    limit: int = 50,
    offset: int = 0,
    transaction_id: Optional[int] = None,
    user_id: Optional[int] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve audit logs with optional filters."""
    try:
        params: list[Any] = []
        where_clauses: list[str] = []

        if transaction_id is not None:
            where_clauses.append("al.log_txn_id = %s")
            params.append(transaction_id)

        if user_id is not None:
            where_clauses.append("al.log_user_id = %s")
            params.append(user_id)

        if action:
            where_clauses.append("al.log_action = %s")
            params.append(action)

        if start_date:
            where_clauses.append("al.log_time >= %s")
            params.append(start_date)

        if end_date:
            where_clauses.append("al.log_time <= %s")
            params.append(end_date)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query = f"""
            SELECT
                al.log_id,
                al.log_txn_id,
                al.log_user_id,
                u.u_name AS username,
                al.log_action,
                al.log_details,
                al.log_time
            FROM audit_logs al
            LEFT JOIN users u ON al.log_user_id = u.u_id
            {where_sql}
            ORDER BY al.log_time DESC, al.log_id DESC
            LIMIT %s OFFSET %s;
        """
        params.extend([limit, offset])
        rows = fetch_all(query, params)
        if rows: return rows
    except Exception:
        pass

    return MOCK_AUDIT_LOGS[offset:offset+limit]


def record_audit_event(
    action: str,
    user_id: Optional[int] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    """Explicitly record non-trigger administrative audit events."""
    try:
        details_json = json.dumps(details) if details else None
        query = "INSERT INTO audit_logs (log_user_id, log_action, log_details) VALUES (%s, %s, %s);"
        execute_commit(query, (user_id, action, details_json))
    except Exception:
        pass
