# SecureBank --- Development Phases and Team Work

## 1. Rule

Every member owns a real technical module, SQL work, tests and one small
out-of-syllabus extension. Nobody is assigned only PPT, documentation,
research or testing.

## 2. Team Allocation

  Member   Ownership                 Extension
  -------- ------------------------- ------------------------------
  1        Database Architecture     Indexing + `EXPLAIN`
  2        Customer Management       KYC/data quality
  3        Account Management        Lifecycle + invariants
  4        Transaction Engine        Stored procedures
  5        Audit & Triggers          Structured audit trail
  6        RBAC & Security           Least privilege/hierarchy
  7        Loan Management           EMI/amortization
  8        Beneficiary & Transfers   Verification/cooling period
  9        Compliance                Risk scoring
  10       Views & Reporting         Role-filtered KPIs
  11       Application Integration   Authentication/security
  12       Testing & Integration     Regression/failure injection

## Phase 0 --- Setup

All members configure the repository, understand their module, read the
five documents and follow the extension boundary.

## Phase 1 --- Database Foundation

**M1:** ER/EER, schema, normalization, PK/FK, indexes.

**M2:** `customers`, constraints, seed data, CRUD and data-quality
queries.

**M3:** `accounts`, `account_types`, status rules and balance
constraints.

**M4:** `transactions`, `transaction_types`, relationships and
transaction constraints.

**M5:** `audit_logs` structure and audit fields.

**M6:** `users`, `roles`, `user_roles`, permission design.

**M7:** `loans`, `loan_types`, `loan_payments`.

**M8:** `beneficiaries`, eligibility fields and constraints.

**M9:** `suspicious_transactions`, compliance statuses and rule fields.

**M10:** reporting requirements and source-table mapping.

**M11:** Flask/database connection and frontend skeleton.

**M12:** test database, baseline data and test format.

Exit criteria: ER model reviewed, schema validated and clean
initialization works.

## Phase 2 --- Core Operations

M2: customer operations and data quality.

M3: account operations and lifecycle.

M4: deposit/withdrawal/transfer engine.

M7: loan application/payment.

M8: beneficiary operations.

M11: backend APIs and UI.

M1/M5/M6/M9/M10/M12 review integration, constraints, security, audit and
tests.

## Phase 3 --- Security, Procedures and Audit

**M4:** implement and explain:

``` text
sp_deposit()
sp_withdraw()
sp_transfer()
```

Demonstrate COMMIT and ROLLBACK.

**M5:** implement audit triggers and structured audit records.

**M6:** implement roles, GRANT, REVOKE and least-privilege tests.

**M8:** implement beneficiary verification/cooling-period rule.

## Phase 4 --- Loans, Compliance and Reports

**M7:** EMI, amortization schedule and outstanding balance.

**M9:** suspicious rules and deterministic risk score.

**M10:** views, date-range reports and role-filtered KPIs.

## Phase 5 --- Application

**M11:** login, password hashing, sessions, role-aware dashboards and
parameterized DB access.

All module owners provide the required API/database interaction.

## Phase 6 --- Testing

**M12:** regression suite, SQL tests, integration tests and controlled
failure injection.

Every member supplies: - one success test - one invalid/business-rule
test - one integration test where applicable

## Phase 7 --- Final Demonstration

1.  Login
2.  Role-specific dashboard
3.  Customer/account workflow
4.  Deposit
5.  Transfer
6.  Automatic audit record
7.  Unauthorized operation
8.  Beneficiary eligibility
9.  Loan EMI/schedule
10. Suspicious transaction/risk score
11. Reporting view
12. Rollback demonstration

## Viva Requirement

Every member must explain their tables, queries, constraints, extension,
test case and interaction with another module.

## Extension Boundary

Extensions must be: 1. Small. 2. Relevant. 3. Demonstrable. 4.
Explainable in a DBMS viva.

Do not add unrelated advanced technologies.
