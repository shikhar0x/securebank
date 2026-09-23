-- SecureBank - Test / Demo Data (MySQL)
-- Run after 07_procedures.sql. Assumes the customers/branches seeded by
-- 03_seed_data.sql exist with their original ids (1-3).

USE securebank;

INSERT INTO accounts (a_cust_id, a_branch_id, a_number, a_type, a_balance, a_status)
SELECT 1, b_id, 'SB10000001', 'SAVINGS', 100000.00, 'ACTIVE'
FROM branches
WHERE b_code = 'SB-MUM-001'
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE a_number = 'SB10000001');

INSERT INTO accounts (a_cust_id, a_branch_id, a_number, a_type, a_balance, a_status)
SELECT 2, b_id, 'SB10000002', 'SAVINGS', 75000.00, 'ACTIVE'
FROM branches
WHERE b_code = 'SB-MUM-002'
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE a_number = 'SB10000002');

INSERT INTO accounts (a_cust_id, a_branch_id, a_number, a_type, a_balance, a_status)
SELECT 3, b_id, 'SB10000003', 'CURRENT', 50000.00, 'ACTIVE'
FROM branches
WHERE b_code = 'SB-PUN-001'
  AND NOT EXISTS (SELECT 1 FROM accounts WHERE a_number = 'SB10000003');

INSERT INTO beneficiaries (be_cust_id, be_name, be_bank, be_acc_no, be_ifsc, be_status)
SELECT 1, 'Priya Mehta', 'SecureBank', 'SB10000002', 'SBIN0000001', 'ACTIVE'
WHERE NOT EXISTS (
    SELECT 1 FROM beneficiaries
    WHERE be_cust_id = 1 AND be_acc_no = 'SB10000002'
);
