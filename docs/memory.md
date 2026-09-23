# SecureBank — Project Memory

> Compact continuation state for developers and AI agents.

## 1. Project Identity

**Project:** SecureBank
**Purpose:** DBMS Innovative Examination
**Team:** 12 second-year Computer Engineering students
<<<<<<< HEAD
**Database:** MySQL
**Backend:** Python + Flask
=======
**Database:** MySQL 8.0+
**Backend:** Python + Flask + mysql-connector-python
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
**Frontend:** HTML/CSS/JavaScript + Bootstrap or agreed equivalent
**Architecture:** Modular monorepo

SecureBank is an academic banking simulation and does not process real money.

## 2. Current Status

<<<<<<< HEAD
**Phase:** Phase 1 — ER Model and Database Foundation

Repository and planning documents are initialized. The core MySQL schema,
seed data, views, triggers and stored procedures have been written
(`database/securebank_mysql.sql` and the numbered `database/00_*.sql`
through `database/08_*.sql` scripts), but have not yet been executed
against a live MySQL server or verified end-to-end — treat them as
unverified until run.

**Immediate next step:** Run the schema against a real MySQL instance,
verify `database/tests/*.sql`, and start wiring the Flask backend to it.
=======
**Phase:** Phase 3 — Backend API Development (Complete)

Repository and planning documents are updated.
Backend implementation in Flask with MySQL 8.0+ connector is complete.
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e

## 3. Technology Decision

```text
Frontend
   ↓
Flask Backend
   ↓
<<<<<<< HEAD
MySQL
```

=======
MySQL 8.0+
```

MySQL 8.0+ is the relational DBMS.

>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
## 4. Authoritative Documents

```text
docs/prd.md
docs/architecture.md
docs/phases.md
docs/rules.md
docs/memory.md
```

## 5. Compact Core Database Model

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

The database remains intentionally small.

Views, triggers, functions/procedures, constraints and privileges are features rather than artificial tables.

## 6. Planned DBMS Features

- Primary keys
- Foreign keys
- Normalization
- Constraints
- Joins
- Subqueries
- DDL
- DML
- DCL
- RBAC
- GRANT
- REVOKE
- Views
- Triggers
<<<<<<< HEAD
- MySQL stored procedures
=======
- MySQL functions/procedures
>>>>>>> b44714e3d670951e57d072f2081c1ef2c89f2e8e
- Transactions
- COMMIT
- ROLLBACK
- Audit logging

## 7. Implemented Views

```text
v_customer_accounts
v_transaction_history
v_loan_report
v_audit_report
```

Only required views should be implemented.

## 8. Implemented Banking Procedures

```text
sp_deposit
sp_withdraw
sp_transfer
```

Loan-specific procedures may be added if required.

## 9. Trigger Responsibilities

1. Transaction audit — implemented (`trg_audit_txn`).
2. Account/transaction validation — implemented (`trg_check_txn`), also
   covers protection of inactive/closed accounts.
3. Suspicious-transaction recording — not automated; `suspicious_transactions`
   rows are inserted by application/compliance logic, not a trigger.

## 10. Team Ownership

| Member | Ownership |
|---|---|
| 1 | Database Architecture / ER / schema integration |
| 2 | Customer Management |
| 3 | Account Management |
| 4 | Transaction Engine |
| 5 | Audit & Triggers |
| 6 | RBAC & Security |
| 7 | Loan Management |
| 8 | Beneficiary & Transfer Security |
| 9 | Compliance |
| 10 | Views & Reporting |
| 11 | Application/Frontend Integration |
| 12 | Testing & Integration |

Known assignments:

- Member 2 — Khushi
- Member 3 — Tripti
- Member 5 — Hiti
- Member 6 — Manyata
- Member 7 — 48
- Member 8 — Vidula
- Member 10 — Nikhil V
- Member 11 — Abhi 47
- Member 4 — backend/Transaction Engine owner

## 11. Controlled Extension Map

| Member | Extension |
|---|---|
| 1 | Indexing + `EXPLAIN` |
| 2 | KYC/data-quality checks |
| 3 | Account lifecycle/balance invariants |
| 4 | Stored banking operations |
| 5 | Structured audit information |
| 6 | Least-privilege refinement |
| 7 | EMI/amortization |
| 8 | Beneficiary cooling period |
| 9 | Deterministic risk scoring |
| 10 | Role-filtered/date-range reporting |
| 11 | Password hashing/session handling/parameterized access |
| 12 | Regression and controlled failure testing |

## 12. Repository State

Expected structure:

```text
securebank/
├── docs/
├── database/
├── backend/
├── frontend/
├── diagrams/
└── scripts/
```

Database order:

```text
00_reset.sql
01_schema.sql
02_constraints.sql
03_seed_data.sql
04_roles.sql
05_views.sql
06_triggers.sql
07_procedures.sql
08_test_data.sql
database/tests/*
```

`database/securebank_mysql.sql` holds the same schema as one consolidated
file, for a quick single-script run in MySQL Workbench.

## 13. Important Current Decisions

- MySQL is final.
- Database remains compact.
- No artificial tables just for member ownership.
- Database member owns final ER/schema integration.
- Backend owner integrates the agreed database with Flask.
- Frontend owner consumes backend APIs.
- All 12 members have genuine technical ownership.
- Each member has one small controlled extension.
- No AI/ML, blockchain, microservices, real payment gateways or unnecessary infrastructure.

## 14. Completed Work

### Planning

- [x] Project concept
- [x] 12-member technical ownership
- [x] 11-page report constraint
- [x] Research requirements
- [x] Monorepo architecture
- [x] MySQL selection
- [x] Compact core database model
- [x] Development rules

### Database

- [x] Final ER model (10 core tables, see section 5)
- [x] Final schema (`database/securebank_mysql.sql`, `database/01_schema.sql`)
- [x] Constraints (`database/02_constraints.sql`)
- [x] Seed data (`database/03_seed_data.sql`, `database/08_test_data.sql`)
- [x] Views (`database/05_views.sql`)
- [x] Triggers (`database/06_triggers.sql`)
- [x] Stored procedures (`database/07_procedures.sql`)
- [x] Test SQL written (`database/tests/*.sql`)
- [ ] Roles/privileges actually granted on a live server (`04_roles.sql` is still an example)
- [ ] Normalization review
- [ ] Schema/tests executed and verified against a running MySQL instance

### Backend

- [x] DB connection
- [x] Authentication
- [x] Authorization
- [x] Feature APIs
- [x] Transaction integration
- [x] Error handling

### Frontend

- [ ] Login
- [ ] Dashboards
- [ ] Customer UI
- [ ] Account UI
- [ ] Transaction UI
- [ ] Loan UI
- [ ] Beneficiary UI
- [ ] Compliance UI
- [ ] Audit/report UI

### Testing

- [ ] RBAC
- [ ] Constraints
- [ ] Triggers
- [ ] Transaction/rollback
- [ ] Views
- [ ] API
- [ ] End-to-end demo

## 15. Immediate Next Actions

1. Run `database/securebank_mysql.sql` (or `00_reset.sql` through
   `08_test_data.sql` in order) against a real MySQL server.
2. Run `database/tests/*.sql` and verify the results.
3. Implement roles/privileges from `04_roles.sql` on the actual server.
4. Connect the Flask backend to MySQL.
5. Integrate frontend.
6. Run the complete test matrix (RBAC, constraints, triggers, transactions,
   views, API, end-to-end demo).

## 16. AI Continuation Protocol

When starting a new session:

1. Read all five documents.
2. Inspect the actual repository/database state.
3. Determine the current phase.
4. Identify the smallest next logical task.
5. Make only required changes.
6. Test them.
7. Update `memory.md`.
8. Report exactly what changed and what remains.

Never treat this file as proof that an implementation exists. Verify the actual repository and MySQL database.
