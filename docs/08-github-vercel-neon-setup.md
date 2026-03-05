# GitHub + Vercel + Neon Setup

## Goal

Establish the default production pipeline:

- Source: GitHub
- Hosting: Vercel
- Database: Neon Postgres

## Current Linked State (2026-03-04)

- GitHub repository: `https://github.com/yes-U-can/work-portal-for-senior-researchers`
- Vercel project: `portal_sicp` (scope: `sicps-projects`)
- Vercel Git connection: linked to `yes-U-can/work-portal-for-senior-researchers`
- Neon project: `portal-sicp` (`raspy-voice-89571259`, region `aws-ap-southeast-1`)
- Vercel env status: `DATABASE_URL` and `ENCRYPTION_KEY` configured for `development` and `production`
- Current production deployment retry should be triggered from Git push because local CLI upload hit free-tier API upload limits (`api-upload-free`)
- BAND app registration status: client key issuance under review (BAND connect kept in pending mode)

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
2. Connect Git repository (already done for `yes-U-can/work-portal-for-senior-researchers`).
2. Configure environment variables:
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `NEXTAUTH_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_OAUTH_CLIENT_ID`
   - `GOOGLE_OAUTH_CLIENT_SECRET`
   - `BAND_APP_REVIEW_STATUS` (`PENDING_REVIEW` while waiting for approval)
   - `BAND_REVIEW_MESSAGE_KO` (optional user guidance text)
   - `BAND_CLIENT_ID`
   - `BAND_CLIENT_SECRET`
   - `DEV_AUTH_EMAIL` (preview/dev only)
   - `DEV_AUTH_PASSWORD` (preview/dev only)
3. Trigger deployment from `main` after env vars are set.

Required integration vars for first functional deploy:

- BAND
  - `BAND_APP_REVIEW_STATUS` = `PENDING_REVIEW` (default) or `AVAILABLE`
  - `BAND_REVIEW_MESSAGE_KO` (optional)
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

1. Keep `BAND_APP_REVIEW_STATUS=PENDING_REVIEW` until BAND approval arrives.
2. Keep polishing senior onboarding for Drive/Mail while BAND is pending.
3. After BAND approval, set `BAND_APP_REVIEW_STATUS=AVAILABLE` + BAND client keys.
4. Re-run production smoke tests including BAND connect flow.
