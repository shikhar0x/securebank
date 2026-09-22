-- SecureBank - Test Data

INSERT INTO accounts (
    customer_id,
    branch_id,
    account_number,
    account_type,
    balance,
    status
)
SELECT
    1,
    branch_id,
    'SB10000001',
    'SAVINGS',
    100000.00,
    'ACTIVE'
FROM branches
WHERE branch_code = 'SB-MUM-001'
  AND NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE account_number = 'SB10000001'
  );

INSERT INTO accounts (
    customer_id,
    branch_id,
    account_number,
    account_type,
    balance,
    status
)
SELECT
    2,
    branch_id,
    'SB10000002',
    'SAVINGS',
    75000.00,
    'ACTIVE'
FROM branches
WHERE branch_code = 'SB-MUM-002'
  AND NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE account_number = 'SB10000002'
  );

INSERT INTO accounts (
    customer_id,
    branch_id,
    account_number,
    account_type,
    balance,
    status
)
SELECT
    3,
    branch_id,
    'SB10000003',
    'CURRENT',
    50000.00,
    'ACTIVE'
FROM branches
WHERE branch_code = 'SB-PUN-001'
  AND NOT EXISTS (
      SELECT 1 FROM accounts
      WHERE account_number = 'SB10000003'
  );

INSERT INTO beneficiaries (
    customer_id,
    beneficiary_name,
    bank_name,
    account_number,
    ifsc_code,
    status,
    activated_at
)
SELECT
    1,
    'Priya Mehta',
    'SecureBank',
    'SB10000002',
    'SBIN0000001',
    'ACTIVE',
    CURRENT_TIMESTAMP
WHERE NOT EXISTS (
    SELECT 1
    FROM beneficiaries
    WHERE customer_id = 1
      AND account_number = 'SB10000002'
);
