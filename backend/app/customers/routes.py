"""Customer Management Routes."""

import re
from flask import Blueprint, request, session
from backend.app.customers.service import (
    get_all_customers,
    get_customer_by_id,
    create_customer,
    update_customer,
)
from backend.app.security.utils import (
    login_required,
    role_required,
    success_response,
    error_response,
)

customers_bp = Blueprint("customers", __name__, url_prefix="/api/customers")

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")


@customers_bp.route("", methods=["GET"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER", "AUDITOR", "COMPLIANCE")
def list_customers():
    """List customers with optional pagination and KYC status filter."""
    try:
        limit = int(request.args.get("limit", 50))
        offset = int(request.args.get("offset", 0))
    except ValueError:
        return error_response("Limit and offset must be valid integers.", code="INVALID_PAGINATION", status_code=400)

    kyc_status = request.args.get("kyc_status")
    if kyc_status:
        kyc_status = kyc_status.upper().strip()

    customers = get_all_customers(limit=limit, offset=offset, kyc_status=kyc_status)
    return success_response(customers, status_code=200)


@customers_bp.route("/<int:customer_id>", methods=["GET"])
@login_required
def get_customer(customer_id: int):
    """Retrieve details for a single customer."""
    current_role = session.get("role")
    current_cust_id = session.get("customer_id")

    # If customer role, only allow accessing their own customer ID
    if current_role == "CUSTOMER" and current_cust_id != customer_id:
        return error_response("Access forbidden to requested customer record.", code="FORBIDDEN", status_code=403)

    customer = get_customer_by_id(customer_id)
    if not customer:
        return error_response(f"Customer with ID {customer_id} not found.", code="CUSTOMER_NOT_FOUND", status_code=404)

    return success_response(customer, status_code=200)


@customers_bp.route("", methods=["POST"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER")
def register_customer():
    """Register a new customer record."""
    data = request.get_json(silent=True) or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    address = data.get("address", "").strip() or None
    date_of_birth = data.get("date_of_birth") or None
    kyc_status = data.get("kyc_status", "PENDING").upper().strip()

    if not full_name:
        return error_response("full_name is required.", code="MISSING_FIELD", status_code=400)
    if not email or not EMAIL_REGEX.match(email):
        return error_response("A valid email address is required.", code="INVALID_EMAIL", status_code=400)
    if not phone or len(phone) < 7:
        return error_response("A valid phone number is required.", code="INVALID_PHONE", status_code=400)

    try:
        new_customer = create_customer(
            full_name=full_name,
            email=email,
            phone=phone,
            address=address,
            date_of_birth=date_of_birth,
            kyc_status=kyc_status,
        )
        return success_response(new_customer, status_code=201)
    except Exception as e:
        err_msg = str(e)
        if "unique" in err_msg.lower() or "duplicate" in err_msg.lower():
            return error_response("Customer with this email or phone already exists.", code="DUPLICATE_CUSTOMER", status_code=409)
        return error_response(f"Failed to create customer: {err_msg}", code="CUSTOMER_CREATION_FAILED", status_code=400)


@customers_bp.route("/<int:customer_id>", methods=["PUT"])
@login_required
@role_required("ADMIN", "MANAGER", "TELLER")
def modify_customer(customer_id: int):
    """Update details for an existing customer."""
    data = request.get_json(silent=True) or {}
    if not data:
        return error_response("Request body is empty.", code="EMPTY_BODY", status_code=400)

    customer = get_customer_by_id(customer_id)
    if not customer:
        return error_response(f"Customer with ID {customer_id} not found.", code="CUSTOMER_NOT_FOUND", status_code=404)

    email = data.get("email")
    if email is not None:
        email = email.strip().lower()
        if not EMAIL_REGEX.match(email):
            return error_response("Invalid email format.", code="INVALID_EMAIL", status_code=400)

    phone = data.get("phone")
    if phone is not None:
        phone = phone.strip()
        if len(phone) < 7:
            return error_response("Invalid phone number.", code="INVALID_PHONE", status_code=400)

    kyc_status = data.get("kyc_status")
    if kyc_status is not None:
        kyc_status = kyc_status.upper().strip()

    try:
        updated = update_customer(
            customer_id=customer_id,
            full_name=data.get("full_name"),
            email=email,
            phone=phone,
            address=data.get("address"),
            date_of_birth=data.get("date_of_birth"),
            kyc_status=kyc_status,
        )
        return success_response(updated, status_code=200)
    except Exception as e:
        return error_response(f"Failed to update customer: {str(e)}", code="UPDATE_FAILED", status_code=400)
