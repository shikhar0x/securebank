-- SecureBank - Transaction Triggers

CREATE OR REPLACE FUNCTION fn_transaction_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_logs (
        transaction_id,
        user_id,
        action,
        table_name,
        record_id,
        details
    )
    VALUES (
        NEW.transaction_id,
        NEW.created_by,
        'INSERT',
        'transactions',
        NEW.transaction_id,
        jsonb_build_object(
            'account_id', NEW.account_id,
            'related_account_id', NEW.related_account_id,
            'transaction_type', NEW.transaction_type,
            'amount', NEW.amount
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transaction_audit ON transactions;

CREATE TRIGGER trg_transaction_audit
AFTER INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_transaction_audit();


CREATE OR REPLACE FUNCTION fn_prevent_invalid_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    current_balance NUMERIC(15,2);
    account_status VARCHAR(20);
BEGIN
    SELECT balance, status
    INTO current_balance, account_status
    FROM accounts
    WHERE account_id = NEW.account_id
    FOR UPDATE;

    IF account_status IS NULL THEN
        RAISE EXCEPTION 'Account % does not exist', NEW.account_id;
    END IF;

    IF account_status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'Account % is not active', NEW.account_id;
    END IF;

    IF NEW.transaction_type IN ('WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT')
       AND current_balance < NEW.amount THEN
        RAISE EXCEPTION
            'Insufficient balance for account %',
            NEW.account_id;
    END IF;

    IF NEW.transaction_type = 'TRANSFER'
       AND NEW.related_account_id IS NULL THEN
        RAISE EXCEPTION 'Transfer requires a related account';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_invalid_transaction ON transactions;

CREATE TRIGGER trg_prevent_invalid_transaction
BEFORE INSERT ON transactions
FOR EACH ROW
EXECUTE FUNCTION fn_prevent_invalid_transaction();
