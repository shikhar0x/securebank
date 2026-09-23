"""MySQL Database connectivity module for SecureBank.

Uses mysql-connector-python without an ORM.
All queries must use parameterized SQL (%s) to prevent SQL injection.
"""

import logging
from contextlib import contextmanager
from typing import Any, Generator, Optional
import mysql.connector
from mysql.connector import Error as MySQLError

from backend.app.config import Config

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Base exception for application-level database errors."""

    def __init__(self, message: str, code: str = "DATABASE_ERROR"):
        super().__init__(message)
        self.message = message
        self.code = code


def get_raw_connection() -> mysql.connector.MySQLConnection:
    """Create a new MySQL connection.

    Raises:
        DatabaseError: If connection parameters are missing or connection fails.
    """
    try:
        db_config = Config.get_db_config()
        conn = mysql.connector.connect(**db_config)
        return conn
    except MySQLError as e:
        logger.error(f"MySQL connection error: {e}")
        raise DatabaseError("Unable to connect to MySQL database server.", code="CONNECTION_FAILED") from e
    except Exception as e:
        logger.error(f"Configuration or system error: {e}")
        raise DatabaseError(str(e), code="CONFIG_ERROR") from e


@contextmanager
def get_db_connection() -> Generator[mysql.connector.MySQLConnection, None, None]:
    """Context manager for MySQL database connections.

    Automatically rolls back on uncaught exceptions and closes the connection.
    """
    conn = get_raw_connection()
    try:
        yield conn
    except Exception:
        try:
            conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            conn.close()
        except Exception:
            pass


@contextmanager
def get_db_cursor(commit: bool = False, dictionary: bool = True) -> Generator[mysql.connector.cursor.MySQLCursor, None, None]:
    """Context manager yielding a dictionary cursor on a managed MySQL connection."""
    with get_db_connection() as conn:
        cursor = conn.cursor(dictionary=dictionary)
        try:
            yield cursor
            if commit:
                conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            try:
                cursor.close()
            except Exception:
                pass


def fetch_one(query: str, params: Optional[tuple | dict | list] = None) -> Optional[dict[str, Any]]:
    """Execute a parameterized query and return a single row as a dictionary."""
    with get_db_cursor(commit=False, dictionary=True) as cur:
        try:
            cur.execute(query, params)
            row = cur.fetchone()
            return dict(row) if row is not None else None
        except MySQLError as e:
            logger.error(f"Query execution error in fetch_one: {e}")
            raise DatabaseError("Database operation failed.", code="QUERY_FAILED") from e


def fetch_all(query: str, params: Optional[tuple | dict | list] = None) -> list[dict[str, Any]]:
    """Execute a parameterized query and return all rows as dictionaries."""
    with get_db_cursor(commit=False, dictionary=True) as cur:
        try:
            cur.execute(query, params)
            rows = cur.fetchall()
            return [dict(r) for r in rows]
        except MySQLError as e:
            logger.error(f"Query execution error in fetch_all: {e}")
            raise DatabaseError("Database operation failed.", code="QUERY_FAILED") from e


def execute_commit(query: str, params: Optional[tuple | dict | list] = None) -> None:
    """Execute a parameterized query and commit immediately."""
    with get_db_cursor(commit=True, dictionary=False) as cur:
        try:
            cur.execute(query, params)
        except MySQLError as e:
            logger.error(f"Execution error in execute_commit: {e}")
            raise DatabaseError("Database update operation failed.", code="EXECUTION_FAILED") from e


def execute_insert(query: str, params: Optional[tuple | dict | list] = None) -> int:
    """Execute an INSERT statement, commit, and return the auto-increment lastrowid."""
    with get_db_cursor(commit=True, dictionary=False) as cur:
        try:
            cur.execute(query, params)
            return cur.lastrowid
        except MySQLError as e:
            logger.error(f"Execution error in execute_insert: {e}")
            raise DatabaseError("Database insert operation failed.", code="EXECUTION_FAILED") from e
