# Mchango: WhatsApp fundraising companion MVP

Date: 30 September 2026
Status: Scope approved; specification awaiting review
Working product name: Mchango

## 1. Purpose and success

Help Kenyan fundraiser organizers stop maintaining growing contribution lists in WhatsApp. WhatsApp remains the place for conversation; Mchango supplies the ledger and a shareable progress page. Contributors continue sending money directly to the organizer's M-Pesa number.

The first release succeeds when an organizer can create a fundraiser, import an existing list, confirm new contributions, and share an accurate live page from a phone. A contributor needs no account to read that page. Recorded contributions are organizer-confirmed entries, not payments independently verified by Mchango.

## 2. Scope and decisions

Included: fundraiser creation and editing, manual contribution entry and correction, pasted WhatsApp lists, pasted M-Pesa received-payment messages, import review, duplicate controls, public totals and ledger, contributor-name visibility, WhatsApp summaries, CSV export, closing a fundraiser, and rotating its management link.

Excluded: payment processing, STK Push, bank integration, WhatsApp bot/API, automatic SMS access, AI providers, donor accounts, organizer account registration, expenses, receipt uploads, billing, campaign discovery, and multiple organizer roles. The app never requests an M-Pesa PIN.

Chosen approach: a mobile-first web application with durable server storage. Alternatives considered were a WhatsApp bot and integrated M-Pesa reconciliation; both add external dependencies before the core bookkeeping workflow has been validated.

Assumptions made explicit: English UI, KES only, Africa/Nairobi display times, one organizer credential per fundraiser, and a working name that can change before launch. No real example names, phone numbers, or contributions are published as demo data. An optional demo uses clearly labeled fictional records separate from real fundraisers.

## 3. Main journeys

### Create and manage

The landing page explains the product and presents Create fundraiser. Required inputs are title (3–120 characters) and a Kenyan mobile payment number. Purpose is optional (up to 2,000 characters); target is optional and positive. Accept local 07/01 and equivalent +254 forms, normalizing the stored number. Number format validation does not verify ownership or M-Pesa eligibility.

Creation returns a public link and a separate private management link. A save-your-link screen explains that the management link grants control and must not be posted to the group. The organizer enters the dashboard only after acknowledging this. The page includes controls to copy both links, clearly separated, and rotate management access.

The dashboard shows recorded total, entry count, target and remaining amount when applicable, contribution table, add/import controls, export, and share summary. Counts refer to contribution entries, not unique people: one person may contribute more than once. Names are not reliable identifiers.

### Add a contribution

Require contributor name (1–120 characters), positive amount, and a received date/time defaulting to now. Optional transaction reference and optional private phone number. A per-entry Hide name toggle masks the public display as Anonymous. The organizer confirms receipt before saving. The saved entry shows its source: manual, WhatsApp list, or M-Pesa message.

The organizer can correct a contribution or remove it after a confirmation. Removal excludes it from totals and public display while retaining an internal correction history. Each mutation updates totals from active entries rather than maintaining a client-supplied total. Conflicting concurrent edits return a refresh-and-retry message.

### Import a WhatsApp list

Paste up to 50,000 characters and preview at most 500 candidate entries. Recognize numbered contributions with KSh/Ksh/ksh/KES amounts, optional commas, decimals, inconsistent spacing, punctuation before names, and multiple numbered entries on a line. Headers, payment instructions, and summaries are not contribution entries.

Preview every recognized row for editing, selection, and name visibility. If the source lacks receipt times, show the fundraiser import time as Recorded at; do not invent a payment date. Warn that list imports are organizer-declared received contributions. Any uncertain or unrecognized segments remain visible with a warning; never silently count them. Mixed pledge/paid indicators are flagged for manual review. Saving selected rows requires confirming that they represent received money.

Importing a growing list again must not blindly add it to the previous total. Flag matching normalized name-and-amount pairs, including repeated pairs within the paste, as possible duplicates; unselect them by default. The organizer may override those warnings because equal names and amounts can represent distinct contributions. Exact replay of a completed import request returns the original result. A growing list is not treated as a replacement ledger or used to infer deletions.

### Import M-Pesa messages

Parse supported received-payment text into reference, amount, sender name, optional phone, and received time. Explicitly reject sent-payment, withdrawal, failed, and reversal messages; they require organizer reconciliation rather than a new contribution. Messages cannot prove authenticity, and their confirmation text never causes automatic saving.

Preview the extracted fields and require organizer confirmation. An unfamiliar format or incomplete required fields produces a visible review error and permits manual correction. No unvalidated row can save. Standardize references by trimming and uppercasing. A database constraint enforces reference uniqueness per fundraiser, including removed entries; an organizer must restore/correct the existing referenced entry rather than reuse its reference. Different fundraisers remain independent.

Raw pasted text stays in the current browser view only and is discarded on successful import or navigation. Server parsing does not persist or log raw messages. Store only confirmed structured fields. Parsing uses deterministic code and has no paid model dependency.

### Share and view

The public page shows title, purpose, organizer payment number, recorded total, entry count, target progress when supplied, active entries and their public names, status, and last update time. The payment number is deliberately public and disclosed as such during creation. Donor phone numbers, references, credential material, private history, and raw messages never enter public API responses or HTML.

Name visibility defaults to hidden; the organizer can enable public names for the fundraiser, with per-entry hiding taking precedence. The dashboard makes this choice explicit. The page says amounts are recorded by the organizer and payments go directly to the displayed number. No claim of platform verification appears.

Share copies a short WhatsApp-ready summary containing title, recorded total, contribution count, optional remaining target, and public link. Use native sharing where supported with a copy fallback. It never sends messages automatically or includes the management link. Progress is capped visually at 100%; the actual raised amount and amount above target remain accurate. Public views revalidate without requiring navigation, with a visible refresh fallback.

Closing a fundraiser displays Closed and disables new entries/imports, while preserving public totals and allowing corrections, export, and reopening. It does not claim to stop payments to the organizer's number.

## 4. Architecture and data boundaries

Use a single Sites-hosted fullstack application, TypeScript UI and server handlers compatible with the hosting runtime, with a managed SQLite-compatible database (D1) for durable records. Browser storage is limited to preferences and temporary draft UI state; it is not the ledger. Keep parsing, validation, database access, authorization, and public projection as separate modules. Confirm hosting setup and supported library APIs during implementation rather than assuming package versions here.

Routes: landing/create, public /f/{public-id}, management-link exchange, and organizer dashboard. Server interfaces cover create, public read, authenticated management read/update, contribution mutations, parse preview, atomic import commit, CSV export, and credential rotation. Each management handler checks authorization for the requested fundraiser. Parsing previews also require authorization.

Public IDs are random opaque identifiers. Management credentials use at least 256 bits of cryptographic randomness and are stored only as hashes. Put the initial secret in the management URL fragment; exchange it via a same-origin POST for a Secure, HttpOnly, SameSite cookie, then remove it from the visible URL. Authorization checks credential version so rotation invalidates old links and sessions. Retain public ID when rotating. Apply no-referrer and no-store to management pages/responses; include no third-party analytics/scripts that could capture secrets. Validate request origin on mutations and parsing. Local development can adapt Secure cookies to localhost only.

Losing the management link and all active sessions means losing access in this account-free MVP; no email recovery is promised. Explain this on creation. Someone holding the link can edit the fundraiser. Avoid displaying complete credentials in routine logs, errors, or audit data.

### Records

Fundraiser: id, public_id, title, purpose, payment_number, optional target_minor, public_names_enabled, active/closed status, credential_hash, credential_version, record_version, created_at, updated_at.

Contribution: id, fundraiser_id, display_name, amount_minor, optional transaction_reference, optional private_phone, optional received_at, recorded_at, source, hide_name, removed_at, record_version, created_at, updated_at.

Mutation history: fundraiser_id, contribution_id when relevant, action, structured previous/new values, timestamp. Access is private. Do not copy secrets or raw pasted text into history.

Import commits: fundraiser_id, client-generated idempotency key, payload digest, stored commit result, timestamp. A reused key with different content is a conflict. Keys and commit operations are checked server-side, and selected rows commit atomically with their history. Database constraints protect against simultaneous duplicate-reference imports.

Use integer minor units (1 KES = 100 cents), never binary floating-point arithmetic for stored money. Reject zero, negative, malformed, more-than-two-decimal, or over-limit amounts. Per-entry and target limit: KES 100,000,000; totals must remain within safe integer bounds. Sum active entries on the server; only that total is authoritative. Store timestamps in UTC and show Nairobi time with a clear timezone label.

## 5. Privacy, resilience, and interface

Small-screen-first layout with a warm neutral background, dark green actions, clear typography, restrained progress visuals, and large touch controls. Prioritize Create, Add contribution, Import, and Share; avoid generic dashboard clutter. Use accessible labels, keyboard-operable dialogs, inline field errors, visible focus, and sufficient contrast. Public ledger entries can use cards on narrow screens and a table on wide screens.

Validate every payload on the server, use parameterized SQL, escape rendered text, and bound input sizes. Add supported rate limits for creation and credential exchange. Never trust a client-supplied authorization fundraiser ID or total. Fetch failures preserve entered form data; saving indicators prevent accidental repeated clicks, and idempotency handles retry after interrupted responses. No optimistic success or fallback to a local-only ledger on server failure.

CSV is a private export of active entries with name, amount in KES, source, received/recorded times, optional reference, and name visibility. Exclude donor phone numbers by default. Neutralize spreadsheet formulas in text fields, quote CSV correctly, and support UTF-8 names. Name visibility affects public display, not the organizer's export.

Public content is accessible to anyone with its link once the deployment audience permits it; do not imply that hiding a donor name makes the entire fundraiser private. Use noindex for fundraiser pages and no public directory. Keep the initial hosted pilot owner-private until the user explicitly requests public launch; the app's public-route authorization rules remain implemented and tested, but external sharing is not claimed to work while host access is private.

## 6. Acceptance and verification

1. Create on a phone-sized viewport, preserve data after refresh, and open the public view independently of organizer authorization.
2. Import the supplied 32-entry WhatsApp example correctly despite entries 25–32 sharing a line. Expected sum: KES 41,659. Use this as a parser fixture only; the actual fundraiser remains empty until user entry.
3. Import a supported received-message fixture; show preview; save once. Repeating its normalized reference or racing two imports cannot inflate the total.
4. Import a growing WhatsApp list again; previous matching entries start unselected and only confirmed new entries affect the total. Equal-value legitimate contributions can be explicitly retained.
5. Malformed rows, pledges, and unsupported payment message types show review errors without silently saving or counting money.
6. Manual additions, edits, removal, restore/correction, closure, and reopening behave consistently; totals and progress agree across management and public views.
7. Inspect public responses and rendered HTML for donor phones, references, secret links, and private history; none may leak. Missing/wrong/cross-fundraiser credentials cannot read private data or mutate records. Rotation invalidates prior sessions.
8. CSV totals match the ledger and text such as =HYPERLINK(...) cannot execute as a spreadsheet formula.
9. Keyboard and touch flows work; share/copy failures have useful fallbacks; server errors preserve drafts. Two-tab conflicts produce refresh guidance rather than silently overwriting changes.
10. Complete a production build and database migration, verify durable records, and report the actual hosting audience and any remaining limitation accurately.

Tests focus on parser correctness, monetary calculations, authorization/privacy, database constraints, idempotent atomic imports, and the primary end-to-end journey. The sample total is independently recalculated when creating the fixture. This spec is a product and engineering design, not a claim of legal compliance or a completed application.

## 7. Next stage

After approval of this written specification, write a concrete implementation plan against the selected hosting starter, review it with the user, and then implement and verify the MVP. No product code or external Site is created during this specification stage.
