"""Audit Log Service (MySQL 8.0+).

Provides parameterized search and filtering across the structured audit_logs table.
Uses exact schema columns: log_id, log_txn_id, log_user_id, log_action, log_details, log_time.
"""

from typing import Optional, Any
import json
from backend.app.db import fetch_all, execute_commit


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
    return fetch_all(query, params)


def record_audit_event(
    action: str,
    user_id: Optional[int] = None,
    details: Optional[dict[str, Any]] = None,
) -> None:
    """Explicitly record non-trigger administrative audit events."""
    details_json = json.dumps(details) if details else None
    query = """
        INSERT INTO audit_logs (
            log_user_id,
            log_action,
            log_details
        )
        VALUES (%s, %s, %s);
    """
    execute_commit(query, (user_id, action, details_json))
