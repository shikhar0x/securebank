"""Authentication Routes."""

from flask import Blueprint, request, session
from backend.app.auth.service import authenticate_user, get_user_profile
from backend.app.security.utils import (
    login_required,
    success_response,
    error_response,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    """Authenticate user with username and password, setting session cookie."""
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return error_response(
            "Username and password are required.",
            code="INVALID_CREDENTIALS",
            status_code=400,
        )

    user = authenticate_user(username, password)
    if not user:
        return error_response(
            "Invalid username or password.",
            code="AUTH_FAILED",
            status_code=401,
        )

    # Establish session
    session.clear()
    session["user_id"] = user["user_id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    session["customer_id"] = user.get("customer_id")

    return success_response(user, status_code=200)


@auth_bp.route("/logout", methods=["POST"])
def logout():
    """Log out current user by clearing session."""
    session.clear()
    return success_response({"message": "Successfully logged out."}, status_code=200)


@auth_bp.route("/me", methods=["GET"])
@login_required
def get_current_user():
    """Get profile information for the current session user."""
    user_id = session.get("user_id")
    profile = get_user_profile(user_id)
    if not profile:
        session.clear()
        return error_response("User not found.", code="USER_NOT_FOUND", status_code=404)

    return success_response(profile, status_code=200)
