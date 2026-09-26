# Phase 1 security test matrix

Integration tests require `DATABASE_URL`, migrated Prisma tables, and seeded roles/users. They remain BLOCKED until those prerequisites exist.

| # | Scenario | Expected |
|---:|---|---|
| 01 | SuperAdmin → Agency A | 200 |
| 02 | SuperAdmin → Agency B | 200 |
| 03 | AgencyAdmin A → Agency A | 200 |
| 04 | AgencyAdmin A → Agency B | 403 |
| 05 | AgencyAdmin A → Branch A1 | 200 |
| 06 | AgencyAdmin A → Branch A2 | 200 |
| 07 | AgencyAdmin A → Branch B1 | 403 |
| 08 | BranchAdmin A1 → Branch A1 | 200 |
| 09 | BranchAdmin A1 → Branch A2 | 403 |
| 10 | BranchAdmin A1 → Branch B1 | 403 |
| 11 | Missing permission | 403 |
| 12 | Missing token | 401 |
| 13 | Suspended user login | 401 |
| 14 | Revoked refresh token | 401 |
| 15 | Self-elevation to SuperAdmin | 403 |
| 16 | BranchAdmin A1 creates branch in Agency B | 403 |
| 17 | AgencyAdmin creates Agency | 403 |
| 18 | Sensitive operation creates AuditLog | AuditLog row |
| 19 | User changes own role | 403 |
| 20 | User branch/agency mismatch | 422 |
| 21 | Duplicate email or branch code | 409 |
| 22 | Missing resource | 404 |
| 23 | Failed login is audited without secrets | AuditLog row, no credential data |
| 24 | Reuse rotated refresh token | 401 |

Static validation: `pnpm exec tsc --noEmit` and `pnpm exec prisma generate`. PostgreSQL integration is BLOCKED because `DATABASE_URL` is absent.

Security assertions: never expose passwordHash, password, access tokens, refresh tokens, or secrets in API responses or audit metadata.
