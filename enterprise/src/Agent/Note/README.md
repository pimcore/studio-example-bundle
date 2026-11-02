# Agent demo: the confirmed Supplier note

The one write of the agent demo. The agent only proposes a Supplier note ([`../README.md`](../README.md),
`ProposalStore`); the Loopwerk supplier confirms it in the portal, and this writes it as a Pimcore note on the
revision's asset: "rev3 exceeds the 45 m limit, rev4 will lower the lift hill". It is not PimcoreAgentBundle's
proposal pipeline, which merges Change Control branches (DR-P27): one confirm, one note.

## What it shows

- `ConfirmController`: `POST /studio-example-enterprise/agent/proposal/{id}/confirm`, on portal sites only
  (`config/pimcore/routing.yaml`). The request carries only the proposal id; the note's asset, revision and text come
  from the proposal stored for this portal user, never from the body. The same gate as the chat route
  (`../../Portal/Agent/ChatAccess.php`): JSON 401 without a real portal login, 403 without PORTAL_ACCESS or from
  another Origin, never a redirect to the login page.
- `ProposalConfirmer`, in order: no such id, or expired after 15 minutes, 404; another portal user's proposal 403 (a
  proposal without an owner matches nobody); already confirmed 409 (no second note); no `edit` on the asset 403
  (nothing written, still pending); else exactly one note, `200 {"confirmed": true, "noteId", "assetId", "revision"}`.
  The proposal is marked confirmed before the write and taken back if the write fails.
- `PimcoreSupplierNoteBackend`: `edit` is re-checked through the Portal Engine's data-pool voter
  (`isGranted('edit', $asset)` with the demo's "Ride designs" pool made current, then restored). The note: type
  "Supplier note", the text as its description, the supplier's name (the portal user's first and last name) and the
  revision in its data. Its Pimcore author stays empty: a portal user is no Pimcore user, and never the Portal
  Engine's shared fallback user.
- `ResetCommand`: `coaster-demo:agent-reset` removes the notes of type "Supplier note" on the assets under
  `/Pimcore Kingdom` (no other note, no note elsewhere) and every pending proposal.

## How to run

1. Set up the coaster demo (`bin/console coaster-demo:setup`) and sign in to the portal as the Loopwerk supplier.
2. Ask the agent the recorded question (`../../Portal/Agent/README.md`); its widget holds the proposal id.
3. Confirm it from the portal page (the panel comes with F130), or by hand from the browser console:
   ```js
   fetch('/studio-example-enterprise/agent/proposal/<id>/confirm', { method: 'POST' }).then((r) => r.json())
   ```
   The answer is `{"confirmed": true, ...}`; Studio shows the note under the asset's "Notes & Events". A second
   confirm answers 409.
4. Between runs: `bin/console coaster-demo:agent-reset`.

Tests: `tests/agent-note.test.mjs`.

## Extension point

A plain invokable controller on a portal route (`config/pimcore/routing.yaml`, `config/agent-note.yaml`) that writes
a Pimcore `Element\Note` after the Portal Engine's own permission check, plus a console command
(`#[AsCommand]`, autoconfigured).
