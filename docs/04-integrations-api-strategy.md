# Integrations and API Strategy

## Strategy Summary

- Use official OAuth flows where available (BAND, Google).
- Keep tokens server-side only, encrypted at rest.
- Use minimal data retention and metadata-first rendering.
- Isolate connector logic in `lib/integrations/*`.

## Shared Connector Interface

Each connector module should expose a compatible core behavior set:

- `connect()`
- `refreshTokenIfNeeded()`
- `listItems(params)`
- `getItemDetail(id)`
- `healthCheck()`

Optional capabilities for providers that support scheduling or writeback:

- `listSchedules(params)`
- `createSchedule(input)`
- `syncDelta(cursor)`

## BAND Integration

### Implemented

- OAuth connect and callback
- Status endpoint
- Band list, post list, comment list APIs
- Workspace UI at `/band`

### Review Waiting Mode

- `BAND_APP_REVIEW_STATUS=PENDING_REVIEW` is the default safety mode.
- `GET /api/integrations/band/status` returns availability metadata:
  - `availability: "PENDING_REVIEW" | "AVAILABLE"`
  - `availabilityMessage: string`
- `GET /api/integrations/band/connect` redirects to dashboard 안내 when availability is pending.
- Production OAuth activation starts only after app approval and key provisioning.

### Guardrails

- Avoid full-content mirroring
- Keep short-lived fetch model
- Show source context and keep provider boundaries clear

## Google Drive Integration

### Implemented

- OAuth connect and callback
- Status endpoint
- File list/search endpoint
- File upload endpoint
- Workspace UI at `/drive`

### Scope Policy

- Default scope: `drive.file` + `drive.metadata.readonly`
- Shared Drive-compatible query defaults enabled

## Gmail Integration

### Implemented

- OAuth connect and callback
- Status endpoint
- Message list endpoint
- Message detail endpoint
- Mail workspace tab at `/mail`

### Scope Policy

- Default scope: `gmail.metadata`
- Metadata/snippet-focused experience for MVP

## Personal Naver Mail Integration

### Implemented

- IMAP app-password connect endpoint
- Status endpoint
- Message list endpoint
- Message detail endpoint
- Mail workspace tab at `/mail`

### Connection Model

- Personal Naver Mail (`@naver.com`) via IMAP
- Requires 2-step verification + app password
- No regular account-password auth path

## Provider Credential Management

- Env secrets only (`.env`, never commit real values)
- Per-tenant integration account records
- Tokens and app passwords encrypted at rest
- Credential values never returned to browser payloads

## Error Response Contract

- Integration APIs should return:
  - `error`: user-visible failure reason
  - `recoveryAction`: explicit next step for recovery
- UI must show both fields in live region when available.
