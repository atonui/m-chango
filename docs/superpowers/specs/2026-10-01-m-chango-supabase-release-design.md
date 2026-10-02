# M-Chango Supabase release design

## Scope and intended outcome

Replace the pilot's D1 persistence and secret management links with Supabase PostgreSQL and organizer accounts. Individuals manage multiple occasional fundraisers. Contributors remain account-free. Preserve imports, corrections, removal/restoration, privacy, full WhatsApp copying and CSV export. No group invitations, payment processing or donor profiling.

This supersedes the D1 account foundation design and plan. Implement natively on an isolated branch. Develop against real local PostgreSQL/Supabase with two synthetic identities; connect Google and email sign-in last. Keep the current deployed pilot intact until release verification completes. Existing records are test data: no claiming or historical migration is required.

## Hosting verification prerequisite

The application remains a Worker-compatible React/Vinext app. Access Supabase through HTTPS APIs, using PostgreSQL RPC functions for transactional operations. Sites supports protected environment values, but external sign-in compatibility is not yet established. Before production cutover, confirm the platform-supported external auth path and demonstrate a database request and complete callback/session round trip on the intended domain. Use `/auth/complete`, avoiding the Sites-owned `/callback` path.

If Sites cannot support that flow, report the evidence and propose another host for approval rather than quietly changing providers. A Supabase project, runtime configuration and email/Google provider configuration are setup prerequisites; no cloud resources or paid subscriptions are assumed to exist.

## Schema and identity

Use versioned SQL migrations under `supabase/migrations`. Create profiles with an internal UUID and a unique mapping to the Supabase Auth subject. Email never determines ownership. Create fundraiser memberships supporting exactly one owner per fundraiser; additional roles remain excluded.

Store fundraisers, contributions, mutation operations and history with UUIDs, timestamps and explicit foreign keys. Amounts remain integer minor units with the current per-entry/target maximum of 10,000,000,000 minor units. Bound totals to JavaScript safe integer range before serialization. Separate recorded timestamps from organizer-reported payment timestamps. Reserve transaction references even after removal.

Optional fundraiser category uses `medical`, `education`, `bereavement`, `community`, `other` or null. Optional county uses an explicit Kenyan county list. Do not infer categories or locations from free text. Mark all contributions as organizer-recorded, not independently verified payments.

## Authorization and writes

Use verified Supabase sessions on the server and a per-request user-scoped Supabase client. Derive actors from the validated identity, never an arbitrary request field. Enable RLS on all exposed private tables; policies constrain reads to owners. Deny direct ledger-table mutations to browser roles and expose narrowly granted transactional mutation functions instead.

Each mutation RPC checks ownership, validates input, locks the fundraiser row, checks expected version, applies changes, records actor history and updates totals/count/version atomically. Where elevated function privileges are needed, use an empty search path, qualified relations, restricted execute grants and explicit `auth.uid()` ownership checks. Public and unauthenticated callers cannot execute private mutations.

Creation inserts the fundraiser, owner membership and creation history in one transaction. Import supports 1–500 validated rows. Replay keys are scoped to fundraiser and actor; identical input returns the committed result, changed input conflicts. Authorization precedes replay lookup. Errors roll back the full operation. Settings and contribution mutations retain optimistic conflict responses.

Legacy capability sessions and rotation do not authorize Supabase fundraisers. The deployed pilot remains separate; the new release does not maintain dual writes or fallback authorization.

## Public data and pagination

Anonymous users access only narrowly defined public projection functions, never unrestricted private tables. Projections omit owner identity, private phone, references, removed entries and hidden names. Global and per-entry name controls apply on the server.

Ledger pages use keyset cursors with timestamp and UUID tie-breaker, default 50 and maximum 100 rows. Dashboard pages default 20 and maximum 50. Public summaries contain total, count and version so unchanged refreshes avoid fetching ledger pages; use a 30-second refresh while visible, pausing when hidden. No public cache may outlive a privacy change without invalidation.

Store total and active-entry count transactionally on the fundraiser to avoid summing its full ledger for every progress view. Restore/edit/remove operations update these values under the same row lock. Tests reconcile cached totals against contribution sums.

Copying a full WhatsApp list and CSV export uses all active contributions from one consistent database snapshot, not only the displayed page. Cap synchronous full-list generation at 5,000 entries with a clear user-facing size message; larger full exports require a separately designed background workflow before support is advertised. The cap must never silently truncate output.

## Organizer experience and authentication last

Add My fundraisers with title, status, total, optional target, last update and create/open actions. Keep active and closed fundraisers accessible. Retain the existing management editor and sharing features; remove secret-saving and rotation prompts from the new account flow.

Local development provides two synthetic Supabase users and guarded session switching. Use local Supabase auth tokens so RLS tests exercise real identity behavior. Local shortcuts require explicit configuration plus a verified local runtime, fail closed in production, and never accept production identities from client-controlled headers.

Finally connect Google and passwordless email one-time-code sign-in through Supabase Auth. Use server-side cookie session handling and PKCE for OAuth, restricted callback redirects and verified identity checks. Test sign-out, expiry, refresh and recovery. Do not automatically merge accounts by email in application code; test and document Supabase's configured provider-linking behavior. Configure production SMTP before enabling general email sign-in.

## Analytics and optional surveys

Keep analytics in a separate private schema, inaccessible to anonymous/browser queries. Allowed events: `fundraiser_created`, `import_completed`, `contribution_list_copied`, `fundraiser_closed`. Properties are limited to event ID, timestamp, event name, pseudonymous organizer/fundraiser IDs when necessary, import source and row count. No free-text properties, descriptions, names, emails, phone numbers, references, pasted messages or tokens. Server events fire after successful commit; deduplicate by operation/event ID. A copy event means clipboard success, not message delivery.

Allow an optional closing survey with outcome `achieved`, `partly_achieved`, `not_achieved`, `prefer_not_to_say`; keep optional feedback private and out of telemetry. Separate research/marketing choices from essential service use. Record purpose/notice version and choice changes. Optional analytics stays off until its lawful basis, notice and deletion behavior are validated.

Proposed retention defaults: product events 90 days, sanitized reliability logs 30 days and optional feedback 180 days. Operational data remains while the organizer maintains the account/fundraiser; offer deletion with defined exceptions reviewed before launch. Deletion removes or irreversibly anonymizes linked analytics and survey data; document backup expiry rather than promise instant backup erasure. No indefinite personal-data warehouse.

No external benchmark publication in this release. Future aggregate outputs require at least 20 distinct organizers per cohort and re-identification review; that threshold alone is not proof of anonymity. Report findings as M-Chango-user patterns.

## Operations and acceptance evidence

Index membership lookups, dashboard ordering, fundraiser/contribution cursors, references, operations and history. Inspect representative query plans on seeded data. Capture sanitized route templates, latency, status, RPC duration and error codes without request bodies, identifying URLs or credentials. Establish actionable alerts and confirm who can access them before launch.

Initial load-test target: 10,000 synthetic fundraisers and 1,000,000 contributions; 100 concurrent public viewers and 10 concurrent organizers, including a 500-row import and a 5,000-entry export. Run a 15-minute mixed workload against a non-production environment. Target p95 summary/page reads under 1 second, ordinary writes under 2 seconds and unexpected errors below 1%; report test region and resources. These are acceptance targets, not advertised capacity guarantees. Verify no duplicate saves, lost updates or cross-account disclosure.

Test migration from an empty database, export and restore into a separate environment, and reconcile IDs, ownership, totals, history and row counts. Proposed recovery targets are no more than 24 hours of lost data and restoration within 4 hours; select a backup plan and rehearse before claiming those targets. Verify plan-specific backup access and cost; do not assume the free plan is production recovery coverage.

Launch gates include RLS and cross-account tests, transactional rollback/concurrency tests, existing money/import/privacy regression tests, pagination and full-copy tests, real auth and SMTP tests, production shortcut rejection, type checking, build, load evidence, recovery rehearsal and hosting compatibility. Assess Kenyan data protection obligations, sensitive fundraiser content, international transfers, retention and user rights before enabling real-user collection. User approval is needed for the final production cutover/public launch, which is separate from this local build.

## Delivery sequence

1. PostgreSQL schema, ownership policies and transactional ledger RPCs, tested locally.
2. Server repository/API integration, dashboard, pagination and complete sharing/export.
3. Minimal analytics, optional survey and operational instrumentation behind appropriate enablement gates.
4. Index/query review, load test and export/restore rehearsal.
5. Real Google/email authentication and hosted compatibility validation, then production preparation.
