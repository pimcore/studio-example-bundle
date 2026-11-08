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
- With PimcoreAgentBundle installed, `Tools/` wraps the three methods as MCP tools (`#[McpTool]`, tag
  `pimcore.mcp_tool`) in the group `kingdom-portal`: `kingdom_read_brief` and `kingdom_list_revisions` (read-only)
  and `kingdom_propose_supplier_note`. The agent preset `kingdom-brief-check`
  ([`config/pimcore/agents/kingdom-brief-check.yaml`](../../config/pimcore/agents/kingdom-brief-check.yaml)) gets them
  through the tool bundle `kingdom-portal` and no other group.

## How to run

1. Install the sub-bundle ([the enterprise README](../../README.md)) and run `bin/console coaster-demo:setup`.
   `config/agent.yaml` registers the service; `KingdomBriefTools` works with or without PimcoreAgentBundle.
2. With PimcoreAgentBundle (`composer.json` only suggests it) and `bin/console cache:clear`, the group
   `kingdom-portal` is at `/pimcore-mcp/agent/kingdom-portal`, and the preset "Kingdom brief check" is in Studio's
   agent configuration, tagged Bundle. A Studio user who is not linked to exactly one portal user gets no data from
   it: the portal user's agent runs through the portal (the replay route,
   [`src/Portal/Agent/README.md`](../Portal/Agent/README.md)), not through Studio.

Tests: `enterprise/tests/agent-tools.test.mjs` (needs `php`), run with the other enterprise tests. Its container
tests also need a Pimcore `vendor/` with PimcoreAgentBundle (`PIMCORE_VENDOR_AUTOLOAD`, else
`/var/www/html/vendor/autoload.php`) and run the bundle's own `McpToolRegistryPass`; they skip without one.

## Extension point

**PimcoreAgentBundle MCP tools and an agent preset from an optional bundle.** A tool is a service with an `#[McpTool]`
method, tagged `pimcore.mcp_tool` with a `group`. The preset directory and the tool bundle are prepended to the
`pimcore_agent` config. Both happen only when PimcoreAgentBundle is in `kernel.bundles`
(`PimcoreStudioExampleEnterpriseExtension::load()` and `prepend()`). No `config/*.yaml` of this bundle may hold a
`pimcore_agent:` key: those files are loaded on every boot, and an unknown extension key stops it.
