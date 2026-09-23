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
<<<<<<< HEAD
| Database | MySQL |
| Backend | Python + Flask |
=======
| Database | MySQL 8.0+ |
| Backend | Python + Flask + mysql-connector-python |
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
| Frontend | HTML/CSS/JavaScript + Bootstrap or agreed equivalent |
| Version Control | Git + GitHub |
| Diagrams | draw.io / Figma |

<<<<<<< HEAD
MySQL is the relational DBMS, run locally or on any standard MySQL server (e.g. via MySQL Workbench).
=======
MySQL 8.0+ is the relational DBMS.
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e

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
<<<<<<< HEAD
   ↓ SQL / Procedures
MySQL
=======
   ↓ SQL / Procedures / Functions
MySQL 8.0+
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
   ├── Tables / Constraints
   ├── Roles / Privileges
   ├── Views
   ├── Triggers
   ├── Procedures / Functions
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
| 5 | Audit & Triggers | Audit usage + MySQL triggers |
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

<<<<<<< HEAD
`database/securebank_mysql.sql` is the same schema as a single consolidated
file, meant for a quick "open and execute" run in MySQL Workbench. The
numbered scripts above are the modular, step-by-step equivalent used for
development and review.

## 9. MySQL Rule

The project must visibly demonstrate MySQL:
=======
## 9. DBMS Implementation

The project must visibly demonstrate MySQL 8.0+:
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e

- DDL
- DML
- DCL
- Constraints
- Joins
- Views
- Triggers
- Procedures/functions
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
<<<<<<< HEAD
MySQL transaction/procedure
=======
MySQL transaction / stored procedure
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
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
