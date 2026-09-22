-- SecureBank - Extension Tests

SELECT fn_calculate_emi(
    500000,
    8.5,
    60
) AS calculated_emi;

SELECT
    transaction_id,
    account_id,
    amount,
    transaction_time
FROM transactions
WHERE amount > 200000
ORDER BY transaction_time DESC;

SELECT
    account_id,
    COUNT(*) AS transaction_count
FROM transactions
WHERE transaction_time >= CURRENT_TIMESTAMP - INTERVAL '5 minutes'
GROUP BY account_id
HAVING COUNT(*) >= 3;
