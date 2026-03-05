# MVP Scope

## MVP Objective

Deliver a production-capable portal that unifies:

- BAND feed visibility (band list, posts, comments)
- Google Drive file list/search/upload visibility
- Mail visibility through Gmail and personal Naver Mail (IMAP)

for a tenant-aware, senior-friendly dashboard.

## In Scope

### UX/UI

- High-contrast and readable base UI
- Simple dashboard with core modules: BAND, Drive, Mail
- Connection status indicators: `CONNECTED`, `NOT_CONNECTED`, `EXPIRED`, `ERROR`
- Fast onboarding: sign in -> connect integrations -> view latest work context

### Platform

- Multi-tenant foundation (`tenant_id` isolation)
- Role model: `owner`, `admin`, `member`, `viewer`
- OAuth flow for BAND/Google connectors
- IMAP app-password flow for personal Naver Mail
- Connector status checks and encrypted token storage

### Integrations

- BAND: connect, status, list bands/posts/comments
  - During app review wait: expose `PENDING_REVIEW` status and keep connect flow in 안내 모드
- Google Drive: connect, status, list/search files, upload file
- Gmail: connect, status, list message metadata, load message preview
- Personal Naver Mail: connect via IMAP app password, status, list message metadata, load preview

### Operations

- Environment-based secret management
- Error handling paths for reconnect and credential issues
- Core authz checks for integration management routes

## Out of Scope (MVP)

- Billing and subscription logic
- Full two-way synchronization automation
- Bulk historical mail persistence
- Native mobile app
- Multi-language localization

## MVP Success Criteria

1. A tenant admin can connect Google Drive, Gmail, and personal Naver Mail in under 10 minutes.
   - If BAND is pending review, the user must still understand BAND is waiting for approval (not a failure).
2. A user can check latest BAND content, key drive files, and recent mail from one screen.
3. No tokens, secrets, or app passwords are exposed in client-side code.
4. Tenant boundaries are enforced across integration routes.
