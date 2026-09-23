# SecureBank — Product Requirements Document

## 1. Project Overview

**Project:** SecureBank — Role-Based Secure Banking Database Management System
**Academic Context:** DBMS Innovative Examination
**Team Size:** 12 students
**Database:** MySQL
**Backend:** Python + Flask
**Frontend:** HTML/CSS/JavaScript + Bootstrap or agreed equivalent

SecureBank is an academic banking simulation. It does not process real money or connect to real banking infrastructure.

## 2. Project Philosophy

The project should remain simple enough for second-year students, strong enough to demonstrate DBMS concepts beyond basic CRUD, modular enough for 12 students to make identifiable technical contributions, and small enough to explain clearly during the viva.

A team member does **not** need a separate table to have a technical contribution.

## 3. Objectives

1. Design a normalized relational banking database.
2. Implement application and database-level RBAC.
3. Implement meaningful triggers.
4. Implement secure database views.
5. Implement stored procedures/functions for important banking operations.
6. Demonstrate ACID transactions and rollback.
7. Maintain an audit trail.
8. Implement deterministic suspicious-transaction monitoring.
9. Provide role-specific workflows.
10. Test valid, invalid and unauthorized operations.
11. Produce reproducible MySQL SQL.
12. Produce an 11-page maximum research-backed report.

## 4. Target Roles

| Role | Main Responsibility |
|---|---|
| Customer | Own account information, transactions and beneficiaries |
| Teller | Customer/account operations, deposits and withdrawals |
| Loan Officer | Loan applications and processing |
| Branch Manager | Branch-level approval and reports |
| Auditor | Audit and transaction reporting |
| Compliance Officer | Suspicious-transaction review |
| Security Administrator | User and role administration |

## 5. Functional Requirements

- Authentication and role determination.
- Customer CRUD.
- Account creation and management.
- Deposits and withdrawals.
- Atomic fund transfers.
- Beneficiary management.
- Loan applications and payments.
- Audit logging.
- Deterministic suspicious-transaction monitoring.
- Role-authorized reporting through views.
- RBAC.
- Transaction integrity with COMMIT/ROLLBACK.

## 6. Core Database Model

The database should remain intentionally compact:

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

These tables cover the planned workflows. Views, triggers, functions/procedures, constraints and privileges are database features, not separate tables.

Additional tables require a genuine functional or normalization reason.

## 7. Business Rules

1. Closed/inactive accounts cannot perform normal financial transactions.
2. Withdrawals cannot exceed permitted available balance.
3. Transfers debit and credit within one atomic transaction.
4. Failed transfers roll back all related changes.
5. Users cannot perform operations outside their permissions.
6. Defined sensitive operations generate audit records.
7. Ordinary operational users cannot freely modify audit history.
8. Suspicious-transaction rules are deterministic and documented.
9. Loan approval is separated from ordinary teller operations.
10. Reports expose only intended information.
11. Beneficiary security may include verification/cooling-period rules.
12. Important business rules have an owner and test case.

## 8. Controlled Extensions

| Member | Core Area | Small Extension |
|---|---|---|
| 1 | Database Architecture | Indexing + basic `EXPLAIN` analysis |
| 2 | Customer Management | KYC/data-quality checks |
| 3 | Account Management | Account lifecycle/balance invariants |
| 4 | Transaction Engine | Stored banking operations |
| 5 | Audit & Triggers | Structured audit information |
| 6 | RBAC & Security | Least-privilege refinement |
| 7 | Loan Management | EMI/amortization |
| 8 | Beneficiary & Transfers | Beneficiary cooling period |
| 9 | Compliance | Deterministic risk scoring |
| 10 | Views & Reporting | Role-filtered/date-range reporting |
| 11 | Application Integration | Password hashing, sessions, parameterized DB access |
| 12 | Testing & Integration | Regression and controlled failure testing |

Do not add AI/ML, blockchain, microservices, real payment gateways, distributed databases or unnecessary infrastructure.

## 9. Research Requirements

Required areas: RBAC, database security, auditing/logging, views/controlled data exposure, transactions/ACID, and banking security context.

Preferred sources:

- IEEE Xplore
- ACM Digital Library
- NIST
- OWASP
- MySQL official documentation
- Recognized DBMS textbooks

Target approximately 12–15 strong references.

## 10. Report Requirements

Maximum length: **11 pages**.

Suggested sections:

1. Title + Abstract
2. Introduction + Problem Statement
3. Literature Review
4. Objectives + Existing vs Proposed System
5. Architecture + ER Diagram
6. Database Design
7. RBAC + Security
8. Triggers + Views + Procedures + Transactions
9. Working Model + Screenshots
10. Testing + Results
11. Conclusion + Limitations + Future Scope + References

## 11. Acceptance Criteria

- MySQL database initializes correctly.
- Core workflows work end-to-end.
- RBAC demonstrates allowed and denied operations.
- Agreed triggers execute correctly.
- Agreed views return correct data.
- Core banking functions/procedures work.
- Transfer rollback can be demonstrated.
- Audit records are generated correctly.
- Suspicious-transaction rules can be demonstrated.
- Tests are documented and pass.
- All 12 members have identifiable technical contributions.
- No secrets or local-only data are committed.
