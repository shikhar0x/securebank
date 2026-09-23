"""Transaction Engine Service (MySQL 8.0+).

Demonstrates ACID principles, deterministic row-level locking (deadlock prevention),
atomic transfers, rollback handling, and compliance checks in MySQL.
Uses exact schema columns: a_id, a_balance, a_status, t_id, t_acc_id, t_related_acc_id, t_type, t_amount, t_desc, t_time, t_by.
"""

from decimal import Decimal
from typing import Optional, Any
from backend.app.db import get_db_connection, fetch_one, fetch_all


class TransactionError(Exception):
    """Base exception for banking transaction errors."""
    def __init__(self, message: str, code: str = "TRANSACTION_FAILED", status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class AccountNotFoundError(TransactionError):
    def __init__(self, account_id: int):
        super().__init__(f"Account {account_id} does not exist.", code="ACCOUNT_NOT_FOUND", status_code=404)


class InactiveAccountError(TransactionError):
    def __init__(self, account_id: int, status: str):
        super().__init__(f"Account {account_id} is not active (current status: {status}).", code="ACCOUNT_INACTIVE", status_code=409)


class InsufficientBalanceError(TransactionError):
    def __init__(self, current_balance: Decimal, requested_amount: Decimal):
        super().__init__(
            f"Insufficient funds: current balance {current_balance} is less than requested amount {requested_amount}.",
            code="INSUFFICIENT_BALANCE",
            status_code=409
        )


def process_deposit(
    account_id: int,
    amount: Decimal,
    description: Optional[str] = "Cash deposit",
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Execute atomic deposit into an active account."""
    if amount <= Decimal("0.00"):
        raise TransactionError("Deposit amount must be greater than zero.", code="INVALID_AMOUNT")

    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        try:
            # 1. Lock account row for update
            cursor.execute(
                "SELECT a_id, a_balance, a_status FROM accounts WHERE a_id = %s FOR UPDATE;",
                (account_id,)
            )
            account = cursor.fetchone()

            if not account:
                raise AccountNotFoundError(account_id)

            if account["a_status"] != "ACTIVE":
                raise InactiveAccountError(account_id, account["a_status"])

            # 2. Update account balance
            new_balance = account["a_balance"] + amount
            cursor.execute(
                "UPDATE accounts SET a_balance = %s WHERE a_id = %s;",
                (new_balance, account_id)
            )

            # 3. Record transaction
            cursor.execute(
                """
                INSERT INTO transactions (
                    t_acc_id,
                    t_type,
                    t_amount,
                    t_desc,
                    t_by
                )
                VALUES (%s, 'DEPOSIT', %s, %s, %s);
                """,
                (account_id, amount, description, user_id)
            )
            txn_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT t_id, t_acc_id, t_type, t_amount, t_desc, t_time, t_by
                FROM transactions
                WHERE t_id = %s;
                """,
                (txn_id,)
            )
            txn = dict(cursor.fetchone())
            txn["new_balance"] = new_balance

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()

    # Trigger deterministic compliance inspection
    from backend.app.compliance.service import inspect_and_flag_transaction
    inspect_and_flag_transaction(txn["t_id"], account_id, amount, "DEPOSIT")

    return txn


def process_withdrawal(
    account_id: int,
    amount: Decimal,
    description: Optional[str] = "Cash withdrawal",
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Execute atomic withdrawal with balance verification and row locking."""
    if amount <= Decimal("0.00"):
        raise TransactionError("Withdrawal amount must be greater than zero.", code="INVALID_AMOUNT")

    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        try:
            # 1. Lock account row for update
            cursor.execute(
                "SELECT a_id, a_balance, a_status FROM accounts WHERE a_id = %s FOR UPDATE;",
                (account_id,)
            )
            account = cursor.fetchone()

            if not account:
                raise AccountNotFoundError(account_id)

            if account["a_status"] != "ACTIVE":
                raise InactiveAccountError(account_id, account["a_status"])

            if account["a_balance"] < amount:
                raise InsufficientBalanceError(account["a_balance"], amount)

            # 2. Update account balance
            new_balance = account["a_balance"] - amount
            cursor.execute(
                "UPDATE accounts SET a_balance = %s WHERE a_id = %s;",
                (new_balance, account_id)
            )

            # 3. Record transaction
            cursor.execute(
                """
                INSERT INTO transactions (
                    t_acc_id,
                    t_type,
                    t_amount,
                    t_desc,
                    t_by
                )
                VALUES (%s, 'WITHDRAWAL', %s, %s, %s);
                """,
                (account_id, amount, description, user_id)
            )
            txn_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT t_id, t_acc_id, t_type, t_amount, t_desc, t_time, t_by
                FROM transactions
                WHERE t_id = %s;
                """,
                (txn_id,)
            )
            txn = dict(cursor.fetchone())
            txn["new_balance"] = new_balance

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()

    # Trigger deterministic compliance inspection
    from backend.app.compliance.service import inspect_and_flag_transaction
    inspect_and_flag_transaction(txn["t_id"], account_id, amount, "WITHDRAWAL")

    return txn


def process_transfer(
    from_account_id: int,
    to_account_id: int,
    amount: Decimal,
    description: Optional[str] = "Account transfer",
    user_id: Optional[int] = None,
) -> dict[str, Any]:
    """Execute atomic two-legged fund transfer preventing deadlocks via ordered row-locking."""
    if amount <= Decimal("0.00"):
        raise TransactionError("Transfer amount must be greater than zero.", code="INVALID_AMOUNT")

    if from_account_id == to_account_id:
        raise TransactionError("Source and destination accounts must differ.", code="IDENTICAL_ACCOUNTS")

    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=True)
        try:
            # Deadlock prevention: Lock accounts in ascending primary key order
            first_id = min(from_account_id, to_account_id)
            second_id = max(from_account_id, to_account_id)

            cursor.execute("SELECT a_id, a_balance, a_status FROM accounts WHERE a_id = %s FOR UPDATE;", (first_id,))
            first_acc = cursor.fetchone()

            cursor.execute("SELECT a_id, a_balance, a_status FROM accounts WHERE a_id = %s FOR UPDATE;", (second_id,))
            second_acc = cursor.fetchone()

            acc_map = {}
            if first_acc:
                acc_map[first_acc["a_id"]] = first_acc
            if second_acc:
                acc_map[second_acc["a_id"]] = second_acc

            if from_account_id not in acc_map:
                raise AccountNotFoundError(from_account_id)
            if to_account_id not in acc_map:
                raise AccountNotFoundError(to_account_id)

            source_acc = acc_map[from_account_id]
            dest_acc = acc_map[to_account_id]

            if source_acc["a_status"] != "ACTIVE":
                raise InactiveAccountError(from_account_id, source_acc["a_status"])
            if dest_acc["a_status"] != "ACTIVE":
                raise InactiveAccountError(to_account_id, dest_acc["a_status"])

            if source_acc["a_balance"] < amount:
                raise InsufficientBalanceError(source_acc["a_balance"], amount)

            # Atomic debit and credit
            new_from_balance = source_acc["a_balance"] - amount
            new_to_balance = dest_acc["a_balance"] + amount

            cursor.execute(
                "UPDATE accounts SET a_balance = %s WHERE a_id = %s;",
                (new_from_balance, from_account_id)
            )
            cursor.execute(
                "UPDATE accounts SET a_balance = %s WHERE a_id = %s;",
                (new_to_balance, to_account_id)
            )

            # Record transfer transaction
            cursor.execute(
                """
                INSERT INTO transactions (
                    t_acc_id,
                    t_related_acc_id,
                    t_type,
                    t_amount,
                    t_desc,
                    t_by
                )
                VALUES (%s, %s, 'TRANSFER', %s, %s, %s);
                """,
                (from_account_id, to_account_id, amount, description, user_id)
            )
            txn_id = cursor.lastrowid

            cursor.execute(
                """
                SELECT t_id, t_acc_id, t_related_acc_id, t_type, t_amount, t_desc, t_time, t_by
                FROM transactions
                WHERE t_id = %s;
                """,
                (txn_id,)
            )
            txn = dict(cursor.fetchone())
            txn["from_account_balance"] = new_from_balance
            txn["to_account_balance"] = new_to_balance

            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            cursor.close()

    # Trigger deterministic compliance inspection
    from backend.app.compliance.service import inspect_and_flag_transaction
    inspect_and_flag_transaction(txn["t_id"], from_account_id, amount, "TRANSFER")

    return txn


def get_transaction_by_id(transaction_id: int) -> Optional[dict[str, Any]]:
    """Retrieve transaction record by its primary key t_id."""
    query = """
        SELECT
            t_id,
            t_acc_id,
            t_related_acc_id,
            t_type,
            t_amount,
            t_desc,
            t_time,
            t_by
        FROM transactions
        WHERE t_id = %s;
    """
    return fetch_one(query, (transaction_id,))


def get_account_transactions(
    account_id: int,
    limit: int = 50,
    offset: int = 0,
    transaction_type: Optional[str] = None,
) -> list[dict[str, Any]]:
    """Retrieve paginated transaction history for a given account."""
    params: list[Any] = [account_id, account_id]
    type_clause = ""
    if transaction_type:
        type_clause = "AND t.t_type = %s"
        params.append(transaction_type)

    query = f"""
        SELECT
            t.t_id,
            t.t_acc_id,
            t.t_related_acc_id,
            t.t_type,
            t.t_amount,
            t.t_desc,
            t.t_time,
            t.t_by
        FROM transactions t
        WHERE (t.t_acc_id = %s OR t.t_related_acc_id = %s)
        {type_clause}
        ORDER BY t.t_time DESC, t.t_id DESC
        LIMIT %s OFFSET %s;
    """
    params.extend([limit, offset])
    return fetch_all(query, params)
