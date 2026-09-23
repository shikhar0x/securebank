# SecureBank — Development Phases and Team Work Allocation

## 1. Development Strategy

The project is divided into phases. Team members own technical areas, but integration is shared.

No member should be assigned only documentation, PPT, research or testing. Every member must produce technical work.

A separate table is not required for every member.

# Phase 0 — Project Freeze and Setup

Confirm scope, MySQL, repository, conventions, Git workflow and documentation.

All members clone the repository, configure the environment and understand their module.

# Phase 1 — ER Model and Database Foundation

### Member 1 — Database Architecture
- ER diagram
- Relational schema
- Normalization
- PK/FK strategy
- Naming conventions
- MySQL schema integration
- Basic indexing

### Member 2 — Customer
- Customer fields/constraints
- Seed data
- KYC/data-quality requirements

### Member 3 — Accounts
- Account fields/status
- Balance rules
- Constraints and seed data

### Member 4 — Transactions
- Transaction fields/relationships
- Transaction constraints
- Deposit/withdrawal/transfer requirements

### Member 5 — Audit
- Audit-log requirements
- Trigger audit fields

### Member 6 — RBAC
- Users
- Roles
- Authorization requirements
- GRANT/REVOKE requirements

### Member 7 — Loans
- Loan fields/relationships
- Loan payment requirements
- EMI calculation requirements

### Member 8 — Beneficiaries
- Beneficiary fields
- Transfer eligibility
- Verification/cooling-period rule

### Member 9 — Compliance
- Suspicious transaction requirements
- Risk-level fields
- Deterministic rules

### Member 10 — Reporting
- Required report fields
- Reporting requirements
- Table-to-report mapping

### Member 11 — Application Integration
- Flask skeleton
- DB connection
- Configuration
- Authentication/session foundation

### Member 12 — Testing
- Test format
- Baseline test data
- Integration checklist

### Exit Criteria
- ER model reviewed
- Core schema reviewed
- Tables created in MySQL
- Relationships validated
- Clean initialization works

# Phase 2 — Core Banking Operations

- Member 2: customer CRUD/validation
- Member 3: account creation/status/operations
- Member 4: deposit/withdrawal/transaction logic
- Member 7: loan application/payment operations
- Member 8: beneficiary management
- Member 11: backend API integration
- Members 1, 5, 6, 9, 10, 12: review, security, reporting and tests

Minimum end-to-end flow:

```text
Customer → Account → Deposit → Withdrawal → Transaction
```

# Phase 3 — RBAC and Database Security

### Member 6
- MySQL roles where required
- GRANT
- REVOKE
- Authorization matrix
- Security tests

### Member 11
- Authentication
- Sessions
- Role-aware routing
- Role-specific UI

### Member 10
Validate report/view access.

### Member 12
Test allowed/denied operations.

All module owners verify role boundaries.

# Phase 4 — Triggers, Functions and Transactions

### Member 5
- Audit triggers
- Validation triggers
- Trigger tests

### Member 4
- Deposit function/procedure
- Withdrawal function/procedure
- Transfer function/procedure
- Atomic transaction demonstration

### Member 7
Loan-related functions where required.

### Member 9
Suspicious transaction rules.

### Member 12
Trigger, rollback, atomicity and invalid-operation tests.

Transfer demonstration:

```text
BEGIN
↓
Debit
↓
Credit
↓
Transaction record
↓
Audit
↓
COMMIT
```

Failure must demonstrate complete rollback.

# Phase 5 — Views and Reporting

### Member 10
Implement only required views, such as:

```text
v_customer_accounts
v_transaction_history
v_loan_report
v_audit_report
```

Module owners validate results. Member 6 validates access. Member 11 integrates reports. Member 12 tests them.

# Phase 6 — Controlled Extensions

Each member completes one small extension:

1. Index/EXPLAIN analysis
2. Customer data-quality checks
3. Account lifecycle/balance invariants
4. Stored banking operations
5. Structured audit information
6. Least-privilege refinement
7. EMI/amortization
8. Beneficiary cooling period
9. Deterministic risk score
10. Role-filtered/date-range reporting
11. Secure password/session handling
12. Regression/failure testing

# Phase 7 — Frontend Integration

Member 11 leads login, dashboard, customer, account, transaction, loan, beneficiary, compliance and reporting screens.

All module owners provide API requirements and verify their screens.

Member 12 performs UI-to-database integration testing.

# Phase 8 — Integration and Testing

Member 12 leads the final matrix:

- Authentication
- RBAC
- CRUD
- Constraints
- Triggers
- Functions/procedures
- Transactions
- Views
- Audit
- Compliance
- Extensions

Members 1–11 fix module and integration defects.

# Phase 9 — Research and Report

Research/documentation is shared work, not a replacement for technical contribution.

Each member supplies their module description, SQL/code, DBMS concept, extension, test case and evidence.
