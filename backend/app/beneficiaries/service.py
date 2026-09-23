"""Beneficiary Service (MySQL 8.0+).

Manages payees/beneficiaries, cooling period workflows, IFSC validation, and status transitions.
Uses exact schema columns: be_id, be_cust_id, be_name, be_bank, be_acc_no, be_ifsc, be_status, be_created.
"""

import re
from typing import Optional, Any
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_BENEFICIARY_STATUSES = {"PENDING", "ACTIVE", "BLOCKED"}
IFSC_REGEX = re.compile(r"^[A-Z]{4}0[A-Z0-9]{6}$", re.IGNORECASE)


def validate_ifsc(ifsc_code: str) -> bool:
    """Validate Indian Financial System Code format (11 characters)."""
    if not ifsc_code:
        return False
    return bool(IFSC_REGEX.match(ifsc_code.strip()))


def get_customer_beneficiaries(customer_id: int) -> list[dict[str, Any]]:
    """Retrieve all beneficiaries registered by a customer."""
    query = """
        SELECT
            be_id,
            be_cust_id,
            be_name,
            be_bank,
            be_acc_no,
            be_ifsc,
            be_status,
            be_created
        FROM beneficiaries
        WHERE be_cust_id = %s
        ORDER BY be_id ASC;
    """
    return fetch_all(query, (customer_id,))


def get_beneficiary_by_id(beneficiary_id: int) -> Optional[dict[str, Any]]:
    """Retrieve a single beneficiary by ID."""
    query = """
        SELECT
            be_id,
            be_cust_id,
            be_name,
            be_bank,
            be_acc_no,
            be_ifsc,
            be_status,
            be_created
        FROM beneficiaries
        WHERE be_id = %s;
    """
    return fetch_one(query, (beneficiary_id,))


def add_beneficiary(
    customer_id: int,
    beneficiary_name: str,
    bank_name: str,
    account_number: str,
    ifsc_code: str,
) -> dict[str, Any]:
    """Add a new beneficiary in PENDING status (cooling period initiated)."""
    beneficiary_name = beneficiary_name.strip()
    bank_name = bank_name.strip()
    account_number = account_number.strip()
    ifsc_code = ifsc_code.strip().upper()

    if not beneficiary_name:
        raise ValueError("beneficiary_name cannot be empty.")
    if not bank_name:
        raise ValueError("bank_name cannot be empty.")
    if not account_number or len(account_number) < 4:
        raise ValueError("account_number must be at least 4 characters long.")
    if not validate_ifsc(ifsc_code):
        raise ValueError(f"Invalid IFSC code '{ifsc_code}'. Standard format is 4 letters, '0', and 6 alphanumeric characters (e.g., SBIN0000001).")

    query = """
        INSERT INTO beneficiaries (
            be_cust_id,
            be_name,
            be_bank,
            be_acc_no,
            be_ifsc,
            be_status
        )
        VALUES (%s, %s, %s, %s, %s, 'PENDING');
    """
    beneficiary_id = execute_insert(query, (customer_id, beneficiary_name, bank_name, account_number, ifsc_code))
    return get_beneficiary_by_id(beneficiary_id)


def update_beneficiary_status(beneficiary_id: int, new_status: str) -> dict[str, Any]:
    """Update beneficiary status (e.g. activating after cooling period or blocking)."""
    new_status = new_status.upper().strip()
    if new_status not in VALID_BENEFICIARY_STATUSES:
        raise ValueError(f"Invalid status: {new_status}. Must be one of {VALID_BENEFICIARY_STATUSES}")

    beneficiary = get_beneficiary_by_id(beneficiary_id)
    if not beneficiary:
        raise ValueError(f"Beneficiary {beneficiary_id} not found.")

    query = """
        UPDATE beneficiaries
        SET be_status = %s
        WHERE be_id = %s;
    """
    execute_commit(query, (new_status, beneficiary_id))
    return get_beneficiary_by_id(beneficiary_id)
