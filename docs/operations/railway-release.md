# Railway account release

Railway hosts the Node application. Supabase continues to provide PostgreSQL and Auth. Cloudflare is not required for this deployment. This supersedes the Cloudflare account-release hosting instructions, not the original pilot.

## Prepared build

`pnpm run build:railway` builds using Vinext's Node runtime with a separate Vite configuration. `pnpm run start:railway` listens on Railway's injected PORT, on all interfaces. `railway.toml` selects these commands and `/api/health` as a process-liveness check. The liveness endpoint does not prove database connectivity; monitor `/api/health/ready` separately for Supabase reachability.

The Node build replaces the Workers environment import with runtime process environment. No D1 database is attached. ACCOUNT_RELEASE=1 rejects the old pilot API and management paths. Keep the account flag set in every Railway environment.

## Runtime variables

- ACCOUNT_RELEASE=1
- APP_ENV=production for Railway production; APP_ENV=staging for Railway staging. The admin panel uses this for the visible environment badge.
- SUPABASE_URL=https://ziamlejfurafauwuqcjk.supabase.co
- SUPABASE_PUBLISHABLE_KEY: the development project's publishable key, supplied through Railway variables
- APP_ORIGIN: exact HTTPS Railway development origin, no trailing slash
- VINEXT_TRUSTED_HOSTS: exact Railway development hostname; enables trusted proxy HTTPS reconstruction for Secure cookies and origin checks
- AUTH_THROTTLE_SECRET: random 32-byte value encoded as 64 lowercase hexadecimal characters; server-only
- RAILWAY_INGRESS_VERIFIED=0 until deployed ingress checks pass, then 1
- GOOGLE_AUTH_READY=0
- EMAIL_AUTH_READY=0
- PRIVACY_NOTICE_READY=0 until the published notice is reviewed
- RAILWAY_GIT_COMMIT_SHA: set when available from Railway or CI; if absent, admin deploy metadata shows no commit SHA rather than guessing

Never supply a Supabase service-role key to this application. Keep both auth-ready flags at zero for the first deployment.

## Remaining external configuration

1. Create/select a development Railway project and upload the approved account branch. Keep the purchased domains unchanged during testing.
2. Generate the HTTPS Railway domain and set APP_ORIGIN plus VINEXT_TRUSTED_HOSTS. Verify the platform overwrites forwarded protocol/host headers and that the service is reached through its trusted ingress before relying on those headers. Verify health, account homepage, disabled sign-in options and legacy-route rejection remotely.
3. Provision the prepared Supabase throttle: generate AUTH_THROTTLE_SECRET securely, store it only in Railway server variables, and register its SHA-256 digest in private.auth_throttle_config using an administrator connection. Never register a fixture token. Use the documented Railway X-Real-IP header; verify ingress overwrites spoofed values and direct access is excluded before RAILWAY_INGRESS_VERIFIED=1. The limiter atomically permits 20 attempts per IP key per fixed 60-second window starting with the first attempt, across all app instances. Raw IPs are HMAC-derived into opaque keys; expired counters are removed every minute in batches of 10,000. Missing configuration, invalid ingress or failed backend requests return 503; rate exhaustion returns 429. No service-role credential is needed by the app.
4. Configure Supabase Site URL to the development origin and allow the exact callback path `/auth/complete` (including its per-flow query). Configure Google OAuth with the Supabase callback `https://ziamlejfurafauwuqcjk.supabase.co/auth/v1/callback`.
5. Configure email delivery, OTP template and sending domain. Verify real delivery before EMAIL_AUTH_READY=1. Verify Google provider credentials before GOOGLE_AUTH_READY=1.
6. Test real Google and email sign-in, refresh, global logout, rejected revoked sessions, owner isolation, anonymous pages, contribution lifecycle and WhatsApp export. Use disposable test fundraisers and accounts.
7. Record hosted latency/error/load results separately from existing SQL benchmarks. Verify external alert delivery and recovery independently before launch.
8. Configure external monitoring against both `/api/health` and `/api/health/ready`. The first proves the process responds; the second proves required Supabase configuration and API reachability.

## Evidence, 2026-10-02

Node production build and seven local process checks passed. Existing 89 unit tests and TypeScript checks passed. Supabase's account-deletion job last succeeded at 04:00 UTC; daily retention succeeded at 00:15 UTC; cron-log cleanup succeeded at 00:30 UTC. No Railway deployment or real provider round trip has yet been verified.

## Throttle registration and operational limits

The private configuration table intentionally has no application read/write grants. Register a SHA-256 digest of the UTF-8 hexadecimal secret string, matching the Node transport. As administrator, upsert singleton=true and secret_hash=<digest>; supply the matching original string only to Railway. Rotate by replacing the digest and server variable together; starts fail closed during any mismatch. The digest grants no ability to read ledger data or impersonate organizers. Do not log request bodies on the throttle endpoint, because they contain the limited-purpose server token.

This is sign-in abuse throttling, not a claim of DDoS protection. Supabase Auth retains its own per-email/provider limits. IP-based limits can affect users sharing a connection. Each sign-in attempt adds one indexed database write and one network call; measure hosted latency/capacity before changing the architecture. The adapter limits the request to five seconds and follows no redirects. No account or fundraiser data is stored in the throttle table.

Database rollback fixtures passed for secret rejection, denied table reads, 20 allowed requests, subsequent denial, independent keys, expiry reset and cleanup. The configuration table remains empty after tests, so live sign-in remains disabled pending secure provisioning. Security advisors report INFO-only intentionally denied tables; performance advisors report no findings.

Final cleanup correction captures one cutoff before the query, producing an expiry-index range condition. The 10,001-row expired fixture verified the 10,000 deletion cap and live-counter preservation. Its minute cron succeeded at 04:19 UTC. The transport additionally rejects non-HTTPS/noncanonical endpoints before sending its capability. Final unit suite: 89 passed.
