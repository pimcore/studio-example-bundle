# "Ask the brief": an agent panel in the portal

## What it shows

A button in the portal header, on every signed-in page, opens a panel where the supplier asks the agent about the
brief and its revisions. The answer streams in as plain text. When the answer was recorded (the demo's replay), its
bubble carries a "recorded" badge.

## Extension point

**`slots.headerActions`** (registered in `../plugin.tsx`). The portal renders that slot in the
header of `@PimcorePortalEngine/layout/studio.html.twig`: a page on another layout has no button.

## The parts

| File | What it does |
| --- | --- |
| `AskBriefButton.tsx` | The header button. Loaded at the portal's start-up, so it holds only the button and `React.lazy` for the panel. Renders nothing without `config().agent`. |
| `agent-config.ts` | Checks `config('studio-example-enterprise').agent`: `{chatUrl, label, mode}` or nothing. |
| `AskBriefPanel.tsx` | The panel: an own overlay (the portal SDK has no Drawer), a `role="dialog"` with the kit's `Panel`, `Input`, `Button`, `Tag` and `Alert`. The overlay starts below the portal header (`#pe-shell-header`) and is never wider than the window; while it is open the page under the header (`.pe-body`) is `inert`, and on a phone, where the sheet covers it, not drawn. |
| `agent-stream.ts` | The chat client: `POST {chatUrl}` and the answer's body read as Server-Sent Events up to `complete`. |
| `agent-events.ts` | A pure reducer: one question and its answer (text, badge, widgets, errors, failure) from the events. |

### Loaded on click

The panel, the stream reader and the UI kit are one chunk, fetched on the first click
(`lazy(async () => await import('./AskBriefPanel'))`). The start-up code stays within the 150 KB of
`assets/portal/tests/unit/plugin-size.test.mjs`.

## The server side

`src/Portal/StudioExampleEnterprisePortalPlugin.php`'s `getFrontendConfig()` adds

```json
{ "agent": { "chatUrl": "/studio-example-enterprise/agent/chat", "label": "Ask the brief", "mode": "replay" } }
```

The URL is generated from the chat route (`config/pimcore/routing.yaml`, `src/Portal/Agent/README.md`). The container
parameter `studio_example_enterprise.agent.enabled` (default `true`, `config/portal.yaml`) turns the button off:

```yaml
# config/config.yaml of the app
parameters:
    studio_example_enterprise.agent.enabled: false
```

Going live means a new `chatUrl` (and `mode: live`): the panel reads the agent server's own stream the same way.

## The stream

The request: `POST {chatUrl}`, `credentials: 'include'`, `Content-Type: application/json`, body
`{"message": "...", "sessionId"?: "..."}`, `redirect: 'manual'` (a login redirect is never followed).

The answer is `text/event-stream`, one PimcoreAgentBundle `AgentEvent` per `data:` line
(`agent-server/src/types/events.ts` on 2026.3). The reader parses across any chunk split and multi-line `data:`,
and keeps only these types, each checked field by field:

| Event | What the panel does |
| --- | --- |
| `system-notice` with `messageKey` `recorded` (or `agent.recorded`) | the "recorded" badge on this answer; it comes from the stream, never from config, so a live answer cannot carry it |
| `turn-started` | nothing to show; the typing indicator runs until the first `text-delta` |
| `text-delta` | appends its text to the answer bubble (`aria-live="polite"`) |
| `widget` | kept with the turn; its `text` or `summary` is shown as a plain line (the Supplier-note card is a later example) |
| `error` | an inline error under the answer |
| `turn-ended`, `complete` | `complete` ends the request |

Every other type (`thinking`, `debug`, ...) and every malformed line is dropped, never shown raw.

**Plain text only.** Agent text and widget data are rendered as React text nodes: no `dangerouslySetInnerHTML`, no
markdown renderer, nothing under `agent/` that parses HTML (`enterprise/tests/portal-agent-panel.test.mjs` checks it).

**Failures.** 401, 403 or a redirect: "Please sign in again". 5xx, a network error, an answer that is not an event
stream, or a stream ending without `complete`: "The assistant is not available". Both come with Retry. Escape, the
Close button or a click beside the panel close it and abort the running request (AbortController).

## Hooks for checks

`data-agent-button` (the header button), `data-agent-panel` (the dialog), `data-agent-text` (an answer's text),
`data-agent-badge="recorded"`, `data-agent-turn="waiting|streaming|done|failed|cancelled"`, `data-agent-failure`,
`data-agent-widget="<widgetType>"`.

## How to run

1. `bin/console coaster-demo:setup`, build the portal plugin (`assets/portal/README.md`), `bin/console cache:clear`.
2. Sign in to the demo portal as the Loopwerk supplier: "Ask the brief" is in the header.
3. Click it and ask "Does my latest Thunder Loop revision meet the brief?": the answer streams in, marked "recorded".

Tests: `node --test enterprise/tests/portal-agent-panel.test.mjs`.
