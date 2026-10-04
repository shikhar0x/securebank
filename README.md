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

## Full Project Setup

### Requirements

- MySQL Server 8.0 or newer, running locally or reachable over the network.
- Python 3.10 or newer and `pip`.
- The `mysql` command-line client for the database commands below. MySQL Workbench can also run the same SQL files.
- Node.js is optional; it is only needed for the frontend JavaScript syntax check.

### 1. Create the database

From the repository root, build the schema, seed data, views, triggers, and
stored procedures in order. The `04_roles.sql` file currently contains example
role/grant statements in comments; it is not required for application startup.

```bash
mysql -u root -p < database/01_schema.sql
mysql -u root -p < database/02_constraints.sql
mysql -u root -p < database/03_seed_data.sql
mysql -u root -p < database/04_roles.sql
mysql -u root -p < database/05_views.sql
mysql -u root -p < database/06_triggers.sql
mysql -u root -p < database/07_procedures.sql
mysql -u root -p < database/08_test_data.sql
```

Enter the MySQL password when prompted. `08_test_data.sql` adds example
accounts and a beneficiary and assumes the seed records from step 3 are intact.
For a simpler initial database, skip that final file. As an alternative to the
numbered scripts, `database/securebank_mysql.sql` creates a consolidated basic
schema and sample data; run either setup path on a fresh database, not both.

`database/00_reset.sql` drops existing SecureBank tables, views, triggers, and
procedures. Do not run it unless you intentionally want to erase the current
SecureBank database before rebuilding it.

### 2. Configure the application

Copy `.env.example` to `.env` in the repository root and set the connection
details for the MySQL account the backend will use:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=securebank
DB_USER=root
DB_PASSWORD=your_mysql_password
SECRET_KEY=replace-with-a-long-random-secret
FLASK_ENV=development
```

Use a dedicated MySQL account with access to the `securebank` database instead
of `root` where practical. Keep `.env` private and do not commit it. The Flask
session uses `SECRET_KEY`; set a unique, unpredictable value before sharing or
deploying the app.

### 3. Install Python dependencies

**Linux/macOS:**

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
```

**Windows PowerShell:**

```powershell
py -3 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
```

### 4. Start SecureBank

Run from the repository root with the virtual environment active:

```bash
python -m flask --app backend.app.main run --debug
```

Open <http://localhost:5000/>. Flask serves the frontend and API on the same
origin, so session cookies work without separate frontend proxy or CORS setup.
Do not open `frontend/index.html` directly from the filesystem.

The SQL seed scripts create roles, branches, and customers; they do not create
user login rows. To create the demo accounts for database-backed login, first
generate a Werkzeug password hash from the active virtual environment:

```bash
python -c "from werkzeug.security import generate_password_hash; print(generate_password_hash('Password123!', method='pbkdf2:sha256:600000', salt_length=8))"
```

Paste the printed hash in place of `<paste-generated-hash>` below, then run the
SQL once in MySQL Workbench or the MySQL client:

```sql
INSERT INTO users (u_cust_id, u_role, u_name, u_password)
SELECT 1, r_id, 'customer1', '<paste-generated-hash>'
FROM roles WHERE r_name = 'CUSTOMER';

INSERT INTO users (u_cust_id, u_role, u_name, u_password)
SELECT NULL, r_id, demo.u_name, '<paste-generated-hash>'
FROM roles r
JOIN (
    SELECT 'teller1' AS u_name, 'TELLER' AS role_name UNION ALL
    SELECT 'loanofficer1', 'LOAN_OFFICER' UNION ALL
    SELECT 'manager1', 'MANAGER' UNION ALL
    SELECT 'auditor1', 'AUDITOR' UNION ALL
    SELECT 'compliance1', 'COMPLIANCE' UNION ALL
    SELECT 'admin1', 'ADMIN'
) AS demo ON demo.role_name = r.r_name;
```

The persona switcher uses `Password123!` for these demo accounts. The built-in
demo fallback is for local academic demonstration only; use database-backed
users with private passwords for any shared environment.

### 5. Check the running application

In another terminal, request the public health endpoint:

```bash
curl http://localhost:5000/api/health
```

The frontend syntax check is optional:

```bash
npm --prefix frontend run check
```

### 6. Run the automated backend tests

With the virtual environment active:

```bash
python -m pytest backend/tests/ -v
```

The SQL validation scripts are in `database/tests/`; run them against the
configured MySQL database from MySQL Workbench or the MySQL client after setup.

### API endpoint groups

- **Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`
- **Customers**: `/api/customers`, `/api/customers/<id>`
- **Accounts**: `/api/accounts`, `/api/accounts/<id>`, `/api/customers/<id>/accounts`, `/api/accounts/<id>/status`
- **Transactions**: `/api/transactions/deposit`, `/api/transactions/withdraw`, `/api/transactions/transfer`, `/api/accounts/<id>/transactions`
- **Beneficiaries**: `/api/customers/<id>/beneficiaries`, `/api/beneficiaries/<id>/status`
- **Loans**: `/api/loans`, `/api/loans/<id>`, `/api/customers/<id>/loans`, `/api/loans/<id>/status`
- **Compliance**: `/api/compliance/suspicious`, `/api/compliance/suspicious/<id>/review`
- **Audit Logs**: `/api/audit/logs`
- **Reports (Views)**: `/api/reports/customer-accounts`, `/api/reports/transactions`, `/api/reports/loans`, `/api/reports/audit`
