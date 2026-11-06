# Agent chat in the portal (recorded)

The Loopwerk supplier asks the Pimcore Kingdom portal's agent whether its latest Thunder Loop revision meets the brief.
`POST /studio-example-enterprise/agent/chat` answers with a recorded turn, streamed in PimcoreAgentBundle's own event
format. The text is recorded; what the agent "sees" is read live with the supplier's permissions
([`src/Agent/README.md`](../../Agent/README.md)), and the Supplier note it proposes is a real, stored proposal. No
model, no key, no network, no agent-server, no Mercure: the demo runs offline. Going live later changes only the URL
the portal's chat calls.

## What it shows

- `AgentChatController`: the route, on portal sites only (`config/pimcore/routing.yaml`). Body `{"message": "..."}`.
  Answers JSON `401` without a portal login (also for a guest, a public-share user or the stand-in admin of Studio
  previews), `403` without `PORTAL_ACCESS` or when the `Origin` is not the portal's own host, `400` without a message.
  It is not a `FrontendController` on purpose: for those, Portal Engine's `SecuritySubscriber` turns a missing login
  into a redirect to the login page, and a script needs a status code. `ChatAccess` holds the rule.
- The stream: `text/event-stream`, `X-Accel-Buffering: no`, one `data: {json}` line per event, flushed one by one, as
  the agent-server's `writeSse()` does (`agent-server/src/routes/sse-helpers.ts`, with its `ts` field). The events are
  members of the `AgentEvent` union of `agent-server/src/types/events.ts` on 2026.3:
  `system-notice {messageKey: "recorded"}` first (the client shows "recorded"), `turn-started`, several `text-delta`,
  `widget {widgetType: "kingdom-supplier-note", data: {proposalId, assetId, revision, text, expiresInSeconds}}`,
  `turn-ended` and `complete`.
- `ReplayPlayer` plays [`demo-data/agent/kingdom-brief-check.replay.json`](../../../demo-data/agent/kingdom-brief-check.replay.json).
  Its steps: `tool` calls `KingdomBriefTools` (`kingdom_read_brief`, `kingdom_list_revisions`) for the portal user;
  `text` is recorded text whose `{placeholders}` (`revisionCount`, `revisionList`, `latest.revision`,
  `latest.maxHeightM`, `overLimitM`, `briefLimitM`) come from those results; `propose` calls
  `proposeSupplierNote()` on the latest revision the user may view and sends the widget; `if` (`hasRevisions`,
  `noRevisions`, `latestAboveLimit`, `latestWithinLimit`) picks the steps that fit the live data. A supplier who may
  view no revision hears so and gets no proposal. Any question the file does not hold (case, spaces and the final
  punctuation aside) gets one fixed "recorded questions only" reply. The text comes a few words per delta with short
  pauses; the clock is injected, so the tests never wait.
  The check is about the ride design the brief is for, `/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster`: with
  its `KingdomSource` (wired in `config/portal-agent.yaml`) the player keeps only that asset's revisions for the
  placeholders, the conditions and the note, so a design variant next to it (`thunder-loop-twister.coaster`, F238) at
  any revision never answers the check; `kingdom_list_revisions` itself still lists both.
- Nothing personal in the file or the stream: no cookie, session id, `pmcp_` token, user id, e-mail or key.

## How to run

1. Install the sub-bundle ([the enterprise README](../../../README.md)), run `bin/console coaster-demo:setup` and
   `bin/console cache:clear`. PimcoreAgentBundle is not needed.
2. Sign in to the portal as the Loopwerk supplier, then in the browser's console on a portal page:
   ```js
   const r = await fetch('/studio-example-enterprise/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Does my latest Thunder Loop revision meet the brief?' }) });
   console.log(await r.text());
   ```
   The events come one after the other over about two seconds; the widget's `proposalId` is the stored proposal.
   Signed out, the same call answers `401` with a JSON error.

Tests: `enterprise/tests/agent-replay.test.mjs` (needs `php`), with the 2026.3 event union pinned in
`enterprise/tests/fixtures/agent-server-events-2026.3.json` (its path and commit inside). Its HTTP tests also need
`symfony/http-foundation` from a Pimcore `vendor/` (`PIMCORE_VENDOR_AUTOLOAD`, else `/var/www/html/vendor/autoload.php`)
and skip without one.

## Extension point

**A portal route that streams an agent turn in PimcoreAgentBundle's event format.** A Symfony route with
`condition: "request.attributes.get('isPortalEngineSite')"` serves portal sites only; a plain invokable controller
(not a `FrontendController`) checks the portal login itself to answer JSON 401/403; a `StreamedResponse` sends one
`AgentEvent` per `data:` line. To record another turn, add it to the replay file's `turns` (its `questions` and
`steps`).
