-- SecureBank - Database Reset (MySQL)
-- WARNING: Destructive. Drops every SecureBank object so the numbered
-- scripts (01-08) can be re-run from a clean state. Run this manually,
-- never automatically, and only against the securebank database.

USE securebank;

DROP PROCEDURE IF EXISTS sp_transfer;
DROP PROCEDURE IF EXISTS sp_withdraw;
DROP PROCEDURE IF EXISTS sp_deposit;

DROP TRIGGER IF EXISTS trg_audit_txn;
DROP TRIGGER IF EXISTS trg_check_txn;

DROP VIEW IF EXISTS v_audit_report;
DROP VIEW IF EXISTS v_loan_report;
DROP VIEW IF EXISTS v_transaction_history;
DROP VIEW IF EXISTS v_customer_accounts;

-- Children first, then parents, so foreign keys never block the drop.
DROP TABLE IF EXISTS suspicious_transactions;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS beneficiaries;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS branches;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS customers;
