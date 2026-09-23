"""Account Routes."""

from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, session
from backend.app.accounts.service import (
    get_all_accounts,
    get_account_by_id,
    get_accounts_by_customer,
    create_account,
    update_account_status,
)
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

accounts_bp = Blueprint("accounts", __name__, url_prefix="/api")


@accounts_bp.route("/accounts", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER", "AUDITOR", "COMPLIANCE")
def list_accounts():
    """List bank accounts with pagination and filtering."""
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

    accounts = get_all_accounts(limit=limit, offset=offset, customer_id=cust_id_int, status=status)
    return success_response(accounts, status_code=200)


@accounts_bp.route("/accounts/<int:account_id>", methods=["GET"])
@login_required
def get_single_account(account_id: int):
    """Retrieve details of a single account."""
    account = get_account_by_id(account_id)
    if not account:
        return error_response(f"Account with ID {account_id} not found.", code="ACCOUNT_NOT_FOUND", status_code=404)

    # If customer role, only allow access to their own account
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and account["a_cust_id"] != current_cust_id:
        return error_response("Access forbidden to this account.", code="FORBIDDEN", status_code=403)

    return success_response(account, status_code=200)


@accounts_bp.route("/customers/<int:customer_id>/accounts", methods=["GET"])
@login_required
def get_customer_accounts_route(customer_id: int):
    """Retrieve all accounts for a specific customer."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER" and current_cust_id != customer_id:
        return error_response("Access forbidden to customer accounts.", code="FORBIDDEN", status_code=403)

    accounts = get_accounts_by_customer(customer_id)
    return success_response(accounts, status_code=200)


@accounts_bp.route("/accounts", methods=["POST"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER")
def open_account():
    """Open a new account for a customer."""
    data = request.get_json(silent=True) or {}
    customer_id = data.get("customer_id")
    branch_id = data.get("branch_id")
    account_type = data.get("account_type", "").upper().strip()
    initial_deposit_raw = data.get("initial_deposit", 0)

    if not customer_id or not branch_id:
        return error_response("customer_id and branch_id are required.", code="MISSING_FIELD", status_code=400)
    if not account_type:
        return error_response("account_type ('SAVINGS' or 'CURRENT') is required.", code="MISSING_FIELD", status_code=400)

    try:
        initial_deposit = Decimal(str(initial_deposit_raw))
    except (InvalidOperation, TypeError, ValueError):
        return error_response("initial_deposit must be a valid numeric amount.", code="INVALID_AMOUNT", status_code=400)

    try:
        account = create_account(
            customer_id=int(customer_id),
            branch_id=int(branch_id),
            account_type=account_type,
            initial_deposit=initial_deposit,
        )
        return success_response(account, status_code=201)
    except ValueError as e:
        return error_response(str(e), code="VALIDATION_ERROR", status_code=400)
    except Exception as e:
        return error_response(f"Failed to open account: {str(e)}", code="ACCOUNT_CREATION_FAILED", status_code=400)


@accounts_bp.route("/accounts/<int:account_id>/status", methods=["PUT"])
@login_required
@role_required("ADMIN", "MANAGER")
def update_status(account_id: int):
    """Change account status (ACTIVE, FROZEN, CLOSED)."""
    data = request.get_json(silent=True) or {}
    new_status = data.get("status", "").upper().strip()

    if not new_status:
        return error_response("status field is required.", code="MISSING_FIELD", status_code=400)

    try:
        updated = update_account_status(account_id, new_status)
        return success_response(updated, status_code=200)
    except ValueError as e:
        return error_response(str(e), code="INVALID_STATUS_TRANSITION", status_code=409)
    except Exception as e:
        return error_response(f"Failed to update account status: {str(e)}", code="UPDATE_FAILED", status_code=400)
