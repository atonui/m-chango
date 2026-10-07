# M-Chango recovery notes

These notes are for MVP operations on Railway plus Supabase. They are not a substitute for a rehearsed disaster-recovery plan. Do not claim an RPO or RTO until an external backup restore has been tested.

## First response

1. Check `https://www.m-chango.com/api/health`.
2. Check `https://www.m-chango.com/api/health/ready`.
3. Check Railway deployment status, logs and recent deploy history.
4. Check Supabase project status, Auth logs, Postgres logs and cron job history.
5. Check DNS and certificate status only if the app is unreachable from browsers but Railway looks healthy.
6. Preserve evidence before changing anything: timestamps, affected URLs, screenshots and relevant sanitized log lines.

## If Railway is down

- Confirm whether the latest deploy failed or the platform is unhealthy.
- Roll back to the last known-good Railway deployment if a new deploy caused the issue.
- Keep Supabase untouched unless logs show database-side errors.
- After rollback, verify sign-in, create fundraiser, add contribution, public page and WhatsApp copy on a disposable fundraiser.
- Record the bad commit/deploy ID and the rollback deploy ID.

## If Supabase is down or degraded

- Do not run migrations during an outage.
- Check Supabase status and project logs.
- Expect `/api/health/ready` to report `degraded`.
- User-facing writes may fail with temporary ledger unavailable messages; do not ask users to retry repeatedly if Supabase is still degraded.
- Once service recovers, verify a disposable fundraiser write and public read.
- Review whether any queued deletion or retention jobs failed and rerun only with administrator review.

## If authentication fails

- Check Google OAuth provider status and callback URL.
- Check Resend/domain verification and Supabase email delivery logs for OTP failures.
- Confirm Railway environment variables:
  - `APP_ORIGIN`
  - `VINEXT_TRUSTED_HOSTS`
  - `GOOGLE_AUTH_READY`
  - `EMAIL_AUTH_READY`
  - `AUTH_THROTTLE_SECRET`
  - `RAILWAY_INGRESS_VERIFIED`
- Confirm Supabase Site URL and redirect allowlist match the live domain.
- Do not disable throttling to fix sign-in. Fix the root configuration or backend error.

## If data looks wrong

- Do not edit production rows manually as a first move.
- Export the affected account/fundraiser data where possible.
- Compare public totals, private ledger entries, history and CSV export.
- Check recent `commit_contributions`, edit/remove/restore actions and idempotency conflicts.
- If the issue follows an app deploy, roll back the app first before touching database data.
- If manual correction is unavoidable, write the exact SQL, have it reviewed and keep a before/after record.

## Backup and restore expectations

Current verified evidence includes SQL fixture restore checks and logical comparison helpers. That is not the same as a provider-level production restore.

Before claiming production recovery targets:

- Verify the Supabase plan's backup feature and retention period.
- Perform a restore into a separate environment.
- Reconcile profiles, fundraiser ownership, fundraisers, contributions, history, operations, privacy choices, analytics events and surveys.
- Verify Auth recovery separately; database table recovery is not the same as provider identity recovery.
- Confirm public reads, private dashboard access and account export after restore.

## Post-incident checklist

- Write a short incident note with date/time in Africa/Nairobi, user impact and duration.
- Record root cause or say explicitly that root cause is unknown.
- Record immediate fix and long-term prevention.
- Add or update a test, checklist item or alert when the incident shows a missing control.
- If personal data may have been affected, assess notification duties under the privacy policy and Kenyan data protection law.
