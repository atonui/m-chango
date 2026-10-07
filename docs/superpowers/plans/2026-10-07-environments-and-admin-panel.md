# Environments and Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation for separated M-Chango environments and a founder-only, future-role-ready admin panel.

**Architecture:** Add explicit runtime environment metadata, then create private Supabase admin tables/RPCs with server-side admin checks and audit logging. Build `/admin` as a guarded read-only operational surface that consumes bounded admin APIs and displays production/staging context clearly.

**Tech Stack:** Next/Vinext app routes and React components, Supabase/Postgres SQL migrations and fixtures, Vitest unit tests, Railway environment variables.

**Spec:** `docs/superpowers/specs/2026-10-07-environments-and-admin-panel-design.md`

## Global Constraints

- Priority is P0 before broad public launch.
- The first admin release is for one founder/operator only, but the authorization model must support future roles without rewriting the system.
- No direct admin editing of contribution amounts, fundraiser balances or ownership.
- No casual viewing of private phone numbers, M-Pesa references, raw imports or account exports.
- No service-role key in the browser.
- Production and staging must point to distinct Supabase projects before meaningful public launch.
- Every database change must exist as a migration file in `supabase/migrations`.
- Admin pages require a valid organizer session and an active admin row.
- Private admin tables must have RLS enabled and no browser table grants.
- Sensitive reads should be explicit and logged.
- Admin actions never trust client-supplied role claims.

## Review Focus

- Non-admin authenticated users must not learn whether `/admin` exists beyond a generic forbidden/not found response; Task 3 tests this at API level.
- A disabled admin row must revoke access immediately without waiting for JWT refresh; Task 2 tests this in SQL and Task 3 tests server behavior.
- Production/staging confusion must be obvious on the first admin screen; Task 1 and Task 4 test environment badge rendering.
- Admin projections must remain paginated and masked; Task 5 and Task 6 test bounded result sizes and sensitive field masking.
- Admin audit metadata must not store raw phone numbers, transaction references, tokens or pasted lists; Task 2 and Task 6 test audit payload allowlisting.

---

## File Structure

- Create `app/lib/server/environment.ts` for runtime environment metadata parsing.
- Modify `app/api/health/route.ts` and `app/api/health/ready/route.ts` only if environment metadata needs to be included in health/admin checks; keep public health responses non-secret.
- Create `supabase/migrations/<generated>_admin_foundation.sql` and matching `supabase/schema/admin_foundation.sql` for `private.admin_users`, `private.admin_audit_events`, admin guards and read RPCs.
- Create `supabase/tests/admin_foundation.sql` for SQL access control and projection tests.
- Create `app/lib/server/admin.ts` for server-side admin session checks and RPC wrappers.
- Create `app/api/admin/overview/route.ts`, `app/api/admin/fundraisers/route.ts`, `app/api/admin/users/route.ts`, `app/api/admin/ledger/[publicId]/route.ts`, `app/api/admin/privacy/route.ts`, `app/api/admin/analytics/route.ts`, and `app/api/admin/audit/route.ts`.
- Create `app/admin/page.tsx` and focused components under `app/components/admin/`.
- Create or extend unit tests under `tests/unit/admin*.test.ts` and `tests/unit/environment.test.ts`.
- Update `docs/operations/admin-checklist.md`, `docs/operations/m-chango-supabase.md`, and `docs/operations/railway-release.md` with environment/admin rollout checks.

### Task 1: Runtime Environment Metadata

**Files:**
- Create: `app/lib/server/environment.ts`
- Test: `tests/unit/environment.test.ts`
- Modify: `docs/operations/railway-release.md`

**Interfaces:**
- Produces: `runtimeEnvironment(bindings: Record<string, string | undefined>) -> RuntimeEnvironment`
- Produces type: `RuntimeEnvironment = { name: 'local'|'staging'|'production'; appOrigin: string | null; supabaseUrl: string | null; supabaseProjectRef: string | null; gitCommit: string | null; deployLabel: string | null }`
- Consumes later: Task 4 uses `runtimeEnvironment()` for the admin overview badge.

- [ ] **Step 1: Write failing unit tests for environment parsing**

Test `tests/unit/environment.test.ts`:

```ts
expect(runtimeEnvironment({
  APP_ENV:'production',
  APP_ORIGIN:'https://www.m-chango.com',
  SUPABASE_URL:'https://ziamlejfurafauwuqcjk.supabase.co',
  RAILWAY_GIT_COMMIT_SHA:'abc123'
})).toMatchObject({
  name:'production',
  appOrigin:'https://www.m-chango.com',
  supabaseProjectRef:'ziamlejfurafauwuqcjk',
  gitCommit:'abc123'
});
```

Also test invalid `APP_ENV` falls back to `local` unless `RAILWAY_ENVIRONMENT_NAME` is `production`.

- [ ] **Step 2: Run failing test**

Run: `pnpm exec vitest run tests/unit/environment.test.ts --configLoader runner`

Expected: FAIL because `app/lib/server/environment.ts` does not exist.

- [ ] **Step 3: Implement `runtimeEnvironment`**

Create `app/lib/server/environment.ts` with:

```ts
export type AppEnvironment='local'|'staging'|'production';
export interface RuntimeEnvironment{ name:AppEnvironment; appOrigin:string|null; supabaseUrl:string|null; supabaseProjectRef:string|null; gitCommit:string|null; deployLabel:string|null }
export function runtimeEnvironment(bindings:Record<string,string|undefined>):RuntimeEnvironment;
```

Derive `supabaseProjectRef` from `SUPABASE_URL` host `<ref>.supabase.co`. Use `APP_ENV` first, then `RAILWAY_ENVIRONMENT_NAME`, then `local`.

- [ ] **Step 4: Run unit test**

Run: `pnpm exec vitest run tests/unit/environment.test.ts --configLoader runner`

Expected: PASS.

- [ ] **Step 5: Document Railway variables**

Update `docs/operations/railway-release.md` to include:

- `APP_ENV=production` for Railway production.
- `APP_ENV=staging` for Railway staging.
- `RAILWAY_GIT_COMMIT_SHA` if available from Railway, otherwise document fallback as null.

- [ ] **Step 6: Commit**

```bash
git add app/lib/server/environment.ts tests/unit/environment.test.ts docs/operations/railway-release.md
git commit -m "Add runtime environment metadata"
```

### Task 2: Admin Database Foundation

**Files:**
- Create: `supabase/migrations/<generated>_admin_foundation.sql`
- Create: `supabase/schema/admin_foundation.sql`
- Create: `supabase/tests/admin_foundation.sql`

**Interfaces:**
- Produces table: `private.admin_users`
- Produces table: `private.admin_audit_events`
- Produces function: `private.require_admin(required_role text default null) returns uuid`
- Produces function: `private.record_admin_audit(action text,target_type text default null,target_id text default null,metadata jsonb default '{}'::jsonb) returns void`
- Produces function: `public.admin_overview() returns jsonb`
- Consumes: existing `public.profiles`, `private.active_organizer_session()`.

- [ ] **Step 1: Generate migration file**

Run: `supabase migration new admin_foundation`.

Expected: new timestamped file under `supabase/migrations`.

- [ ] **Step 2: Write failing SQL fixture**

Create `supabase/tests/admin_foundation.sql` with rollback-wrapped tests that assert:

- `anon` cannot select `private.admin_users`.
- normal `authenticated` user not in `private.admin_users` cannot call `public.admin_overview()`.
- disabled admin cannot call `public.admin_overview()`.
- active `owner` admin can call `public.admin_overview()`.
- audit metadata containing keys `phone`, `transactionReference`, `rawText`, `token`, or `cookie` is rejected by `private.record_admin_audit`.

- [ ] **Step 3: Run SQL fixture and verify failure**

Run the existing Supabase SQL test harness command for one fixture, matching the repo's current pattern.

Expected: FAIL because tables/functions do not exist.

- [ ] **Step 4: Implement migration SQL**

In the generated migration and `supabase/schema/admin_foundation.sql`, add:

- `private.admin_users`
- `private.admin_audit_events`
- RLS enabled on both tables
- revoke all table access from `public`, `anon`, `authenticated`
- `private.require_admin(required_role text default null) returns uuid`
- `private.record_admin_audit(...) returns void`
- `public.admin_overview() returns jsonb`

Role check values are exactly: `'owner','support','analyst','ops'`. MVP grants useful access only to `owner`.

- [ ] **Step 5: Run SQL fixture**

Run the same SQL fixture command.

Expected: PASS.

- [ ] **Step 6: Run Supabase advisors against the target project or branch**

Run Supabase security and performance advisors.

Expected: no unresolved high-risk findings introduced by admin tables/functions.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/*_admin_foundation.sql supabase/schema/admin_foundation.sql supabase/tests/admin_foundation.sql
git commit -m "Add admin database foundation"
```

### Task 3: Server-Side Admin Guard and API Boundary

**Files:**
- Create: `app/lib/server/admin.ts`
- Create: `app/api/admin/overview/route.ts`
- Test: `tests/unit/admin-api.test.ts`

**Interfaces:**
- Produces: `adminRpc(req: Request, rpcName: string, payload?: unknown) -> Promise<unknown>`
- Produces: `requireAdminRequest(req: Request) -> Promise<{ token: string }>`
- Consumes: `requestAccessToken(req)` from `app/lib/server/account-session.ts`
- Consumes: `SupabaseRpc` from `app/lib/server/supabase-rpc.ts`

- [ ] **Step 1: Write failing API tests**

Create `tests/unit/admin-api.test.ts` with tests:

- missing session returns 403 or 404 from `GET /api/admin/overview`.
- Supabase RPC `PT403` maps to 403 with generic error.
- successful RPC returns JSON body.

Mock `SupabaseRpc` rather than hitting live Supabase.

- [ ] **Step 2: Run failing tests**

Run: `pnpm exec vitest run tests/unit/admin-api.test.ts --configLoader runner`

Expected: FAIL because files/routes do not exist.

- [ ] **Step 3: Implement `app/lib/server/admin.ts`**

Implement:

```ts
export async function adminRpc(req:Request,rpcName:string,payload?:unknown):Promise<unknown>
```

The function reads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, extracts the organizer access token, calls `SupabaseRpc.call(rpcName,payload)`, and throws `DomainError` with generic messages for unauthorized/forbidden cases.

- [ ] **Step 4: Implement overview route**

Create `app/api/admin/overview/route.ts` with `GET(req: Request)` using `boundary()` and `adminRpc(req,'admin_overview')`.

- [ ] **Step 5: Run tests**

Run: `pnpm exec vitest run tests/unit/admin-api.test.ts --configLoader runner`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/lib/server/admin.ts app/api/admin/overview/route.ts tests/unit/admin-api.test.ts
git commit -m "Add admin API guard"
```

### Task 4: Admin Overview Page

**Files:**
- Create: `app/admin/page.tsx`
- Create: `app/components/admin/admin-overview.tsx`
- Modify: `app/globals.css`
- Test: `tests/unit/admin-overview.test.ts`

**Interfaces:**
- Consumes: `GET /api/admin/overview`
- Consumes: `RuntimeEnvironment` display fields from Task 1 via API response.
- Produces UI elements: environment badge, readiness cards, Supabase project ref, cron status placeholder.

- [ ] **Step 1: Write failing render tests**

Create `tests/unit/admin-overview.test.ts` that reads component/page source or renders the component according to the project's existing test style and asserts:

- text `Production` appears when `environment.name === 'production'`
- Supabase project ref is displayed
- public health and readiness labels are present
- production warning copy is present

- [ ] **Step 2: Run failing test**

Run: `pnpm exec vitest run tests/unit/admin-overview.test.ts --configLoader runner`

Expected: FAIL because admin page/components do not exist.

- [ ] **Step 3: Implement overview UI**

Create `app/admin/page.tsx` as a server/client page matching existing app patterns. Create `app/components/admin/admin-overview.tsx` with a dense operational layout, no decorative dashboard fluff.

Use visible badge copy:

- `PRODUCTION`
- `STAGING`
- `LOCAL`

Production badge must include copy: `Real user data`.

- [ ] **Step 4: Add CSS**

Extend `app/globals.css` with admin layout classes:

- `.admin-shell`
- `.admin-grid`
- `.admin-badge`
- `.admin-badge.production`
- `.admin-table`

Keep mobile layout single-column.

- [ ] **Step 5: Run tests**

Run: `pnpm exec vitest run tests/unit/admin-overview.test.ts --configLoader runner`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/admin/page.tsx app/components/admin/admin-overview.tsx app/globals.css tests/unit/admin-overview.test.ts
git commit -m "Add admin overview page"
```

### Task 5: Admin Fundraisers and Users Read Models

**Files:**
- Modify: admin migration/schema from Task 2 with additional RPCs or create a new generated migration `admin_read_models`.
- Modify: `supabase/tests/admin_foundation.sql` or create `supabase/tests/admin_read_models.sql`
- Create: `app/api/admin/fundraisers/route.ts`
- Create: `app/api/admin/users/route.ts`
- Create: `app/components/admin/admin-fundraisers.tsx`
- Create: `app/components/admin/admin-users.tsx`
- Test: `tests/unit/admin-read-models.test.ts`

**Interfaces:**
- Produces RPC: `public.admin_fundraisers(page_cursor jsonb default null,page_size integer default 25) returns jsonb`
- Produces RPC: `public.admin_users(page_cursor jsonb default null,page_size integer default 25) returns jsonb`
- Produces API: `GET /api/admin/fundraisers`
- Produces API: `GET /api/admin/users`

- [ ] **Step 1: Write SQL tests for bounded projections**

Assert:

- page size above 100 is rejected.
- fundraiser projection includes `publicId`, `title`, `status`, `totalMinor`, `targetMinor`, `entryCount`, `updatedAt`, `ownerProfileId`.
- user projection includes `profileId`, `authSubject`, `createdAt`, `fundraiserCount`, `deletionStatus`.
- projection does not include phone numbers, transaction references, raw import text, cookies or tokens.

- [ ] **Step 2: Run SQL test and verify failure**

Run the SQL fixture.

Expected: FAIL because RPCs do not exist.

- [ ] **Step 3: Implement read-model RPCs**

Create the migration with `public.admin_fundraisers` and `public.admin_users`. Both call `private.require_admin('owner')`, return paginated JSON, and call `private.record_admin_audit`.

- [ ] **Step 4: Run SQL test**

Expected: PASS.

- [ ] **Step 5: Write API/UI tests**

In `tests/unit/admin-read-models.test.ts`, assert routes call `adminRpc` with correct RPC names and components include table headers for fundraisers/users.

- [ ] **Step 6: Implement routes and components**

Add the routes and components. Link them from `app/admin/page.tsx`.

- [ ] **Step 7: Run unit tests**

Run: `pnpm exec vitest run tests/unit/admin-read-models.test.ts --configLoader runner`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/*_admin_read_models.sql supabase/schema/admin_foundation.sql supabase/tests/admin_read_models.sql app/api/admin/fundraisers/route.ts app/api/admin/users/route.ts app/components/admin/admin-fundraisers.tsx app/components/admin/admin-users.tsx tests/unit/admin-read-models.test.ts app/admin/page.tsx
git commit -m "Add admin fundraiser and user read models"
```

### Task 6: Ledger, Privacy, Analytics and Audit Admin Sections

**Files:**
- Create migration: `admin_operational_views`
- Create/update SQL test: `supabase/tests/admin_operational_views.sql`
- Create: `app/api/admin/ledger/[publicId]/route.ts`
- Create: `app/api/admin/privacy/route.ts`
- Create: `app/api/admin/analytics/route.ts`
- Create: `app/api/admin/audit/route.ts`
- Create: `app/components/admin/admin-ledger.tsx`
- Create: `app/components/admin/admin-privacy.tsx`
- Create: `app/components/admin/admin-analytics.tsx`
- Create: `app/components/admin/admin-audit-log.tsx`
- Test: `tests/unit/admin-operational-sections.test.ts`

**Interfaces:**
- Produces RPC: `public.admin_ledger(public_id text,page_cursor jsonb default null,page_size integer default 50) returns jsonb`
- Produces RPC: `public.admin_privacy_overview() returns jsonb`
- Produces RPC: `public.admin_analytics_overview(days integer default 14) returns jsonb`
- Produces RPC: `public.admin_audit_events(page_cursor jsonb default null,page_size integer default 50) returns jsonb`

- [ ] **Step 1: Write SQL tests for masking and audits**

Assert:

- `admin_ledger` masks contributor phone and transaction reference fields by default.
- `admin_ledger` is paginated and rejects page size above 100.
- `admin_privacy_overview` returns counts, not raw export payloads.
- `admin_analytics_overview` returns aggregate event counts only.
- every RPC inserts an `admin_audit_events` row.

- [ ] **Step 2: Run SQL test and verify failure**

Expected: FAIL because RPCs do not exist.

- [ ] **Step 3: Implement operational RPCs**

Create the migration and schema updates. Use minimal JSON projections. Avoid raw personal fields.

- [ ] **Step 4: Run SQL tests**

Expected: PASS.

- [ ] **Step 5: Write API/UI tests**

Assert route-to-RPC mapping and presence of UI labels:

- `Ledger viewer`
- `Privacy and data`
- `Analytics`
- `Admin audit log`

- [ ] **Step 6: Implement routes and components**

Add the four routes and four components. Keep all destructive/action buttons out of the MVP.

- [ ] **Step 7: Run unit tests**

Run: `pnpm exec vitest run tests/unit/admin-operational-sections.test.ts --configLoader runner`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/*_admin_operational_views.sql supabase/schema/admin_foundation.sql supabase/tests/admin_operational_views.sql app/api/admin app/components/admin tests/unit/admin-operational-sections.test.ts
git commit -m "Add admin operational sections"
```

### Task 7: Environment Rollout and Production Verification

**Files:**
- Modify: `docs/operations/admin-checklist.md`
- Modify: `docs/operations/m-chango-supabase.md`
- Modify: `docs/operations/railway-release.md`
- Test: `tests/unit/admin-content.test.ts`

**Interfaces:**
- Consumes all previous admin pages/API routes.
- Produces launch checklist language for staging/production separation.

- [ ] **Step 1: Write content test**

Create `tests/unit/admin-content.test.ts` that asserts operations docs contain:

- `m-chango-staging`
- `m-chango-production`
- `APP_ENV=production`
- `APP_ENV=staging`
- `Supabase backup access`
- `admin audit log`

- [ ] **Step 2: Run failing test**

Run: `pnpm exec vitest run tests/unit/admin-content.test.ts --configLoader runner`

Expected: FAIL until docs are updated.

- [ ] **Step 3: Update operations docs**

Update docs with:

- staging/production environment checklist
- first admin bootstrap procedure
- pre-launch check that production does not point to `m-chango-dev`
- backup/PITR dashboard verification step
- advisor check step
- admin audit review step

- [ ] **Step 4: Run content test**

Expected: PASS.

- [ ] **Step 5: Run full local verification**

Run:

```bash
pnpm run test:unit
pnpm run build:railway
```

Expected: PASS. If Vite config temp path fails, use `--configLoader runner` for focused Vitest runs and document the environment limitation.

- [ ] **Step 6: Apply migrations to staging**

Apply migrations to staging Supabase only. Run SQL fixtures/advisors against staging.

Expected: PASS, no high-risk advisor findings.

- [ ] **Step 7: Apply migrations to production after approval**

Apply migrations to production only after staging verification and explicit release approval.

Expected: migrations applied, advisors clean or known INFO-only findings.

- [ ] **Step 8: Verify production**

Check:

- `/api/health`
- `/api/health/ready`
- `/admin` as admin user
- `/admin` as non-admin user
- admin audit event after viewing sensitive sections

Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add docs/operations/admin-checklist.md docs/operations/m-chango-supabase.md docs/operations/railway-release.md tests/unit/admin-content.test.ts
git commit -m "Document admin and environment rollout"
```

## Self-Review Notes

- Spec coverage: environment separation, migration workflow, database portability, admin access, audit, screens, security, testing and rollout are all mapped to tasks.
- Step scan: each task has failing test, implementation, verification and commit steps. External production migration is explicitly gated in Task 7.
- Type consistency: `runtimeEnvironment`, `adminRpc`, and RPC names are defined once and reused consistently.
- Review focus: the five likely failure modes are listed and pinned to owning tasks.
- Proportion: plan is longer than the spec but uses signatures and assertions rather than full implementations.

## Execution Handoff

Plan complete. Recommended execution approach: **Native** for the first pass, because the tasks are tightly coupled through shared SQL/RPC/API names and we already know the current codebase constraints. Use one final review after Task 7 before treating the admin surface as launch-ready.
