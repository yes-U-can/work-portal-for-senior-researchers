# System Architecture Blueprint

## High-Level Architecture

1. `Web App (Next.js)`  
User interface, session-aware pages, and server actions/API routes.

2. `Application API Layer`  
Authentication, authorization, connector orchestration, policy checks.

3. `Connector Services`  
Provider-specific modules: BAND, Google Drive, Gmail, personal Naver Mail (IMAP).

4. `Data Layer (Postgres)`  
Tenant, user, role, integration configs, encrypted tokens, sync state, logs.

5. `Async Jobs`  
Background sync and retry pipeline for provider polling/webhook handling.

## Multi-Tenant Model

Every core table includes `tenant_id` and strict query scoping.

- Tenant
- User
- Membership (user <-> tenant roles)
- IntegrationAccount
- IntegrationToken
- SyncCursor
- AuditLog
- ConnectorEvent

## Suggested Data Schema (Initial)

### `tenants`

- `id (uuid, pk)`
- `name`
- `slug`
- `created_at`

### `users`

- `id (uuid, pk)`
- `email`
- `name`
- `created_at`

### `memberships`

- `id (uuid, pk)`
- `tenant_id (fk)`
- `user_id (fk)`
- `role` (`owner|admin|member|viewer`)
- `created_at`

### `integration_accounts`

- `id (uuid, pk)`
- `tenant_id (fk)`
- `provider` (`band|google_drive|gmail|naver_mail`)
- `provider_account_id`
- `status` (`connected|expired|error`)
- `created_at`
- `updated_at`

### `integration_tokens`

- `id (uuid, pk)`
- `integration_account_id (fk)`
- `access_token_encrypted`
- `refresh_token_encrypted`
- `expires_at`
- `scope`
- `updated_at`

### `sync_cursors`

- `id (uuid, pk)`
- `integration_account_id (fk)`
- `cursor_key`
- `cursor_value`
- `updated_at`

### `audit_logs`

- `id (uuid, pk)`
- `tenant_id (fk)`
- `actor_user_id (fk, nullable)`
- `action`
- `resource_type`
- `resource_id`
- `result` (`success|denied|error`)
- `meta_json`
- `created_at`

## API Surface (Initial)

### Auth/Session

- `GET /api/me`
- `GET /api/tenants/:tenantId/members`

### Integration Connection

- `POST /api/tenants/:tenantId/integrations/:provider/connect`
- `POST /api/tenants/:tenantId/integrations/:provider/callback`
- `POST /api/tenants/:tenantId/integrations/:provider/disconnect`

### BAND

- `GET /api/tenants/:tenantId/band/bands`
- `GET /api/tenants/:tenantId/band/posts`
- `GET /api/tenants/:tenantId/band/posts/:postKey/comments`

### Drive

- `GET /api/tenants/:tenantId/drive/files`
- `GET /api/tenants/:tenantId/drive/files/:fileId`

### Mail (Gmail / Naver Mail)

- `GET /api/tenants/:tenantId/mail/messages`
- `GET /api/tenants/:tenantId/mail/messages/:messageId`

## Sync Strategy

1. Start with on-demand fetch for first version.
2. Add incremental cursor sync for each connector.
3. Store only metadata needed for speed and UX.
4. Keep source-of-truth links for full content in provider systems.

## Observability Baseline

- Structured logs with `tenant_id`, `request_id`, `provider`
- Error tracking with connector labels
- Admin diagnostic page for integration status
