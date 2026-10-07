# M-Chango operational verification

The development Supabase project is `ziamlejfurafauwuqcjk`. The deployed pilot has not been switched. Never run seed/load/restore routines against production.

## Data controls

Account JSON export includes owned fundraiser records, contributions, audit history, purpose choices, surveys and associated events. Synchronous export refuses accounts above 50 fundraisers, 5,000 entries or 50,000 audit events. It is not a complete database backup; provider identities, all auth records and infrastructure configuration require separate operational backup.

Deletion queues an idempotent owner request. The administrator-only worker runs every five minutes and atomically deletes owned fundraisers, linked data, the profile and Auth user. Auth sessions/refresh tokens cascade; stale JWTs cannot resolve a profile or recreate it. Submission is not completed deletion. The worker is limited to the sole-owner model and fails rather than deletes foreign shared records. Anonymous completion receipts expire after 90 days. Backup expiry and lawful exceptions need the final privacy policy.

Privacy-choice UI remains disabled until `PRIVACY_NOTICE_READY=1` and the actual notice/lawful bases are reviewed. Product analytics collection is enabled for the approved allowlisted events only; do not add fields containing names, phone numbers, transaction references, fundraiser descriptions, raw messages or tokens.

Admin-only `private.expire_product_events()` clears expired 90-day event records. `private.expire_survey_feedback()` clears expired 180-day feedback. Both routines are scheduled daily at 00:15 UTC (03:15 Nairobi). M-Chango cron run logs expire after 30 days. The deletion schedule has an observed successful run; the first daily retention run has not yet occurred. Retention functions passed fixture boundary tests; never grant browser execution.

## Load and recovery tools

`scripts/load-test.mjs` performs public-summary reads only. It requires `MCHANGO_TEST_ENV=development`, matching `MCHANGO_TEST_ORIGIN`/`MCHANGO_ALLOWED_TEST_ORIGIN`, and synthetic `MCHANGO_TEST_PUBLIC_IDS`. Defaults: 100 concurrent readers, 900 seconds. Report only aggregate timings/statuses. Pass targets: p95 <1 second and errors <1%. This does not replace the planned mixed workload with writes/imports/exports or prove database capacity.

`scripts/compare-account-exports.mjs` compares JSON data before/after a restore with order-independent object/array canonicalization. It reports only match status, not personal data. It does not itself export a database, restore one or verify auth identity recovery. Full restore rehearsal must separately verify ownership, row counts, totals, history and access policies in a fresh environment.

## Monitoring and recovery

Use `/api/health` for process liveness and `/api/health/ready` for Supabase reachability. External monitors should alert on both; readiness failures mean users may see sign-in or ledger errors even when the app process is alive.

Use `docs/operations/admin-checklist.md` for daily, weekly and pre-launch checks. Use `docs/operations/recovery.md` for outage response, rollback, authentication failure and backup/restore notes.

## Remaining release gates

Working app-to-Supabase networking and real sessions; external authentication hosting support; Google OAuth and production SMTP; two-user end-to-end/browser tests; query plans and concurrent writers; mixed load report; backup plan and restore rehearsal; alert delivery/operator access; independent review. No passing claim for these gates exists yet.

Privacy opt-ins require both the application notice flag and private database notice configuration. The database defaults disabled; withdrawals remain allowed. Synchronous account exports cap fundraisers at 50, contributions at 5,000, and each history, survey, or event collection at 50,000 rows using bounded checks. Larger accounts need an assisted export.

## Development evidence — 2026-10-01

- Expanded deletion fixture passed: contributions, history, retry operations, privacy choices/history, survey, events, Auth sessions and refresh tokens removed; foreign organizer preserved; old identity denied creation; repeat worker returns zero. All fixtures rolled back.
- Four mixed server-side benchmark requests dispatched in parallel, each with a 5,000-entry synthetic ledger and 500 measured operations (400 summaries, 50 pages, 50 single-entry writes). Total 2,000 measured operations, no SQL errors. Worst per-run p95: summaries 0.111 ms, pages 0.893 ms, writes 1.787 ms. These exclude seed imports and network/connector latency. Tool dispatch does not prove sustained simultaneous database concurrency. This is not a 100-reader/15-minute release load test.
- Logical loss/restore drill restored seven fundraiser-linked tables with exact row equality, recovered totals, and measured 9.21 ms restoration for a tiny fixture. It uses temporary snapshots in the same transaction; it proves SQL restore order/data integrity, not external backup durability, PITR, Auth recovery, or disaster RTO/RPO.
- HTTP endpoint probe failed at proxy CONNECT after five seconds. Full HTTP load and independent-environment backup restoration remain release gates; no production capacity/recovery claim is made.
- Security advisor has only INFO denied-all RLS tables without policies (intentional private/operations tables): https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .
