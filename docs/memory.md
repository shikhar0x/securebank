# SecureBank --- Project Memory

## 1. Identity

**Project:** SecureBank\
**Purpose:** DBMS Innovative Examination\
**Team:** 12 second-year Computer Engineering students\
**Database:** MySQL 8.x\
**Backend:** Python + Flask\
**Frontend:** HTML/CSS/JavaScript + Bootstrap\
**Architecture:** Modular monorepo

## 2. Current Status

**Phase:** Phase 0 --- Project Freeze and Setup\
**Implementation:** Not started\
**Next:** Finalize ER model and relational schema.

## 3. Core Syllabus

The project foundation is:

``` text
ER/EER
Relational Model
SQL DDL/DML/DCL/TCL
Constraints
Joins/Subqueries
Views
Triggers
Security/Authorization
GRANT/REVOKE
Normalization
Transactions
ACID
Concurrency
Locking
Deadlock
Recovery
```

These are syllabus concepts and are not the main innovation claims.

## 4. Controlled Extensions

  Member   Extension
  -------- ------------------------------------------------
  1        Indexing + `EXPLAIN`
  2        KYC/data quality
  3        Account lifecycle + invariants
  4        Stored procedures
  5        Structured audit trail
  6        Least privilege + limited hierarchy
  7        EMI/amortization
  8        Beneficiary verification/cooling period
  9        Deterministic risk score
  10       Role-filtered KPIs
  11       Password hashing/sessions/parameterized access
  12       Regression/failure injection

These extensions are intentionally small.

## 5. Planned Modules

``` text
auth
customers
accounts
transactions
beneficiaries
loans
compliance
audit
reports
security
```

## 6. Planned Entities

``` text
users
roles
user_roles
customers
employees
branches
account_types
accounts
transaction_types
transactions
beneficiaries
loan_types
loans
loan_payments
audit_logs
suspicious_transactions
login_attempts
```

## 7. Planned Roles

``` text
Customer
Teller
Loan Officer
Branch Manager
Auditor
Compliance Officer
Security Administrator
```

Exact privilege matrix is not yet frozen.

## 8. Planned Procedures

``` text
sp_deposit
sp_withdraw
sp_transfer
sp_apply_loan
sp_make_loan_payment
```

## 9. Planned Views

``` text
v_customer_accounts
v_transaction_history
v_branch_summary
v_loan_portfolio
v_audit_activity
v_suspicious_transactions
```

## 10. Planned Trigger Responsibilities

1.  Transaction audit
2.  Account/withdrawal validation
3.  Closed/blocked account protection
4.  Suspicious transaction recording where appropriate

## 11. Team Ownership

  Member   Ownership
  -------- ------------------------------------
  1        Database Architecture
  2        Customer Management
  3        Account Management
  4        Transaction Engine
  5        Audit & Triggers
  6        RBAC & Security
  7        Loan Management
  8        Beneficiary & Transfer Security
  9        Compliance
  10       Views & Reporting
  11       Frontend & Application Integration
  12       Testing & Integration

## 12. Repository State

Expected:

``` text
securebank/
├── docs/
├── database/
├── backend/
├── frontend/
├── diagrams/
└── scripts/
```

No feature is considered implemented merely because it appears in this
file.

## 13. Completed Planning

-   [x] Project concept
-   [x] 12-member ownership
-   [x] 11-page report constraint
-   [x] Research direction
-   [x] Monorepo architecture
-   [x] Syllabus foundation identified
-   [x] Controlled extension assigned to every member
-   [x] Development rules

## 14. Pending

-   [ ] ER model
-   [ ] Relational schema
-   [ ] Normalization
-   [ ] Constraints
-   [ ] Seed data
-   [ ] Roles
-   [ ] Views
-   [ ] Triggers
-   [ ] Procedures
-   [ ] Extension queries
-   [ ] Backend
-   [ ] Frontend
-   [ ] Tests
-   [ ] Final research references

## 15. Research State

Target approximately 12--15 strong references from IEEE Xplore, ACM,
NIST, OWASP, MySQL documentation and recognized DBMS textbooks.

## 16. Next Actions

1.  Finalize entity list.
2.  Create ER diagram.
3.  Define attributes/types.
4.  Define PK/FK.
5.  Review normalization.
6.  Identify initial indexes.
7.  Freeze `01_schema.sql`.
8.  Create seed data.
9.  Define RBAC matrix.
10. Define extension test cases.

## 17. AI Continuation Protocol

When continuing: 1. Read `prd.md`. 2. Read `architecture.md`. 3. Read
`phases.md`. 4. Read `rules.md`. 5. Read `memory.md`. 6. Inspect actual
repository state. 7. Determine current phase. 8. Make the smallest
logical change. 9. Test it. 10. Update this file. 11. Report changed
files, tests and next step.

Never use this file as proof that an implementation exists.
