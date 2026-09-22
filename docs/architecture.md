# SecureBank — Project Architecture

## 1. Architecture Goals

- Modular
- Monorepo-based
- Suitable for 12 developers
- Database-first
- Simple enough for second-year students
- Reproducible
- Easy to demonstrate
- Resistant to unnecessary redesign

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL hosted by Supabase |
| Backend | Python + Flask |
| Frontend | HTML/CSS/JavaScript + Bootstrap or agreed equivalent |
| Version Control | Git + GitHub |
| Diagrams | draw.io / Figma |

Supabase is the hosting/platform layer. PostgreSQL is the actual relational DBMS.

## 3. Repository Structure

```text
securebank/
├── README.md
├── .gitignore
├── .env.example
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
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── main.py
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
│   ├── tests/
│   └── requirements.txt
├── frontend/
├── diagrams/
└── scripts/
```

## 4. Logical Architecture

```text
Frontend
   ↓ HTTP/JSON
Flask Backend
   ↓ SQL / Functions
Supabase PostgreSQL
   ├── Tables / Constraints
   ├── Roles / Privileges
   ├── Views
   ├── Triggers
   ├── Functions / Procedures
   ├── Transactions
   └── Audit
```

## 5. Responsibilities

### Database

Authoritative for:

- Persistent banking data
- Referential integrity
- Database permissions
- Views
- Triggers
- Functions/procedures
- Transaction integrity
- Audit records

### Flask Backend

Responsible for:

- API endpoints
- Authentication/session handling
- Input validation
- Calling database operations
- Application authorization
- Response formatting

### Frontend

Responsible for:

- UI
- Forms
- Dashboards
- Displaying results
- Calling backend APIs

Frontend hiding alone is never considered security.

## 6. Core Database Model

```text
customers
users
roles
branches
accounts
transactions
beneficiaries
loans
audit_logs
suspicious_transactions
```

## 7. Module Ownership

| Member | Module | Technical Output |
|---|---|---|
| 1 | Database Architecture | ER, normalization, schema integration, indexes |
| 2 | Customer Management | Customer SQL + CRUD API + data-quality checks |
| 3 | Account Management | Account SQL + lifecycle/balance rules |
| 4 | Transaction Engine | Deposit/withdrawal/transfer SQL + atomic operations |
| 5 | Audit & Triggers | Audit usage + PostgreSQL triggers |
| 6 | RBAC & Security | Roles, GRANT/REVOKE, authorization |
| 7 | Loan Management | Loan SQL + EMI calculations |
| 8 | Beneficiary & Transfers | Beneficiary validation/security |
| 9 | Compliance | Risk rules + suspicious workflow |
| 10 | Views & Reporting | Views + reporting queries |
| 11 | Application Integration | Authentication/session + frontend/API integration |
| 12 | Testing & Integration | SQL/API/regression/integration tests |

## 8. SQL Execution Order

```text
00_reset.sql
↓
01_schema.sql
↓
02_constraints.sql
↓
03_seed_data.sql
↓
04_roles.sql
↓
05_views.sql
↓
06_triggers.sql
↓
07_procedures.sql
↓
08_test_data.sql
↓
database/tests/*
```

## 9. Supabase Rule

Supabase should simplify hosting and development, not replace the DBMS work.

The project must visibly demonstrate PostgreSQL:

- DDL
- DML
- DCL
- Constraints
- Joins
- Views
- Triggers
- Functions/procedures
- Transactions
- COMMIT/ROLLBACK
- Authorization

## 10. Transfer Flow

```text
Frontend
   ↓
Flask transaction endpoint
   ↓
Validate request
   ↓
PostgreSQL transaction/function
   ↓
Debit source
   ↓
Credit destination
   ↓
Record transaction
   ↓
Audit trigger
   ↓
COMMIT
```

Failure causes `ROLLBACK`, leaving no partial transfer.
