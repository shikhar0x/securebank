-- SecureBank - Atomic Banking Operations
-- PostgreSQL uses functions for these database operations.

CREATE OR REPLACE FUNCTION sp_deposit(
    p_account_id BIGINT,
    p_amount NUMERIC
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id BIGINT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Deposit amount must be greater than zero';
    END IF;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_account_id
      AND status = 'ACTIVE';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Active account % not found', p_account_id;
    END IF;

    INSERT INTO transactions (
        account_id,
        transaction_type,
        amount,
        description
    )
    VALUES (
        p_account_id,
        'DEPOSIT',
        p_amount,
        'Deposit'
    )
    RETURNING transaction_id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;


CREATE OR REPLACE FUNCTION sp_withdraw(
    p_account_id BIGINT,
    p_amount NUMERIC
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id BIGINT;
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
    END IF;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_account_id
      AND status = 'ACTIVE'
      AND balance >= p_amount;

    IF NOT FOUND THEN
        RAISE EXCEPTION
            'Withdrawal failed: inactive account or insufficient balance';
    END IF;

    INSERT INTO transactions (
        account_id,
        transaction_type,
        amount,
        description
    )
    VALUES (
        p_account_id,
        'WITHDRAWAL',
        p_amount,
        'Withdrawal'
    )
    RETURNING transaction_id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;


CREATE OR REPLACE FUNCTION sp_transfer(
    p_from_account_id BIGINT,
    p_to_account_id BIGINT,
    p_amount NUMERIC
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
    v_transaction_id BIGINT;
    v_from_balance NUMERIC(15,2);
    v_from_status VARCHAR(20);
    v_to_status VARCHAR(20);
BEGIN
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be greater than zero';
    END IF;

    IF p_from_account_id = p_to_account_id THEN
        RAISE EXCEPTION 'Source and destination accounts must differ';
    END IF;

    -- Lock accounts in deterministic order to reduce deadlock risk.
    IF p_from_account_id < p_to_account_id THEN
        PERFORM 1
        FROM accounts
        WHERE account_id = p_from_account_id
        FOR UPDATE;

        PERFORM 1
        FROM accounts
        WHERE account_id = p_to_account_id
        FOR UPDATE;
    ELSE
        PERFORM 1
        FROM accounts
        WHERE account_id = p_to_account_id
        FOR UPDATE;

        PERFORM 1
        FROM accounts
        WHERE account_id = p_from_account_id
        FOR UPDATE;
    END IF;

    SELECT balance, status
    INTO v_from_balance, v_from_status
    FROM accounts
    WHERE account_id = p_from_account_id;

    SELECT status
    INTO v_to_status
    FROM accounts
    WHERE account_id = p_to_account_id;

    IF v_from_status IS NULL THEN
        RAISE EXCEPTION 'Source account does not exist';
    END IF;

    IF v_to_status IS NULL THEN
        RAISE EXCEPTION 'Destination account does not exist';
    END IF;

    IF v_from_status <> 'ACTIVE' OR v_to_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Both accounts must be active';
    END IF;

    IF v_from_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_from_account_id;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_to_account_id;

    INSERT INTO transactions (
        account_id,
        related_account_id,
        transaction_type,
        amount,
        description
    )
    VALUES (
        p_from_account_id,
        p_to_account_id,
        'TRANSFER',
        p_amount,
        'Account transfer'
    )
    RETURNING transaction_id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;


CREATE OR REPLACE FUNCTION fn_calculate_emi(
    p_principal NUMERIC,
    p_annual_rate NUMERIC,
    p_tenure_months INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_monthly_rate NUMERIC;
    v_emi NUMERIC;
BEGIN
    IF p_principal <= 0 OR p_tenure_months <= 0 THEN
        RAISE EXCEPTION 'Principal and tenure must be greater than zero';
    END IF;

    IF p_annual_rate = 0 THEN
        RETURN ROUND(p_principal / p_tenure_months, 2);
    END IF;

    v_monthly_rate := p_annual_rate / 1200;

    v_emi :=
        p_principal
        * v_monthly_rate
        * POWER(1 + v_monthly_rate, p_tenure_months)
        / (POWER(1 + v_monthly_rate, p_tenure_months) - 1);

    RETURN ROUND(v_emi, 2);
END;
$$;
