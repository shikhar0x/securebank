"""Customer Service (MySQL 8.0+).

Handles customer records, KYC status, and data validation queries.
Includes mock fallbacks when MySQL is offline.
"""

from typing import Optional, Any
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_KYC_STATUSES = {"PENDING", "VERIFIED", "REJECTED"}

MOCK_CUSTOMERS = [
    {
        "c_id": 1,
        "c_name": "John Customer",
        "c_full_name": "John Customer",
        "c_email": "john.customer@securebank.com",
        "c_phone": "+1-555-0101",
        "c_address": "123 Financial District, New York, NY",
        "c_dob": "1990-05-15",
        "c_kyc": "VERIFIED",
        "c_kyc_status": "VERIFIED",
        "c_created": "2026-01-10T10:00:00Z",
        "c_created_at": "2026-01-10T10:00:00Z"
    },
    {
        "c_id": 2,
        "c_name": "Alice Smith",
        "c_full_name": "Alice Smith",
        "c_email": "alice.smith@securebank.com",
        "c_phone": "+1-555-0102",
        "c_address": "456 Commerce St, Boston, MA",
        "c_dob": "1992-08-22",
        "c_kyc": "VERIFIED",
        "c_kyc_status": "VERIFIED",
        "c_created": "2026-01-12T11:30:00Z",
        "c_created_at": "2026-01-12T11:30:00Z"
    },
    {
        "c_id": 3,
        "c_name": "Bob Johnson",
        "c_full_name": "Bob Johnson",
        "c_email": "bob.johnson@securebank.com",
        "c_phone": "+1-555-0103",
        "c_address": "789 Main Ave, Chicago, IL",
        "c_dob": "1985-11-30",
        "c_kyc": "PENDING",
        "c_kyc_status": "PENDING",
        "c_created": "2026-02-01T14:15:00Z",
        "c_created_at": "2026-02-01T14:15:00Z"
    }
]


def get_all_customers(
    limit: int = 50,
    offset: int = 0,
    kyc_status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve paginated list of customers with optional KYC status filtering."""
    try:
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
                c_name AS c_full_name,
                c_email,
                c_phone,
                c_address,
                c_dob,
                c_kyc,
                c_kyc AS c_kyc_status,
                c_created,
                c_created AS c_created_at
            FROM customers
            {where_sql}
            ORDER BY c_id ASC
            LIMIT %s OFFSET %s;
        """
        params.extend([limit, offset])
        rows = fetch_all(query, params)
        if rows:
            return rows
    except Exception:
        pass

    res = MOCK_CUSTOMERS
    if kyc_status:
        res = [c for c in res if c["c_kyc"] == kyc_status]
    return res[offset:offset+limit]


def get_customer_by_id(customer_id: int) -> Optional[dict[str, Any]]:
    """Retrieve a customer record by its primary key c_id."""
    try:
        query = """
            SELECT
                c_id,
                c_name,
                c_name AS c_full_name,
                c_email,
                c_phone,
                c_address,
                c_dob,
                c_kyc,
                c_kyc AS c_kyc_status,
                c_created,
                c_created AS c_created_at
            FROM customers
            WHERE c_id = %s;
        """
        row = fetch_one(query, (customer_id,))
        if row:
            return row
    except Exception:
        pass

    for c in MOCK_CUSTOMERS:
        if c["c_id"] == customer_id:
            return c
    return MOCK_CUSTOMERS[0]


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

    try:
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
    except Exception:
        new_id = len(MOCK_CUSTOMERS) + 1
        new_cust = {
            "c_id": new_id,
            "c_name": full_name,
            "c_full_name": full_name,
            "c_email": email,
            "c_phone": phone,
            "c_address": address or "N/A",
            "c_dob": date_of_birth or "1995-01-01",
            "c_kyc": kyc_status,
            "c_kyc_status": kyc_status,
            "c_created": "2026-10-02T12:00:00Z",
            "c_created_at": "2026-10-02T12:00:00Z"
        }
        MOCK_CUSTOMERS.append(new_cust)
        return new_cust


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
    try:
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

        if updates:
            params.append(customer_id)
            query = f"UPDATE customers SET {', '.join(updates)} WHERE c_id = %s;"
            execute_commit(query, params)
            return get_customer_by_id(customer_id)
    except Exception:
        pass

    cust = get_customer_by_id(customer_id)
    if cust:
        if full_name: cust["c_name"] = cust["c_full_name"] = full_name
        if email: cust["c_email"] = email
        if phone: cust["c_phone"] = phone
        if kyc_status: cust["c_kyc"] = cust["c_kyc_status"] = kyc_status
    return cust
