# Agent tools for the portal user

The tools an agent gets for the Loopwerk supplier in the Pimcore Kingdom portal: read the Thunder Loop brief, list the
`.coaster` revisions the supplier may view, and propose one Supplier note. The agent reads only what the portal user
may see: the user is the signed-in portal user, and every revision passes the Portal Engine's own "view" check.

## What it shows

- `KingdomBriefTools` does the work: `readBrief()`, `listRevisions()` (`[{assetId, revision, maxHeightM, lengthM}]`,
  no paths, e-mails or user ids) and `proposeSupplierNote(assetId, revision, text)` (`{proposalId, expiresInSeconds}`).
- `PortalUserContext` says who the tools act for, and fails closed. It returns the portal login's user, or for an MCP
  call the one portal user linked to the Studio caller. It returns nobody for no login, a guest or public-share user,
  the Portal Engine's stand-in admin (Studio previews), a Studio-only caller, the shared fallback Pimcore user
  `portal-engine-default-user`, or a caller linked to more than one portal user. Without a user the reads return
  nothing and a proposal is refused.
- `ProposalStore` keeps a proposal on the server (portal user, asset, revision, text) under a random 128-bit id, for
  15 minutes (the TTL). Proposing writes no note: the confirm step (a later feature) reads the note from here, never
  from the request.
- `KingdomSource` is where the data comes from; `PimcoreKingdomSource` reads the Thunder Loop ride brief (the "Ride brief" data object of the portal's Open briefs, F293; the brief page on a demo set up before it) and the `.coaster` assets'
  version history (version n = revision n) and asks the Portal Engine's `PermissionService` for "view" in the demo
  portal's data pool. The fixture `demo-data/agent-fixtures/night-fury.coaster` is a design the supplier may not see.
- The portal's agent chat replays a recorded turn and fills it from these methods
  ([`src/Portal/Agent/README.md`](../Portal/Agent/README.md)); the Confirm card's route confirms a stored proposal
  ([`Note/README.md`](Note/README.md)).

## How to run

1. Install the sub-bundle ([the enterprise README](../../README.md)) and run `bin/console coaster-demo:setup`.
   `config/agent.yaml` registers the services; they need no PimcoreAgentBundle.
2. Sign in to the portal as the supplier and open "Ask the brief": the replay reads through `KingdomBriefTools`
   ([`src/Portal/Agent/README.md`](../Portal/Agent/README.md)).

Tests: `enterprise/tests/agent-tools.test.mjs` (needs `php`), run with the other enterprise tests. Its container
test also needs a Pimcore `vendor/` (`PIMCORE_VENDOR_AUTOLOAD`, else `/var/www/html/vendor/autoload.php`); it skips
without one.

## Extension point

**Symfony services for the portal user** (`config/agent.yaml`): one service that reads only what the signed-in portal
user may see, behind a `KingdomSource` interface, so the portal's replay route and the confirm route share it. No
`config/*.yaml` of this bundle may hold a `pimcore_agent:` key: those files are loaded on every boot, and an unknown
extension key stops it.
