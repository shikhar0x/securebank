-- SecureBank - Stored Procedures (MySQL)
--
--    IN  parameter  -> a value we pass INTO the procedure (input)
--    OUT parameter  -> a value the procedure sends back to us (output),
--                      we read it afterwards with a @variable
--
--    Usage:
--      CALL sp_deposit(1, 500, @id);    SELECT @id;
--      CALL sp_withdraw(1, 200, @id);   SELECT @id;
--      CALL sp_transfer(1, 2, 300, @id); SELECT @id;

USE securebank;

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

    UPDATE accounts
    SET a_balance = a_balance + p_amount
    WHERE a_id = p_acc_id AND a_status = 'ACTIVE';

    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found or not active';
    END IF;

    INSERT INTO transactions (t_acc_id, t_type, t_amount, t_desc)
    VALUES (p_acc_id, 'DEPOSIT', p_amount, 'Deposit');

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

    IF p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount must be greater than zero';
    END IF;

    IF p_from_id = p_to_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'From and to account must be different';
    END IF;

    SELECT a_balance, a_status INTO v_from_balance, v_from_status
    FROM accounts WHERE a_id = p_from_id;

    SELECT a_status INTO v_to_status
    FROM accounts WHERE a_id = p_to_id;

    IF v_from_status IS NULL OR v_to_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'One of the accounts does not exist';
    END IF;

    IF v_from_status <> 'ACTIVE' OR v_to_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both accounts must be active';
    END IF;

    IF v_from_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Not enough balance';
    END IF;

    UPDATE accounts SET a_balance = a_balance - p_amount WHERE a_id = p_from_id;
    UPDATE accounts SET a_balance = a_balance + p_amount WHERE a_id = p_to_id;

    INSERT INTO transactions (t_acc_id, t_related_acc_id, t_type, t_amount, t_desc)
    VALUES (p_from_id, p_to_id, 'TRANSFER', p_amount, 'Account transfer');

    SET p_txn_id = LAST_INSERT_ID();
END$$

DELIMITER ;

-- Note: EMI is not auto-calculated - insert l_emi directly (or calculate
-- it in application code) when adding a loan.
