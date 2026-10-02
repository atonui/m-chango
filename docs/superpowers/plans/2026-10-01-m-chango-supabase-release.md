# M-Chango Supabase Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execution method: Native, previously selected by the owner.

**Goal:** Deliver the approved Supabase-backed organizer release with reliable ledgers, bounded queries, minimal analytics and operational evidence.

**Architecture:** Replace D1 in an isolated release branch with Supabase HTTPS queries and transactional PostgreSQL RPCs. Enforce ownership at the server and database boundaries. Exercise real local identity and RLS before connecting public Google/email sign-in last.

**Tech Stack:** Existing TypeScript/React/Vinext Worker, Supabase PostgreSQL/Auth, versioned SQL, Vitest, real PostgreSQL integration tests and an HTTP load harness.

**Spec:** `docs/superpowers/specs/2026-10-01-m-chango-supabase-release-design.md`

## Global Constraints

- Do not execute the superseded D1 account plan or alter the deployed pilot.
- One owner per fundraiser; contributors account-free; no group invitations or payment processing.
- Integer minor units; per-entry/target maximum 10,000,000,000; aggregate maximum Number.MAX_SAFE_INTEGER.
- Import 1–500 rows; optimistic versions, reserved references, atomic actor history and idempotent saves.
- Ledger page default 50/max 100; dashboard default 20/max 50; complete synchronous export maximum 5,000 entries, never silent truncation.
- Visible public summary refresh every 30 seconds; pause while hidden; no stale privacy caching.
- Product-event retention 90 days; sanitized reliability logs 30 days; optional feedback 180 days.
- Authentication last. No production development bypass, dual writes, cloud reset or publication during local implementation.
- Real hosted callback/session verification and approved production preparation precede cutover.

## Review Focus

- Calling Supabase directly must not bypass app ownership checks or reveal private columns.
- Concurrent retries and imports must not duplicate entries or diverge totals/history.
- Pagination and concurrent edits must not silently omit data in a full-copy snapshot.
- Failed token refresh, local-cookie spoofing and cross-account replay must fail closed.
- Logs, consent changes and deletion must not preserve unintended personal data.

## Files and boundaries

- `supabase/config.toml`, `supabase/migrations/*.sql`: local configuration, schema, RLS and functions.
- `supabase/tests/*.sql`: database policy, constraint, concurrency and function assertions.
- `app/lib/server/supabase.ts`: per-request clients and server-only runtime configuration.
- `app/lib/server/accounts.ts`, `identity.ts`: verified identity, membership and dashboard queries.
- `app/lib/server/repository.ts`, `handler.ts`, `auth.ts`, `rate-limit.ts`: replace D1 access and capability authorization.
- `app/lib/domain/account.ts`, `pagination.ts`, `analytics.ts`: typed contracts, validated cursors and telemetry allowlist.
- `app/api/account/[[...path]]/route.ts`, `app/dashboard/page.tsx`, `app/components/account-dashboard.tsx`: organizer flows.
- Existing ledger/create/share/public components: account navigation, pagination and snapshot export.
- `app/lib/server/telemetry.ts`, `app/api/events/route.ts`: gated minimal analytics.
- `scripts/test-supabase.mjs`, `scripts/load-test.mjs`, `scripts/recovery-check.mjs`: verifiable database and operations checks.
- `tests/unit/*`, `tests/integration/supabase-ledger.test.mjs`: client/domain and real API regression tests.
- `docs/operations/m-chango-supabase.md`: configuration, recovery, alerts and measured limitations.

### Task 1: Establish a real test database and schema

**Interfaces:** SQL tables `profiles`, `fundraiser_members`, `fundraisers`, `contributions`, `operations`, `history`; internal UUID profile maps uniquely to Auth subject. Schema uses snake_case; TypeScript DTOs retain existing camelCase names.

- [ ] Create an isolated branch/worktree using the prescribed worktree workflow; read project instructions and approved spec.
- [ ] Establish local Supabase with Docker/CLI if supported. Current workspace has neither installed. If installation/runtime is unavailable, report the concrete blocker and arrange an owner-authorized disposable development project; never substitute an in-memory mock for database acceptance tests or use production credentials.
- [ ] Write SQL tests for FK violations, duplicate owner, duplicate Auth mapping, amount bounds, removed-entry reference reservation and anonymous/private access. Run them against the empty database and confirm expected missing-schema failures.
- [ ] Add migrations with profile mapping, owner-only membership, fundraiser counters/version, ledger records, actor-scoped operation keys and attributable history. Use category enum values from the spec, optional county validation and timestamps with time zones.
- [ ] Configure RLS and revoke direct browser mutations. Index owner/dashboard lookup, contribution cursor, references, retry key and history lookup. Keep profiles and private columns inaccessible anonymously.
- [ ] Apply migrations to a disposable database, run SQL tests and commit schema/tests.

### Task 2: Implement transactional ledger functions

**Interfaces:** RPCs `create_fundraiser(payload jsonb)`, `commit_contributions(public_id text, expected_version bigint, operation_key text, rows jsonb)`, `edit_contribution(public_id text, entry_id uuid, expected_version bigint, payload jsonb)`, `set_contribution_removed(public_id text, entry_id uuid, expected_version bigint, removed boolean)`, `update_fundraiser(public_id text, expected_version bigint, payload jsonb)`. Actor derives from `auth.uid()` through profiles; replies map to current DTOs.

- [ ] Write SQL/integration assertions for atomic owner creation, unauthorized caller, wrong entry fundraiser, 500-row import, 501-row rejection, conflicting reference rollback, overflow, stale version and closed import denial.
- [ ] Add two-connection tests: identical retry produces one result/history set; changed retry conflicts; two same-version writes produce one winner; foreign actor cannot replay; remove/restore/edit reconcile cached totals and count.
- [ ] Run tests and confirm missing-function failures.
- [ ] Implement bounded validation and ownership checks in each RPC; lock the fundraiser before counter/version changes. Check authorization before replay lookup and compare canonical payload digest. Restrict EXECUTE, qualify relations and fix search_path for elevated functions. Preserve audit atomicity.
- [ ] Run SQL and concurrency tests, inspect execution grants and commit.

### Task 3: Provide safe public reads and complete exports

**Interfaces:** `public_summary(public_id text)`; `public_entries(public_id text, cursor jsonb, page_size integer)`; private ledger page with same cursor; `export_snapshot(public_id text, format text)` returning one authorized snapshot. Cursor is `{recordedAt:string,id:string}` and ordering uses both values consistently.

- [ ] Write tests asserting anonymous projection omits identities, references, phones and removed entries, and renders hidden names as Anonymous. Test invalid cursor, equal timestamps, page-size bounds and empty/final pages.
- [ ] Test 5,000-entry snapshot completeness, 5,001-entry explicit size error and total consistency under concurrent mutation. Assert private CSV neutralizes formulas and WhatsApp applies existing visibility rules.
- [ ] Run failing tests, then implement projection functions with narrowly granted anonymous execution and no direct private table grants. Supply pages/counters from consistent snapshots; export all entries in one snapshot rather than assembling moving pages.
- [ ] Verify policy changes are immediately reflected, reconcile totals and commit.

### Task 4: Integrate the Worker and local accounts

**Interfaces:** `resolveOrganizer(req):Promise<{userId:string,authSubject:string}>`; per-request authenticated Supabase client; repository functions preserve existing domain DTOs and error status semantics. Supabase URL and publishable key are configuration; privileged keys stay server-only and are not used for ordinary user requests.

- [ ] Write HTTP tests for owner A creation and owner B denial of dashboard, ledger, export, preview/import and all writes; absent session 401; inaccessible resources 404. Include direct RPC attempts and legacy capability denial.
- [ ] Write configuration tests: local identity requires explicit local setting and runtime, unknown synthetic user rejected, production header/cookie spoof denied, build rejects enabled local shortcuts.
- [ ] Run failing tests; implement Supabase client/identity boundary and replace repository/API D1 calls. Add PostgreSQL-backed rate limiting appropriate to public reads/auth attempts without logging raw IPs in analytics.
- [ ] Provide two synthetic local Supabase users using local auth tokens and guarded session switching. Do not connect Google or outbound email yet. Remove capability/session/rotation paths in the new branch; no fallback to pilot credentials.
- [ ] Exercise exact Worker requests against real Supabase, run existing domain tests/type checking and commit.

### Task 5: Deliver dashboard, pagination and efficient refresh

**Interfaces:** `/api/account/me`, `/api/account/fundraisers`; account-aware existing create/manage endpoints; `loadLedgerPage(cursor)` and public summary-version refresh drive client state.

- [ ] Write client-state tests for empty/active/closed dashboard, account switch clearing private state, cursor progression, hidden-tab pause and unchanged summary avoiding page download. Test expired identity preserves unsaved form data but clears stale private displays.
- [ ] Run failing tests; build My fundraisers, create/open actions and existing management editor without secret prompts. Add bounded ledger/dashboard paging and refetch visible pages when public version changes.
- [ ] Keep Copy contribution list and CSV bound to complete snapshot export, show explicit oversize error and never copy only the loaded page. Keep clipboard fallback and money formatting tests.
- [ ] Inspect available preview, run focused tests/type checking and commit. Record unavailable visual checks honestly.

### Task 6: Add approved data collection with explicit gates

**Interfaces:** `trackEvent(event:AllowedEvent):Promise<void>`; allowed names are exactly fundraiser_created, import_completed, contribution_list_copied, fundraiser_closed. Properties follow the spec; arbitrary free text is rejected. Optional survey and consent records are owner-scoped.

- [ ] Write tests rejecting names, email, phone, references, descriptions, tokens and unknown event fields. Assert successful server writes emit once after commit, rollback emits nothing, and clipboard event requires success.
- [ ] Test analytics disabled default, consent withdrawal, owner-only survey access and deletion removing linked events/surveys. Test retention expiry at 90/30/180 days respectively using fixed clocks.
- [ ] Run failing tests; implement separate private analytics schema, deduplication and enablement gate, optional category/county/closing outcome form and separate research/marketing choices with notice versions. Optional analytics remains disabled pending lawful-basis/notice review.
- [ ] Implement owner deletion/export requests and bounded retention jobs; exclude prohibited raw fields from logs. Do not publish benchmarks. Verify affected tests and commit.

### Task 7: Establish performance, monitoring and recovery evidence

**Interfaces:** load/recovery scripts accept explicit non-production targets and reject missing safety configuration; reports contain metrics and synthetic fixture counts, no secrets or personal data.

- [ ] Add sanitized route/RPC timing and error metrics; confirm telemetry cannot capture bodies, identifying URLs or credentials. Configure documented alerts for error rate, latency and storage/cost thresholds with an identified operator.
- [ ] Seed 10,000 synthetic fundraisers/1,000,000 contributions outside production. Inspect representative EXPLAIN plans and adjust indexes based on measured results.
- [ ] Run 15-minute mixed workload: 100 public viewers/10 organizers, 500-row import and 5,000-entry export. Targets: read p95 <1s, ordinary write p95 <2s, unexpected errors <1%; also assert no duplicate saves/lost updates/private disclosure. Record resources/region and failures rather than relaxing targets silently.
- [ ] Export and restore to a separate database; reconcile IDs, owners, totals, history and counts. Verify selected plan's backup access and rehearse proposed RPO <=24h/RTO <=4h before claiming them.
- [ ] Record actual evidence and operational prerequisites in docs; commit. Missing external credentials or dashboard access is a named blocker, not a passed check.

### Task 8: Connect real sign-in last and prepare release

**Interfaces:** production Supabase SSR cookie identity replaces local adapter. Google uses PKCE and `/auth/complete`; email uses one-time codes. No app-owned password store or email-based account merging.

- [ ] Confirm Sites external-auth support using its documented platform path before scaffolding hosted auth. Configure an owner-authorized Supabase project, redirect allowlist, Google client and production SMTP through protected runtime values; never commit credentials.
- [ ] Write tests for callback exchange/redirect safety, expiry/refresh/logout, invalid OTP, configured provider linking and cross-account isolation. Implement minimum Google/email UI after failing tests.
- [ ] Demonstrate database request and complete auth/session flow on intended hosting/domain. If Sites cannot support it, stop deployment and propose hosting alternative with evidence.
- [ ] Run unit tests, real database/API tests, type checking and Sites production build; independently review the whole branch per Native workflow, resolve findings and rerun affected checks.
- [ ] Prepare release with test-data reset procedure, privacy/legal review results, backup/alerts access and domain configuration. Present concrete cutover for approval; no automatic public launch or production reset.

## Execution checkpoint

The approved design is now translated into tasks. Owner review of this plan is the remaining workflow gate before Native implementation. Infrastructure setup is not yet available locally; the first task must establish the real test environment or return a precise blocker while independent work proceeds.
