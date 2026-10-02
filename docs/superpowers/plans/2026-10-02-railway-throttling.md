# Railway durable sign-in throttling

Approved scope: prepare Railway app hosting and live testing, retain Supabase Auth/PostgreSQL and native implementation. No domain cutover or public launch.

Ruling: use a dedicated Supabase-backed limiter rather than another infrastructure service. Only hashed IP keys and short-lived counters are stored. Cost if this choice proves insufficient: auth traffic adds one indexed database write per sign-in attempt; move the adapter to a separate cache if measured traffic warrants it.

1. Add server-only, secret-gated limiter RPC and expiring counter table. Default unconfigured; only configured application secret can increment. Anonymous users cannot read configuration/counters. Atomic 20 attempts per fixed 60-second window starting with the first attempt; cron deletes expired counters. Verify anonymous roles, rejected secret, saturation and expiry in rollback fixtures.
2. Add Railway adapter using verified ingress X-Real-IP, HMAC pseudonymous keys and bounded, fail-closed RPC requests. Bind through existing auth-config while preserving Workers behavior. Test missing/invalid ingress, spoofed CF headers, backend failures and aggregate behavior before implementation.
3. Run unit/TypeScript/Node production smoke checks, database fixtures and security/performance advisors. Fresh reviewer once at end. Document exact secret registration and ingress verification; keep auth-ready flags zero until real Google/email delivery/provider tests.

External configuration remains blocked if Railway tools cannot be called. Do not claim deployment or end-to-end authentication.
