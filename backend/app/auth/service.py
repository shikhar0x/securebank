"""Authentication Service (MySQL 8.0+).

Handles user verification, role lookups, and session management queries.
"""

from typing import Optional, Any
from backend.app.db import fetch_one
from backend.app.security.utils import verify_password


def authenticate_user(username: str, password: str) -> Optional[dict[str, Any]]:
    """Verify credentials and return user details if authenticated."""
    if not username or not password:
        return None

    query = """
        SELECT
            u.u_id,
            u.u_cust_id,
            u.u_name,
            u.u_password,
            r.r_name
        FROM users u
        JOIN roles r ON u.u_role = r.r_id
        WHERE u.u_name = %s;
    """
    user = fetch_one(query, (username,))

    if not user:
        return None

    if not verify_password(password, user["u_password"]):
        return None

    return {
        "user_id": user["u_id"],
        "username": user["u_name"],
        "customer_id": user["u_cust_id"],
        "role": user["r_name"]
    }


def get_user_profile(user_id: int) -> Optional[dict[str, Any]]:
    """Retrieve public profile information for a user by u_id."""
    query = """
        SELECT
            u.u_id AS user_id,
            u.u_cust_id AS customer_id,
            u.u_name AS username,
            u.u_created AS created_at,
            r.r_name AS role
        FROM users u
        JOIN roles r ON u.u_role = r.r_id
        WHERE u.u_id = %s;
    """
    return fetch_one(query, (user_id,))
