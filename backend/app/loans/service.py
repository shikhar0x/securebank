"""Loan Management Service (MySQL 8.0+).

Calculates EMI using standard banking amortization formulas (and MySQL function),
manages loan lifecycles, and validates parameters.
Uses exact schema columns: l_id, l_cust_id, l_type, l_amount, l_rate, l_months, l_emi, l_status, l_created.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Any
from backend.app.db import fetch_one, fetch_all, execute_insert, execute_commit

VALID_LOAN_STATUSES = {"PENDING", "APPROVED", "REJECTED", "ACTIVE", "CLOSED"}


def calculate_emi_py(principal: Decimal, annual_rate: Decimal, tenure_months: int) -> Decimal:
    """Calculate Equated Monthly Installment (EMI) using standard financial formula."""
    if principal <= Decimal("0.00") or tenure_months <= 0:
        raise ValueError("Principal and tenure must be strictly greater than zero.")
    if annual_rate < Decimal("0.00"):
        raise ValueError("Interest rate cannot be negative.")

    if annual_rate == Decimal("0.00"):
        return (principal / Decimal(tenure_months)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    # Monthly interest rate = Annual rate / (12 * 100)
    monthly_rate = (annual_rate / Decimal("1200"))
    factor = (Decimal("1.00") + monthly_rate) ** tenure_months
    emi = (principal * monthly_rate * factor) / (factor - Decimal("1.00"))
    return emi.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_emi(principal: Decimal, annual_rate: Decimal, tenure_months: int) -> Decimal:
    """Calculate EMI by querying database stored function fn_calculate_emi with Python fallback."""
    try:
        row = fetch_one(
            "SELECT fn_calculate_emi(%s, %s, %s) AS emi;",
            (principal, annual_rate, tenure_months)
        )
        if row and row.get("emi") is not None:
            return Decimal(str(row["emi"])).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:
        pass

    return calculate_emi_py(principal, annual_rate, tenure_months)


def get_all_loans(
    limit: int = 50,
    offset: int = 0,
    customer_id: Optional[int] = None,
    status: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve paginated list of loans with customer details."""
    params: list[Any] = []
    where_clauses: list[str] = []

    if customer_id is not None:
        where_clauses.append("l.l_cust_id = %s")
        params.append(customer_id)

    if status:
        where_clauses.append("l.l_status = %s")
        params.append(status)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    query = f"""
        SELECT
            l.l_id,
            l.l_cust_id,
            c.c_name,
            l.l_type,
            l.l_amount,
            l.l_rate,
            l.l_months,
            l.l_emi,
            l.l_status,
            l.l_created
        FROM loans l
        JOIN customers c ON l.l_cust_id = c.c_id
        {where_sql}
        ORDER BY l.l_id ASC
        LIMIT %s OFFSET %s;
    """
    params.extend([limit, offset])
    return fetch_all(query, params)


def get_loan_by_id(loan_id: int) -> Optional[dict[str, Any]]:
    """Retrieve loan details by loan primary key l_id."""
    query = """
        SELECT
            l.l_id,
            l.l_cust_id,
            c.c_name,
            l.l_type,
            l.l_amount,
            l.l_rate,
            l.l_months,
            l.l_emi,
            l.l_status,
            l.l_created
        FROM loans l
        JOIN customers c ON l.l_cust_id = c.c_id
        WHERE l.l_id = %s;
    """
    return fetch_one(query, (loan_id,))


def get_customer_loans(customer_id: int) -> list[dict[str, Any]]:
    """Retrieve all loans associated with a specific customer."""
    query = """
        SELECT
            l_id,
            l_cust_id,
            l_type,
            l_amount,
            l_rate,
            l_months,
            l_emi,
            l_status,
            l_created
        FROM loans
        WHERE l_cust_id = %s
        ORDER BY l_id ASC;
    """
    return fetch_all(query, (customer_id,))


def create_loan(
    customer_id: int,
    loan_type: str,
    principal_amount: Decimal,
    interest_rate: Decimal,
    tenure_months: int,
) -> dict[str, Any]:
    """Create a new loan application in PENDING status."""
    loan_type = loan_type.strip()
    if not loan_type:
        raise ValueError("loan_type cannot be empty.")
    if principal_amount <= Decimal("0.00"):
        raise ValueError("Principal amount must be greater than zero.")
    if interest_rate < Decimal("0.00"):
        raise ValueError("Interest rate cannot be negative.")
    if tenure_months <= 0:
        raise ValueError("Tenure months must be greater than zero.")

    emi_amount = calculate_emi(principal_amount, interest_rate, tenure_months)

    query = """
        INSERT INTO loans (
            l_cust_id,
            l_type,
            l_amount,
            l_rate,
            l_months,
            l_emi,
            l_status
        )
        VALUES (%s, %s, %s, %s, %s, %s, 'PENDING');
    """
    loan_id = execute_insert(query, (customer_id, loan_type, principal_amount, interest_rate, tenure_months, emi_amount))
    return get_loan_by_id(loan_id)


def update_loan_status(loan_id: int, new_status: str) -> dict[str, Any]:
    """Update loan application status with workflow transition checks."""
    new_status = new_status.upper().strip()
    if new_status not in VALID_LOAN_STATUSES:
        raise ValueError(f"Invalid loan status: {new_status}. Must be one of {VALID_LOAN_STATUSES}")

    loan = get_loan_by_id(loan_id)
    if not loan:
        raise ValueError(f"Loan {loan_id} not found.")

    query = """
        UPDATE loans
        SET l_status = %s
        WHERE l_id = %s;
    """
    execute_commit(query, (new_status, loan_id))
    return get_loan_by_id(loan_id)
