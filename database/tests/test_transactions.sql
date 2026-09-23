-- SecureBank - Transaction Tests (MySQL)
-- MySQL procedures return values through OUT parameters, not RETURNING,
-- so each call is followed by a SELECT on the session variable.

USE securebank;

CALL sp_deposit(1, 500.00, @deposit_txn_id);
SELECT @deposit_txn_id AS deposit_txn_id;

CALL sp_withdraw(1, 200.00, @withdraw_txn_id);
SELECT @withdraw_txn_id AS withdraw_txn_id;

CALL sp_transfer(1, 2, 1000.00, @transfer_txn_id);
SELECT @transfer_txn_id AS transfer_txn_id;

SELECT a_id, a_number, a_balance, a_status
FROM accounts
WHERE a_id IN (1, 2)
ORDER BY a_id;

SELECT *
FROM v_transaction_history
ORDER BY t_time DESC
LIMIT 20;

SELECT *
FROM audit_logs
ORDER BY log_time DESC
LIMIT 20;
