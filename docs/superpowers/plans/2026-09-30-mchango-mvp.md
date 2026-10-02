# Mchango MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first fundraising ledger with reviewed message imports, private organizer access, and shareable live contribution pages.

**Architecture:** One Sites-hosted Vinext application uses server route handlers and managed D1 persistence. Pure domain modules handle money, validation, parsing, public projection, and export; a repository owns transactional SQL. Capability links authorize organizer actions without account registration, separately from the hosting audience restriction.

**Tech Stack:** TypeScript, React/Vinext, the bundled Shadcn components, Cloudflare D1, Drizzle schema/migrations, Web Crypto, Vitest, and local Worker HTTP integration checks. Preserve the starter's selected package manager, build plugin, and lockfile. Use Node >=22.13.0 as required by the starter.

**Spec:** `docs/superpowers/specs/2026-09-30-mchango-design.md` (approved by the user on 30 September 2026).

## Global Constraints

- English UI, KES only, Africa/Nairobi display times, one organizer credential per fundraiser.
- Title (3–120 characters); purpose up to 2,000 characters; contributor name (1–120 characters).
- Paste up to 50,000 characters and preview at most 500 candidate entries.
- Use integer minor units (1 KES = 100 cents); per-entry and target limit: KES 100,000,000; totals must remain within safe integer bounds.
- Management credentials use at least 256 bits of cryptographic randomness and are stored only as hashes.
- Name visibility defaults to hidden; per-entry hiding takes precedence.
- Recorded contributions are organizer-confirmed entries, not payments independently verified by Mchango.
- No real example names, phone numbers, or contributions are published as demo data.
- Raw pasted text is not persisted or logged; money continues going directly to the organizer.
- No payment processing, WhatsApp integration, AI provider, accounts, expenses, uploads, billing, or donor directory.
- Keep the initial hosted pilot owner-private until the user explicitly requests public launch.

## Review Focus

1. Unicode names and visually unusual separators must survive parsing/display/export without merging adjacent entries (Task 2).
2. A timed-out commit followed by a retry must not double count; same key with different data must fail (Tasks 3–4).
3. A fundraiser closed after preview must reject the subsequent import without partial writes (Task 3).
4. Two open fundraiser tabs must retain independent credentials and reject cross-fundraiser access (Tasks 4 and 7).
5. Polling/network errors and blocked clipboard access must preserve visible data and expose a working manual fallback (Tasks 6–7).

## Checkout, boundaries, and test commands

Create the Site checkout at `/workspace/sites/mchango` only after plan approval. The current scratch repository contains planning documents only; copy these two documents into the new checkout and commit them with the Site source. No independent task initializes or publishes a Site. The owner follows the Sites setup, preview, source synchronization, packaging, and hosting instructions.

Task 1 runs the absolute plugin helper `scripts/project-setup.mjs` from the empty checkout, then `scripts/install-dependencies.mjs`. The installed plugin root reported in this session is `/root/.codex/plugins/cache/openai-curated-remote/sites/0.1.75`; use its skill resources/current helpers if the execution session changes. Set logical D1 binding `DB` and unused R2 binding to null in `.openai/hosting.json`; do not hardcode physical resource IDs.

After the starter install succeeds, add Vitest only if absent, using the selected manager. Define `test:unit` as `vitest run tests/unit`, and `test:integration` as `node --test tests/integration/*.test.mjs`; commands below use npm script invocation, which does not replace the selected dependency manager. Integration tests hit the built local Worker at an explicitly supplied `TEST_BASE_URL` using fetch and cookie helpers, and exercise real migrated local D1 rather than a mocked database. Bind local preview only through the prescribed Sites preview controls; do not scan ports or install browser tooling preemptively.

Files and responsibilities:

| Files | Responsibility |
|---|---|
| `app/lib/domain/{types,money,validation}.ts` | Shared domain types and field validation |
| `app/lib/import/{whatsapp,mpesa,duplicates}.ts` | Pure parsing and duplicate classification |
| `db/schema.ts`, `drizzle/*`, `db/index.ts` | Schema, generated migrations, existing binding helper |
| `app/lib/server/{repository,auth,http,rate-limit}.ts` | Persistence, credentials, request checks, abuse limits |
| `app/lib/domain/{public-view,csv,summary}.ts` | Public projection and private export/share formatting |
| `app/api/fundraisers/**/route.ts` | Thin request handlers, validation and authorization |
| `app/page.tsx`, `app/components/create-fundraiser.tsx` | Landing/create and save-link acknowledgment |
| `app/manage/[publicId]/page.tsx`, `app/components/organizer-dashboard.tsx` | Fragment exchange and private management |
| `app/f/[publicId]/page.tsx`, `app/components/public-fundraiser.tsx` | Anonymous-compatible public page |
| `app/components/{contribution-form,import-review,share-panel}.tsx` | Focused organizer controls |
| `app/lib/client/{api,webmcp}.ts` | UI request helpers and page-scoped tools |
| `app/globals.css`, `app/layout.tsx`, `public/favicon.svg` | Theme, document metadata, custom icon |
| `tests/unit/*`, `tests/fixtures/*`, `tests/integration/*` | Domain fixtures and real Worker acceptance tests |

## Task 1: Validated creation and first product preview

**Files:** Create `app/lib/domain/types.ts`, `money.ts`, `validation.ts`, `tests/unit/domain.test.ts`, `app/components/create-fundraiser.tsx`; modify `app/page.tsx`, `app/layout.tsx`, `app/globals.css`, `public/favicon.svg`, `package.json`, `.openai/hosting.json`.

**Interfaces:** `parseKes(input: string): number`; `normalizeKenyanPhone(input: string): string`; `validateFundraiser(input: unknown): FundraiserInput`; `validateContribution(input: unknown): ContributionInput`. Validation throws `ValidationError` with field errors. Define `FundraiserInput`, `ContributionInput`, `FundraiserRecord`, `ContributionRecord`, `ImportCandidate`, `ParsePreview`, `PublicFundraiser`, `CommitResult`, and `DomainError` here. Money input is a decimal string at the HTTP boundary; validated records use integer `amountMinor`/`targetMinor`. Contribution input includes optional UTC `receivedAt`, reference and private phone, boolean `hideName`, and source enum `manual | whatsapp | mpesa`.

- [ ] Write failing `tests/unit/domain.test.ts`: `parseKes('1,030.00') === 103000`, `parseKes('529') === 52900`, `parseKes('100000000') === 10000000000`; reject `0`, `-1`, `1.001`, `1e3`, `100000001`, malformed separators. Normalize `0712123456` and `+254712123456` identically; reject foreign/incomplete numbers. Check exact title, purpose and name bounds.
- [ ] Run `npm run test:unit -- tests/unit/domain.test.ts`; verify failures identify missing domain behavior, not a broken test runner.
- [ ] Implement the domain signatures and the smallest recognizable Mchango creation surface. Use warm neutral/dark green shared tokens, product copy, real form labels and visible Create action; show payment-number-public disclosure and private-link explanation. No successful create state until Task 4 supplies the server endpoint. Replace starter title, description, icon, and placeholder content. Retain installed primitive components and Sites build integration.
- [ ] Run the domain test successfully, start the prescribed preview, fix blocking rendering errors, and hand off the first meaningful preview before adding the wider app. Check 390px layout and keyboard focus. Do not present an inert control as completed functionality.
- [ ] Commit the creation/domain slice and its passing tests with `feat: define validated fundraiser inputs and creation surface`.

## Task 2: Reviewed import parsing

**Files:** Create `app/lib/import/whatsapp.ts`, `mpesa.ts`, `duplicates.ts`, `tests/unit/import.test.ts`, `tests/fixtures/whatsapp-sample.txt`, `tests/fixtures/mpesa-received.txt`.

**Interfaces:** `parseWhatsApp(text: string): ParsePreview`; `parseMpesa(text: string): ParsePreview`; `classifyDuplicates(candidates: ImportCandidate[], existing: ContributionRecord[]): ImportCandidate[]`. A candidate has stable preview ID, editable validated fields, selection default, issues, and optional blocking error. Preview reports unrecognized segments separately. Name matching uses Unicode normalization, case folding and collapsed spacing without transliterating people into one identity.

- [ ] Write failing parser tests using the supplied sample: `rows.length === 32`, sum `amountMinor === 4165900`; retain KES 10,100, 1,030 and 529 and entries on one line. Test `1. Amina — KES 1,000 2. José - ksh 529` produces two separate names. Check headers/totals aren't entries and missing receipt times remain null. Check 50,001 characters and 501 entries are rejected without truncation.
- [ ] Add received-message fixtures for date/time and whitespace variants: extract uppercase reference, correct amount and UTC time from Nairobi input. Assert sent, withdrawal, failed, reversed, pledge, malformed and unfamiliar messages are blocked/flagged and cannot automatically save. Duplicate references are blocked; matching name/amount pairs are unselected warnings that can be overridden; removed referenced entries still count as exact-reference conflicts.
- [ ] Run `npm run test:unit -- tests/unit/import.test.ts` and confirm the tests fail on absent parser behavior.
- [ ] Implement the three signatures with bounded deterministic scans. Never guess missing payment dates or silently consume unparsed text; use domain validation from Task 1. Run the same command and confirm all assertions pass.
- [ ] Commit `feat: parse fundraising lists and received M-Pesa messages for review`.

## Task 3: Durable, atomic ledger repository

**Files:** Modify `db/schema.ts`; create generated `drizzle/*`, `app/lib/server/repository.ts`, `tests/integration/ledger.test.mjs`, `tests/integration/helpers.mjs`.

**Interfaces:** `createFundraiser(db, input, credentialHash): Promise<FundraiserRecord>`; `getPrivateLedger(db, publicId): Promise<PrivateLedger | null>`; `getPublicLedger(db, publicId): Promise<PublicFundraiser | null>`; `commitContributions(db, fundraiserId, {key, digest, expectedVersion, rows}): Promise<CommitResult>`; `editContribution(db, fundraiserId, entryId, input, expectedVersion): Promise<void>`; `setContributionRemoved(db, fundraiserId, entryId, removed, expectedVersion): Promise<void>`; `updateFundraiser(db, fundraiserId, input, expectedVersion): Promise<void>`. Define `PrivateLedger` as private fundraiser/entry data excluding credential hashes. Creation returns no hash to consumers except the internal auth accessor.

- [ ] Write failing Worker integration cases (enabled after Task 4 wires handlers): refresh preserves rows, totals sum active entries exactly, repeated reference including removed entries fails, unrelated fundraisers may use the same reference, edit/remove/restore updates totals, and closing after preview rejects commit. Idempotent replay returns the same entry IDs; changed payload under the same key returns 409; simultaneous conflicting commits never partially save. Entry and fundraiser stale versions return 409, and rejected writes create no history.
- [ ] Define fundraiser, contributions, mutation history and operation/import receipt tables. Add unique public ID, unique `(fundraiser_id, transaction_reference)` including removed rows, unique `(fundraiser_id, idempotency_key)`, and query indexes on fundraiser entries/history. Extend import receipt infrastructure to also cover manual-add retries. Include integer amount bounds and source/status constraints. Generate and inspect schema-only Drizzle migrations with `npm run db:generate`.
- [ ] Implement prepared SQL and a single transactional D1 `batch()` for each multi-statement mutation. First statement inserts a unique operation guard with `CHECK(precondition_ok = 1)` derived from authoritative fundraiser state/version; subsequent statements write rows/history/operation result and increment version. Constraint failure rolls back the whole batch. For a race/replay, read the existing completed operation and compare digest; do not mistake a different constraint failure for a successful replay. Same-key/different-payload returns 409. Select/update row scope includes fundraiser ID. Apply guarded batches to edits, remove/restore, closure and rotation; no partial audit writes or unchecked read-then-write updates.
- [ ] Build to generate local Worker configuration, apply each pending generated migration in order using the starter's local D1 command and `.wrangler/state`, and run the ledger integration suite once routes exist. Exact command: `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file <generated-migration>`. Check active-entry lookups use the intended index with `EXPLAIN QUERY PLAN`. Do not replay already-applied migrations.
- [ ] Commit schema, SQL, repository and tests with `feat: persist an atomic contribution ledger` after the Task 4 integration gate passes; do not claim repository verification before routes exist.

## Task 4: Private links and authorized server interfaces

**Files:** Create `app/lib/server/auth.ts`, `http.ts`, `rate-limit.ts`, `tests/unit/auth.test.ts`, `tests/integration/security.test.mjs`; create handlers listed below. Add schema-only rate-limit migration if needed.

**Interfaces:** `generateCredential(): string` (32 random bytes, base64url); `hashCredential(token: string): Promise<string>`; `requireOrganizer(request: Request, publicId: string): Promise<OrganizerContext>`; `assertSameOrigin(request: Request): void`; `rotateCredential(db, organizer, expectedVersion): Promise<{managementLink: string}>`. Organizer context carries server-resolved fundraiser ID/version. Use a fundraiser-scoped HttpOnly session cookie containing the opaque credential; check its hash against current stored hash on every private request. Rotation changes hash and credential version, immediately invalidating old links/cookies. Do not use client-readable storage for tokens. Limit cookie scope to that fundraiser's management API prefix and do not set it on public requests.

HTTP contract (JSON unless CSV):

| Method/path | Input/result |
|---|---|
| `POST /api/fundraisers` | Validated creation → 201 `{publicId, publicLink, managementLink}` |
| `GET /api/fundraisers/[publicId]` | Allowlisted public view, no session required |
| `POST /api/fundraisers/[publicId]/manage/session` | `{credential}` → set scoped cookie; no credential echo |
| `GET/PATCH /api/fundraisers/[publicId]/manage` | Private ledger / validated settings+expectedVersion |
| `POST /api/fundraisers/[publicId]/manage/contributions` | Manual confirmed row+idempotencyKey+expectedVersion → commit result |
| `PATCH /api/fundraisers/[publicId]/manage/contributions/[entryId]` | Edit, remove or restore + expectedVersion |
| `POST /api/fundraisers/[publicId]/manage/preview` | `{kind, text}` → reviewed candidates/issues |
| `POST /api/fundraisers/[publicId]/manage/import` | Selected corrected rows+confirmedReceived+key+expectedVersion → atomic result |
| `GET /api/fundraisers/[publicId]/manage/export` | Private active-entry CSV |
| `POST /api/fundraisers/[publicId]/manage/rotate` | expectedVersion → replacement private link/session |

- [ ] Write failing auth tests: 32-byte entropy, wrong/missing tokens, no token in URLs outside fragment, same-origin checks. Integration tests assert missing/wrong/cross-fundraiser credentials get 401/403; cross-site or missing-Origin mutations fail; stale versions return 409; invalid input 422; unknown IDs 404; oversized bodies 413; raw messages and hashes never appear in successful/error public output. Replaying confirmed commit returns original result. Creation limits: 10 per ten-minute window per client; session exchange: 30 per ten-minute window per client and fundraiser; excess requests return 429.
- [ ] Run `npm run test:unit -- tests/unit/auth.test.ts`; then run the security tests against the minimal handlers to confirm failures expose missing authorization/behavior.
- [ ] Implement handlers using Task 1 validation, Task 2 preview and Task 3 persistence. Bound JSON request bodies to 256 KiB; preview text and row limits still apply. On import revalidate every selected row, reference uniqueness and required receipt confirmation; server computes digest and totals. Use durable atomic counters with expiry for rate limits, trusted runtime client-IP data when available, and a documented coarse limit when unavailable; do not trust arbitrary forwarded headers. Use relative links/same-origin app navigation rather than constructing origins from untrusted forwarded hosts.
- [ ] Set private response/page `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, Secure/HttpOnly/SameSite=Strict cookies (localhost exception only). Preserve input on unavailable storage via explicit 503 errors; log only redacted error categories. Run `npm run test:unit` and `npm run test:integration` against the migrated built local Worker. Require Tasks 3–4 suites to pass before moving to organizer flows.
- [ ] Commit `feat: authorize organizer actions with private capability links`.

## Task 5: Public privacy projection, sharing and CSV

**Files:** Create `app/lib/domain/public-view.ts`, `csv.ts`, `summary.ts`, `tests/unit/presentation.test.ts`; wire projection and CSV handlers from Task 4.

**Interfaces:** `toPublicFundraiser(ledger: PrivateLedger): PublicFundraiser`; `ledgerCsv(ledger: PrivateLedger): string`; `whatsAppSummary(view: PublicFundraiser, publicLink: string): string`. Public view is an explicit allowlist: public ID, title/purpose/payment number, status, totalMinor, entryCount, targetMinor, updatedAt and public entry name/amount/date fields. No spreads of private database records.

- [ ] Write failing tests for default Anonymous names and per-entry hiding override, no phones/references/hashes/history, total exceeding target with progress capped at 100%, no target, and repeated names counting entries rather than people. CSV excludes private phone, quotes comma/newline/Unicode correctly, and prefixes dangerous formula text (`=`, `+`, `-`, `@`, or control/whitespace-prefixed formula) without changing numeric amounts. WhatsApp summary has only public link and accurate totals.
- [ ] Run `npm run test:unit -- tests/unit/presentation.test.ts` and confirm failures.
- [ ] Implement the three functions and wire public GET/CSV to them; timestamps display Nairobi time, missing received times say Recorded at. Neutralize formula fields before CSV quoting. Use noindex on fundraiser pages and never add a public directory.
- [ ] Rerun unit tests and integration privacy/export checks; exported amounts sum to the displayed active-entry total.
- [ ] Commit `feat: expose private-safe public progress and ledger exports`.

## Task 6: Complete organizer workflow

**Files:** Create `app/manage/[publicId]/page.tsx`, `app/components/organizer-dashboard.tsx`, `contribution-form.tsx`, `import-review.tsx`, `share-panel.tsx`, `app/lib/client/api.ts`; finish `create-fundraiser.tsx`; create `tests/unit/client-state.test.ts` and `tests/integration/journey.test.mjs`.

**Interfaces:** `apiJson<T>(path: string, init?: RequestInit): Promise<T>` returns structured errors without clearing form state. Components consume the private/public types and endpoint contract already defined. `buildImportCommit(review, key, expectedVersion)` returns selected corrected structured rows only, never raw text. `sharePublicSummary(text)` uses native share, clipboard, then a selectable text fallback.

- [ ] Write failing state/journey checks: creation returns two separate links; dashboard requires save-link acknowledgment; preview produces zero writes; only selected confirmed valid rows commit; matching pairs remain unselected by default; interrupted retry reuses the operation key; success clears raw text but failure keeps the draft. Check unsupported clipboard exposes selectable public summary and never the management link.
- [ ] Run `npm run test:unit -- tests/unit/client-state.test.ts` and the journey integration test; verify expected failures.
- [ ] Implement fragment read → same-origin exchange → immediate `history.replaceState` cleanup before loading private data. Keep the saved private link only in transient UI during creation/rotation and provide copy/download-as-text UI only if needed to save the link, without storing it in browser persistence. Complete validated manual entry/edit/remove/restore, reviewed list/message imports, settings, close/reopen, CSV, separate link copy controls and rotation acknowledgment. Use installed dialog/alert-dialog/table/checkbox/progress/sonner primitives where semantically matched. Do not render secret hashes or expose raw paste to tools.
- [ ] Verify successful create/add/import and failed saves at phone and desktop sizes. Preserve form values on 409/503; conflicts offer refresh/review rather than discarding input or automatic overwrite. Closed state blocks additions but allows corrections/export. Run the state/journey suites successfully.
- [ ] Commit `feat: complete the organizer contribution workflow`.

## Task 7: Live contributor page and final browser checks

**Files:** Create `app/f/[publicId]/page.tsx`, `app/components/public-fundraiser.tsx`, `app/lib/client/webmcp.ts`, `tests/unit/public-state.test.ts`; extend `tests/integration/journey.test.mjs`.

**Interfaces:** Public component fetches the allowlisted public endpoint; 15-second visible-tab refresh with cleanup, no concurrent fetch buildup, last-known data preserved on failure, and explicit Refresh. Browser tools: `get_fundraiser_summary` (read-only public data), `stage_contribution` (fills an authorized organizer form without saving), and `stage_import` (opens an authorized preview without committing). Tools feature-detect `document.modelContext`, register once and clean up with AbortSignal; no complete-payment or automatic-confirmation tool.

- [ ] Write failing tests for polling failure retaining totals, successful refresh adopting updates, cleanup stopping refresh, absent target, closed state, two independent fundraiser credential cookies, and cross-fundraiser requests failing. Test WebMCP input validation using the same staging actions as the visible UI; malformed stage input cannot write records.
- [ ] Run the targeted state tests and journey/security suites and confirm expected failures before implementation.
- [ ] Implement the readable mobile ledger, recorded-by-organizer/payment-direct copy, no-account viewing, target/remaining/above-target states, public summary and fallback sharing. Finish metadata, responsive layout, loading/empty/errors and accessible labels; remove unused starter examples/placeholders. Add minimal browser tools without third-party scripts or exposing private data.
- [ ] Use the supported Site preview/browser context for create → save link → import → public view → refresh → export. Inspect public HTML/network responses, keyboard navigation, 390px and desktop layout, blocked clipboard, failed network, closure and rotation in two tabs. Validate WebMCP state read-back if supported; otherwise report validation unavailable without blocking the unrequested capability. Run all automated suites successfully.
- [ ] Commit `feat: deliver live fundraiser sharing and accessible mobile flows`.

## Task 8: Review, build and private pilot delivery

**Files:** Update `README.md` with operating steps, link-loss limitation, development/migration instructions and pilot audience; retain generated migrations and hosting metadata. Remove test data from production source surfaces; test fixtures remain private source only.

**Interfaces:** The deployable Worker must export a default object with callable `fetch(request, env, ctx)`; logical D1 binding and generated migration metadata travel with the saved source. Preserve the single Site ID and audience throughout source sync/deploy.

- [ ] Conduct spec coverage/code review using the execution method the user selects. Review monetary accuracy, atomicity, authorization, secret leakage, duplicate parsing, no fake verification, and migration correctness; fix material findings and rerun only affected tests plus final required checks.
- [ ] Run `npm run test:unit` and `npm run test:integration` against the built migrated local Worker; run the required production build through Sites hosting workflow, reusing successful build results when source is unchanged. Do not run unrequested lint or repeatedly broaden tests without a new concern.
- [ ] Inspect Worker export and new migration SQL; ensure schema-only migrations are bounded, metadata matches, and physical IDs/secrets/runtime state are absent from source. Push the exact tested source and package its build through Sites hosting helpers. No separate deployment approval is needed for the authorized owner-private pilot.
- [ ] Save/deploy the exact pushed commit and inspect terminal deployment status. Verify hosted creation, confirmed contribution, refresh persistence and public projection while respecting owner-private host access; use only supported authenticated access and do not change audience to bypass a failed check.
- [ ] Deliver the private pilot link with completed features, tested evidence and limitations. Explicitly state that external WhatsApp sharing requires a public launch decision, and that contributions are organizer-confirmed. Do not describe the app as built, deployed or verified until those checks actually succeed.

## Plan review and execution handoff

Self-review coverage: Tasks 1/6 implement creation and management; Tasks 2/3/4 cover reviewed imports and atomic duplicate handling; Tasks 4/5 protect private data; Tasks 5/7 implement public sharing/export; Tasks 6/7 cover mobile resilience; Task 8 covers migrations, review and deployment. All five Review Focus items have owning tests. Domain signatures and HTTP paths are shared across tasks; no third-party payment/WhatsApp/AI subsystem is introduced.

Recommended execution: Native, with this agent implementing the eight dependent tasks in this session and one independent whole-branch review before delivery. Subagent-driven execution is also available, with per-task implementation/review, at greater context cost. Wait for user plan review and method selection before setup or product implementation.
