# M-Chango admin checklist

Use this checklist before launch, after every deploy, and during the first weeks of real user testing. Keep evidence short: date, operator, result and any follow-up.

## Daily launch check

- Open `https://www.m-chango.com/` in a private browser window.
- Check liveness: `https://www.m-chango.com/api/health` returns `{"status":"ok"}`.
- Check readiness: `https://www.m-chango.com/api/health/ready` returns `status: ok`.
- Sign in with Google.
- Sign in with email OTP.
- Create a disposable fundraiser.
- Add one manual contribution.
- Paste/import a small contribution list.
- Open the public fundraiser page.
- Copy the WhatsApp contribution list.
- Confirm the privacy policy page loads and shows the current effective date.
- Confirm Railway logs show no repeated 5xx errors.
- Confirm Supabase Auth logs show no unexpected provider or OTP failures.

## Weekly operations check

- Review Railway deploy history and confirm the live deployment is the expected commit.
- Review Railway metrics for restart loops, memory pressure and sustained 5xx responses.
- Review Supabase Auth logs for unusual failure bursts.
- Review Supabase database logs for slow queries, function errors and cron failures.
- Check Supabase security advisors and performance advisors.
- Confirm scheduled jobs have recent successful runs:
  - `m-chango-account-deletion`
  - `m-chango-data-retention`
  - `m-chango-cron-log-retention`
  - `m-chango-auth-throttle-cleanup`
- Confirm analytics events are being recorded without sensitive fields.
- Confirm product-event retention still deletes expired records.
- Confirm account deletion requests, if any, are processed or deliberately pending.
- Confirm the latest available backup/export path is known and accessible to the operator.

## Pre-launch gate

- `pnpm run test:unit` passes.
- `pnpm run build:railway` passes.
- Real Google sign-in passes on the production domain.
- Real email OTP passes on the production domain.
- Create, record, import, edit, remove, restore, export CSV and close/reopen flows pass on a disposable fundraiser.
- Public page and WhatsApp copy work on mobile.
- `/api/health` is monitored externally.
- `/api/health/ready` is monitored externally.
- Alert destination is tested by the monitoring provider, not assumed.
- Supabase backup access is verified from the dashboard or plan-specific backup tool.
- Recovery notes have been read by the person who would operate recovery.
- DNS, Railway, Supabase, Resend, Google OAuth and GitHub access are held by the accountable operator.

## Alert thresholds for MVP

- Liveness endpoint down for 2 consecutive checks.
- Readiness endpoint down for 2 consecutive checks.
- Railway 5xx rate above 1% for 10 minutes.
- Supabase Auth error burst affecting sign-in.
- Supabase cron job failure for account deletion, retention or throttle cleanup.
- Database storage, bandwidth or compute approaching plan limits.

## Things not to log

- Raw WhatsApp paste text.
- Contributor phone numbers.
- Transaction references.
- Authentication codes, tokens or cookies.
- Full public or private fundraiser URLs containing sensitive parameters.
- CSV exports or account export payloads.
