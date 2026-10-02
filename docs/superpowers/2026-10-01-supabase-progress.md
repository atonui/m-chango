# Supabase release implementation progress

Plan: `docs/superpowers/plans/2026-10-01-m-chango-supabase-release.md`
Spec: `docs/superpowers/specs/2026-10-01-m-chango-supabase-release-design.md`
Branch: `feat/m-chango-supabase`
Development project: `ziamlejfurafauwuqcjk` (`m-chango-dev`, Purple Systems).

## Verified foundation

- Baseline and current domain unit suite: 52/52 passing.
- PostgreSQL tests first failed on missing foundation/create function, then passed after migrations.
- `supabase/tests/account_foundation.sql` verifies owner/foreign-owner isolation, anonymous denial, denied direct browser writes, amount bounds, owner/auth uniqueness, foreign keys and reserved references after removal. Fixtures roll back.
- `supabase/tests/create_fundraiser.sql` verifies creation with membership and attributable history, invalid-target rollback and anonymous denial. Fixtures roll back.
- Applied migration versions: `20261001182215_account_foundation`, `20261001182409_create_fundraiser`. Local migration copies use the exact versions returned by Supabase, not invented timestamps.
- Security advisor: only informational `rls_enabled_no_policy` on operations, intentionally denied to browser roles with no read grant. No warnings/errors reported by that advisor.

## Rulings and remaining work

- Work on an isolated release branch in the current checkout; no deployed pilot changes. The newly authorized development project provides real PostgreSQL testing while local Docker/CLI are unavailable.
- Store identical applied SQL with Supabase-returned migration versions. CLI-generated filename workflow is unavailable in this environment; do not rewrite the applied versions.
- Elevated writes live in the unexposed private schema with restricted grants and identity checks. Public RPC wrapper is security invoker.
- Task 1 is only partially complete: creation is atomic, but fresh-environment replay, county validation and full constraint tests remain. Task 2 has creation only; no contribution mutation RPCs yet.
- No app-to-Supabase wiring, user JWT/session verification, pagination UI, analytics collection, authentication, load test, recovery rehearsal or hosted auth compatibility claim yet.
- Next: edits/settings and Worker integration. Continue the plan without redoing these migrations.

## Contribution and public-read checkpoint

- Added `20261001183312_commit_contributions` and `20261001183611_public_reads`; exact remote versions preserved locally.
- Contribution commit and public-read tests failed first on absent functions, then passed against the real development PostgreSQL database.
- Contribution tests: identical replay returns original result without duplicate history, changed payload retry conflicts, stale version conflicts, conflicting reference rolls back the whole batch and version, foreign actor cannot replay/write.
- Import limits: 500 entries succeed with reconciled counters and audit; 501 entries, fractional minor units and excessive entry amount reject; total overflow rolls back entries; closed fundraisers reject additions.
- Public tests: summary counters, bounded keyset pages with timestamp/UUID ties, no duplicate page entry, hidden/global name privacy, no private phone/reference projection, oversized page rejection.
- Existing unit suite remains 52/52 passing; TypeScript check exits 0. Security advisor still only reports intentionally deny-all operations table informational notice.
- Canonical JSON payload is retained as the idempotency digest in private operational records for exact replay matching. It is not analytics. Retention/deletion must include these records.
- Multi-connection concurrency and JWT-backed HTTP checks remain unverified; SQL role/claim tests establish database policies, not the full app authentication flow.
- Task 2 remains partial: edits, removals/restoration and settings RPCs remain. Public-read pagination exists at the database boundary only; UI and full snapshot exports remain.

## Contribution changes checkpoint

- Applied `20261001184103_contribution_changes`, retained exact migration locally.
- New change test failed first on missing edit function, then passed on real PostgreSQL.
- Verified edit adjusts total, removal clears active counters, editing a removed entry does not affect total, restoration uses its corrected amount, stale edits conflict, missing entries reject and all four changes create actor history.
- Repeated remove/restore returns conflict rather than silently advancing version. Removed entries remain editable for correction.
- Settings, full exports, app integration and multi-connection concurrency tests remain next. No deployment or real authentication enabled.

## Settings and export checkpoint

- Applied `20261001184752_settings_export`, retained matching SQL locally.
- New test failed first on absent settings RPC, then passed after implementation.
- Verified settings update, closing, stale-version rejection, actor audit and owner-only complete active-entry export. Stable export functions read a single statement snapshot.
- Synchronous export rejects more than 5,000 active entries rather than truncating. Boundary-sized and concurrent export tests still required; do not claim these passed.
- Returned private snapshot remains server/owner data; CSV and WhatsApp must use existing projection/formatters rather than serialize private records directly.
- Unit suite 52/52 and TypeScript pass. Worker integration is not yet implemented. County and additional database input validation remain incomplete.

## Server API checkpoint

- Added request-scoped `SupabaseRpc` HTTPS transport and `/api/ledger` release API, separate from the working pilot endpoints.
- Release API covers public summary/pages, account creation, contribution/import commits, corrections/removal/restoration, settings and private snapshot/CSV exports. Uses existing domain validation and CSV formula protection.
- Missing production bindings return 503. Private operations require bearer tokens; actual token authorization is delegated to Supabase validation/RLS/RPC ownership. No local identity bypass or privileged service key introduced.
- Real local HTTP transport tests verify separate user Authorization headers and safe database-error messages. Handler tests verify missing identity, cross-origin write rejection and disabled legacy session exchange. Tests failed before modules existed, then passed.
- Unit suite 58/58; TypeScript exits 0. A test helper initially used the wrong Node overload type; corrected to RequestListener and rechecked.
- Hosted endpoint configuration, real JWT-backed end-to-end HTTP and compiled Worker verification remain unperformed. No publish/environment mutation.
- UI still calls pilot API. Account dashboard, private paginated reads and import preview/duplicate UX remain before switching clients. Full snapshot endpoint is for exports, not a replacement for paginated management reads.

## Dashboard checkpoint

- Applied `20261001190125_dashboard`; invoker/RLS query returns only owned records with bounded cursor pagination. SQL tests verify distinct pages and foreign-user empty results.
- Added `/api/account/fundraisers` and `/dashboard` with paginated fundraiser cards, amounts, status, update dates and loading/empty/error/refresh states.
- Unit dashboard RPC authorization test failed before adding the operation, then passed; total suite 59/59 and type check pass.
- Dashboard is an incomplete release screen: client session attachment, create/manage actions, public page switching, account-switch state tests and browser validation remain. Do not advertise dashboard as usable end to end yet.
- No production configuration or deployment changes. Next: real development-user session transport and account screen integration, private ledger paging and import review.

## Private paging checkpoint

- Applied `20261001190647_private_pages`; owner management reads include removed entries with global counters and bounded timestamp/UUID cursor pages.
- Initial automatic approval rejected the migration for relying on RLS without an explicit ownership predicate. Added `private.owns_fundraiser` alongside invoker/RLS restrictions; revised migration was accepted. No bypass used.
- SQL tests first failed on absent function, then passed for page bounds, distinct pages, global total and foreign-user denial.
- Added private-page RPC transport and GET management route. Authorization test failed before operation registration, then passed. Unit suite 60/60 and type check pass.
- Session attachment, management UI integration and import preview remain outstanding; no production publish.

## Import preview checkpoint

- Applied `20261001191013_import_preview`: owner-scoped duplicate flags for up to 500 parsed rows with indexed name/amount matching and reserved-reference lookup. Returns flags and ledger version rather than downloading ledger records.
- SQL tests failed on missing function, then passed for normalized name/amount matching, reference conflict, no private-record projection and foreign-user denial.
- Release preview API reuses WhatsApp/M-Pesa parsers and within-batch duplicate classification, then overlays database flags. Raw messages are not persisted.
- Private RPC test failed before registration then passed; suite 61/61 and type check pass.
- Session attachment and management/client integration remain. Full HTTP preview behavior and removed-reference preview tests remain to broaden; no end-to-end claim or deployment.

## Browser token transport checkpoint

- Added shared `requestAccessToken` to account/ledger APIs: explicit bearer takes precedence; exact `m_chango_access_token` cookie is the fallback. Duplicate cookies and malformed authorization fail closed.
- Token extraction is not authentication; Supabase still validates JWTs and database ownership. No cookie issuer, refresh flow or development identity bypass was added.
- New tests failed before helper existed, then passed. Suite 64/64 and type check pass.
- Reviewed legacy management component: it assumes a complete ledger for SharePanel and still exchanges secret links. Do not simply switch its API path, which would copy only a paginated page. Next integration must use complete snapshot sharing and remove account-mode capability prompts.
- Session issuance and real JWT-backed app tests remain unfinished. Dashboard can consume a validated cookie once the final authentication adapter issues it.

## Account management screen checkpoint

- Added `/dashboard/[publicId]` with paginated private entries, global totals, existing contribution/import forms, corrections/removal/restoration and CSV download against the release API.
- Complete WhatsApp SharePanel is populated only from the separate snapshot endpoint; page entries are never used as the full contributor list. Mutations/refetches clear the prepared snapshot.
- Dashboard cards now point to account management rather than the pilot public page.
- Unit suite 64/64, TypeScript and Sites production build passed. Real signed-in browser flow remains untested; this is not an end-to-end release claim.
- Account create/settings UI, session issuance, public page cutover and account-switch lifecycle tests remain. SharePanel's progress link still needs the public page cutover before release.
- No deployment or production environment mutation.

## Creation, settings, public UI and analytics validation checkpoint

- Added account creation and settings forms, dashboard creation navigation and management settings actions. Existing server validators handle money, phone, privacy and optimistic version fields.
- Added Supabase public route `/fundraisers/[publicId]` with bounded entry pages and 30-second visible-tab summary refresh; changed version reloads the first page. Account sharing points to this route rather than the pilot `/f` route.
- Public fetch generations reject out-of-order responses and clear entries on version change/error. Dedicated lifecycle/privacy browser tests remain required.
- Added strict analytics event/property allowlist with tests rejecting personal fields and unsupported names/counts. No analytics persistence or collection enabled; surveys/retention/deletion remain unimplemented.
- Unit suite 67/67, TypeScript and Sites production build passed. An initial JSX delimiter error was corrected before final verification.
- Direct unauthenticated HTTPS probe to development Supabase REST endpoint timed out after 5 seconds from this workspace. Native database-plugin SQL works. Direct app HTTP connectivity and session flow are therefore still unverified; do not claim production-host networking is blocked based on this probe alone.
- Release is still incomplete: authentication/SMTP/Google setup and platform auth confirmation, real-user-session tests, load/concurrency/recovery evidence, data lifecycle implementation and independent final review remain.

## Optional survey checkpoint

- Applied `20261001193806_surveys`, with private survey storage, restricted write RPC and admin-only feedback expiry.
- Database tests failed first on missing RPC, then passed: active fundraiser rejected, owner can submit/update one survey, foreign owner rejected, anonymous table access denied, feedback expiry clears only expired feedback.
- Added optional closing survey form and release API integration; feedback is limited to 2,000 characters, never analytics. Outcome remains organizer-reported.
- Feedback retention is 180 days. Expiry function is tested but not scheduled: operational scheduling must be verified before claiming automatic retention enforcement. Outcome retention/deletion follows future operational-data lifecycle controls.
- Unit suite 67/67 and type check pass. Session/browser/end-to-end tests and full release completion remain pending.

## Privacy choices and analytics storage checkpoint

- Applied `20261001194250_privacy_choices` and `20261001194420_analytics_storage`, exact remote versions copied locally.
- Separate research/marketing choices are private, versioned and actor-derived, with change history. SQL tests verify update, withdrawal, independent choices and denied anonymous access.
- Private product-event schema permits only approved event types and typed properties. Collection configuration defaults disabled; no browser INSERT grant or write RPC exists. Retention expiry is admin-only and tested at 90-day boundary using fixtures.
- Both tests failed on missing functions/tables before schema application, then passed in real PostgreSQL; test fixtures rolled back.
- Choices currently have database RPC only: notice UI/legal review remains. Event collection remains intentionally unavailable; expiry functions are not yet scheduled. Full export/deletion/session revocation controls remain to implement.
- Unit suite 67/67 and TypeScript pass. No production changes; authentication/network/load/recovery verification remains blocked or unfinished, not passed.

## Account controls and operational tooling

- Applied account_controls and account_controls_hardening (20261001195249, 20261001200034); exact migration copies retained. Private account export, notice-gated choices, and idempotent deletion-request status are available through the account API/UI. Deletion processing is still pending.
- Independent scoped review found direct-RPC notice bypass and unbounded additional export collections. Added database-disabled notice configuration, bounded limits for every exported collection, and actual stored deletion status. Regression test failed on bypass before correction, then passed against development PostgreSQL; privacy fixtures also passed and rolled back.
- Added guarded public-summary load harness and canonical export comparison helper. Guard/comparison fixtures verified; actual mixed workload and backup restoration are not performed.
- Unit tests 67/67 and TypeScript passed after SQL hardening. Retention scheduling, authentication, live session tests, production deployment, load and recovery evidence remain unfinished.
- Follow-up review identified missing configuration must fail closed. Applied 20261001200240_privacy_notice_fail_closed; missing-row opt-in regression passes. Production build passed. Scoped review found no other material issues; this does not replace full-release review.

## Lifecycle and test execution

- Applied exact migration 20261001200658_data_lifecycle. Admin-only bounded deletion worker, 5-minute cron, daily analytics/feedback/receipt expiry and 30-day cron-log cleanup installed. Deletion cron observed succeeded. First daily retention execution not yet observed.
- Missing-worker test failed first; worker then passed expanded linked-data/session deletion fixture and old-identity denial. SQL fixture rollback prevents actual test data retention.
- Four parallel dispatched server-side benchmark batches passed, 2,000 measured mixed RPC operations across 5,000-entry ledgers; timings and scope in operations doc. Logical transactional restore drill passed all seven tables exact equality. These are not HTTP capacity or independent backup restoration evidence.
- Workspace proxy CONNECT timeout blocks direct HTTP benchmark. Temporary 10-second destructive verification schedule was rejected by automatic approval review; abandoned in favor of authorized job history and rolled-back fixtures.
- Scoped independent review found no current sole-owner authorization/deletion flaw; requested expanded fixtures implemented and passed. Future shared-group support requires deletion redesign.
- Retention event and survey boundary SQL tests rerun and passed after scheduling. Unit suite 67/67, TypeScript, production build, and diff whitespace check passed. Deployed pilot remains unchanged.

## Authentication prerequisite investigation

- User requested authentication implementation. Read Sites authentication instructions and current Site metadata. External-provider auth path remains unconfirmed; platform auth_client_id is not proof of Supabase compatibility. The skill explicitly requires confirmation before implementation, so no auth scaffold was added.
- Recorded concrete routes, cookie/session guarantees, provider/SMTP configuration and tests in docs/operations/authentication-hosting.md. Need documented Sites support or owner authorization to change hosting. Pilot and database unchanged.

## Google/email authentication implementation

- Owner authorized standard Cloudflare Workers hosting. Ruling: use a separate Workers config/build entry rather than mutate Sites dispatch — avoids claiming unconfirmed external-auth support and preserves pilot.
- Installed exact @supabase/supabase-js 2.115.0 with lockfile. Latest 2.117.2 was rejected by dependency age policy; selected a mature version without bypassing policy.
- Implemented server-only Google PKCE, email OTP, refresh, global logout, account gate/navigation and exact-origin/CSRF/rate-limit checks. Cookies use __Host prefix, Secure, HttpOnly, SameSite=Lax. No user/session singleton or browser token store.
- Applied 20261001202743_active_sessions and 20261001204348_signin_profile; exact copies retained. Active auth.sessions enforced across private public RPCs and owner RLS; sign-in creates profile before first fundraiser. All 17 standard/rolled-back SQL fixture files passed with real synthetic auth.sessions; revoked-session and new-profile export regression passed.
- SDK PKCE custom storage initially failed test (persistSession=false ignores supplied adapter). Corrected to request-local session memory with a durable verifier adapter; actual challenge/verifier matching and cleared-state callback replay tests passed against mock HTTP.
- Independent whole-branch review found an expired-token public-read defect. Public RPCs now ignore account tokens; regression failed before fix then passed. Reviewer closed with no Critical/Important findings and independently ran 26 focused tests.
- 84 unit tests pass; TypeScript passes after correcting test JSON result types. Standalone Workers build passes. Compatibility date corrected to pinned runtime-supported May date after local startup rejection.
- Provider credentials/SMTP and actual hosted round trips remain unverified. Cloudflare CLI has no authenticated operator. Plugin discovery found no Cloudflare plugin; no production resources, email, or cutover performed.
- Local generated Worker smoke passed all five checks. Wrangler local HTTPS listener forwarded an HTTP upstream origin initially; diagnostic instrumentation confirmed this and was removed. Harness now specifies HTTPS upstream explicitly, preserving exact-origin and CSRF enforcement. Smoke is one process/network namespace with its disposable Worker; no real provider calls.
- Security advisor reports INFO only for intentional denied-all private/operations RLS tables without policies. No warning/error. Client build scan contains no Supabase URL/SDK or tokens. Final diff whitespace check passed. No provider or Cloudflare credentials committed.

## 2026-10-02 Railway preparation and live scheduler checks

User selected Railway application hosting; Supabase Auth/PostgreSQL remains the approved data architecture. Prepared separate Node Vite build, runtime environment adapter, build/start scripts, Railway process-health configuration and smoke harness. Account-release middleware blocks legacy routes without changing the pilot when ACCOUNT_RELEASE is unset. Node build, seven local Node smoke checks, TypeScript and all 84 unit tests passed. Native Supabase cron history confirms daily retention and cron-log retention succeeded on their first daily schedules, plus deletion processing succeeded at 04:00 UTC. Railway installation was confirmed by user, but no callable Railway tools appeared in this session's registry at the time of discovery. Deployment not claimed. Existing Workers throttling remains a fail-closed blocker for Node sign-in; both ready flags must stay zero until a durable Railway-compatible limiter is implemented and verified. See docs/operations/railway-release.md.

## 2026-10-02 Durable Railway throttle

Ruling: use Supabase PostgreSQL for temporary sign-in counters to avoid another infrastructure service. The cost if wrong is one indexed write/network round trip per auth attempt; measure hosted demand before replacing the adapter. Private server capability is distinct from service-role/organizer credentials. Only its SHA-256 digest persists in configuration; HMAC IP keys and counters expire after 60 seconds and cron cleans them in bounded batches every minute. Railway X-Real-IP is documented by the provider; the adapter requires a separate ingress-verification flag and never falls back to spoofed Workers headers. Native migration 20261002041114_auth_throttle applied. Failure observed before implementation (missing RPC / four red unit cases); four new tests now pass, entire suite 88/88, TypeScript and Node build/smoke pass. Native rollback fixture verified permissions, denial, 20-attempt cap, saturation, independent key, expiry reset and cleanup. Native security advisors INFO-only denied tables; performance advisors no findings. Live configuration stays empty, auth flags remain zero, no hosting/provider round trip claimed. Railway still has no callable tools in this session despite installation confirmation.

Final review: independent reviewer found one Important cleanup-performance defect; fixed in separate immutable migration 20261002041818_auth_throttle_indexed_cleanup. Before fix EXPLAIN showed volatile expiry Filter; after capturing cutoff once it shows expiry Index Cond. Native 10,001-expired-row fixture verified first cleanup deletes 10,000, second deletes one, and live counter survives. Cleanup cron succeeded at 04:19 UTC. Config and attempt tables both confirmed empty after rollback. Final TypeScript, full 88/88 unit suite, Node smoke seven checks passed; both Workers and Railway builds verified. Minor window terminology corrected to first-request-anchored fixed window; no stricter rolling-window claim. No remaining Critical/Important review findings after the verified correction. External configuration/provider round trips and Railway ingress trust remain unverified.

Additional transport hardening: a new test reproduced capability transmission to an HTTP endpoint (RED); the adapter now requires canonical HTTPS origin without credentials/path/query before any transport, test GREEN. Final suite updated to 89/89. No user/provider credentials generated or registered. Final post-fix advisors: security INFO-only intentional deny-all RLS tables, performance zero findings. Railway browser fallback must be approved because connector methods are still absent despite confirmed installation.
