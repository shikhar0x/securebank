-- SecureBank - Trigger Tests

SELECT
    sp_deposit(1, 1000.00);

SELECT
    transaction_id,
    action,
    table_name,
    record_id,
    details,
    created_at
FROM audit_logs
ORDER BY audit_id DESC
LIMIT 5;
