# M-Chango Environments and Admin Panel Design

Date: 2026-10-07
Status: Proposed
Priority: P0 before broad public launch

## Purpose

M-Chango is moving from pilot testing toward real users and real fundraiser data. The current live deployment works, but the operating model is still too close to a development setup. We need two linked improvements:

1. Separate development, staging and production so test work cannot pollute or damage real user data.
2. Add a restrained admin panel for founder/operator visibility without creating unsafe back-office powers.

The first admin release is for one operator only, but the authorization model must support future roles without rewriting the system.

## Current State

- Railway production runs the app from GitHub `main`.
- The live app currently points at Supabase project `ziamlejfurafauwuqcjk`, named `m-chango-dev`.
- Supabase contains account auth, fundraiser ledgers, contribution history, privacy controls, analytics events, deletion queues, retention jobs and auth throttling.
- Operational checks exist in `docs/operations/admin-checklist.md`, `docs/operations/recovery.md` and `docs/operations/m-chango-supabase.md`.
- The app has health endpoints:
  - `/api/health` for app liveness.
  - `/api/health/ready` for Supabase reachability.

## Goals

- Make production data clearly separate from development and staging.
- Make every schema change reproducible through migrations.
- Make the admin UI useful for support, launch monitoring and data sanity checks.
- Keep admin capabilities narrow, auditable and privacy-aware.
- Design admin access for future roles while shipping the MVP for one operator.
- Preserve the option to migrate away from Supabase later by keeping provider-specific assumptions isolated.

## Non-Goals

- No full staff management system in the first admin release.
- No direct admin editing of contribution amounts, fundraiser balances or ownership.
- No casual viewing of private phone numbers, M-Pesa references, raw imports or account exports.
- No service-role key in the browser.
- No custom BI warehouse yet.
- No migration away from Supabase now.

## Environment Model

Use three environments.

| Environment | Supabase | Railway | Data Policy |
| --- | --- | --- | --- |
| Local | Local Supabase or disposable branch | Local dev server | Synthetic data only |
| Staging | `m-chango-staging` | Railway staging environment | Test/synthetic data only |
| Production | `m-chango-production` | Railway production environment | Real user data |

The current Supabase project should become staging or be renamed to match its actual purpose. Production should use a distinct Supabase project before meaningful public launch.

## Branch and Deployment Flow

- `main` deploys to production.
- A staging branch or Railway staging environment deploys to staging.
- Feature work is merged only after unit tests and the relevant database checks pass.
- Production environment variables must point only to the production Supabase project.
- Staging variables must point only to the staging Supabase project.

Each deployed app should expose enough non-secret metadata for admin display:

- app environment name: `local`, `staging` or `production`
- public app origin
- Supabase project ref or friendly environment label
- Git commit SHA
- build/deploy timestamp if available

## Migration Workflow

Schema is code. Every database change must exist as a migration file in `supabase/migrations`.

Required flow:

1. Create or edit migration locally.
2. Apply to local/dev database.
3. Run database fixtures and unit tests.
4. Apply to staging.
5. Run Supabase security and performance advisors.
6. Perform a smoke test against staging.
7. Apply to production during a deliberate release step.
8. Verify production health, readiness, cron jobs and critical app flows.

Production manual SQL is allowed only for emergencies. Any emergency SQL must be backfilled into a migration or documented rollback file immediately after the incident.

## Database Portability

Supabase is the right MVP choice, but we should avoid unnecessary lock-in.

Keep:

- core data in ordinary Postgres tables
- migrations as plain SQL
- application access through server-side modules
- auth/provider-specific logic isolated in auth/session helpers and RPC boundaries

Accept for MVP:

- Supabase Auth
- `auth.uid()`
- Supabase RLS
- Supabase RPC
- `pg_cron`

Avoid:

- putting Supabase assumptions in UI components
- depending on dashboard-only schema changes
- storing data in provider-only formats
- using service-role secrets in the app runtime unless a tightly scoped server-only task truly requires it

If M-Chango later migrates to another Postgres provider, fundraiser and ledger data should move through normal Postgres dump/restore or logical export. Auth migration is the hard part and should be planned separately.

## Admin Access Model

The MVP admin panel is for one founder/operator, but access must be data-driven.

Add a private admin table:

```sql
private.admin_users
```

Minimum fields:

- `user_id uuid primary key references public.profiles(id)`
- `role text not null check(role in ('owner','support','analyst','ops'))`
- `created_at timestamptz not null default now()`
- `created_by uuid references public.profiles(id)`
- `disabled_at timestamptz`

MVP behavior:

- Only one row is needed for the founder/operator.
- Only the `owner` role is active in product behavior.
- Other role values exist to preserve the future shape, not to expose features now.
- Admin checks must be performed server-side through private RPC or server handlers.

Do not hardcode admin access across UI components. A seed or one-time controlled SQL step may create the first admin row.

## Admin Audit Model

Every admin action should be recorded, including sensitive reads where practical.

Add:

```sql
private.admin_audit_events
```

Minimum fields:

- `id uuid primary key`
- `actor_user_id uuid references public.profiles(id)`
- `action text not null`
- `target_type text`
- `target_id text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Metadata must not contain raw phone numbers, transaction references, raw pasted lists, cookies, tokens, OTPs or export payloads.

## Admin Panel MVP Screens

### 1. Overview

Shows:

- app environment badge
- Railway deployment status or commit if available
- Supabase project label/ref
- `/api/health`
- `/api/health/ready`
- latest cron run summaries
- advisor warning summary

Purpose: prevent operating blindly and make environment confusion obvious.

### 2. Fundraisers

Shows searchable/paginated fundraisers:

- public ID
- title
- status
- owner
- total amount
- target amount
- entry count
- created/updated timestamps
- public link

MVP is read-only.

### 3. Users

Shows organizer accounts:

- profile ID
- auth subject
- masked email if available
- provider summary if available
- created date
- fundraiser count
- deletion request status

MVP is read-only.

### 4. Ledger Viewer

Shows a fundraiser's contributions and history with pagination.

Default masking:

- phone numbers hidden
- transaction references hidden or last characters only
- removed entries clearly marked

No admin edits in MVP.

### 5. Privacy and Data

Shows:

- pending deletion requests
- completed deletion receipt counts
- privacy notice readiness
- analytics configuration
- privacy choice counts
- export/recovery checklist links

No manual deletion execution from UI in MVP unless we later add a heavily confirmed and audited operation.

### 6. Analytics

Shows aggregate product events only:

- fundraiser created
- contribution added
- import completed
- WhatsApp copied
- public page viewed

Breakdowns should avoid personal data. Admin analytics can be daily counts and simple funnel numbers at first.

### 7. Admin Audit Log

Shows recent admin actions:

- actor
- action
- target
- timestamp
- minimal metadata

This should exist before adding any admin write action.

## Security Rules

- Admin pages require a valid organizer session and an active admin row.
- Admin data access must go through server-side handlers or private RPC functions.
- No service-role key goes to the browser.
- Public RLS policies remain focused on normal organizer access; admin access should not weaken them.
- Private admin tables have RLS enabled and no browser table grants.
- Sensitive reads should be explicit and logged.
- Production admin UI displays a visible production warning.
- Admin actions never trust client-supplied role claims.

## Data Access Pattern

Preferred pattern:

1. Browser calls `/api/admin/...`.
2. Server extracts the organizer access token.
3. Server calls Supabase RPC with the user's JWT.
4. Private RPC verifies active session and admin membership.
5. RPC returns a minimal projection.
6. RPC records an audit event for sensitive access.

This keeps admin logic inside the same security model as the rest of the application and avoids a broad service-role backend for MVP.

## Testing

Unit tests:

- non-admin cannot access admin API
- disabled admin cannot access admin API
- owner admin can access read-only admin projections
- admin projections mask sensitive fields
- audit events are written for sensitive reads
- production environment badge renders from config

Database tests:

- admin private tables deny `anon` and normal `authenticated`
- private admin RPC denies non-admin
- admin RPC returns only bounded/paginated data
- audit metadata rejects sensitive fields where enforceable

Operational tests:

- staging admin panel points to staging database
- production admin panel points to production database
- readiness check succeeds after deploy
- cron status query works without exposing private data

## Rollout Plan

1. Create/rename environments:
   - current project becomes staging or is clearly labeled staging
   - new Supabase production project is created
2. Apply existing migrations to production.
3. Configure Railway staging and production variables.
4. Add admin tables and admin read RPCs.
5. Add admin API routes.
6. Add admin UI with overview, fundraisers and users first.
7. Add ledger viewer, privacy/data and analytics sections.
8. Add audit log display.
9. Run advisors, unit tests and production smoke checks.

## Open Decisions

- Whether to use a dedicated Railway staging environment or a separate Railway project for staging.
- Whether the first production Supabase project should start empty or receive selected pilot fundraisers.
- Whether admin access is granted by profile ID, auth subject, or verified email during first bootstrap.
- How much auth provider detail Supabase exposes cleanly without service-role access.
- Whether monitoring alerts should be displayed inside admin or linked out to Railway/Supabase for MVP.

## Acceptance Criteria

- Production and staging are separate Supabase projects or clearly isolated environments.
- Railway production cannot accidentally point to staging without obvious admin-page evidence.
- First admin user can view operational data from `/admin`.
- Non-admin users receive 404 or 403 for admin pages and APIs.
- Admin read access is audited.
- Fundraiser and ledger data remain paginated.
- Sensitive contributor fields are masked by default.
- Supabase advisors show no unresolved high-risk security issues.
- Production readiness returns `ok` after deploy.
