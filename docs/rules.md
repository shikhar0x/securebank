# SecureBank — Development Rules

## 1. Source of Truth

The Git repository is authoritative for implementation.

- `prd.md` → requirements
- `architecture.md` → architecture
- `phases.md` → work allocation
- `rules.md` → engineering constraints
- `memory.md` → current state

Verify actual code/database state when documentation and implementation disagree.

## 2. Database Platform

```text
MySQL
```

MySQL is the DBMS. Do not use PostgreSQL-specific syntax.

## 3. Scope Rule

Keep the project basic and purposeful.

Core model:

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

Do not create tables merely to give someone ownership. A member can own SQL, views, triggers, functions, backend APIs, frontend integration, security, testing or performance analysis.

Additional tables require a genuine functional or normalization reason.

## 4. AI Agent Rules

The AI agent must:

1. Read relevant project files first.
2. Check `memory.md`.
3. Follow the project documents.
4. Preserve working behavior.
5. Work one logical step at a time.
6. Prefer minimal changes.
7. Never redesign without a concrete requirement.
8. Never invent existing files/tables/APIs.
9. Verify repository/database assumptions.
10. Update `memory.md` after meaningful changes.
11. Give copy-pasteable commands.
12. Test before declaring completion.
13. Report failures honestly.

## 5. AI Must Not

- Claim an untested feature works.
- Claim unverified SQL permissions work.
- Delete working code unnecessarily.
- Add unnecessary frameworks.
- Add AI/ML merely for appearance.
- Replace database security with frontend-only checks.
- Put secrets in source files.
- Generate fake test results.
- Invent references.
- Modify unrelated modules.
- Commit passwords, `.env`, local datasets or generated artifacts.

## 6. Git Rules

Stable branch:

```text
main
```

Feature branches:

```text
feature/<module>
fix/<issue>
test/<module>
```

Each commit should represent one logical change.

Examples:

```text
feat: add transfer function
fix: reject withdrawal from inactive account
test: add RBAC authorization cases
docs: update architecture
```

## 7. Database Rules

Use `snake_case` table names, plural for entity tables.

Column names use a short table-prefix + name convention (see the header
of `database/securebank_mysql.sql` for the full prefix list), e.g.
`c_name`, `a_balance`, `t_type`. Keep it consistent across all tables.

Every major entity has a primary key.

Use explicit foreign keys.

Prefer:

- `NOT NULL`
- `UNIQUE`
- `PRIMARY KEY`
- `FOREIGN KEY`
- `CHECK`

For money use:

```sql
DECIMAL(10,2)
```

## 8. RBAC Rules

Application roles and MySQL privileges are related but distinct.

Application roles are part of the project model.

MySQL `GRANT`/`REVOKE` demonstrates database authorization.

Frontend visibility is never the only security mechanism.

## 9. Transaction Rules

Transfers must be atomic:

```text
BEGIN
↓
Debit
↓
Credit
↓
Record transaction
↓
COMMIT
```

On failure:

```text
ROLLBACK
```

No partial transfer may remain.

## 10. Audit Rules

Sensitive operations should generate audit records through database triggers where appropriate.

Audit information should include, where relevant:

- entity/table
- record identifier
- operation
- actor
- timestamp
- before/after information

Ordinary operational users must not freely alter audit history.

## 11. Security Rules

- Never store plaintext passwords.
- Use password hashing.
- Never commit secrets.
- Use environment variables.
- Use parameterized SQL.
- Validate input.
- Enforce authorization server-side.
- Never expose database credentials to frontend code.

## 12. Extension Rules

Every member receives one small meaningful extension.

Each extension must be implemented, tested and explainable in the viva.

Do not add AI/ML, blockchain, microservices, real payment gateways or unnecessary infrastructure.

## 13. Testing Rules

Every module owner provides at least:

1. One successful case.
2. One invalid/failure case.
3. One relevant boundary/security case where applicable.

Never fabricate test results.

## 14. Integration Rules

Members own modules but share the agreed schema and API contracts.

Do not independently redesign shared tables.

The database member maintains the final MySQL schema/ER model.

The backend owner integrates the database with Flask.

The frontend owner consumes backend APIs.

## 15. Academic Integrity

Every member must honestly be able to explain:

- their technical contribution,
- their SQL/code,
- the DBMS concept,
- their extension,
- their test case,
- how their work integrates with SecureBank.
