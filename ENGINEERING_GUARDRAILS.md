# Engineering Guardrails

This file is the single source of truth for how work is done in this repository.
All CLI agents (Codex, Claude, others) must read and follow it before making changes.

## 1) Core Principles

- Maintainability is higher priority than delivery speed.
- Reuse existing structure first. Add new abstractions only when duplication appears 2+ times.
- Keep change sets small: one feature or fix at a time.
- Prefer simplification and deletion over additive complexity.

## 2) Repository Boundaries

- `app/`: UI, routing, API route handlers.
- `lib/`: business logic, shared utilities, auth/authz/env access.
- `prisma/`: schema and data model definitions.
- `docs/`: product, architecture, and operations docs.

Rules:
- Do not grow complex API logic directly in route handlers; move logic into `lib/` modules.
- Reuse `lib/authorization.ts` for role checks.
- Keep environment variable reads centralized through `lib/env.ts`.
- New code must not read `process.env` outside `lib/env.ts`.

## 3) Required Start Report

Before implementation, report these 4 items:

1. Goal
2. Planned files to change
3. Risks and impact scope
4. Validation plan (commands + manual checks)

## 4) Implementation Rules (Maintainability First)

- Avoid expanding inline styles. Promote repeated styling to `app/globals.css` or a clear styling layer.
- Do not add new `style={{ ... }}` blocks unless explicitly approved for a temporary prototype.
- Use domain-explicit names. Avoid vague names like `data`, `temp`, `util`.
- Do not introduce `any` unless unavoidable; if used, document why and add a follow-up TODO.
- Keep files and functions focused. Split when responsibility grows.
- If schema changes, update `prisma/schema.prisma` and related docs in the same change.

## 5) Definition of Done (Required)

A task is complete only if all items below are included in the final report:

- File-by-file summary: what changed and why (one line per file)
- Diff evidence: key highlights from `git diff -- <file>`
- Validation results:
  - `npm.cmd run lint`
  - `npm.cmd run typecheck`
  - `npm.cmd test` (when tests exist)
  - `Get-ChildItem app,lib -Recurse -File | Select-String -Pattern 'process\\.env'`
  - `Get-ChildItem app,lib -Recurse -File | Select-String -SimpleMatch 'style={{'`
- Manual verification steps and outcomes
- Rollback method (commit revert or explicit restore steps)

Note:
- If validation fails due to existing environment issues, still report failure details, cause, and impact.
- If new direct `process.env` access or new inline style blocks are introduced, the task is not complete.

## 6) Restricted Operations

Do not run without explicit user approval:

- `git reset --hard`
- large delete/move operations
- destructive DB changes (possible data loss)
- secret or environment policy changes

## 7) Documentation Sync Rules

When these change, update docs in the same task:

- architecture boundaries: `docs/03-system-architecture.md`
- scope/milestones: `docs/06-milestones.md`, `docs/02-mvp-scope.md`
- setup/run flow: `README.md`

## 8) Reporting Template (Recommended)

Start:
- Goal:
- Files:
- Risks:
- Validation:

Progress:
- Done:
- Next:
- Blockers:

Final:
- Summary:
- Diff highlights:
- Validation results:
- Manual check:
- Rollback:
