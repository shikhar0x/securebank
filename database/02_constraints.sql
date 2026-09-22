-- SecureBank - Additional Constraints and Indexes

ALTER TABLE accounts
    ADD CONSTRAINT chk_account_number_not_blank
    CHECK (length(trim(account_number)) > 0);

ALTER TABLE beneficiaries
    ADD CONSTRAINT chk_ifsc_not_blank
    CHECK (length(trim(ifsc_code)) > 0);

ALTER TABLE transactions
    ADD CONSTRAINT chk_transfer_related_account
    CHECK (
        transaction_type NOT IN ('TRANSFER')
        OR related_account_id IS NOT NULL
    );

CREATE INDEX IF NOT EXISTS idx_accounts_customer
    ON accounts(customer_id);

CREATE INDEX IF NOT EXISTS idx_accounts_branch
    ON accounts(branch_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_time
    ON transactions(account_id, transaction_time DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_type
    ON transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_customer
    ON beneficiaries(customer_id);

CREATE INDEX IF NOT EXISTS idx_loans_customer
    ON loans(customer_id);

CREATE INDEX IF NOT EXISTS idx_audit_created_at
    ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_status
    ON suspicious_transactions(status);
