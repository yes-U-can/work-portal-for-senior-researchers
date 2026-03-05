# Milestones

## M0 - Foundation (Completed)

- Next.js app initialization and repository guardrails
- Tenant/user/role data model with Prisma
- Protected routes and baseline auth/session flow
- Development credential login and auth route
- Local environment variable strategy

## M1 - BAND Connector MVP (Code completed, activation pending review)

- OAuth connect/callback flow
- Status endpoint
- Band/post/comment read endpoints
- BAND workspace page scaffold and interaction model
- Pending-review UX guard (`PENDING_REVIEW` status + connect guidance mode)

## M2 - Google Drive Connector MVP (Completed core)

- OAuth connect/callback flow
- Status endpoint
- File list/search endpoint
- File upload endpoint
- Drive workspace page

## M3 - Mail Connector MVP (Completed core)

- Gmail OAuth connect/callback/status
- Gmail message list/detail metadata preview
- Personal Naver Mail IMAP connect/status/list/detail
- Unified mail workspace tabs and reconnect UX

## M4 - Portal Consolidation (Next)

- Senior-focused onboarding simplification (Drive -> Mail first)
- Connector error recovery UX (`error` + `recoveryAction`)
- Unified dashboard diagnostics with BAND review waiting status
- Tenant onboarding flow refinement

## M5 - Expansion Readiness (Next)

- Hardening: rate limits, retry policies, alerts
- Operational runbook and public self-host guide
- Optional advanced feature flag boundary for paid extensions
