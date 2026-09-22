-- SecureBank - Reporting Views

CREATE OR REPLACE VIEW v_customer_accounts AS
SELECT
    c.customer_id,
    c.full_name,
    c.email,
    a.account_id,
    a.account_number,
    a.account_type,
    a.balance,
    a.status,
    b.branch_name,
    b.city
FROM customers c
JOIN accounts a ON a.customer_id = c.customer_id
JOIN branches b ON b.branch_id = a.branch_id;

CREATE OR REPLACE VIEW v_transaction_history AS
SELECT
    t.transaction_id,
    t.account_id,
    a.account_number,
    t.related_account_id,
    t.transaction_type,
    t.amount,
    t.description,
    t.transaction_time,
    t.created_by
FROM transactions t
JOIN accounts a ON a.account_id = t.account_id;

CREATE OR REPLACE VIEW v_branch_summary AS
SELECT
    b.branch_id,
    b.branch_code,
    b.branch_name,
    b.city,
    COUNT(a.account_id) AS total_accounts,
    COALESCE(SUM(a.balance), 0) AS total_balance
FROM branches b
LEFT JOIN accounts a ON a.branch_id = b.branch_id
GROUP BY b.branch_id, b.branch_code, b.branch_name, b.city;

CREATE OR REPLACE VIEW v_loan_report AS
SELECT
    l.loan_id,
    l.customer_id,
    c.full_name,
    l.loan_type,
    l.principal_amount,
    l.interest_rate,
    l.tenure_months,
    l.emi_amount,
    l.status,
    l.created_at
FROM loans l
JOIN customers c ON c.customer_id = l.customer_id;

CREATE OR REPLACE VIEW v_audit_report AS
SELECT
    al.audit_id,
    al.transaction_id,
    al.user_id,
    al.action,
    al.table_name,
    al.record_id,
    al.details,
    al.created_at
FROM audit_logs al;
