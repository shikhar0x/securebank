-- SecureBank - Extension Tests (MySQL)
-- Ad hoc queries exercising the per-member extensions (indexing,
-- EMI reporting, deterministic risk flags) against the MySQL schema.

USE securebank;

-- Member 7 (Loans/EMI): EMI is stored directly on the loan row, not
-- computed by a database function - report it back with the customer.
SELECT l_id, c_name, l_amount, l_rate, l_months, l_emi, l_status
FROM v_loan_report
ORDER BY l_created DESC;

-- Member 1 (Indexing): idx_transactions_account_time should make this
-- an index-range scan instead of a full table scan - check with EXPLAIN.
EXPLAIN
SELECT t_id, t_acc_id, t_amount, t_time
FROM transactions
WHERE t_amount > 200000
ORDER BY t_time DESC;

SELECT t_id, t_acc_id, t_amount, t_time
FROM transactions
WHERE t_amount > 200000
ORDER BY t_time DESC;

-- Member 9 (Compliance): flag accounts with unusually frequent
-- transactions in a short window (a simple deterministic risk signal).
SELECT
    t_acc_id,
    COUNT(*) AS transaction_count
FROM transactions
WHERE t_time >= NOW() - INTERVAL 5 MINUTE
GROUP BY t_acc_id
HAVING COUNT(*) >= 3;
