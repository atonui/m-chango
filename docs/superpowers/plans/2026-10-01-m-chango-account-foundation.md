# M-Chango Account Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Execution method: Native, as previously selected.

**Goal:** Build organizer ownership, a multi-fundraiser dashboard and attributable ledger changes, testable locally before connecting real authentication.

**Architecture:** Retain React/Vinext, the Worker and D1. Add a server identity boundary and owner memberships; route account-owned resources through ownership checks. Keep the capability pilot operational for existing unowned records while account routes fail closed without a production identity adapter.

**Tech Stack:** TypeScript, React, D1/SQLite, Drizzle, Vitest, Miniflare/workerd.

**Spec:** `docs/superpowers/specs/2026-10-01-m-chango-account-foundation-design.md`

## Global Constraints

- Contributors need no accounts; preserve public projections and complete WhatsApp copying.
- Exactly one owner per fundraiser; no groups, invitations or additional roles.
- Internal UUIDs establish ownership; provider/subject pairs map identities; email does not authorize or automatically merge accounts.
- Authentication is connected last. No provider dependencies or production identity bypass in this phase.
- Local identity requires explicit configuration and verified local runtime; production rejects development mode.
- Preserve integer money, version guards, atomic batches and reference uniqueness.
- No production reset, migration application or deployment during this foundation phase.

## Review Focus

- A direct request bypassing the dashboard still cannot access another user's ledger.
- Retrying a previously committed request after switching users cannot disclose its result.
- A forged local hostname or identity header in production grants no access.
- Removed or closed records preserve their existing ledger semantics and attribution.
- Existing capability links cannot authorize a newly account-owned fundraiser.

## File Map

- `db/schema.ts`, generated `drizzle/*`: identity, membership and actor persistence.
- `app/lib/server/accounts.ts`: identity mapping, ownership and dashboard queries.
- `app/lib/server/identity.ts`, `app/lib/domain/account.ts`: identity boundary and types.
- `app/lib/server/auth.ts`, `handler.ts`, `repository.ts`: integrate authorization and transactional attribution.
- `app/api/account/[[...path]]/route.ts`: account identity and fundraiser-list endpoints.
- `app/dashboard/page.tsx`, `app/components/account-dashboard.tsx`: organizer fundraiser list.
- Existing create/management components: account-aware creation and management without capability recovery prompts.
- `vite.config.ts`, `scripts/check-account-mode.mjs`, `scripts/test-integration.mjs`: explicit local configuration and build safeguards.
- `tests/unit/accounts.test.ts`, `tests/integration/accounts.test.mjs`: identity/ownership and real Worker/D1 checks.

### Task 1: Persist identities and ownership atomically

**Interfaces:** `OrganizerIdentity={userId:string,displayName:string}`; `resolveProviderUser(db, provider:string, subject:string):Promise<OrganizerIdentity|null>`; `createOwnedFundraiser(db,input:FundraiserInput,userId:string):Promise<FundraiserRecord>`; `requireOwner(db,publicId:string,userId:string):Promise<{fundraiserId:string,recordVersion:number}>`.

- [ ] Write real D1 tests: duplicate provider/subject fails; duplicate owner fails; absent user FK fails; failed membership insertion leaves no fundraiser; user B's `requireOwner` returns 404 for user A's fundraiser.
- [ ] Run the new integration tests and confirm the missing schema/functions cause failure.
- [ ] Add users, userIdentities and fundraiserMembers, with foreign keys and unique owner per fundraiser. Add nullable actorUserId foreign keys to history and operations; retain historical null actors. Generate and inspect additive migration SQL.
- [ ] Implement interfaces in `accounts.ts`. Create fundraiser and membership in one batch; use an inaccessible random credential hash for owned fundraisers while the legacy schema requires it. Keep current test records unowned.
- [ ] Apply migrations only to local D1, run tests, and commit schema, migration and repository changes.

### Task 2: Resolve local identity safely

**Interfaces:** `resolveOrganizer(req:Request):Promise<OrganizerIdentity>`; `readIdentityMode(config:{localEnabled:boolean,runtimeLocal:boolean}):'local'|'disabled'`. Disabled mode returns 401; invalid local configuration fails closed. Production adapter will later implement the same resolved-user contract.

- [ ] Write unit tests asserting disabled mode cannot resolve a user, runtimeLocal=false rejects localEnabled=true, and host/header values alone cannot enable local identity.
- [ ] Run `npm run test:unit` and confirm new tests fail before implementation.
- [ ] Implement `identity.ts` and the configuration checker. Use explicit `MCHANGO_LOCAL_ACCOUNTS=1` only in the local launcher/test harness, with a separate runtime binding supplied by Miniflare local configuration. Production build rejects that environment setting and emits no enabled local binding.
- [ ] Seed two stable synthetic UUID users only in local setup. Accept only those users in a local HttpOnly SameSite cookie. Add same-origin local session switching at `/api/account/local-session`; production returns 404 for it. Never trust an arbitrary client user ID.
- [ ] Verify unknown user selection is rejected and spoofing local headers in a production-mode Worker leaves account endpoints inaccessible. Run unit tests and commit.

### Task 3: Enforce ownership and attribute every write

**Interfaces:** account authorization yields `{fundraiserId,recordVersion,actorUserId}`. Repository write functions accept a final `actorUserId:string|null`; owned writes require a non-null authorized actor. `listOwnedFundraisers(db,userId:string)` returns `{publicId,title,status,totalMinor,targetMinor,updatedAt}[]`.

- [ ] Write HTTP integration tests for user A creation and user B denial of private GET, export, import preview/commit, contribution add/edit/remove/restore and settings changes. Assert anonymous public GET still succeeds with no user, phone or reference fields.
- [ ] Add tests: owned resources reject legacy session/rotation endpoints; user B cannot replay user A's operation key; user A's identical replay returns the original result with no duplicate history. Assert each mutation and fundraiser creation records user A's ID atomically.
- [ ] Run the new tests and confirm authorization/attribution failures.
- [ ] Integrate identity and ownership checks into `auth.ts`/`handler.ts`: owned records always require account identity; unowned pilot records retain their capability authorization. Account creation uses atomic owned creation; no failed account check falls back to a capability. Keep same-origin enforcement.
- [ ] Pass actors to repository operations and history in the existing transactions, including bulk import history. Require the replay actor to match. Preserve legacy null-actor operations only for unowned records.
- [ ] Add `/api/account/me` and `/api/account/fundraisers` using the shared HTTP boundary and public-safe dashboard DTO. Aggregate active contributions without multiplying totals through joins.
- [ ] Verify closed-fundraiser rejection and remove/restore attribution, cross-account denial, replay behavior and existing ledger regression tests; commit.

### Task 4: Build the account dashboard and management path

**Interfaces:** dashboard consumes account/me and account/fundraisers; creation uses the existing fundraiser endpoint and returns the public ID without a capability URL in account mode. Management authorization follows Task 3.

- [ ] Write client-state tests for empty list, active/closed display and handling 401. Assert switching synthetic users clears the previous user's cached dashboard and management data before refetching.
- [ ] Run the focused Vitest file and confirm failures.
- [ ] Build `/dashboard` and `account-dashboard.tsx` with title, status, total, optional target, last update and create/open actions. Reuse existing visual styles and money formatting.
- [ ] Adapt create and management components to account mode: navigate to management after account creation; omit secret-saving and rotation flows there; retain them for the existing unowned pilot. Preserve sharing, WhatsApp copying and ledger forms.
- [ ] Add local-only identity selector backed by the guarded session endpoint. Expose no selector in production. Test dashboard states and inspect the available local preview; document any unavailable browser verification.
- [ ] Run unit tests and type checking, then commit.

### Task 5: Verify the foundation and document authentication handoff

- [ ] Extend `scripts/test-integration.mjs` to run existing ledger tests in pilot mode and account tests in explicitly local mode, disposing each runtime. Never enable local accounts by default for a production-mode Worker.
- [ ] Run `npm run test:unit`, `npx tsc --noEmit`, the Sites production build helper, and `npm run test:integration`; all must exit 0. Run a production-mode HTTP check that simulated credentials cannot authorize account routes.
- [ ] Confirm production build with `MCHANGO_LOCAL_ACCOUNTS=1` fails with a clear configuration error, then rebuild normally. Check generated Worker config contains no enabled local account binding.
- [ ] Update README with local development instructions, branch-only status and the unresolved production authentication handoff. Record actual verification evidence without claiming real sign-in works.
- [ ] Commit final changes and obtain the Native workflow's independent whole-branch review. Resolve material findings and rerun affected checks.
- [ ] Present the foundation for review. Next work is provider/platform validation and a separate Google/email adapter design; do not reset production data or deploy this branch automatically.
