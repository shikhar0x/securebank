# SecureBank — Project Memory

> Compact continuation state for developers and AI agents.

## 1. Project Identity

**Project:** SecureBank
**Purpose:** DBMS Innovative Examination
**Team:** 12 second-year Computer Engineering students
**Database:** PostgreSQL hosted through Supabase
**Backend:** Python + Flask
**Frontend:** HTML/CSS/JavaScript + Bootstrap or agreed equivalent
**Architecture:** Modular monorepo

SecureBank is an academic banking simulation and does not process real money.

## 2. Current Status

**Phase:** Phase 0 — Project Freeze and Setup

Repository and planning documents are initialized.

**Immediate next step:** Finalize the compact ER model and PostgreSQL/Supabase schema.

## 3. Technology Decision

```text
Frontend
   ↓
Flask Backend
   ↓
PostgreSQL
   ↓
Supabase
```

Supabase is the platform/hosting layer. PostgreSQL is the DBMS.

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
- PostgreSQL functions/procedures
- Transactions
- COMMIT
- ROLLBACK
- Audit logging

## 7. Planned Views

```text
v_customer_accounts
v_transaction_history
v_branch_summary
v_loan_portfolio
v_audit_activity
```

Only required views should be implemented.

## 8. Planned Banking Functions

```text
sp_deposit
sp_withdraw
sp_transfer
```

Loan-specific functions may be added if required.

## 9. Planned Trigger Responsibilities

1. Transaction audit.
2. Account/transaction validation.
3. Protection of inactive/closed accounts.
4. Relevant suspicious-transaction recording.

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

## 13. Important Current Decisions

- Supabase/PostgreSQL is final.
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
- [x] PostgreSQL/Supabase selection
- [x] Compact core database model
- [x] Development rules

### Database

- [ ] Final ER model
- [ ] Final schema
- [ ] Normalization review
- [ ] Constraints
- [ ] Seed data
- [ ] Roles/privileges
- [ ] Views
- [ ] Triggers
- [ ] Functions/procedures
- [ ] Tests

### Backend

- [ ] DB connection
- [ ] Authentication
- [ ] Authorization
- [ ] Feature APIs
- [ ] Transaction integration
- [ ] Error handling

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

1. Finalize compact ER model.
2. Agree on exact attributes for the 10 core tables.
3. Database member creates the schema in Supabase.
4. Retain the agreed PostgreSQL SQL.
5. Implement constraints.
6. Add seed/demo data.
7. Implement roles/privileges.
8. Implement views.
9. Implement triggers.
10. Implement banking functions.
11. Connect Flask backend.
12. Integrate frontend.
13. Run complete test matrix.

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

Never treat this file as proof that an implementation exists. Verify the actual repository and Supabase database.
