-- SecureBank - Transaction Triggers (MySQL)
--
--    trg_check_txn  -> runs BEFORE a new transaction row is saved, makes
--                       sure the account is real, active and has money.
--    trg_audit_txn  -> runs AFTER a transaction is saved, writes one
--                       line into audit_logs so we have a history log.
--
--    "NEW.column_name" means "the value being inserted into that column".
--    DELIMITER $$ just tells the client "don't stop at the first ;
--    inside this trigger, wait for $$ instead" - triggers have many ;
--    inside them so the normal ; can't be used to mark the end.

USE securebank;

DELIMITER $$

CREATE TRIGGER trg_check_txn
BEFORE INSERT ON transactions
FOR EACH ROW
BEGIN
    DECLARE v_balance DECIMAL(10,2);
    DECLARE v_status VARCHAR(20);

    SELECT a_balance, a_status INTO v_balance, v_status
    FROM accounts
    WHERE a_id = NEW.t_acc_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account does not exist';
    END IF;

    IF v_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account is not active';
    END IF;

    IF NEW.t_type IN ('WITHDRAWAL', 'TRANSFER', 'LOAN_PAYMENT') AND v_balance < NEW.t_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;

    IF NEW.t_type = 'TRANSFER' AND NEW.t_related_acc_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer needs a related account';
    END IF;
END$$

CREATE TRIGGER trg_audit_txn
AFTER INSERT ON transactions
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (log_txn_id, log_user_id, log_action, log_details)
    VALUES (
        NEW.t_id,
        NEW.t_by,
        'INSERT',
        CONCAT(NEW.t_type, ' of amount ', NEW.t_amount, ' on account ', NEW.t_acc_id)
    );
END$$

DELIMITER ;
