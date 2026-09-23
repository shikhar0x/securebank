"""Security and Response Utilities.

Provides password hashing, session checking, RBAC decorators,
and standardized JSON response structures.
"""

from functools import wraps
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Callable
from flask import jsonify, session, Response
from werkzeug.security import generate_password_hash, check_password_hash

# Documented valid roles in SecureBank
VALID_ROLES = {
    "ADMIN",
    "MANAGER",
    "TELLER",
    "LOAN_OFFICER",
    "AUDITOR",
    "CUSTOMER",
    "COMPLIANCE",
}


def hash_password(password: str) -> str:
    """Hash a plaintext password using Werkzeug's secure hash algorithm."""
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a stored password hash."""
    return check_password_hash(password_hash, password)


def serialize_db_data(val: Any) -> Any:
    """Convert non-JSON-serializable objects (Decimal, datetime, date) into JSON-compatible values."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dict):
        return {k: serialize_db_data(v) for k, v in val.items()}
    if isinstance(val, list):
        return [serialize_db_data(item) for item in val]
    return val


def success_response(data: Any = None, status_code: int = 200) -> tuple[Response, int]:
    """Generate a standard success JSON response."""
    payload = {
        "success": True,
        "data": serialize_db_data(data) if data is not None else {}
    }
    return jsonify(payload), status_code


def error_response(message: str, code: str = "BAD_REQUEST", status_code: int = 400) -> tuple[Response, int]:
    """Generate a standard error JSON response."""
    payload = {
        "success": False,
        "error": message,
        "code": code
    }
    return jsonify(payload), status_code


def login_required(f: Callable) -> Callable:
    """Decorator ensuring that a user is authenticated in the session."""
    @wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        user_id = session.get("user_id")
        if not user_id:
            return error_response(
                "Authentication required. Please log in.",
                code="UNAUTHENTICATED",
                status_code=401
            )
        return f(*args, **kwargs)
    return decorated_function


def role_required(*allowed_roles: str) -> Callable:
    """Decorator ensuring that the logged-in user possesses one of the allowed roles."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            user_id = session.get("user_id")
            if not user_id:
                return error_response(
                    "Authentication required. Please log in.",
                    code="UNAUTHENTICATED",
                    status_code=401
                )

            user_role = session.get("role")
            if not user_role or user_role not in allowed_roles:
                return error_response(
                    f"Access forbidden: requires one of the following roles: {', '.join(allowed_roles)}.",
                    code="FORBIDDEN",
                    status_code=403
                )
            return f(*args, **kwargs)
        return decorated_function
    return decorator
