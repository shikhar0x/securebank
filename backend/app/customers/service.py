"""Customer Service (MySQL 8.0+).

Handles customer records, KYC status, and data validation queries.
"""

from typing import Optional, Any
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_KYC_STATUSES = {"PENDING", "VERIFIED", "REJECTED"}


def get_all_customers(
    limit: int = 50,
    offset: int = 0,
    kyc_status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve paginated list of customers with optional KYC status filtering."""
    params: list[Any] = []
    where_clauses: list[str] = []

    if kyc_status:
        where_clauses.append("c_kyc = %s")
        params.append(kyc_status)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
        SELECT
            c_id,
            c_name,
            c_email,
            c_phone,
            c_address,
            c_dob,
            c_kyc,
            c_created
        FROM customers
        {where_sql}
        ORDER BY c_id ASC
        LIMIT %s OFFSET %s;
    """
    params.extend([limit, offset])
    return fetch_all(query, params)


def get_customer_by_id(customer_id: int) -> Optional[dict[str, Any]]:
    """Retrieve a customer record by its primary key c_id."""
    query = """
        SELECT
            c_id,
            c_name,
            c_email,
            c_phone,
            c_address,
            c_dob,
            c_kyc,
            c_created
        FROM customers
        WHERE c_id = %s;
    """
    return fetch_one(query, (customer_id,))


def create_customer(
    full_name: str,
    email: str,
    phone: str,
    address: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    kyc_status: str = "PENDING",
) -> dict[str, Any]:
    """Create a new customer with parameterized SQL and return the created record."""
    if kyc_status not in VALID_KYC_STATUSES:
        raise ValueError(f"Invalid KYC status: {kyc_status}. Must be one of {VALID_KYC_STATUSES}")

    query = """
        INSERT INTO customers (
            c_name,
            c_email,
            c_phone,
            c_address,
            c_dob,
            c_kyc
        )
        VALUES (%s, %s, %s, %s, %s, %s);
    """
    customer_id = execute_insert(query, (full_name, email, phone, address, date_of_birth, kyc_status))
    return get_customer_by_id(customer_id)


def update_customer(
    customer_id: int,
    full_name: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    address: Optional[str] = None,
    date_of_birth: Optional[str] = None,
    kyc_status: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """Update fields on an existing customer record."""
    updates: list[str] = []
    params: list[Any] = []

    if full_name is not None:
        updates.append("c_name = %s")
        params.append(full_name)
    if email is not None:
        updates.append("c_email = %s")
        params.append(email)
    if phone is not None:
        updates.append("c_phone = %s")
        params.append(phone)
    if address is not None:
        updates.append("c_address = %s")
        params.append(address)
    if date_of_birth is not None:
        updates.append("c_dob = %s")
        params.append(date_of_birth)
    if kyc_status is not None:
        if kyc_status not in VALID_KYC_STATUSES:
            raise ValueError(f"Invalid KYC status: {kyc_status}")
        updates.append("c_kyc = %s")
        params.append(kyc_status)

    if not updates:
        return get_customer_by_id(customer_id)

    params.append(customer_id)
    query = f"""
        UPDATE customers
        SET {', '.join(updates)}
        WHERE c_id = %s;
    """
    execute_commit(query, params)
    return get_customer_by_id(customer_id)
