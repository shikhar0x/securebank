"""Compliance Routes."""

from flask import Blueprint, request, session
from backend.app.compliance.service import (
    get_suspicious_transactions,
    get_suspicious_transaction_by_id,
    review_suspicious_transaction,
)
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

compliance_bp = Blueprint("compliance", __name__, url_prefix="/api/compliance")


@compliance_bp.route("/suspicious", methods=["GET"])
@login_required
@role_required("ADMIN", "COMPLIANCE", "MANAGER", "AUDITOR")
def list_suspicious():
    """List suspicious transactions with status filter and pagination."""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    status = request.args.get("status")
    if status:
        status = status.upper().strip()

    records = get_suspicious_transactions(limit=limit, offset=offset, status=status)
    return success_response(records, status_code=200)


@compliance_bp.route("/suspicious/<int:suspicious_id>", methods=["GET"])
@login_required
@role_required("ADMIN", "COMPLIANCE", "MANAGER", "AUDITOR")
def get_suspicious(suspicious_id: int):
    """Retrieve details for a single suspicious transaction."""
    record = get_suspicious_transaction_by_id(suspicious_id)
    if not record:
        return error_response(f"Suspicious transaction record {suspicious_id} not found.", code="NOT_FOUND", status_code=404)

    return success_response(record, status_code=200)


@compliance_bp.route("/suspicious/<int:suspicious_id>/review", methods=["POST"])
@login_required
@role_required("ADMIN", "COMPLIANCE")
def review_suspicious(suspicious_id: int):
    """Review and update the status of a suspicious transaction."""
    data = request.get_json(silent=True) or {}
    status = data.get("status", "").upper().strip()

    if not status:
        return error_response("status field is required ('CLEARED', 'CONFIRMED', 'REVIEWED').", code="MISSING_FIELD", status_code=400)

    user_id = session.get("user_id")
    try:
        updated = review_suspicious_transaction(
            suspicious_id=suspicious_id,
            new_status=status,
            reviewer_user_id=user_id,
        )
        return success_response(updated, status_code=200)
    except ValueError as e:
        return error_response(str(e), code="INVALID_REVIEW_ACTION", status_code=400)
    except Exception as e:
        return error_response(f"Failed to review suspicious record: {str(e)}", code="REVIEW_FAILED", status_code=400)
