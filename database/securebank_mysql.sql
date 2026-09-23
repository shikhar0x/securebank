-- =====================================================================
-- SecureBank - Simple MySQL Database (Student Project)
-- A simple banking system: customers, users, accounts, transactions,
-- loans, beneficiaries, branches, audit log and suspicious transactions.
--
-- How to use in MySQL Workbench:
--   File > Open SQL Script... > select this file > Execute (lightning icon)
--   Run this on a fresh/empty database (it does not check for
--   already-existing rows, it just inserts once).
--
-- Column naming used in every table: short table prefix + name
--   customers -> c_...   roles -> r_...      users -> u_...
--   branches  -> b_...   accounts -> a_...   beneficiaries -> be_...
--   loans     -> l_...   transactions -> t_... audit_logs -> log_...
--   suspicious_transactions -> s_...
-- =====================================================================

CREATE DATABASE IF NOT EXISTS securebank;
USE securebank;

-- =====================================================================
-- 1. TABLES
-- =====================================================================

CREATE TABLE customers (
    c_id       INT AUTO_INCREMENT PRIMARY KEY,
    c_name     VARCHAR(100) NOT NULL,
    c_email    VARCHAR(100) UNIQUE NOT NULL,
    c_phone    VARCHAR(15) UNIQUE NOT NULL,
    c_address  VARCHAR(200),
    c_dob      DATE,
    c_kyc      VARCHAR(20) DEFAULT 'PENDING'
        CHECK (c_kyc IN ('PENDING', 'VERIFIED', 'REJECTED')),
    c_created  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    r_id    INT AUTO_INCREMENT PRIMARY KEY,
    r_name  VARCHAR(30) UNIQUE NOT NULL,
    r_desc  VARCHAR(100)
);

CREATE TABLE users (
    u_id        INT AUTO_INCREMENT PRIMARY KEY,
    u_cust_id   INT,
    u_role      INT NOT NULL,
    u_name      VARCHAR(50) UNIQUE NOT NULL,
    u_password  VARCHAR(100) NOT NULL,
    u_created   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (u_cust_id) REFERENCES customers(c_id),
    FOREIGN KEY (u_role) REFERENCES roles(r_id)
);

CREATE TABLE branches (
    b_id       INT AUTO_INCREMENT PRIMARY KEY,
    b_code     VARCHAR(20) UNIQUE NOT NULL,
    b_name     VARCHAR(100) NOT NULL,
    b_city     VARCHAR(50) NOT NULL,
    b_address  VARCHAR(200)
);

CREATE TABLE accounts (
    a_id         INT AUTO_INCREMENT PRIMARY KEY,
    a_cust_id    INT NOT NULL,
    a_branch_id  INT NOT NULL,
    a_number     VARCHAR(20) UNIQUE NOT NULL,
    a_type       VARCHAR(20) NOT NULL
        CHECK (a_type IN ('SAVINGS', 'CURRENT')),
    a_balance    DECIMAL(10,2) DEFAULT 0
        CHECK (a_balance >= 0),
    a_status     VARCHAR(20) DEFAULT 'ACTIVE'
        CHECK (a_status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    a_created    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (a_cust_id) REFERENCES customers(c_id),
    FOREIGN KEY (a_branch_id) REFERENCES branches(b_id)
);


CREATE TABLE beneficiaries (
    be_id      INT AUTO_INCREMENT PRIMARY KEY,
    be_cust_id INT NOT NULL,
    be_name    VARCHAR(100) NOT NULL,
    be_bank    VARCHAR(100) NOT NULL,
    be_acc_no  VARCHAR(20) NOT NULL,
    be_ifsc    VARCHAR(15) NOT NULL,
    be_status  VARCHAR(20) DEFAULT 'PENDING'
        CHECK (be_status IN ('PENDING', 'ACTIVE', 'BLOCKED')),
    be_created DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (be_cust_id) REFERENCES customers(c_id)
);

CREATE TABLE loans (
    l_id       INT AUTO_INCREMENT PRIMARY KEY,
    l_cust_id  INT NOT NULL,
    l_type     VARCHAR(50) NOT NULL,
    l_amount   DECIMAL(10,2) NOT NULL,
    l_rate     DECIMAL(5,2) NOT NULL,
    l_months   INT NOT NULL,
    l_emi      DECIMAL(10,2),
    l_status   VARCHAR(20) DEFAULT 'PENDING'
        CHECK (l_status IN ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED')),
    l_created  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (l_cust_id) REFERENCES customers(c_id)
);

CREATE TABLE transactions (
    t_id             INT AUTO_INCREMENT PRIMARY KEY,
    t_acc_id         INT NOT NULL,
    t_related_acc_id INT,
    t_type           VARCHAR(20) NOT NULL
        CHECK (t_type IN ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT')),
    t_amount         DECIMAL(10,2) NOT NULL,
    t_desc           VARCHAR(200),
    t_time           DATETIME DEFAULT CURRENT_TIMESTAMP,
    t_by             INT,
    FOREIGN KEY (t_acc_id) REFERENCES accounts(a_id),
    FOREIGN KEY (t_related_acc_id) REFERENCES accounts(a_id),
    FOREIGN KEY (t_by) REFERENCES users(u_id)
);

CREATE TABLE audit_logs (
    log_id      INT AUTO_INCREMENT PRIMARY KEY,
    log_txn_id  INT,
    log_user_id INT,
    log_action  VARCHAR(50) NOT NULL,
    log_details VARCHAR(200),
    log_time    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_txn_id) REFERENCES transactions(t_id),
    FOREIGN KEY (log_user_id) REFERENCES users(u_id)
);

CREATE TABLE suspicious_transactions (
    s_id       INT AUTO_INCREMENT PRIMARY KEY,
    s_txn_id   INT UNIQUE NOT NULL,
    s_reason   VARCHAR(200) NOT NULL,
    s_status   VARCHAR(20) DEFAULT 'PENDING'
        CHECK (s_status IN ('PENDING', 'REVIEWED', 'CLEARED', 'CONFIRMED')),
    s_created  DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (s_txn_id) REFERENCES transactions(t_id)
);

-- =====================================================================
-- 2. SAMPLE / SEED DATA
-- =====================================================================

INSERT INTO roles (r_name, r_desc) VALUES
    ('ADMIN', 'Full system administration'),
    ('MANAGER', 'Branch and operational management'),
    ('TELLER', 'Customer and transaction operations'),
    ('LOAN_OFFICER', 'Loan processing and approval'),
    ('AUDITOR', 'Audit and compliance access'),
    ('CUSTOMER', 'Bank customer'),
    ('COMPLIANCE', 'Suspicious transaction review');

INSERT INTO branches (b_code, b_name, b_city, b_address) VALUES
    ('SB-MUM-001', 'SecureBank Mumbai Central', 'Mumbai', 'Mumbai Central'),
    ('SB-MUM-002', 'SecureBank Andheri', 'Mumbai', 'Andheri East'),
    ('SB-PUN-001', 'SecureBank Pune', 'Pune', 'Shivajinagar');

INSERT INTO customers (c_name, c_email, c_phone, c_address, c_dob, c_kyc) VALUES
    ('Aarav Sharma', 'aarav@example.com', '9000000001', 'Mumbai', '2000-01-15', 'VERIFIED'),
    ('Priya Mehta', 'priya@example.com', '9000000002', 'Mumbai', '1999-05-20', 'VERIFIED'),
    ('Rahul Verma', 'rahul@example.com', '9000000003', 'Pune', '2001-08-10', 'PENDING');

-- Sample accounts (uses the customer/branch ids created above: 1, 2, 3)
INSERT INTO accounts (a_cust_id, a_branch_id, a_number, a_type, a_balance, a_status) VALUES
    (1, 1, 'SB10000001', 'SAVINGS', 100000.00, 'ACTIVE'),
    (2, 2, 'SB10000002', 'SAVINGS', 75000.00, 'ACTIVE'),
    (3, 3, 'SB10000003', 'CURRENT', 50000.00, 'ACTIVE');

-- Sample beneficiary
INSERT INTO beneficiaries (be_cust_id, be_name, be_bank, be_acc_no, be_ifsc, be_status) VALUES
    (1, 'Priya Mehta', 'SecureBank', 'SB10000002', 'SBIN0000001', 'ACTIVE');

-- =====================================================================
-- 3. VIEWS (simple joins for reports)
-- =====================================================================

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

-- =====================================================================
-- 4. TRIGGERS
--    A trigger is just a block of SQL that MySQL runs automatically
--    when a row is inserted/updated/deleted - we never call it ourselves.
--
--    trg_check_txn  -> runs BEFORE a new transaction row is saved, makes
--                       sure the account is real, active and has money.
--    trg_audit_txn  -> runs AFTER a transaction is saved, writes one
--                       line into audit_logs so we have a history log.
--
--    "NEW.column_name" means "the value being inserted into that column".
--    DELIMITER $$ just tells MySQL Workbench "don't stop at the first ;
--    inside this trigger/procedure, wait for $$ instead" - triggers and
--    procedures have many ; inside them so the normal ; can't be used
--    to mark the end.
-- =====================================================================

DELIMITER $$

CREATE TRIGGER trg_check_txn
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    -- temporary variables to hold the account's current balance/status
    DECLARE v_balance DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);

    -- look up the account this transaction is happening on
    SELECT a_balance, a_status INTO v_balance, v_status
    FROM accounts
    WHERE a_id = NEW.t_acc_id;

    -- SIGNAL is how MySQL stops the insert and shows an error message,
    -- similar to "throw an error" in a programming language
    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not exist';
    END IF;

    IF v_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not active';
    END IF;

    -- money going OUT of the account must not be more than the balance
    IF NEW.t_type IN ('WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT') AND v_balance < NEW.t_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;

    -- a transfer must always say which account is receiving the money
    IF NEW.t_type = 'TRANSFER' AND NEW.t_related_acc_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer needs a related account';
    END IF;
END$$

CREATE TRIGGER trg_audit_txn
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    -- write one plain-text log line every time a transaction is saved
    INSERT INTO audit_logs (log_txn_id, log_user_id, log_action, log_details)
    VALUES (
        NEW.t_id,
        NEW.t_by,
        'INSERT',
        CONCAT(NEW.t_type, ' of amount ', NEW.t_amount, ' on account ', NEW.t_acc_id)
    );
END$$

DELIMITER ;

-- =====================================================================
-- 5. STORED PROCEDURES (simple banking operations)
--    A procedure is a saved set of SQL steps we can run with CALL,
--    instead of typing the same UPDATE + INSERT every time.
--
--    IN  parameter  -> a value we pass INTO the procedure (input)
--    OUT parameter  -> a value the procedure sends back to us (output),
--                      we read it afterwards with a @variable
--
--    Usage:
--      CALL sp_deposit(1, 500, @id);  SELECT @id;
--      CALL sp_withdraw(1, 200, @id); SELECT @id;
--      CALL sp_transfer(1, 2, 300, @id); SELECT @id;
-- =====================================================================

DELIMITER $$

CREATE PROCEDURE sp_deposit(
    IN p_acc_id INT,
    IN p_amount DECIMAL(10,2),
    OUT p_txn_id INT
)
BEGIN
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Deposit amount must be greater than zero';
    END IF;

    -- add the money to the account
    UPDATE accounts
    SET a_balance = a_balance + p_amount
    WHERE a_id = p_acc_id AND a_status = 'ACTIVE';

    -- ROW_COUNT() tells us how many rows the last UPDATE changed;
    -- 0 means the account id was wrong or it isn't ACTIVE
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found or not active';
    END IF;

    -- keep a record of this deposit in the transactions table
    INSERT INTO transactions (t_acc_id, t_type, t_amount, t_desc)
    VALUES (p_acc_id, 'DEPOSIT', p_amount, 'Deposit');

    -- LAST_INSERT_ID() gives the auto-generated t_id of the row we
    -- just inserted above, so we can hand it back through OUT
    SET p_txn_id = LAST_INSERT_ID();
END$$

CREATE PROCEDURE sp_withdraw(
    IN p_acc_id INT,
    IN p_amount DECIMAL(10,2),
    OUT p_txn_id INT
)
BEGIN
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Withdrawal amount must be greater than zero';
    END IF;

    UPDATE accounts
    SET a_balance = a_balance - p_amount
    WHERE a_id = p_acc_id AND a_status = 'ACTIVE' AND a_balance >= p_amount;

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough balance or account not active';
    END IF;

    INSERT INTO transactions (t_acc_id, t_type, t_amount, t_desc)
    VALUES (p_acc_id, 'WITHDRAWAL', p_amount, 'Withdrawal');

    SET p_txn_id = LAST_INSERT_ID();
END$$

-- sp_transfer moves money from one account to another. It does 4 things,
-- in order: (1) check the request makes sense, (2) look up both
-- accounts, (3) make sure both accounts are OK to use, (4) move the
-- money and log it as one TRANSFER transaction.
CREATE PROCEDURE sp_transfer(
    IN p_from_id INT,
    IN p_to_id INT,
    IN p_amount DECIMAL(10,2),
    OUT p_txn_id INT
)
BEGIN
    DECLARE v_from_balance DECIMAL(10,2);
    DECLARE v_from_status VARCHAR(20);
    DECLARE v_to_status VARCHAR(20);

    -- Step 1: basic sanity checks on the input values
    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount must be greater than zero';
    END IF;

    IF p_from_id = p_to_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'From and to account must be different';
    END IF;

    -- Step 2: look up both accounts before changing anything
    SELECT a_balance, a_status INTO v_from_balance, v_from_status
    FROM accounts WHERE a_id = p_from_id;

    SELECT a_status INTO v_to_status
    FROM accounts WHERE a_id = p_to_id;

    -- Step 3: make sure both accounts exist, are active, and there is
    -- enough money in the sending account
    IF v_from_status IS NULL OR v_to_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One of the accounts does not exist';
    END IF;

    IF v_from_status <> 'ACTIVE' OR v_to_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both accounts must be active';
    END IF;

    IF v_from_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough balance';
    END IF;

    -- Step 4: all checks passed - take money out of one account,
    -- put it into the other, and save one TRANSFER transaction row
    UPDATE accounts SET a_balance = a_balance - p_amount WHERE a_id = p_from_id;
    UPDATE accounts SET a_balance = a_balance + p_amount WHERE a_id = p_to_id;

    INSERT INTO transactions (t_acc_id, t_related_acc_id, t_type, t_amount, t_desc)
    VALUES (p_from_id, p_to_id, 'TRANSFER', p_amount, 'Account transfer');

    SET p_txn_id = LAST_INSERT_ID();
END$$

DELIMITER ;

-- =====================================================================
-- End of script.
-- Note: EMI is not auto-calculated here - just insert l_emi directly
-- (or calculate it in your application code) when adding a loan.
-- =====================================================================
