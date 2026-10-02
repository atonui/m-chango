# M-Chango — agreed direction

The product name is M-Chango. The owner has purchased m-chango.com and m-chango.co.ke; domain routing has not been configured by this branding update.

Serve individuals running occasional fundraisers first. Keep a path to recurring groups and shared organizer access without building group workflows yet.

Next account-based release: Google and email sign-in for organizers, recoverable account ownership of multiple fundraisers, and attribution of ledger changes to the acting organizer. Contributors remain account-free. Preserve public/private data separation, name visibility, integer money, atomic saves and full WhatsApp list copying.

Existing fundraisers are test data. No legacy ownership-claiming flow is required. Leave current records intact until a controlled reset for the account-based release.

## Infrastructure direction

The owner selected Supabase Auth and hosted PostgreSQL. The D1-specific account foundation spec and implementation plan are superseded; retain them as historical documents, not execution instructions. Revise the architecture before implementation. Connect real Google and email authentication last; use guarded local identities during foundation development.

Supabase documents Cloudflare Workers support and Sites supports runtime secrets. Full Supabase integration with Sites remains unverified: confirm external authentication support and test a real database request and sign-in/callback/session round trip before claiming hosting compatibility. No database migration, production reset or authentication integration has been performed.

The revised release must include indexed query review, paginated ledgers, efficient public updates, monitoring, realistic load tests and tested export/restore procedures. Pagination must preserve complete WhatsApp copying and CSV export. Record measured capacity and operational access rather than assuming hosting guarantees.

## Approved data strategy

M-Chango aims to build useful fundraising intelligence. Collect reliable data for explicit purposes rather than maximizing personal data collection.

- Retain operational ledger data with provenance: contributions are organizer-recorded, not independently verified payments. Keep recorded time distinct from payment time.
- Collect fundraiser category, target, dates and status; category remains optional. Offer optional county, feedback and closing outcome surveys.
- Collect minimal product events such as fundraiser creation, import completion, list copying and closure, plus performance/error metrics. A list-copy event does not prove delivery or donation.
- Keep operational records separate from analytics. Use an explicit event/property allowlist and only necessary pseudonymous identifiers. Never include names, phone numbers, transaction references, raw pasted messages or fundraiser descriptions in analytics or error logs. Hashing alone is not anonymization.
- Exclude national IDs, contact books, precise location, entire WhatsApp conversations, medical documents and cross-fundraiser donor profiling from this release.
- Define purpose-specific notices, lawful bases, retention, access controls and export/deletion processes. Optional research and marketing choices must be separate. Organizer agreement does not establish permission for every use of contributor or beneficiary data.
- Before launch assess ODPC registration, sensitive-data handling and cross-border hosting requirements; do not treat provider choice as legal compliance.
- Build aggregate benchmarks only with small-group suppression and re-identification review. Describe findings as M-Chango-user patterns, not nationally representative estimates. Personal donor data is not the proposed commercial product.

The owner approved this strategy on 2026-10-01. It is a design requirement for the revised Supabase release; analytics and surveys have not yet been implemented. Detailed event schema, retention periods, aggregate thresholds and legal review must be specified before collection is enabled.
