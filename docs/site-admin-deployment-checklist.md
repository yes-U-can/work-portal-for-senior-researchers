# Public Site Admin Deployment Checklist

Use this checklist when moving the SICP public site admin features from local code to production.

## 1. Database

- Completed on 2026-04-26: synced the production Neon database with the current Prisma schema using `prisma db push`.
- Completed on 2026-04-26: ran `npm run db:seed-site-admin` against production.
- Current review SQL can be generated with Prisma `migrate diff`; the latest local review file is `docs/site-admin-schema-diff.sql`.
- The schema now includes `WorkshopSchedule`, which is the source of truth for public workshop calendar data.
- Do not run `npm run db:push` against production casually. Treat it as a schema-changing operation.
- Run `npm run db:generate` after pulling the deployed schema locally.
- Confirmed the four allowed accounts exist as users, memberships, and author profiles.
- If `npm run db:seed-site-admin` is run again, existing author display names are preserved.

## 2. Authentication

- Keep `ENABLE_DEV_CREDENTIALS=false` in production.
- Configure Google OAuth for the portal domain.
- Confirm only these accounts can sign in:
  - `thinkinthegrey@gmail.com`
  - `loveyer@iscu.ac.kr`
  - `mow.coding@gmail.com`
  - `sicpseoul@gmail.com`

## 3. Blob Storage

- Create and connect a Vercel Blob store to the portal project.
- Confirm `BLOB_READ_WRITE_TOKEN` exists in the portal project environment.
- Test one notice attachment upload.
- Test one rich-text body image upload.

## 4. Public Site Connection

- Completed on 2026-04-26: set `SITE_ADMIN_API_URL` in the public site production environment.
- Current value uses the stable Vercel production URL until the portal custom domain DNS is ready:
  - `https://portalsicp.vercel.app/api/public-site`
- Future custom-domain value:
  - `https://portal.yesucan.co.kr/api/public-site`
- Confirm public notices, workshop schedules, and resources appear on the public site.
- Confirm private/internal/draft content does not appear on the public site.
- Confirm the public site calendar uses portal schedules, not Google Calendar.

## 5. Portal Deployment

- Completed on 2026-04-26: set Vercel `portal_sicp` framework preset to `Next.js`.
- Completed on 2026-04-26: deployed `portal_sicp` to production.
- Completed on 2026-04-26: added `portal.yesucan.co.kr` to the Vercel `portal_sicp` project.
- Pending DNS at Gabia:
  - Type: `A`
  - Host: `portal`
  - Value: `76.76.21.21`
  - TTL: `600` is fine during setup.
- `portal.yesucan.co.kr` will not resolve until the Gabia DNS record is added.
- After DNS is active, Vercel will issue the SSL certificate asynchronously.

## 6. Manual QA

- Sign in with `sicpseoul@gmail.com` and confirm manager-only fields are editable.
- Sign in with a professor account and confirm they can create, update, and soft-delete workshop schedules.
- Confirm a professor can edit/delete only their own content.
- Confirm soft-deleted content moves to trash.
- Confirm manager accounts can permanently delete trash items.
- Confirm workshop status is calculated automatically from application dates and workshop dates.
- Confirm Chrome, Edge, Whale, and Safari responsive layouts before public launch.
