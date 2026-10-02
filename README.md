# M-Chango

A contribution ledger for Kenyan fundraisers organized on WhatsApp. Payments go directly to the organizer's M-Pesa number; the organizer confirms receipt. M-Chango does not process or independently verify payments.

## Using the pilot

1. Create a fundraiser with its title and public payment number; optionally add purpose and target.
2. Save the private management link before opening the ledger. It grants full management access. Do not share it with the group. Lost links cannot be recovered if no active session remains.
3. Record confirmed contributions manually, or paste a numbered WhatsApp list / supported received M-Pesa messages. Review every selected row, correct flagged data, and confirm receipt before saving.
4. Use **Copy contribution list** to paste the complete numbered list, total, target and remaining balance directly into WhatsApp without a link. Above target, the list shows the surplus; without a target, it shows the total only. The short update with a progress link remains available. Names start hidden; global visibility and each entry's Hide name setting control disclosure. References and donor phone numbers are private.
5. Correct/remove/restore entries, export active contributions as CSV, close/reopen the fundraiser, or replace the private management link from settings. Save the replacement before activating it: rotation immediately revokes previous links and sessions, and the saved replacement recovers access even if its activation response is interrupted.

The initial deployment is owner-private. External WhatsApp visitors cannot access it until its owner explicitly chooses a public launch. No donor accounts are required by the application's public routes once hosting access permits them.

## Development

Node >=22.13, pnpm 11.25.0. Preserve the committed lockfile. The Sites helpers select the supported execution profile and install dependencies; `npm run install:ci` invokes that installer without changing package managers.

- `npm run test:unit`: deterministic money, validation, parsing, privacy, export, authorization helpers and client-state tests.
- `npm run build`: production Worker build; the Sites `build-site.mjs` helper adds deployment validation.
- `npm run test:integration`: starts the built Worker on local loopback in the same process environment, runs real HTTP/D1 tests, and disposes its Miniflare/workerd runtime. Requires an already migrated local database; `TEST_PORT` and optional `TEST_PATTERN` select a port or a named subset.
- `npx tsc --noEmit`: type checking.

Generate schema-only migrations with `npm run db:generate`; inspect the SQL. Build first to generate `dist/server/wrangler.json`. Apply each pending migration once, in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_crazy_metal_master.sql
```

Local test records stay in ignored `.wrangler/state`; production starts without test fixtures. Never commit local runtime state, secrets or physical resource IDs. `.openai/hosting.json` retains the single Site ID and logical D1 binding. Publishing uses the Sites workflow to push exact source, package its matching Worker build and apply committed production migrations.

## Data and reliability

Amounts use integer minor units; each entry/target is bounded to KES 100,000,000. A four-statement D1 batch atomically guards the fundraiser version, inserts all selected contributions and history, and advances its version. Unique references remain reserved after removal. An idempotency key returns the original committed result on retry; different data with the same key conflicts. Ledger reads share a database snapshot. Conflicting edits require refresh and review.

Management credentials are 256-bit random capabilities, stored as SHA-256 hashes. The initial URL fragment is exchanged for a fundraiser-scoped HttpOnly, SameSite cookie, then removed from the visible URL. Mutations require same-origin requests. Public projections explicitly omit private fields. Raw pasted messages are not persisted or logged. Private CSV export neutralizes spreadsheet formulas and excludes phone numbers.

No payment APIs, WhatsApp bot, automatic SMS access, paid models, organizer accounts or receipt uploads are included. Browser visual and native WebMCP validation were unavailable in the managed build environment; automated client-state and real Worker tests provide the available evidence.

The reconstructed synthetic list tests the known 32-entry total and unusual amounts/formatting; it is not a verbatim replay of the original supplied message, which was unavailable after environment recovery. One review minor remains: simultaneous manual and automatic public refreshes may briefly show an older snapshot until the next refresh. Server records stay authoritative.
