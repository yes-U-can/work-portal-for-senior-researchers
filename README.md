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

Optional development values:

- `DEV_AUTH_EMAIL`
- `DEV_AUTH_PASSWORD`
- `ACTIVE_TENANT_SLUG`
- `DEV_AUTO_PROVISION`
- `BAND_APP_REVIEW_STATUS` (`PENDING_REVIEW` | `AVAILABLE`, default: `PENDING_REVIEW`)
- `BAND_REVIEW_MESSAGE_KO` (BAND 심사대기 안내 문구)
- `BAND_CLIENT_ID` (BAND 심사 완료 후)
- `BAND_CLIENT_SECRET` (BAND 심사 완료 후)
- `BAND_REDIRECT_URI` (BAND 심사 완료 후)
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
- `GET /api/integrations/band/status` (`availability`, `availabilityMessage` 포함)
- `GET /api/integrations/band/bands`
- `GET /api/integrations/band/posts?bandKey=...`
- `GET /api/integrations/band/comments?bandKey=...&postKey=...`

BAND 심사 대기 모드:

- `BAND_APP_REVIEW_STATUS=PENDING_REVIEW`일 때 `/api/integrations/band/connect`는 OAuth로 이동하지 않고
  대시보드 안내 화면으로 이동합니다.
- 이 모드에서도 Drive/Gmail/Naver Mail은 정상 사용 가능합니다.

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
- Connector 오류 응답은 `error` + `recoveryAction` 형식을 기본으로 제공합니다.

## Deployment status

- GitHub repository: `https://github.com/yes-U-can/work-portal-for-senior-researchers`
- Vercel project: `portal_sicp` (connected to GitHub)
- Neon project: `portal-sicp` (`raspy-voice-89571259`, region `aws-ap-southeast-1`)
- `DATABASE_URL` and `ENCRYPTION_KEY` are configured on Vercel for `development` and `production`.

Before redeploying, set required Vercel env vars:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_DRIVE_REDIRECT_URI`
- `GOOGLE_GMAIL_REDIRECT_URI`

Set BAND vars after BAND app review is approved:

- `BAND_APP_REVIEW_STATUS=AVAILABLE`
- `BAND_CLIENT_ID`
- `BAND_CLIENT_SECRET`
- `BAND_REDIRECT_URI`
