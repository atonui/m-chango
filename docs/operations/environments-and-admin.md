# M-Chango environments and admin rollout

M-Chango production runs on Railway for the app and Supabase for Auth/Postgres. Keep development, staging and production separated by environment variables and Supabase project/branch identity; do not point local experiments at production unless the task is explicitly a production verification.

## Environment model

| Environment | App host | Supabase target | `APP_ENV` | Purpose |
| --- | --- | --- | --- | --- |
| Local | Local dev server | Dev Supabase project or branch | `development` | Fast feature work and unit tests |
| Staging | Railway staging environment | Supabase branch or disposable project | `staging` | Migration rehearsal and live-domain smoke tests |
| Production | Railway production environment | Production Supabase project | `production` | Real users and real fundraiser data |

Required app variables stay the same in every environment, but values must belong to that environment:

- `ACCOUNT_RELEASE=1`
- `APP_ENV`
- `APP_ORIGIN`
- `VINEXT_TRUSTED_HOSTS`
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `AUTH_THROTTLE_SECRET`
- `RAILWAY_INGRESS_VERIFIED`
- `GOOGLE_AUTH_READY`
- `EMAIL_AUTH_READY`
- `PRIVACY_NOTICE_READY`
- `RAILWAY_GIT_COMMIT_SHA` when Railway or CI exposes it

Never put a Supabase service-role key in Railway app variables.

## Admin migration order

Apply these migrations in order after the existing account-release migrations:

1. `20261008100500_admin_foundation.sql`
2. `20261008103000_admin_overview_totals.sql`
3. `20261008104500_admin_read_models.sql`
4. `20261008110000_admin_operations.sql`

After applying them, run Supabase security and performance advisors. The known private-table RLS warnings are acceptable only when the table has no direct grants to `anon` or `authenticated` and access is through reviewed functions.

## First admin owner

Create the first admin only after the person has signed in once and has a `public.profiles` row. Use an administrator SQL session:

```sql
insert into private.admin_users(user_id, role)
select id, 'owner'
from public.profiles
where auth_subject = '<supabase-auth-user-uuid>'
on conflict (user_id) do update
set role = excluded.role,
    disabled_at = null;
```

Use the Supabase Auth user UUID, not an email address. Record who approved the admin grant and when. For support or analyst roles later, add separate role-specific UI and tests before granting access.

## Post-deploy verification

1. Confirm `/api/health` and `/api/health/ready` are both healthy.
2. Sign in as the admin owner on the target domain.
3. Open `/admin`.
4. Confirm the environment badge matches the Railway environment.
5. Confirm the commit badge matches the deployed commit when `RAILWAY_GIT_COMMIT_SHA` is configured.
6. Confirm fundraisers and users lists load without payment numbers, auth subjects, phone numbers or transaction references.
7. Confirm operations shows deletion, analytics, retention and audit sections.
8. Confirm a denied non-admin account receives `Admin access required.`
9. Run Supabase security and performance advisors.
10. Record the migration versions, deployed commit and advisor results in the launch notes.

## Migration escape hatch

If Supabase later needs to move to another Postgres host, these boundaries are intentional:

- Application code calls named RPCs through `SupabaseRpc`, not ad hoc SQL.
- Admin access is concentrated in `private.require_admin` and public wrapper RPCs.
- UI components consume shaped JSON read models.
- Migrations are timestamped SQL files in `supabase/migrations`.

That means a future migration can preserve API shapes while moving storage internals in phases. Keep new features on the same boundary unless there is a measured reason to change it.
