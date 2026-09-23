-- SecureBank - Reporting Views (MySQL)

USE securebank;

CREATE OR REPLACE VIEW v_customer_accounts AS
SELECT
    c.c_id, c.c_name, c.c_email,
    a.a_id, a.a_number, a.a_type, a.a_balance, a.a_status,
    b.b_name, b.b_city
FROM customers c
JOIN accounts a ON a.a_cust_id = c.c_id
JOIN branches b ON b.b_id = a.a_branch_id;

CREATE OR REPLACE VIEW v_transaction_history AS
SELECT
    t.t_id, t.t_acc_id, a.a_number,
    t.t_related_acc_id, t.t_type, t.t_amount, t.t_desc, t.t_time, t.t_by
FROM transactions t
JOIN accounts a ON a.a_id = t.t_acc_id;

CREATE OR REPLACE VIEW v_loan_report AS
SELECT
    l.l_id, l.l_cust_id, c.c_name,
    l.l_type, l.l_amount, l.l_rate, l.l_months, l.l_emi, l.l_status, l.l_created
FROM loans l
JOIN customers c ON c.c_id = l.l_cust_id;

CREATE OR REPLACE VIEW v_audit_report AS
SELECT log_id, log_txn_id, log_user_id, log_action, log_details, log_time
FROM audit_logs;
