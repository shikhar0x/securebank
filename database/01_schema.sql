-- SecureBank - Core MySQL Schema
--
-- This is the modular, numbered breakdown (01-08 + tests/) of the single
-- consolidated file database/securebank_mysql.sql. Both describe the same
-- schema; run either the one file in MySQL Workbench, or these scripts in
-- order (see docs/architecture.md, section 8) for a step-by-step build.
--
-- Column naming: short table prefix + name (see securebank_mysql.sql
-- header for the full prefix list: c_, r_, u_, b_, a_, be_, l_, t_, log_, s_).

CREATE DATABASE IF NOT EXISTS securebank;
USE securebank;

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
