-- SecureBank - Initial Seed Data

INSERT INTO roles (role_name, description)
VALUES
    ('ADMIN', 'Full system administration'),
    ('MANAGER', 'Branch and operational management'),
    ('TELLER', 'Customer and transaction operations'),
    ('LOAN_OFFICER', 'Loan processing and approval'),
    ('AUDITOR', 'Audit and compliance access'),
    ('CUSTOMER', 'Bank customer'),
    ('COMPLIANCE', 'Suspicious transaction review')
ON CONFLICT (role_name) DO NOTHING;

INSERT INTO branches (branch_code, branch_name, city, address)
VALUES
    ('SB-MUM-001', 'SecureBank Mumbai Central', 'Mumbai', 'Mumbai Central'),
    ('SB-MUM-002', 'SecureBank Andheri', 'Mumbai', 'Andheri East'),
    ('SB-PUN-001', 'SecureBank Pune', 'Pune', 'Shivajinagar')
ON CONFLICT (branch_code) DO NOTHING;

INSERT INTO customers
    (full_name, email, phone, address, date_of_birth, kyc_status)
VALUES
    ('Aarav Sharma', 'aarav@example.com', '9000000001',
     'Mumbai', '2000-01-15', 'VERIFIED'),
    ('Priya Mehta', 'priya@example.com', '9000000002',
     'Mumbai', '1999-05-20', 'VERIFIED'),
    ('Rahul Verma', 'rahul@example.com', '9000000003',
     'Pune', '2001-08-10', 'PENDING')
ON CONFLICT (email) DO NOTHING;
