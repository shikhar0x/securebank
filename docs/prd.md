# SecureBank --- Product Requirements Document

## 1. Project Overview

SecureBank is an academic **Role-Based Secure Banking Database
Management System** for the DBMS Innovative Examination. It uses MySQL
8.x, Python/Flask and a web frontend. It is a simulation and does not
process real money.

The project follows the TCET DBMS syllabus as its foundation and adds
**small, meaningful extensions to every member's module**. The
extensions must remain limited so the project still clearly remains a
DBMS project.

## 2. Syllabus Foundation

The TCET syllabus covers ER/EER, relational design, SQL DDL/DML/DCL/TCL,
constraints, joins, subqueries, views, triggers, security/authorization,
GRANT/REVOKE, normalization, transactions, ACID, concurrency, locking,
timestamp protocols, deadlocks and recovery.

These are therefore treated as the **syllabus foundation**, not as the
main innovation claim.

## 3. Controlled Innovation

  -----------------------------------------------------------------------------
  Member                  Core module             Small extension
  ----------------------- ----------------------- -----------------------------
  1                       Database Architecture   Indexing and basic `EXPLAIN`
                                                  analysis

  2                       Customer Management     KYC completeness and
                                                  duplicate-candidate checks

  3                       Account Management      Account lifecycle/state rules
                                                  and balance invariants

  4                       Transaction Engine      Stored-procedure-based
                                                  banking operations

  5                       Audit & Triggers        Structured audit trail with
                                                  actor/time/before-after data

  6                       RBAC & Security         Least-privilege refinement
                                                  and limited role hierarchy

  7                       Loan Management         EMI/amortization schedule

  8                       Beneficiary & Transfers Verification/cooling-period
                                                  rule

  9                       Compliance              Deterministic transaction
                                                  risk scoring

  10                      Views & Reporting       Role-filtered KPIs and
                                                  date-range reporting

  11                      Application Integration Password hashing, sessions
                                                  and parameterized DB access

  12                      Testing & Integration   Automated regression and
                                                  controlled failure injection
  -----------------------------------------------------------------------------

Every extension must be small, demonstrable and explainable in a DBMS
viva.

## 4. Objectives

1.  Build a normalized relational banking database.
2.  Demonstrate the complete DBMS syllabus through a realistic system.
3.  Implement database authorization and least privilege.
4.  Implement views, triggers and stored procedures.
5.  Demonstrate ACID transactions and rollback.
6.  Maintain structured audit records.
7.  Implement deterministic suspicious-transaction monitoring.
8.  Add one controlled extension to every member's module.
9.  Provide role-specific workflows.
10. Produce reproducible SQL setup and tests.

## 5. Roles

Customer, Teller, Loan Officer, Branch Manager, Auditor, Compliance
Officer and Security Administrator.

## 6. Core Requirements

-   Authentication and role-specific access.
-   Customer and account management.
-   Deposits, withdrawals and atomic transfers.
-   Beneficiary management.
-   Loans, payments and EMI schedule.
-   Audit logging.
-   Suspicious transaction review.
-   Secure reporting through views.
-   RBAC and database privileges.
-   Reproducible tests.

## 7. Core Entities

`users`, `roles`, `user_roles`, `customers`, `employees`, `branches`,
`account_types`, `accounts`, `transaction_types`, `transactions`,
`beneficiaries`, `loan_types`, `loans`, `loan_payments`, `audit_logs`,
`suspicious_transactions`, `login_attempts`.

## 8. Important Business Rules

1.  Closed/blocked accounts cannot perform normal financial
    transactions.
2.  Withdrawals cannot exceed permitted balance.
3.  Transfers are atomic.
4.  Failed transfers roll back.
5.  Unauthorized roles cannot perform restricted operations.
6.  Sensitive operations generate audit records.
7.  Ordinary users cannot freely modify audit records.
8.  Suspicious-transaction rules are deterministic and documented.
9.  Loan approval is separated from ordinary teller operations.
10. Reports expose only intended information.
11. Beneficiaries may require verification/cooling period.
12. Account state transitions must follow defined paths.
13. Important business rules must have an owner and test.

## 9. Report

Maximum 11 pages. The report must distinguish syllabus concepts from
project extensions and use approximately 12--15 strong, traceable
references from sources such as IEEE Xplore, ACM, NIST, OWASP, MySQL
documentation and recognized DBMS textbooks.

## 10. Acceptance Criteria

Clean database initialization, working end-to-end workflows,
allowed/denied RBAC tests, working views/triggers/procedures, rollback
demonstration, audit records, suspicious-transaction detection, loan
schedule, beneficiary rule, extension tests and identifiable technical
contributions from all 12 members.
