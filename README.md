# Work Portal for Senior Researchers

Senior-friendly work portal for integrating BAND, Google Drive, Gmail, and personal Naver Mail.

## Current scope (M0-M3)

- Next.js App Router foundation with Prisma multi-tenant schema
- Auth.js sign-in page with Google sign-in. Development credentials are disabled by default and require `ENABLE_DEV_CREDENTIALS=true`.
- BAND integration routes and workspace (connect/status/bands/posts/comments)
- Google Drive integration routes and workspace (connect/status/files/upload)
- Gmail integration routes and workspace (connect/status/messages/detail)
- Personal Naver Mail IMAP integration routes and workspace (connect/status/messages/detail)
- Public SICP website operations workspace (`/site-admin`) for notices, workshop settings, and workshop resource links

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
- `ENABLE_DEV_CREDENTIALS` (`false` by default; keep disabled unless a local-only fallback is needed)
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

Local development에서만 위 명령을 가볍게 사용합니다.

운영 Neon 데이터베이스에 적용할 때는 먼저 스키마 diff를 확인하고, 적용 대상 DB가 맞는지 확인한 뒤 진행합니다. 실제 운영 DB 반영은 실수 비용이 크므로 이 프로젝트에서는 별도 승인 없이 실행하지 않습니다.

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
- Public site admin workspace: `http://localhost:3000/site-admin`
- Accessibility checklist page: `http://localhost:3000/accessibility-checklist`
- Health endpoint: `http://localhost:3000/api/health`

## Public SICP site admin

The `/site-admin` workspace is the internal operations area for content that will later feed the public Seoul Institute of Clinical Psychology website.

Allowed Google accounts are hardcoded in `lib/site-admin/allowed-users.ts`.

- `thinkinthegrey@gmail.com` -> `황성훈`
- `loveyer@iscu.ac.kr` -> `김환`
- `mow.coding@gmail.com` -> `관리자`
- `sicpseoul@gmail.com` -> `관리자`

Core permissions:

- Only the allowed accounts can sign in.
- All allowed accounts can create public-site notices, workshop resources, and workshop application settings.
- `mow.coding@gmail.com` and `sicpseoul@gmail.com` can manage system-level fields such as calendar IDs and can edit/delete every public-site item.
- Professor accounts can edit/delete their own posts and resources.
- Deletes are soft deletes by default, so records are retained in the database.
- Deleted posts and resources appear in the trash. Owners can restore their own deleted records, while manager accounts can permanently delete records.

Content managed here:

- Notices with category, labels, visibility, pinned state, sanitized rich text body, up to 3 related links, and up to 5 attachment link records.
- Notice forms include browser-local autosave and `Ctrl+S` draft saving.
- Workshop resource archive entries grouped by workshop and round/title.
- Workshop application settings, including application form URL, application period, workshop event period, and auto-calculated display status.
- Attachment uploads use Vercel Blob client uploads. Files are uploaded directly from the browser to Blob, then stored as public attachment URLs on the notice.
- Admin lists support search, category/visibility/label filtering, workshop resource filtering, and created/updated sorting.
- Important site-admin actions are recorded in the existing `AuditLog` table and shown in the recent operations list.

Database note:

- After schema changes, run `npm run db:generate`.
- Syncing the schema to a real database requires an explicit migration or `npm run db:push` decision. Do not run destructive database changes casually.
- After the database schema is synced, run `npm run db:seed-site-admin` once to create the tenant, memberships, and default author profiles for the four allowed accounts.
- The seed keeps user-edited author display names intact when it is run again.

Public read API:

- `GET /api/public-site`
- Returns only public, non-deleted notices and resources.
- Returns workshop settings with an auto-calculated status: `OPEN`, `CLOSED`, `ENDED`, or `NO_SCHEDULE`.
- The application form URL is exposed only while the workshop status is `OPEN`.

Attachment storage:

- Create and connect a Vercel Blob store to this Vercel project.
- Ensure `BLOB_READ_WRITE_TOKEN` is available in the deployment environment.
- Supported attachment extensions: `pdf`, `hwp`, `hwpx`, `doc`, `docx`, `xls`, `xlsx`, `ppt`, `pptx`.
- Current upload limit is 5 files per notice and 30MB per file.
- Body images are uploaded through the same Blob route and are limited to 10MB per image in the editor UI.

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
