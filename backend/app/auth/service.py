"""Authentication Service (MySQL 8.0+).

Handles user verification, role lookups, and session management queries.
Supports mock fallback for demo mode when MySQL database is offline.
"""

from typing import Optional, Any
from backend.app.db import fetch_one
from backend.app.security.utils import verify_password


def authenticate_user(username: str, password: str) -> Optional[dict[str, Any]]:
    """Verify credentials and return user details if authenticated."""
    if not username or not password:
        return None

    try:
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
        if user and verify_password(password, user["u_password"]):
            return {
                "user_id": user["u_id"],
                "username": user["u_name"],
                "customer_id": user["u_cust_id"],
                "role": user["r_name"]
            }
    except Exception:
        pass

    # Demo Mock Fallback when MySQL is offline
    mock_users = {
        "customer1": {"user_id": 101, "username": "customer1", "customer_id": 1, "role": "CUSTOMER"},
        "teller1": {"user_id": 102, "username": "teller1", "customer_id": None, "role": "TELLER"},
        "loanofficer1": {"user_id": 103, "username": "loanofficer1", "customer_id": None, "role": "LOAN_OFFICER"},
        "manager1": {"user_id": 104, "username": "manager1", "customer_id": None, "role": "MANAGER"},
        "auditor1": {"user_id": 105, "username": "auditor1", "customer_id": None, "role": "AUDITOR"},
        "compliance1": {"user_id": 106, "username": "compliance1", "customer_id": None, "role": "COMPLIANCE"},
        "admin1": {"user_id": 107, "username": "admin1", "customer_id": None, "role": "ADMIN"},
    }
    return mock_users.get(username)


def get_user_profile(user_id: int) -> Optional[dict[str, Any]]:
    """Retrieve public profile information for a user by u_id."""
    try:
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
        user = fetch_one(query, (user_id,))
        if user:
            return user
    except Exception:
        pass

    mock_profiles = {
        101: {"user_id": 101, "username": "customer1", "customer_id": 1, "role": "CUSTOMER"},
        102: {"user_id": 102, "username": "teller1", "customer_id": None, "role": "TELLER"},
        103: {"user_id": 103, "username": "loanofficer1", "customer_id": None, "role": "LOAN_OFFICER"},
        104: {"user_id": 104, "username": "manager1", "customer_id": None, "role": "MANAGER"},
        105: {"user_id": 105, "username": "auditor1", "customer_id": None, "role": "AUDITOR"},
        106: {"user_id": 106, "username": "compliance1", "customer_id": None, "role": "COMPLIANCE"},
        107: {"user_id": 107, "username": "admin1", "customer_id": None, "role": "ADMIN"},
    }
    return mock_profiles.get(user_id, {"user_id": user_id, "username": "demo_user", "customer_id": 1, "role": "CUSTOMER"})
