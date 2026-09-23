-- SecureBank - Initial Seed Data (MySQL)
-- Run after 02_constraints.sql. INSERT IGNORE skips rows that would
-- violate the UNIQUE constraints below, so this is safe to re-run.

USE securebank;

INSERT IGNORE INTO roles (r_name, r_desc) VALUES
    ('ADMIN', 'Full system administration'),
    ('MANAGER', 'Branch and operational management'),
    ('TELLER', 'Customer and transaction operations'),
    ('LOAN_OFFICER', 'Loan processing and approval'),
    ('AUDITOR', 'Audit and compliance access'),
    ('CUSTOMER', 'Bank customer'),
    ('COMPLIANCE', 'Suspicious transaction review');

INSERT IGNORE INTO branches (b_code, b_name, b_city, b_address) VALUES
    ('SB-MUM-001', 'SecureBank Mumbai Central', 'Mumbai', 'Mumbai Central'),
    ('SB-MUM-002', 'SecureBank Andheri', 'Mumbai', 'Andheri East'),
    ('SB-PUN-001', 'SecureBank Pune', 'Pune', 'Shivajinagar');

INSERT IGNORE INTO customers (c_name, c_email, c_phone, c_address, c_dob, c_kyc) VALUES
    ('Aarav Sharma', 'aarav@example.com', '9000000001', 'Mumbai', '2000-01-15', 'VERIFIED'),
    ('Priya Mehta', 'priya@example.com', '9000000002', 'Mumbai', '1999-05-20', 'VERIFIED'),
    ('Rahul Verma', 'rahul@example.com', '9000000003', 'Pune', '2001-08-10', 'PENDING');
