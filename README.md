# Work Portal for Senior Researchers

Senior-friendly work portal for integrating BAND, Google Drive, Gmail, and personal Naver Mail.

## Current scope (M0-M3)

- Next.js App Router foundation with Prisma multi-tenant schema
- Auth.js sign-in page with Google sign-in and development credentials fallback
- BAND integration routes and workspace (connect/status/bands/posts/comments)
- Google Drive integration routes and workspace (connect/status/files/upload)
- Gmail integration routes and workspace (connect/status/messages/detail)
- Personal Naver Mail IMAP integration routes and workspace (connect/status/messages/detail)

## 1) Install

```bash
npm install
```

## 2) Configure environment

```bash
copy .env.example .env
```

Set required values in `.env`:

- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `BAND_CLIENT_ID`
- `BAND_CLIENT_SECRET`

Optional development values:

- `DEV_AUTH_EMAIL`
- `DEV_AUTH_PASSWORD`
- `ACTIVE_TENANT_SLUG`
- `DEV_AUTO_PROVISION`
- `NAVER_IMAP_HOST`
- `NAVER_IMAP_PORT`
- `NAVER_IMAP_SECURE`

## 3) Generate Prisma client

```bash
npm run db:generate
```

## 4) Sync schema to DB

```bash
npm run db:push
```

## 5) Run

```bash
npm run dev
```

Open:

- App: `http://localhost:3000`
- Sign in: `http://localhost:3000/signin`
- Dashboard: `http://localhost:3000/dashboard`
- BAND workspace: `http://localhost:3000/band`
- Drive workspace: `http://localhost:3000/drive`
- Mail workspace: `http://localhost:3000/mail`
- Accessibility checklist page: `http://localhost:3000/accessibility-checklist`
- Health endpoint: `http://localhost:3000/api/health`

## Integration routes

### BAND

- `GET /api/integrations/band/connect`
- `GET /api/integrations/band/callback`
- `GET /api/integrations/band/status`
- `GET /api/integrations/band/bands`
- `GET /api/integrations/band/posts?bandKey=...`
- `GET /api/integrations/band/comments?bandKey=...&postKey=...`

### Google Drive

- `GET /api/integrations/drive/connect`
- `GET /api/integrations/drive/callback`
- `GET /api/integrations/drive/status`
- `GET /api/integrations/drive/files?q=...`
- `POST /api/integrations/drive/upload` (`multipart/form-data`, field: `file`)

### Gmail

- `GET /api/integrations/gmail/connect`
- `GET /api/integrations/gmail/callback`
- `GET /api/integrations/gmail/status`
- `GET /api/integrations/gmail/messages?max=20`
- `GET /api/integrations/gmail/messages/:messageId`

### Personal Naver Mail (IMAP)

- `POST /api/integrations/naver-mail/connect` (body: `email`, `appPassword`)
- `GET /api/integrations/naver-mail/status`
- `GET /api/integrations/naver-mail/messages?max=20`
- `GET /api/integrations/naver-mail/messages/:uid`

Naver Mail notes:

- Use personal Naver Mail (`@naver.com`) app password.
- Enable 2-step verification before creating app password.
- Regular account password login is not supported for this connector.

## Notes

- Tokens and app passwords are encrypted at rest server-side.
- Integration account state is stored per tenant.
- Billing/paid plan logic is intentionally out of current scope.
- Senior accessibility test protocol: `docs/09-senior-accessibility-usability-checklist.md`

## Deployment status

- GitHub repository: `https://github.com/yes-U-can/portal_sicp`
- Vercel project: `portal_sicp` (connected to GitHub)
- Last production build failure cause: missing `DATABASE_URL` and `ENCRYPTION_KEY` on Vercel.

Before redeploying, set required Vercel env vars:

- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `BAND_CLIENT_ID`
- `BAND_CLIENT_SECRET`
- `BAND_REDIRECT_URI`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `GOOGLE_GMAIL_REDIRECT_URI`
