# SecureBank

## Role-Based Secure Banking Database Management System

SecureBank is an academic banking database management system developed for the DBMS Innovative Examination.

The project demonstrates core DBMS concepts taught in the curriculum and extends them with small, meaningful technical additions assigned across all 12 team members.

> **Academic simulation only:** SecureBank does not process real money or connect to real banking infrastructure.

## Technology Stack

- MySQL 8.0+
- Python
- Flask
- mysql-connector-python
- HTML
- CSS
- JavaScript
- Bootstrap
- Git
- GitHub

## Core DBMS Concepts

- ER/EER modelling
- Relational database design
- Normalization
- Primary and foreign keys
- Constraints
- DDL / DML / DCL / TCL
- Joins and subqueries
- Views
- Triggers
- GRANT / REVOKE
- Transactions
- ACID
- Concurrency
- Deadlock and recovery concepts

## Controlled Project Extensions

Each team member has one small technical extension:

| Member | Extension |
|---|---|
| 1 | Indexing and basic `EXPLAIN` analysis |
| 2 | KYC/data-quality and duplicate-candidate checks |
| 3 | Account lifecycle and balance invariants |
| 4 | Stored-procedure-based banking operations |
| 5 | Structured audit trail |
| 6 | Least-privilege refinement and limited role hierarchy |
| 7 | EMI/amortization schedule |
| 8 | Beneficiary verification/cooling period |
| 9 | Deterministic transaction risk scoring |
| 10 | Role-filtered KPIs and date-range reporting |
| 11 | Password hashing, sessions and parameterized database access |
| 12 | Automated regression and controlled failure injection |

## Repository Structure

```text
securebank/
├── docs/
├── database/
├── backend/
├── frontend/
├── diagrams/
└── scripts/
See docs/ for the complete project requirements, architecture, development phases, engineering rules and project memory.
```

## Backend Quickstart

### 1. Setup Virtual Environment & Dependencies

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 3. Run Development Server

```bash
python -m flask --app backend.app.main run --debug
```

### 4. Health Check

```bash
curl http://localhost:5000/api/health
```

### 5. Major API Endpoint Groups

- **Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- **Customers**: `/api/customers`, `/api/customers/<id>`
- **Accounts**: `/api/accounts`, `/api/accounts/<id>`, `/api/customers/<id>/accounts`, `/api/accounts/<id>/status`
- **Transactions**: `/api/transactions/deposit`, `/api/transactions/withdraw`, `/api/transactions/transfer`, `/api/accounts/<id>/transactions`
- **Beneficiaries**: `/api/customers/<id>/beneficiaries`, `/api/beneficiaries/<id>/status`
- **Loans**: `/api/loans`, `/api/loans/<id>`, `/api/customers/<id>/loans`, `/api/loans/<id>/status`
- **Compliance**: `/api/compliance/suspicious`, `/api/compliance/suspicious/<id>/review`
- **Audit Logs**: `/api/audit/logs`
- **Reports (Views)**: `/api/reports/customer-accounts`, `/api/reports/transactions`, `/api/reports/branches`, `/api/reports/loans`, `/api/reports/audit`

### 6. Run Backend Tests

```bash
source .venv/bin/activate
python -m pytest backend/tests/ -v
```
