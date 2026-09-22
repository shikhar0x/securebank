# SecureBank --- Project Architecture

## 1. Architecture

``` text
Frontend
   ↓ HTTP/JSON
Flask Backend
   ↓ SQL / Procedures
MySQL Database
```

The database is authoritative for persistent data, integrity
constraints, privileges, views, triggers, stored procedures, transaction
atomicity and audit records.

## 2. Repository

``` text
securebank/
├── docs/
│   ├── prd.md
│   ├── architecture.md
│   ├── phases.md
│   ├── rules.md
│   └── memory.md
├── database/
│   ├── 00_reset.sql
│   ├── 01_schema.sql
│   ├── 02_constraints.sql
│   ├── 03_seed_data.sql
│   ├── 04_roles.sql
│   ├── 05_views.sql
│   ├── 06_triggers.sql
│   ├── 07_procedures.sql
│   ├── 08_test_data.sql
│   └── tests/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── accounts/
│   │   ├── transactions/
│   │   ├── beneficiaries/
│   │   ├── loans/
│   │   ├── compliance/
│   │   ├── audit/
│   │   ├── reports/
│   │   └── security/
│   └── tests/
├── frontend/
├── diagrams/
└── scripts/
```

## 3. Database Layer

``` text
Base Tables
    ↓
Constraints
    ↓
Views / Triggers / Procedures
    ↓
Backend Services
    ↓
API
    ↓
Frontend
```

## 4. Module Extensions

### Member 1 --- Database Architecture

ER/EER, normalization, keys and schema. Extension: selected indexes and
basic `EXPLAIN` comparison.

### Member 2 --- Customer

Customer CRUD and joins. Extension: deterministic KYC completeness and
duplicate-candidate queries.

### Member 3 --- Accounts

Accounts, account types and status. Extension: lifecycle transitions and
balance invariants.

### Member 4 --- Transactions

Deposit, withdrawal, transfer, ACID and rollback. Extension:
`sp_deposit`, `sp_withdraw`, `sp_transfer`.

### Member 5 --- Audit

Triggers and audit table. Extension: actor, event, timestamp and
relevant before/after values.

### Member 6 --- Security

Roles, GRANT/REVOKE and authorization. Extension: least-privilege matrix
and limited role hierarchy.

### Member 7 --- Loans

Loans and payments. Extension: EMI/amortization calculation.

### Member 8 --- Beneficiaries

Beneficiary management and transfer eligibility. Extension: verification
and cooling period.

### Member 9 --- Compliance

Suspicious transaction rules. Extension: deterministic risk score based
on documented rules.

### Member 10 --- Reports

Views, joins and aggregates. Extension: role-filtered KPIs and
date-range reports.

### Member 11 --- Application

Flask/frontend integration. Extension: password hashing, sessions and
parameterized access.

### Member 12 --- Testing

SQL/integration testing. Extension: automated regression and controlled
failure injection.

## 5. Transfer Flow

``` text
User
 ↓
Frontend
 ↓
Backend authentication/authorization
 ↓
Beneficiary/account eligibility
 ↓
sp_transfer(...)
 ↓
BEGIN
 ↓
Validate → Debit → Credit → Record
 ↓
Audit Trigger
 ↓
COMMIT
```

Failure at a critical step:

``` text
ROLLBACK → no partial transfer
```

## 6. Audit Flow

``` text
Sensitive Database Event
        ↓
Trigger
        ↓
audit_logs
        ↓
Audit View
        ↓
Authorized Auditor
```

## 7. Compliance Flow

``` text
Transaction
    ↓
Documented Rules
    ↓
Rule Matches
    ↓
Academic Risk Score
    ↓
suspicious_transactions
    ↓
Compliance Review
```

The risk score is deterministic; this is not an AI/ML fraud detector.

## 8. RBAC Flow

``` text
Authenticated User
      ↓
Application Role
      ↓
Backend Authorization
      ↓
Database Privilege
      ↓
Allow / Deny
```

Frontend button hiding is never considered sufficient security.
