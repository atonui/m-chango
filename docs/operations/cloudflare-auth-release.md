# M-Chango account release on Cloudflare Workers

This is a standalone deployment path for the approved account release. The existing Sites/D1 pilot remains unchanged. Do not run the Sites publishing workflow for this Workers artifact.

## Implemented

Google OAuth with PKCE, browser-bound callback state, email one-time codes, server-side session refresh, global logout, first-sign-in profile initialization and account UI. Tokens stay in HttpOnly Secure SameSite=Lax `__Host-` cookies, never localStorage or JSON response bodies. Each request has its own Supabase client. Only PKCE verifier storage crosses the OAuth round trip; session storage in the SDK is request-local. Starting another Google flow replaces the previous browser flow.

Every private public RPC and owner-read RLS policy checks a real, unexpired Supabase Auth session. Revoked sessions cannot keep using still-signed access tokens. Public summary/pages always use anonymous access, even for signed-in visitors with expired cookies. Private responses and callback/refresh responses must remain uncached at every proxy.

Email and Google share the same organizer account model; application code does not merge accounts by email. Supabase provider-linking behavior still needs a real provider test. Auth endpoints use a required Cloudflare rate-limit binding (20 attempts per minute per connecting IP, an approximation per Cloudflare location) plus Supabase's provider limits. No raw IP is logged or added to product analytics. Missing binding or trusted IP fails closed.

## External configuration still needed

1. Authenticate the deploying operator to their Cloudflare account. Current workspace Wrangler reports no authenticated account. No Cloudflare plugin was found in the available plugin search. Do not paste API tokens into chat or source.
2. Set the final development origin in `wrangler.account.jsonc` (`APP_ORIGIN` must be an exact HTTPS origin), verify that rate-limit namespace `1001` is appropriate/unused in that account, and configure `SUPABASE_PUBLISHABLE_KEY` through protected Worker runtime values. No service-role key is required for application authentication or ledger requests. The current origin is a nonfunctional placeholder and both provider readiness flags are zero.
3. In Supabase URL configuration, set the Site URL and allow the exact development callback path `/auth/complete` with its flow query parameter. Use tightly scoped callback matching rather than a whole-domain wildcard. Verify Supabase's query matching in a live round trip before enabling users.
4. Create/configure the Google OAuth client in Google Cloud. Its authorized redirect URI is `https://ziamlejfurafauwuqcjk.supabase.co/auth/v1/callback`. Store its client ID/secret in Supabase's Google provider configuration, never this application. Configure production origins separately.
5. Configure production SMTP in Supabase and change the passwordless email template to show `{{ .Token }}` (one-time code). Confirm sender/domain verification, delivery and provider rate limits with a selected test recipient. No outbound email has been sent by this implementation.
6. Enable `GOOGLE_AUTH_READY=1` and/or `EMAIL_AUTH_READY=1` only after provider configuration is verified. Keep privacy/analytics gates disabled until their own review is complete.

## Build and verification

- `npm run build:workers` builds using `vite.workers.config.ts` and outputs `dist/server/wrangler.json` plus Worker/static assets. It includes no Sites auth, connector, or D1 bindings. Legacy pilot API/manage/public paths return 404 in the standalone entry point; new public routes are `/fundraisers/[publicId]`.
- `npm run smoke:workers` starts a disposable local HTTPS Worker using a dummy publishable value. It checks readiness flags, sign-in/root rendering, rejected legacy API, and unauthenticated session behavior. It does not contact a real Auth provider.
- `npm run test:unit` and `npx tsc --noEmit` check implementation contracts and types. Supabase SQL fixtures exercise database identity/session authorization, not actual provider sign-in.
- Preserve the pinned compatibility date supported by the repository's Workers runtime; the initial October date was rejected by its May runtime. Deployment compatibility is currently `2026-05-15`.

Use the generated config for standard Wrangler deployment after the selected origin/configuration is ready and the owner approves the concrete release cutover. Real Google/OTP callback, refresh, logout and two-user browser tests remain mandatory. The current workspace proxy still prevents direct Supabase HTTP verification. A local mock transport or successful build is not evidence that hosted authentication works.

## Recorded implementation checks

On 2026-10-01: 84 unit tests, TypeScript, standard Workers production build, five local generated-Worker smoke checks, all 17 rolled-back standard PostgreSQL fixtures, plus new-profile/session-revocation regression passed. Independent whole-branch review closed with no Critical/Important findings after correcting expired-account-token public reads. Only INFO advisor notices for intentional denied-all RLS tables without policies remain (https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Local HTTPS smoke must set both Wrangler listener and upstream protocols to HTTPS; setting only the listener presents an HTTP request origin to the Worker. This is a harness requirement, not an app-origin exception. No real Google/SMTP/Auth provider or deployed-host flow was exercised.
