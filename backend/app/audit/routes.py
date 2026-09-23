"""Audit Routes."""

from flask import Blueprint, request
from backend.app.audit.service import get_audit_logs
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

audit_bp = Blueprint("audit", __name__, url_prefix="/api/audit")


@audit_bp.route("/logs", methods=["GET"])
@login_required
@role_required("ADMIN", "AUDITOR", "MANAGER", "COMPLIANCE")
def list_logs():
    """Retrieve audit log history with parameterized filters."""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    txn_id = request.args.get("transaction_id")
    txn_id_int = int(txn_id) if txn_id and txn_id.isdigit() else None

    user_id = request.args.get("user_id")
    user_id_int = int(user_id) if user_id and user_id.isdigit() else None

    action = request.args.get("action")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")

    logs = get_audit_logs(
        limit=limit,
        offset=offset,
        transaction_id=txn_id_int,
        user_id=user_id_int,
        action=action,
        start_date=start_date,
        end_date=end_date,
    )
    return success_response(logs, status_code=200)
