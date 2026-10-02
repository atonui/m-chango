# M-Chango account foundation — proposed design

## Outcome and sequence

Individuals running occasional fundraisers can manage multiple fundraisers from one recoverable organizer account. Contributors need no accounts. Preserve the existing contribution ledger, imports, public privacy and complete WhatsApp copying. Recurring groups and shared management remain future work.

Build and test the account foundation locally first. Connect Google and email authentication last. This phase does not select an authentication vendor or publish an unauthenticated account release.

## Identity and ownership

Introduce an internal `users` table with a stable UUID, display name and timestamps. A separate `userIdentities` table maps a unique provider/subject pair to that internal user. Email is profile data, never an authorization key. Automatic account merging by matching email is excluded.

Introduce `fundraiserMembers` with fundraiser ID, user ID, role and creation timestamp. The first release supports the owner role only, with exactly one owner per fundraiser. A membership table leaves room for future shared access without adding invitations or groups now.

Create the fundraiser and its owner membership in one D1 transaction. Resolve the acting internal user on the server and require ownership before every management read, export or mutation. Public routes continue using the explicit public projection. A supplied fundraiser ID or contribution ID never establishes authority; contribution lookups remain scoped to the authorized fundraiser. Return 401 for an absent identity and 404 for a resource the acting user cannot access.

## Dashboard and existing flows

Add `/dashboard` with the current organizer's fundraisers, showing title, active/closed status, confirmed total, optional target and last update. Include create and open-management actions, and a useful empty state. Both active and closed fundraisers remain accessible.

The existing management screen remains the ledger editor. Account ownership replaces private capability links in the final account release; saving or rotating a management secret is removed from that flow. Public sharing and copy-to-WhatsApp remain available. Existing test fundraisers are not automatically claimed or assigned to a user.

## Attribution and transaction safety

Add the acting internal user ID to history and operation records. New account-owned changes require it. Record creation, contribution additions/imports, edits, removal/restoration and settings changes with the actor in the same transaction as the change. Historical pilot events may keep a null actor; never invent historical attribution.

Retain optimistic version guards, integer amounts, duplicate reference constraints and atomic batches. Idempotency records identify the actor as well as the fundraiser and retry key. Check authorization before returning a replay result. A replay does not create another history event.

## Development without repeated login

Define a server identity boundary returning a resolved internal user. The local adapter offers two fixed synthetic organizers and a local identity selector so developers can exercise ownership and switching accounts. Client-supplied identity has meaning only inside this adapter.

Enable the adapter only with an explicit local-development setting and verified local runtime configuration. A hostname check alone is insufficient. Production must fail closed if the development adapter is requested; production builds and deployment validation must reject that configuration. Without a real production identity adapter, account routes reject access.

Keep the deployed capability-based pilot working while this foundation is developed on an isolated branch. Do not introduce a production fallback from failed account authentication to a capability or simulated user.

## Authentication handoff and rollout

Google and email sign-in connect through the identity boundary after foundation tests pass. Select and validate the provider against Sites hosting before implementing its adapter. Email recovery, provider linking and logout/session expiry must be defined in that follow-up design; the foundation must not implement a partial password system.

Do not reset test data or apply the account cutover to production during this phase. The final account release requires a controlled test-data reset, real authentication verification and explicit deployment preparation. Custom domains and public launch are separate actions.

## Verification

Use two synthetic users to prove dashboard isolation and deny cross-account management reads, exports, imports, edits, removals and settings changes. Verify anonymous public reads expose no identity or private fields. Test atomic fundraiser/owner creation, actor attribution and idempotent replay. Exercise the development-adapter production rejection. Run existing unit and real Worker/D1 integration checks, type checking and production build. Verify dashboard empty, active and closed states in the available preview environment.

## Scope exclusions

No recurring-group workflows, invitations, additional roles, payment processing, donor authentication, legacy ownership claiming or automatic email-based account merging. Authentication provider integration follows this foundation and is not silently assumed complete.
