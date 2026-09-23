-- SecureBank - Regression Tests (MySQL)

USE securebank;

SELECT COUNT(*) AS customer_count FROM customers;

SELECT COUNT(*) AS role_count FROM roles;

SELECT COUNT(*) AS user_count FROM users;

SELECT COUNT(*) AS branch_count FROM branches;

SELECT COUNT(*) AS account_count FROM accounts;

SELECT COUNT(*) AS beneficiary_count FROM beneficiaries;

SELECT COUNT(*) AS loan_count FROM loans;

SELECT COUNT(*) AS transaction_count FROM transactions;

SELECT COUNT(*) AS audit_count FROM audit_logs;

SELECT COUNT(*) AS suspicious_count FROM suspicious_transactions;

SELECT COUNT(*) AS invalid_accounts
FROM accounts
WHERE a_balance < 0;

SELECT COUNT(*) AS invalid_transactions
FROM transactions
WHERE t_amount <= 0;

SELECT COUNT(*) AS invalid_transfer_records
FROM transactions
WHERE t_type = 'TRANSFER'
  AND t_related_acc_id IS NULL;
