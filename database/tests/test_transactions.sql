-- SecureBank - Transaction Tests

SELECT sp_deposit(1, 500.00);

SELECT sp_withdraw(1, 200.00);

SELECT sp_transfer(1, 2, 1000.00);

SELECT
    account_id,
    account_number,
    balance,
    status
FROM accounts
WHERE account_id IN (1, 2)
ORDER BY account_id;

SELECT *
FROM v_transaction_history
ORDER BY transaction_time DESC
LIMIT 20;

SELECT *
FROM audit_logs
ORDER BY created_at DESC
LIMIT 20;
