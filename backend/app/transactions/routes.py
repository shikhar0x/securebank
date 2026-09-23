"""Transaction Routes."""

from decimal import Decimal, InvalidOperation
from flask import Blueprint, request, session
from backend.app.transactions.service import (
    process_deposit,
    process_withdrawal,
    process_transfer,
    get_transaction_by_id,
    get_account_transactions,
    TransactionError,
)
from backend.app.accounts.service import get_account_by_id
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

transactions_bp = Blueprint("transactions", __name__, url_prefix="/api")


@transactions_bp.route("/transactions/deposit", methods=["POST"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER")
def deposit():
    """Deposit money into a bank account."""
    data = request.get_json(silent=True) or {}
    account_id = data.get("account_id")
    amount_raw = data.get("amount")
    description = data.get("description", "Cash deposit")

    if not account_id:
        return error_response("account_id is required.", code="MISSING_FIELD", status_code=400)
    if amount_raw is None:
        return error_response("amount is required.", code="MISSING_FIELD", status_code=400)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0:
            return error_response("Deposit amount must be greater than zero.", code="INVALID_AMOUNT", status_code=400)
    except (InvalidOperation, TypeError, ValueError):
        return error_response("amount must be a valid positive number.", code="INVALID_AMOUNT", status_code=400)

    try:
        user_id = session.get("user_id")
        result = process_deposit(
            account_id=int(account_id),
            amount=amount,
            description=description,
            user_id=user_id,
        )
        return success_response(result, status_code=201)
    except TransactionError as e:
        return error_response(e.message, code=e.code, status_code=e.status_code)
    except Exception as e:
        return error_response(f"Deposit failed: {str(e)}", code="TRANSACTION_ERROR", status_code=400)


@transactions_bp.route("/transactions/withdraw", methods=["POST"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER", "CUSTOMER")
def withdraw():
    """Withdraw funds from an active account."""
    data = request.get_json(silent=True) or {}
    account_id = data.get("account_id")
    amount_raw = data.get("amount")
    description = data.get("description", "Cash withdrawal")

    if not account_id:
        return error_response("account_id is required.", code="MISSING_FIELD", status_code=400)
    if amount_raw is None:
        return error_response("amount is required.", code="MISSING_FIELD", status_code=400)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0:
            return error_response("Withdrawal amount must be greater than zero.", code="INVALID_AMOUNT", status_code=400)
    except (InvalidOperation, TypeError, ValueError):
        return error_response("amount must be a valid positive number.", code="INVALID_AMOUNT", status_code=400)

    # Customer authorization check
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER":
        account = get_account_by_id(int(account_id))
        if not account or account["a_cust_id"] != current_cust_id:
            return error_response("Unauthorized to withdraw from this account.", code="FORBIDDEN", status_code=403)

    try:
        user_id = session.get("user_id")
        result = process_withdrawal(
            account_id=int(account_id),
            amount=amount,
            description=description,
            user_id=user_id,
        )
        return success_response(result, status_code=201)
    except TransactionError as e:
        return error_response(e.message, code=e.code, status_code=e.status_code)
    except Exception as e:
        return error_response(f"Withdrawal failed: {str(e)}", code="TRANSACTION_ERROR", status_code=400)


@transactions_bp.route("/transactions/transfer", methods=["POST"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER", "CUSTOMER")
def transfer():
    """Transfer funds atomically between two accounts."""
    data = request.get_json(silent=True) or {}
    from_account_id = data.get("from_account_id")
    to_account_id = data.get("to_account_id")
    amount_raw = data.get("amount")
    description = data.get("description", "Account transfer")

    if not from_account_id or not to_account_id:
        return error_response("from_account_id and to_account_id are required.", code="MISSING_FIELD", status_code=400)
    if amount_raw is None:
        return error_response("amount is required.", code="MISSING_FIELD", status_code=400)

    try:
        from_id = int(from_account_id)
        to_id = int(to_account_id)
    except (ValueError, TypeError):
        return error_response("Account IDs must be integers.", code="INVALID_ACCOUNT_ID", status_code=400)

    if from_id == to_id:
        return error_response("Source and destination accounts must differ.", code="IDENTICAL_ACCOUNTS", status_code=400)

    try:
        amount = Decimal(str(amount_raw))
        if amount <= 0:
            return error_response("Transfer amount must be greater than zero.", code="INVALID_AMOUNT", status_code=400)
    except (InvalidOperation, TypeError, ValueError):
        return error_response("amount must be a valid positive number.", code="INVALID_AMOUNT", status_code=400)

    # Customer authorization check
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER":
        account = get_account_by_id(from_id)
        if not account or account["a_cust_id"] != current_cust_id:
            return error_response("Unauthorized to transfer from this account.", code="FORBIDDEN", status_code=403)

    try:
        user_id = session.get("user_id")
        result = process_transfer(
            from_account_id=from_id,
            to_account_id=to_id,
            amount=amount,
            description=description,
            user_id=user_id,
        )
        return success_response(result, status_code=201)
    except TransactionError as e:
        return error_response(e.message, code=e.code, status_code=e.status_code)
    except Exception as e:
        return error_response(f"Transfer failed: {str(e)}", code="TRANSACTION_ERROR", status_code=400)


@transactions_bp.route("/transactions/<int:transaction_id>", methods=["GET"])
@login_required
def get_transaction(transaction_id: int):
    """Retrieve details for a specific transaction."""
    txn = get_transaction_by_id(transaction_id)
    if not txn:
        return error_response(f"Transaction {transaction_id} not found.", code="NOT_FOUND", status_code=404)

    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER":
        account = get_account_by_id(txn["t_acc_id"])
        if not account or account["a_cust_id"] != current_cust_id:
            return error_response("Access forbidden to this transaction record.", code="FORBIDDEN", status_code=403)

    return success_response(txn, status_code=200)


@transactions_bp.route("/accounts/<int:account_id>/transactions", methods=["GET"])
@login_required
def get_history(account_id: int):
    """Retrieve transaction history for an account."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")
    if current_role == "CUSTOMER":
        account = get_account_by_id(account_id)
        if not account or account["a_cust_id"] != current_cust_id:
            return error_response("Access forbidden to account transactions.", code="FORBIDDEN", status_code=403)

    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    txn_type = request.args.get("transaction_type")
    if txn_type:
        txn_type = txn_type.upper().strip()

    history = get_account_transactions(account_id=account_id, limit=limit, offset=offset, transaction_type=txn_type)
    return success_response(history, status_code=200)
