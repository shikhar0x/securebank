-- SecureBank - RBAC Tests (MySQL)

USE securebank;

SELECT CURRENT_USER();

SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'securebank'
ORDER BY grantee, table_name, privilege_type;

SELECT
    grantee,
    table_schema,
    privilege_type
FROM information_schema.schema_privileges
WHERE table_schema = 'securebank'
ORDER BY grantee, privilege_type;
