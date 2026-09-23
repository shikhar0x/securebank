"""Beneficiary Routes."""

from flask import Blueprint, request, session
from backend.app.beneficiaries.service import (
    get_customer_beneficiaries,
    get_beneficiary_by_id,
    add_beneficiary,
    update_beneficiary_status,
)
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

beneficiaries_bp = Blueprint("beneficiaries", __name__, url_prefix="/api")


@beneficiaries_bp.route("/customers/<int:customer_id>/beneficiaries", methods=["GET"])
@login_required
def list_beneficiaries(customer_id: int):
    """Retrieve all beneficiaries for a customer."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and current_cust_id != customer_id:
        return error_response("Access forbidden to customer beneficiaries.", code="FORBIDDEN", status_code=403)

    beneficiaries = get_customer_beneficiaries(customer_id)
    return success_response(beneficiaries, status_code=200)


@beneficiaries_bp.route("/customers/<int:customer_id>/beneficiaries", methods=["POST"])
@login_required
def create_beneficiary(customer_id: int):
    """Add a new beneficiary in PENDING status for cooling period verification."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and current_cust_id != customer_id:
        return error_response("Unauthorized to add beneficiaries for this customer.", code="FORBIDDEN", status_code=403)

    data = request.get_json(silent=True) or {}
    beneficiary_name = data.get("beneficiary_name", "")
    bank_name = data.get("bank_name", "")
    account_number = data.get("account_number", "")
    ifsc_code = data.get("ifsc_code", "")

    try:
        new_beneficiary = add_beneficiary(
            customer_id=customer_id,
            beneficiary_name=beneficiary_name,
            bank_name=bank_name,
            account_number=account_number,
            ifsc_code=ifsc_code,
        )
        return success_response(new_beneficiary, status_code=201)
    except ValueError as e:
        return error_response(str(e), code="VALIDATION_ERROR", status_code=400)
    except Exception as e:
        return error_response(f"Failed to add beneficiary: {str(e)}", code="BENEFICIARY_CREATION_FAILED", status_code=400)


@beneficiaries_bp.route("/beneficiaries/<int:beneficiary_id>/status", methods=["PUT"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER")
def update_status(beneficiary_id: int):
    """Update beneficiary status (e.g., approve to ACTIVE or BLOCKED)."""
    data = request.get_json(silent=True) or {}
    status = data.get("status", "").upper().strip()

    if not status:
        return error_response("status field is required.", code="MISSING_FIELD", status_code=400)

    try:
        updated = update_beneficiary_status(beneficiary_id, status)
        return success_response(updated, status_code=200)
    except ValueError as e:
        return error_response(str(e), code="INVALID_STATUS", status_code=400)
    except Exception as e:
        return error_response(f"Failed to update beneficiary status: {str(e)}", code="UPDATE_FAILED", status_code=400)
