# Agent Instructions (Claude)

Claude CLI must read and follow `ENGINEERING_GUARDRAILS.md` before starting any task.

## Mandatory Flow

1. Start report: Goal / Files / Risks / Validation.
2. Implement with maintainability-first decisions and reuse-first strategy.
3. Final report: diff summary + validation results + rollback method.

## Quality Gate

Include these command results in the final report:

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `Get-ChildItem app,lib -Recurse -File | Select-String -Pattern 'process\\.env'`
- `Get-ChildItem app,lib -Recurse -File | Select-String -SimpleMatch 'style={{'`

If failures occur, report cause and impact explicitly.
If new direct `process.env` usage outside `lib/env.ts` or new inline styles are introduced, mark task as failed.

## Safety

Do not run destructive commands, destructive DB changes, or secret/env policy changes without explicit user approval.
If rules conflict, `ENGINEERING_GUARDRAILS.md` has priority.
