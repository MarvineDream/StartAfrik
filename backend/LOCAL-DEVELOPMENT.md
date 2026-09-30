# Local development environment

## 1. Create the local environment file

Copy `.env.example` to `.env.development.local` at the repository root. This file is ignored by Git and must contain only local values.

## 2. PostgreSQL

Create or use a local PostgreSQL database named `startafrik`, then set `DATABASE_URL` in `.env.development.local` to the real connection string for that database. Do not put real credentials in `.env.example`.

## 3. JWT secrets

Generate two distinct, random secrets of at least 32 characters and set them as `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env.development.local`. The `CHANGE_ME_*` values are not suitable for a real environment.

## 4. API URL

Set `NEXT_PUBLIC_API_URL="http://localhost:4000"` for the local backend. The backend also uses `FRONTEND_URL=http://localhost:3000` by default.

The backend loads `.env.development.local` before falling back to `.env`. Prisma CLI loads `.env`; when running Prisma commands locally, export the values from `.env.development.local` or copy the configured values to your shell so Prisma can read `DATABASE_URL` without committing the file.

## 5. Validate

From the repository root:

```bash
pnpm exec prisma validate --schema backend/prisma/schema.prisma
pnpm exec tsc --noEmit
pnpm test:foundation
pnpm exec tsx --test backend/src/modules/vehicles/vehicles.contract.test.ts
```

A missing `DATABASE_URL` or JWT secret is an environment failure, not a passing test result.
