"""Reporting and View Routes (MySQL 8.0+).

Directly queries MySQL reporting views (v_customer_accounts, v_transaction_history, v_loan_report, v_audit_report)
without reinventing them in application code.
"""

from flask import Blueprint, request
from backend.app.db import fetch_all
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")


def get_pagination_params() -> tuple[int, int]:
    """Parse limit and offset from query parameters."""
    limit = int(request.args.get("limit", 50))
    offset = int(request.args.get("offset", 0))
    return limit, offset


@reports_bp.route("/customer-accounts", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER", "AUDITOR")
def report_customer_accounts():
    """Query v_customer_accounts view."""
    try:
        limit, offset = get_pagination_params()
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    query = """
        SELECT *
        FROM v_customer_accounts
        ORDER BY c_id ASC, a_id ASC
        LIMIT %s OFFSET %s;
    """
    rows = fetch_all(query, (limit, offset))
    return success_response(rows, status_code=200)


@reports_bp.route("/transactions", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "AUDITOR", "COMPLIANCE")
def report_transactions():
    """Query v_transaction_history view."""
    try:
        limit, offset = get_pagination_params()
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    query = """
        SELECT *
        FROM v_transaction_history
        ORDER BY t_time DESC, t_id DESC
        LIMIT %s OFFSET %s;
    """
    rows = fetch_all(query, (limit, offset))
    return success_response(rows, status_code=200)


@reports_bp.route("/loans", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "LOAN_OFFICER", "AUDITOR")
def report_loans():
    """Query v_loan_report view."""
    try:
        limit, offset = get_pagination_params()
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    query = """
        SELECT *
        FROM v_loan_report
        ORDER BY l_created DESC, l_id DESC
        LIMIT %s OFFSET %s;
    """
    rows = fetch_all(query, (limit, offset))
    return success_response(rows, status_code=200)


@reports_bp.route("/audit", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "AUDITOR", "COMPLIANCE")
def report_audit():
    """Query v_audit_report view."""
    try:
        limit, offset = get_pagination_params()
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    query = """
        SELECT *
        FROM v_audit_report
        ORDER BY log_time DESC, log_id DESC
        LIMIT %s OFFSET %s;
    """
    rows = fetch_all(query, (limit, offset))
    return success_response(rows, status_code=200)
