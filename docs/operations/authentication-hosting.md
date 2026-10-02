# Authentication hosting prerequisite

The account release uses Supabase Google OAuth with PKCE and passwordless email OTP. Contributors do not require accounts. The database and existing Worker-compatible application remain unchanged by this hosting decision.

## Current evidence

- Sites Authentication guidance requires confirming the supported platform path before implementing app-owned external sign-in.
- Sites metadata confirms a platform auth client, not a Supabase integration. No exposed Sites tool documents or configures external-provider authentication.
- Supabase documentation supports server-side PKCE/cookie sessions. This alone does not establish Sites dispatch/callback/cookie compatibility.
- Direct workspace HTTPS to Supabase currently fails at proxy CONNECT. Native database access succeeds. This is not evidence that deployed host networking fails.

## Required integration

- `/signin`: Google and email OTP entry, generic errors, resend throttling.
- `/auth/complete`: PKCE exchange, strict same-origin return paths. Do not use Sites-owned `/callback`.
- HttpOnly Secure SameSite=Lax cookies; per-request clients; no shared sessions or tokens in browser storage/logs.
- Session refresh and logout with upstream revocation and cleared private client state. Verify current user/session before sensitive operations, rather than relying only on stale access-token claims.
- Supabase redirect allowlist for the selected development and production origins.
- Google OAuth client configured in Supabase using protected credentials; Google authorized redirect URI is the project's Supabase Auth callback.
- Custom SMTP and email template containing a one-time code; no real outbound email test without an explicitly selected recipient.
- Tests: callback tampering, duplicate/malformed cookies, invalid OTP, expired/failed refresh, logout replay, two-account isolation and deletion.

## Decision needed

Either establish a documented Sites external-auth path, or authorize standard Cloudflare Workers hosting for the account release. The latter retains the current Worker application and Supabase database, leaving the deployed pilot intact until cutover. No hosting migration or auth implementation is claimed yet.

## Resolution

The owner approved standard Cloudflare Workers hosting on 2026-10-01. The account release now has a separate Workers build/entry point and Supabase authentication implementation. See cloudflare-auth-release.md for configuration and remaining live-provider evidence. Earlier prerequisite notes remain historical; Sites pilot is preserved.
