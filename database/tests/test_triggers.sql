-- SecureBank - Trigger Tests (MySQL)

USE securebank;

CALL sp_deposit(1, 1000.00, @deposit_txn_id);
SELECT @deposit_txn_id AS deposit_txn_id;

SELECT
    log_id,
    log_txn_id,
    log_user_id,
    log_action,
    log_details,
    log_time
FROM audit_logs
ORDER BY log_id DESC
LIMIT 5;
