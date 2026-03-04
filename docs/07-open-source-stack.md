# Open Source Stack and Build Acceleration

## Recommended Core Stack

- `Next.js` (App Router)
- `TypeScript`
- `Auth.js` for authentication and OAuth provider flows
- `Prisma` + `PostgreSQL` for relational multi-tenant data
- `Zod` for API input validation
- `TanStack Query` for client-side server state
- `BullMQ` or `QStash` for background sync tasks

## UI and Accessibility

- `Tailwind CSS` + design tokens
- `Radix UI` primitives for robust accessible components
- `lucide-react` icons with large touch targets

## Operational Tooling

- `Sentry` for error monitoring
- `pino` or structured logger for runtime logs
- `ESLint` + `Prettier` + `Husky` for quality gates

## Why This Stack

- Fast iteration with strong production readiness.
- Good OAuth and API integration ergonomics.
- Supports modular connector architecture.

## Build Fast Rules

1. Reuse connector interface and shared client utilities.
2. Start with metadata sync; avoid full data replication.
3. Add integrations one by one, not all at once.
4. Keep docs and schema updated with every major change.
