# GitHub + Vercel + Neon Setup

## Goal

Establish the default production pipeline:

- Source: GitHub
- Hosting: Vercel
- Database: Neon Postgres

## Current Linked State (2026-03-04)

- GitHub repository: `https://github.com/yes-U-can/portal_sicp`
- Vercel project: `portal_sicp` (scope: `sicps-projects`)
- Vercel Git connection: linked to `yes-U-can/portal_sicp`
- Current production deployment: build failed because required env vars were missing (`DATABASE_URL`, `ENCRYPTION_KEY`)

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

1. Create project: `portal_sicp` (already done).
2. Connect Git repository (already done for `yes-U-can/portal_sicp`).
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
3. Trigger deployment from `main` after env vars are set.

Required integration vars for first functional deploy:

- BAND
  - `BAND_CLIENT_ID`
  - `BAND_CLIENT_SECRET`
  - `BAND_REDIRECT_URI` = `https://<your-domain>/api/integrations/band/callback`
- Google OAuth (shared for sign-in, Drive, Gmail)
  - `GOOGLE_OAUTH_CLIENT_ID`
  - `GOOGLE_OAUTH_CLIENT_SECRET`
  - `GOOGLE_DRIVE_REDIRECT_URI` = `https://<your-domain>/api/integrations/drive/callback`
  - `GOOGLE_GMAIL_REDIRECT_URI` = `https://<your-domain>/api/integrations/gmail/callback`
- Naver IMAP defaults
  - `NAVER_IMAP_HOST` = `imap.naver.com`
  - `NAVER_IMAP_PORT` = `993`
  - `NAVER_IMAP_SECURE` = `true`

## 4) Prisma in CI/Deployment

- Keep `prisma/schema.prisma` as source of truth.
- Run `prisma generate` in build pipeline.
- Apply migrations safely for production branch (`prisma db push` or migrations pipeline after DB provisioning).

## 5) Security Notes

- Never commit `.env` values.
- Rotate `ENCRYPTION_KEY` with migration plan.
- Restrict Neon roles and allowed origins where possible.

## 6) Next Implementation Step

1. Add missing Vercel env vars and re-run production deploy.
2. Create Google OAuth credentials in Google Cloud Console and add redirect URIs.
3. Register BAND app redirect URI to production domain.
4. Harden connector operations: retries, audit logs, and rate limiting for integration routes.
