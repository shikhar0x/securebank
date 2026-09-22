# SecureBank --- Project Rules

## 1. Primary Rule

SecureBank is primarily a **DBMS project**. The TCET syllabus is the
foundation; controlled extensions provide the innovative component.

## 2. Syllabus Foundation

ER/EER, relational design, normalization, SQL, constraints, joins,
subqueries, views, triggers, GRANT/REVOKE, transactions, ACID,
concurrency, locking, deadlock and recovery are syllabus concepts.

Do not falsely claim these concepts themselves are outside the syllabus.

## 3. Controlled Extensions

Use only the following planned extensions:

-   M1: indexing and basic `EXPLAIN`
-   M2: KYC/data-quality and duplicate candidates
-   M3: account lifecycle and balance invariants
-   M4: stored procedures
-   M5: structured audit trail
-   M6: least privilege and limited role hierarchy
-   M7: EMI/amortization
-   M8: beneficiary verification/cooling period
-   M9: deterministic transaction risk scoring
-   M10: role-filtered KPIs/date-range reporting
-   M11: password hashing/sessions/parameterized access
-   M12: automated regression/failure injection

Do not keep adding extensions merely to make the project sound advanced.

## 4. No Overengineering

Do not introduce blockchain, ML/AI fraud detection, microservices,
distributed databases, cloud infrastructure or payment gateways unless
the faculty explicitly changes the scope.

## 5. Technical Contribution

Every member must have: - implementation responsibility -
SQL/application work - an extension - tests - viva-ready explanation

## 6. Database Authority

The database is authoritative for persistent data, integrity,
privileges, views, triggers, stored procedures, transaction atomicity
and audit records.

Frontend visibility is not security.

## 7. Transaction Rule

Critical financial operations must preserve atomicity:

``` text
BEGIN
→ validate
→ modify
→ record
→ COMMIT
```

Critical failure:

``` text
ROLLBACK
```

## 8. Audit Rule

Audit records should be append-oriented. Ordinary operational roles must
not freely alter/delete audit records. Capture actor, event, timestamp
and relevant before/after information.

## 9. RBAC Rule

Use least privilege. Test both allowed and denied operations. Do not
rely on hidden frontend buttons.

## 10. Compliance Rule

Suspicious-transaction detection must be deterministic and documented.
Never describe it as real-world fraud prediction.

Risk scoring must expose its contributing rules.

## 11. Security Rule

Never store plaintext passwords. Never commit `.env`, credentials or API
keys. Use parameterized database access.

## 12. SQL Rule

Every contributor must understand every query they submit, including its
purpose, expected result and failure condition.

## 13. Data Rule

Use fictional academic banking data only. Do not use real customer
financial information or real credentials.

## 14. Testing Rule

Every module must have success, invalid/business-rule and integration
tests where applicable. Critical operations require failure tests.

## 15. Git Rule

Use feature branches. Keep commits focused and descriptive. Do not
commit virtual environments, node_modules, secrets, temporary dumps or
generated junk.

## 16. Documentation Rule

Never claim a feature is implemented until it exists and has been
tested. Planning documents do not prove implementation.

## 17. AI Agent Rule

An AI assistant must read all five documents, inspect the actual
repository, make the smallest logical change, preserve working
architecture, test the change and update `memory.md`.

## 18. Innovation Rule

The intended project shape is:

``` text
DBMS syllabus
      +
realistic banking system
      +
small meaningful extensions
```

Not:

``` text
unrelated advanced technologies
      +
banking UI
      +
some SQL
```
