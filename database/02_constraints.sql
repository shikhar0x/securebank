-- SecureBank - Additional Constraints and Indexes (MySQL)
-- Run after 01_schema.sql. CHECK constraints need MySQL 8.0.16+.

USE securebank;

ALTER TABLE accounts
    ADD CONSTRAINT chk_account_number_not_blank
    CHECK (LENGTH(TRIM(a_number)) > 0);

ALTER TABLE beneficiaries
    ADD CONSTRAINT chk_ifsc_not_blank
    CHECK (LENGTH(TRIM(be_ifsc)) > 0);

ALTER TABLE transactions
    ADD CONSTRAINT chk_transfer_related_account
    CHECK (
        t_type <> 'TRANSFER'
        OR t_related_acc_id IS NOT NULL
    );

-- Indexes to support common lookups and reporting queries.
CREATE INDEX idx_accounts_customer ON accounts(a_cust_id);
CREATE INDEX idx_accounts_branch ON accounts(a_branch_id);

CREATE INDEX idx_transactions_account_time ON transactions(t_acc_id, t_time DESC);
CREATE INDEX idx_transactions_type ON transactions(t_type);

CREATE INDEX idx_beneficiaries_customer ON beneficiaries(be_cust_id);
CREATE INDEX idx_loans_customer ON loans(l_cust_id);

CREATE INDEX idx_audit_log_time ON audit_logs(log_time DESC);

CREATE INDEX idx_suspicious_status ON suspicious_transactions(s_status);
