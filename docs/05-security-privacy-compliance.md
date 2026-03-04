# Security, Privacy, and Compliance

## Security Baseline

1. No provider client secrets in browser code.
2. Tokens encrypted at rest.
3. HTTPS-only deployment.
4. Strict tenant boundary checks on every request.
5. Audit logs for sensitive operations.

## Access Control Model

- `owner`: tenant-level control including billing and integrations
- `admin`: integration and member management
- `member`: day-to-day usage
- `viewer`: read-only workspace access

## Data Classification

- `Public`: product copy, docs
- `Internal`: tenant configuration, sync status
- `Sensitive`: access tokens, mail metadata, message content references

## Storage Policy

- Prefer metadata over full content persistence.
- Set explicit retention windows per connector.
- Provide tenant-level export/delete controls (later phase).

## Compliance Checklist (MVP)

- Terms of service alignment for each provider.
- Privacy notice draft before public onboarding.
- Incident response runbook (minimum template).
- Access revocation test for disconnected accounts.

## Required Security Controls Before Public Beta

1. Secret rotation procedure documented.
2. Tenant authorization tests added.
3. OAuth callback validation and anti-CSRF state handling.
4. Rate limiting on integration endpoints.
5. Basic abuse and anomaly logging.
