"""Loan Routes."""

from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, session
from backend.app.loans.service import (
    get_all_loans,
    get_loan_by_id,
    get_customer_loans,
    create_loan,
    update_loan_status,
)
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

loans_bp = Blueprint("loans", __name__, url_prefix="/api")


@loans_bp.route("/loans", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "LOAN_OFFICER", "AUDITOR")
def list_loans():
    """List loan applications with optional status and customer filters."""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    customer_id = request.args.get("customer_id")
    cust_id_int = int(customer_id) if customer_id and customer_id.isdigit() else None
    status = request.args.get("status")
    if status:
        status = status.upper().strip()

    loans = get_all_loans(limit=limit, offset=offset, customer_id=cust_id_int, status=status)
    return success_response(loans, status_code=200)


@loans_bp.route("/loans/<int:loan_id>", methods=["GET"])
@login_required
def get_loan(loan_id: int):
    """Retrieve details for a single loan."""
    loan = get_loan_by_id(loan_id)
    if not loan:
        return error_response(f"Loan with ID {loan_id} not found.", code="LOAN_NOT_FOUND", status_code=404)

    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and loan["l_cust_id"] != current_cust_id:
        return error_response("Access forbidden to this loan record.", code="FORBIDDEN", status_code=403)

    return success_response(loan, status_code=200)


@loans_bp.route("/customers/<int:customer_id>/loans", methods=["GET"])
@login_required
def get_customer_loans_route(customer_id: int):
    """Retrieve all loans associated with a customer."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and current_cust_id != customer_id:
        return error_response("Access forbidden to customer loans.", code="FORBIDDEN", status_code=403)

    loans = get_customer_loans(customer_id)
    return success_response(loans, status_code=200)


@loans_bp.route("/loans", methods=["POST"])
@login_required
def apply_for_loan():
    """Apply for a new loan."""
    data = request.get_json(silent=True) or {}
    customer_id = data.get("customer_id")
    loan_type = data.get("loan_type", "").strip()
    principal_raw = data.get("principal_amount")
    rate_raw = data.get("interest_rate")
    tenure_raw = data.get("tenure_months")

    if not customer_id or not loan_type or principal_raw is None or rate_raw is None or tenure_raw is None:
        return error_response("customer_id, loan_type, principal_amount, interest_rate, and tenure_months are required.", code="MISSING_FIELD", status_code=400)

    # Authorization check for customer role
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and int(customer_id) != current_cust_id:
        return error_response("Unauthorized to apply for loan on behalf of another customer.", code="FORBIDDEN", status_code=403)

    try:
        principal = Decimal(str(principal_raw))
        interest_rate = Decimal(str(rate_raw))
        tenure_months = int(tenure_raw)
    except (InvalidOperation, TypeError, ValueError):
        return error_response("Invalid numeric values for principal, interest rate, or tenure.", code="INVALID_NUMERIC", status_code=400)

    try:
        new_loan = create_loan(
            customer_id=int(customer_id),
            loan_type=loan_type,
            principal_amount=principal,
            interest_rate=interest_rate,
            tenure_months=tenure_months,
        )
        return success_response(new_loan, status_code=201)
    except ValueError as e:
        return error_response(str(e), code="VALIDATION_ERROR", status_code=400)
    except Exception as e:
        return error_response(f"Failed to submit loan application: {str(e)}", code="LOAN_CREATION_FAILED", status_code=400)


@loans_bp.route("/loans/<int:loan_id>/status", methods=["PUT"])
@login_required
@role_required("ADMIN", "MANAGER", "LOAN_OFFICER")
def change_loan_status(loan_id: int):
    """Approve, reject, or update status of a loan."""
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "").upper().strip()

    if not new_status:
        return error_response("status field is required.", code="MISSING_FIELD", status_code=400)

    try:
        updated = update_loan_status(loan_id, new_status)
        return success_response(updated, status_code=200)
    except ValueError as e:
        return error_response(str(e), code="INVALID_STATUS", status_code=400)
    except Exception as e:
        return error_response(f"Failed to update loan status: {str(e)}", code="UPDATE_FAILED", status_code=400)
