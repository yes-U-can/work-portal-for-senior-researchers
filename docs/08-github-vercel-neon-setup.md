# GitHub + Vercel + Neon Setup

## Goal

Establish the default production pipeline:

- Source: GitHub
- Hosting: Vercel
- Database: Neon Postgres

## 1) GitHub Repository

1. Create a new repository.
2. Push current project.
3. Protect `main` branch (recommended).

## 2) Neon Database

1. Create a new Neon project.
2. Copy connection string.
3. Use pooled connection URL in app environments.

Environment variable:

- `DATABASE_URL` = Neon Postgres pooled URL

## 3) Vercel Project

1. Import GitHub repository into Vercel.
2. Configure environment variables:
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `BAND_CLIENT_ID`
   - `BAND_CLIENT_SECRET`
   - `DEV_AUTH_EMAIL` (preview/dev only)
   - `DEV_AUTH_PASSWORD` (preview/dev only)
3. Trigger first deployment.

## 4) Prisma in CI/Deployment

- Keep `prisma/schema.prisma` as source of truth.
- Run `prisma generate` in build pipeline.
- Apply migrations safely for production branch.

## 5) Security Notes

- Never commit `.env` values.
- Rotate `ENCRYPTION_KEY` with migration plan.
- Restrict Neon roles and allowed origins where possible.

## 6) Next Implementation Step

- Harden connector operations: retries, audit logs, and rate limiting for integration routes.
