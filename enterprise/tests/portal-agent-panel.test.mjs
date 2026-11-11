// F128: the portal panel "Ask the brief" (assets/portal/js/src/agent/): a slots.headerActions button that opens an own
// overlay, loaded on click, which POSTs to config().agent.chatUrl and reads the answer as an event stream to
// `complete`. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
// The stream reader (agent-stream.ts), the turn reducer (agent-events.ts) and the config check (agent-config.ts) run
// in Node on PimcoreAgentBundle-shaped events; the components, their registration and the PHP config are read or run
// with the php CLI (Portal Engine and Symfony routing stubbed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const agentDir = join(portalSrc, 'agent');
const read = (path) => readFileSync(path, 'utf8');

const stream = await import(join(agentDir, 'agent-stream.ts'));
const events = await import(join(agentDir, 'agent-events.ts'));
const agentConfig = await import(join(agentDir, 'agent-config.ts'));

// --- helpers ---

// The events of a recorded turn as F127's route (src/Portal/Agent/AgentChatController.php) sends them, with `ts`.
const TURN = [
  { type: 'system-notice', messageKey: 'recorded', ts: 1 },
  { type: 'turn-started', messageId: 'm1', agentName: 'kingdom-brief-check', ts: 2 },
  { type: 'text-delta', text: 'I read the ', ts: 3 },
  { type: 'text-delta', text: 'Thunder Loop brief: ', ts: 4 },
  { type: 'text-delta', text: 'no point above 45 m. ', ts: 5 },
  { type: 'widget', widgetType: 'kingdom-supplier-note', data: { proposalId: 'p1', assetId: 9, revision: 3, text: 'Too high', expiresInSeconds: 900 }, ts: 6 },
  { type: 'turn-ended', status: 'completed', ts: 7 },
  { type: 'complete', ts: 8 }
];
const sse = (list) => list.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
const types = (list) => list.map((e) => e.type);

/** Feeds the text to a fresh parser in pieces of the given sizes (cycled) and returns every event it yields. */
function parseInPieces (text, sizes) {
  const parser = stream.createSseParser();
  const out = [];
  for (let i = 0, k = 0; i < text.length; k++) {
    const size = sizes[k % sizes.length];
    out.push(...parser.feed(text.slice(i, i + size)));
    i += size;
  }
  return out;
}

/** A Response whose body arrives in the given chunks. */
function streamedResponse (chunks, { status = 200, contentType = 'text/event-stream; charset=utf-8' } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start (controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    }
  });
  return new Response(body, { status, headers: { 'Content-Type': contentType } });
}

/** A fetch that records its call and answers with the given response (or throws it, when it is an Error). */
function fakeFetch (answer) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (answer instanceof Error) throw answer;
    return typeof answer === 'function' ? answer(init) : answer;
  };
  return { calls, fetchImpl };
}

async function chat (answer, extra = {}) {
  const { calls, fetchImpl } = fakeFetch(answer);
  const seen = [];
  const outcome = await stream.streamChat({ chatUrl: '/studio-example-enterprise/agent/chat', message: 'Does rev3 meet the brief?', onEvent: (e) => seen.push(e), fetchImpl, ...extra });
  return { outcome, seen, calls };
}

/** Runs the reducer over the events, as the panel does, then ends the turn with the outcome. */
function playTurn (list, outcome = { kind: 'complete' }) {
  let turn = events.startTurn('Does rev3 meet the brief?');
  for (const e of list) turn = events.reduceTurn(turn, e);
  return events.finishTurn(turn, outcome);
}

// The value imports (no `import type`) of a module: the static ones and the dynamic import()s.
const EXTENSIONS = ['', '.tsx', '.ts', '.mjs', '.js', '/index.tsx', '/index.ts'];
function resolveFile (from, spec) {
  for (const ext of EXTENSIONS) {
    const path = resolve(dirname(from), spec + ext);
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  throw new Error(`${relative(enterpriseDir, from)}: cannot resolve ${spec}`);
}
function staticGraph (entry) {
  const files = new Set();
  const packages = new Set();
  const walk = (path) => {
    if (files.has(path) || path.endsWith('.json')) return;
    files.add(path);
    const source = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const statics = [...source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^'";]*?\sfrom\s+['"]([^'"]+)['"]/g)].map(([, s]) => s);
    for (const spec of statics) {
      if (spec.startsWith('.')) walk(resolveFile(path, spec));
      else packages.add(spec);
    }
  };
  walk(entry);
  return { files, packages };
}

const agentFiles = () => readdirSync(agentDir, { recursive: true }).map(String).filter((f) => /\.(tsx?|mjs|js)$/.test(f));
const panelSource = () => read(join(agentDir, 'AskBriefPanel.tsx'));
const buttonSource = () => read(join(agentDir, 'AskBriefButton.tsx'));

// The provider's getFrontendConfig(), run with the php CLI: the Portal Engine interfaces and Symfony's URL generator
// are stubbed, the generator knows the chat route only when `withRoute` is set.
function frontendConfig ({ agentEnabled, withRoute = true }) {
  const php = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace Symfony\\Component\\Routing\\Exception {
    interface ExceptionInterface {}
    class RouteNotFoundException extends \\InvalidArgumentException implements ExceptionInterface {}
}
namespace Symfony\\Component\\Routing\\Generator {
    interface UrlGeneratorInterface { public function generate(string $name, array $parameters = [], int $referenceType = 1): string; }
}
namespace {
    require ${JSON.stringify(join(src, 'Portal/StudioExampleEnterprisePortalPlugin.php'))};
    $routes = [];
    if (${withRoute ? 'true' : 'false'}) { $routes['pimcore_studio_example_enterprise_agent_chat'] = '/studio-example-enterprise/agent/chat'; }
    $generator = new class($routes) implements Symfony\\Component\\Routing\\Generator\\UrlGeneratorInterface {
        public function __construct(private array $routes) {}
        public function generate(string $name, array $parameters = [], int $referenceType = 1): string {
            if (!isset($this->routes[$name])) { throw new Symfony\\Component\\Routing\\Exception\\RouteNotFoundException($name); }
            return $this->routes[$name];
        }
    };
    $plugin = new Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\StudioExampleEnterprisePortalPlugin(
        $generator, ${agentEnabled ? 'true' : 'false'});
    echo json_encode($plugin->getFrontendConfig());
}`;
  return JSON.parse(execFileSync('php', ['-r', php.replace(/^\s*<\?php/, '')], { encoding: 'utf8' }));
}

// --- AC1: the button, only with config().agent, the panel only on click ---

test('AC1: config().agent decides: no agent key or no chatUrl means no button, a chatUrl gives the label "Ask the brief"', () => {
  assert.equal(agentConfig.agentConfigOf(undefined), null);
  assert.equal(agentConfig.agentConfigOf(null), null);
  assert.equal(agentConfig.agentConfigOf({}), null, 'no agent key');
  assert.equal(agentConfig.agentConfigOf({ other: { url: '/en/other' } }), null, 'another key only');
  assert.equal(agentConfig.agentConfigOf({ agent: {} }), null, 'no chatUrl');
  assert.equal(agentConfig.agentConfigOf({ agent: { chatUrl: '' } }), null);
  assert.equal(agentConfig.agentConfigOf({ agent: { chatUrl: 42 } }), null);
  assert.deepEqual(agentConfig.agentConfigOf({ agent: { chatUrl: '/studio-example-enterprise/agent/chat' } }),
    { chatUrl: '/studio-example-enterprise/agent/chat', label: 'Ask the brief', mode: 'replay' });
  assert.deepEqual(agentConfig.agentConfigOf({ agent: { chatUrl: '/c', label: 'Ask', mode: 'live' } }), { chatUrl: '/c', label: 'Ask', mode: 'live' });
  assert.equal(agentConfig.agentConfigOf({ agent: { chatUrl: '/c', mode: 'other' } }).mode, 'replay');

  // the button reads the plugin's config and renders nothing without it
  const button = buttonSource();
  assert.match(button, /config<[^>]*>\(PLUGIN_ID\)|config\(PLUGIN_ID\)/);
  assert.match(button, /agentConfigOf\(/);
  assert.match(button, /if \(agent === null\) return null/);
  assert.match(button, /data-agent-button/);
});

test('AC1: the button is registered on slots.headerActions and loads the panel only on click (React.lazy)', () => {
  const plugin = read(join(portalSrc, 'plugin.tsx'));
  assert.match(plugin, /componentRegistry\.registerToSlot\(\s*slots\.headerActions\s*,\s*\{[^}]*component:\s*AskBriefButton/);
  assert.match(plugin, /import \{ AskBriefButton \} from '\.\/agent\/AskBriefButton'/);

  const button = buttonSource();
  assert.match(button, /const AskBriefPanel = lazy\(async \(\) => await import\('\.\/AskBriefPanel'\)\)/);
  assert.match(button, /\{ open && \(?\s*<Suspense/, 'the lazy panel is rendered only once the button was clicked');

  // nothing of the panel, the stream reader or the UI kit is in the start-up code (F88's 150 KB stays)
  const { files, packages } = staticGraph(join(portalSrc, 'plugin.tsx'));
  assert.ok(files.has(join(agentDir, 'AskBriefButton.tsx')));
  for (const f of ['AskBriefPanel.tsx', 'agent-stream.ts', 'agent-events.ts']) {
    assert.ok(!files.has(join(agentDir, f)), `${f} is not loaded at start-up`);
  }
  assert.deepEqual([...packages].filter((p) => p.startsWith('@pimcore/portal-ui-kit')), [], 'no UI kit at start-up');
});

test('AC1: the server hands over agent {chatUrl, label, mode} unless studio_example_enterprise.agent.enabled is false', () => {
  assert.deepEqual(frontendConfig({ agentEnabled: true }), {
    agent: { chatUrl: '/studio-example-enterprise/agent/chat', label: 'Ask the brief', mode: 'replay' }
  });
  assert.deepEqual(frontendConfig({ agentEnabled: false }), {}, 'disabled: no agent key, no button');
  assert.equal(frontendConfig({ agentEnabled: true, withRoute: false }).agent, undefined, 'no route: no button');

  // the container parameter defaults to true and is the provider's $agentEnabled
  const portalYaml = read(join(enterpriseDir, 'config/portal.yaml'));
  assert.match(portalYaml, /^parameters:\s*\n\s+studio_example_enterprise\.agent\.enabled: true\s*$/m);
  assert.match(portalYaml, /\$agentEnabled: '%studio_example_enterprise\.agent\.enabled%'/);
  // the provider generates the chat route F127 registered
  const routing = read(join(enterpriseDir, 'config/pimcore/routing.yaml'));
  const plugin = read(join(src, 'Portal/StudioExampleEnterprisePortalPlugin.php'));
  const route = plugin.match(/AGENT_CHAT_ROUTE = '([^']+)'/);
  assert.ok(route, 'names the chat route');
  assert.match(routing, new RegExp(`^${route[1]}:\\s*\\n\\s+path: /studio-example-enterprise/agent/chat`, 'm'));
});

// --- AC2: the answer streams in, across chunk splits, with the "recorded" badge; unknown or malformed events dropped ---

test('AC2: the SSE reader yields the same events however the body is split into chunks', () => {
  const text = sse(TURN);
  const whole = parseInPieces(text, [text.length]);
  assert.deepEqual(whole, TURN);
  for (const sizes of [[1], [2], [3, 7], [5, 1, 13], [64], [17, 4, 2]]) {
    assert.deepEqual(parseInPieces(text, sizes), TURN, `pieces of ${sizes.join(',')}`);
  }
  // UTF-8 split inside a character: streamChat decodes with { stream: true }, tested below
});

test('AC2: the SSE reader takes CRLF, multi-line data, comments and other fields; it drops malformed and unknown events', () => {
  const text = [
    ': keep-alive comment\r\n\r\n',
    'event: message\r\nid: 4\r\ndata: {"type":"text-delta",\r\ndata: "text":"two lines"}\r\n\r\n',
    'data: {not json}\n\n',
    'data: {"type":"thinking","content":"hidden thoughts"}\n\n',
    'data: {"type":"debug","message":"internal"}\n\n',
    'data: {"type":"brand-new-event","x":1}\n\n',
    'data: {"type":"text-delta","text":42}\n\n',
    'data: {"type":"widget","widgetType":"w","data":"not an object"}\n\n',
    'data: ["an","array"]\n\n',
    'data: null\n\n',
    'data: {"type":"text-delta","text":"ok"}\n\n',
    'data: {"type":"text-delta","text":"cut off at the end, no blank line"}'
  ].join('');
  for (const sizes of [[text.length], [1], [6]]) {
    assert.deepEqual(parseInPieces(text, sizes), [
      { type: 'text-delta', text: 'two lines' },
      { type: 'text-delta', text: 'ok' }
    ]);
  }
  assert.equal(stream.toAgentEvent({ type: 'turn-ended', status: 'completed' }).type, 'turn-ended');
  assert.equal(stream.toAgentEvent({ type: 'system-notice', messageKey: 7 }), null);
  assert.equal(stream.toAgentEvent({ type: 'error' }), null);
  assert.equal(stream.toAgentEvent('text-delta'), null);
});

test('AC2: streamChat POSTs the question and hands every event to the panel as it arrives, to complete', async () => {
  const text = sse(TURN);
  // chunks cut through a JSON value and through the two bytes of an "ü"
  const withUmlaut = text.replace('Thunder Loop brief', 'Thünder Loop brief');
  const bytes = new TextEncoder().encode(withUmlaut);
  const cut = bytes.indexOf(0xc3) + 1;
  const body = new ReadableStream({
    start (c) { c.enqueue(bytes.slice(0, 40)); c.enqueue(bytes.slice(40, cut)); c.enqueue(bytes.slice(cut)); c.close(); }
  });
  const { outcome, seen, calls } = await chat(new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } }));
  assert.deepEqual(outcome, { kind: 'complete' });
  assert.deepEqual(types(seen), types(TURN));
  assert.equal(seen[3].text, 'Thünder Loop brief: ');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/studio-example-enterprise/agent/chat');
  assert.equal(calls[0].init.method, 'POST');
  assert.equal(calls[0].init.credentials, 'include');
  assert.equal(calls[0].init.redirect, 'manual', 'never follows a login redirect');
  assert.equal(new Headers(calls[0].init.headers).get('Content-Type'), 'application/json');
  assert.deepEqual(JSON.parse(calls[0].init.body), { message: 'Does rev3 meet the brief?' });

  const withSession = await chat(streamedResponse([text]), { sessionId: 's1' });
  assert.deepEqual(JSON.parse(withSession.calls[0].init.body), { message: 'Does rev3 meet the brief?', sessionId: 's1' });
});

test('AC2: the turn shows the "recorded" badge only when the stream carried the recorded notice, and builds the text from the deltas', () => {
  const recorded = playTurn(TURN);
  assert.equal(recorded.recorded, true);
  assert.equal(recorded.text, 'I read the Thunder Loop brief: no point above 45 m. ');
  assert.equal(recorded.status, 'done');
  assert.equal(recorded.widgets.length, 1);
  assert.equal(recorded.widgets[0].widgetType, 'kingdom-supplier-note');
  // contract C3 names the key agent.recorded; F127 sends "recorded": both carry the badge
  assert.equal(playTurn([{ type: 'system-notice', messageKey: 'agent.recorded' }, ...TURN.slice(1)]).recorded, true);

  const live = playTurn(TURN.slice(1));
  assert.equal(live.recorded, false, 'no notice, no badge: a live answer never carries it');
  assert.equal(playTurn([{ type: 'system-notice', messageKey: 'agent.rate-limited' }, ...TURN.slice(1)]).recorded, false);

  // waiting (typing indicator) until the first delta, then streaming
  let turn = events.startTurn('q');
  assert.equal(turn.status, 'waiting');
  turn = events.reduceTurn(turn, TURN[0]);
  turn = events.reduceTurn(turn, TURN[1]);
  assert.equal(turn.status, 'waiting');
  turn = events.reduceTurn(turn, TURN[2]);
  assert.equal(turn.status, 'streaming');
  assert.equal(events.isRunning(turn), true);
  assert.equal(events.isRunning(events.finishTurn(turn, { kind: 'complete' })), false);

  // an error event is an inline error bubble, the turn still ends normally
  const failed = playTurn([TURN[1], { type: 'error', message: 'The Supplier note could not be prepared.' }, TURN[6], TURN[7]]);
  assert.deepEqual(failed.errors, ['The Supplier note could not be prepared.']);
  assert.equal(failed.status, 'done');

  // the panel's bubble is aria-live and carries the QA hooks
  const panel = panelSource();
  assert.match(panel, /aria-live="polite"/);
  assert.match(panel, /data-agent-text/);
  assert.match(panel, /data-agent-badge="recorded"/);
  assert.match(panel, /turn\.recorded &&/);
  assert.match(panel, /data-agent-panel/);
});

// --- AC3: plain text only ---

test('AC3: HTML in agent text and widget data stays plain text', () => {
  const html = '<img src=x onerror="alert(1)"><b>bold</b> **not markdown**';
  const turn = playTurn([
    TURN[1],
    { type: 'text-delta', text: html },
    { type: 'widget', widgetType: 'kingdom-supplier-note', data: { proposalId: 'p1', text: html, assetId: 9, revision: 3 } },
    { type: 'widget', widgetType: 'unknown-widget', data: { summary: '<script>alert(2)</script>' } },
    { type: 'error', message: '<a href="javascript:alert(3)">x</a>' },
    TURN[7]
  ]);
  assert.equal(turn.text, html, 'kept verbatim, as a string, for React to render as a text node');
  assert.equal(events.widgetText(turn.widgets[0]), html);
  assert.equal(events.widgetText(turn.widgets[1]), '<script>alert(2)</script>');
  assert.equal(events.widgetText({ widgetType: 'x', data: { other: 1 } }), null);
  assert.equal(turn.errors[0], '<a href="javascript:alert(3)">x</a>');

  // and the panel renders them as JSX text
  const panel = panelSource();
  assert.match(panel, /\{ turn\.text \}/);
  assert.match(panel, /\{ widgetText\(widget\) \}/);
});

test('AC3: no file under agent/ renders HTML or markdown', () => {
  const files = agentFiles();
  assert.ok(files.length >= 5, `the agent folder's modules (${files.join(', ')})`);
  for (const file of files) {
    const source = read(join(agentDir, file));
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|innerHTML|outerHTML|insertAdjacentHTML|SanitizeHtml/, file);
    assert.doesNotMatch(source, /from ['"](marked|markdown-it|react-markdown|remark[^'"]*|micromark|showdown|snarkdown)['"]/, file);
  }
});

// --- AC4: failures and closing ---

test('AC4: 401, 403, a redirect (302 or opaque) and a followed redirect say "Please sign in again"', async () => {
  for (const status of [401, 403]) {
    const { outcome, seen } = await chat(new Response(JSON.stringify({ error: 'no' }), { status, headers: { 'Content-Type': 'application/json' } }));
    assert.deepEqual(outcome, { kind: 'auth' }, String(status));
    assert.deepEqual(seen, []);
  }
  assert.deepEqual((await chat({ type: 'basic', status: 302, ok: false, redirected: false, headers: new Headers(), body: null })).outcome, { kind: 'auth' });
  assert.deepEqual((await chat({ type: 'opaqueredirect', status: 0, ok: false, redirected: false, headers: new Headers(), body: null })).outcome, { kind: 'auth' });
  const followed = streamedResponse(['<html>login</html>'], { contentType: 'text/html' });
  Object.defineProperty(followed, 'redirected', { value: true });
  assert.deepEqual((await chat(followed)).outcome, { kind: 'auth' }, 'the login page is never read as the answer');

  assert.equal(events.FAILURE_TEXT.auth, 'Please sign in again');
  const turn = events.finishTurn(events.startTurn('q'), { kind: 'auth' });
  assert.equal(turn.status, 'failed');
  assert.equal(turn.failure, 'auth');
});

test('AC4: 5xx, a network error, a non-stream answer and a stream ending without complete say "The assistant is not available"', async () => {
  for (const status of [500, 502, 503]) {
    assert.deepEqual((await chat(new Response('oops', { status }))).outcome, { kind: 'unavailable' }, String(status));
  }
  assert.deepEqual((await chat(new TypeError('Failed to fetch'))).outcome, { kind: 'unavailable' });
  assert.deepEqual((await chat(streamedResponse(['<html></html>'], { contentType: 'text/html' }))).outcome, { kind: 'unavailable' });

  const cut = await chat(streamedResponse([sse(TURN.slice(0, 4))]));
  assert.deepEqual(cut.outcome, { kind: 'unavailable' }, 'no complete: an error');
  assert.deepEqual(types(cut.seen), types(TURN.slice(0, 4)), 'what came is shown');

  const broken = new ReadableStream({ start (c) { c.enqueue(new TextEncoder().encode(sse(TURN.slice(0, 2)))); c.error(new Error('reset')); } });
  assert.deepEqual((await chat(new Response(broken, { headers: { 'Content-Type': 'text/event-stream' } }))).outcome, { kind: 'unavailable' });

  assert.equal(events.FAILURE_TEXT.unavailable, 'The assistant is not available');
  const turn = playTurn(TURN.slice(0, 4), { kind: 'unavailable' });
  assert.equal(turn.status, 'failed');
  assert.equal(turn.failure, 'unavailable');
  assert.equal(turn.text, 'I read the Thunder Loop brief: ', 'the partial answer stays');

  // the panel offers a retry for both failures
  const panel = panelSource();
  assert.match(panel, /FAILURE_TEXT\[turn\.failure\]/);
  assert.match(panel, /Retry/);
  assert.match(panel, /onClick=\{ \(\) => \{ retry\(turn\) \} \}|onClick=\{ \(\) => retry\(turn\) \}/);
});

test('AC4: aborting (Escape, closing the panel) stops the request and the stream', async () => {
  // aborted before the answer
  const early = new AbortController();
  early.abort();
  const before = await chat(async (init) => { init.signal.throwIfAborted(); return streamedResponse([sse(TURN)]); }, { signal: early.signal });
  assert.deepEqual(before.outcome, { kind: 'aborted' });
  assert.equal(before.calls[0].init.signal, early.signal, 'the signal goes to fetch');

  // aborted while streaming: the reader stops, no more events
  const controller = new AbortController();
  const encoder = new TextEncoder();
  let cancelled = false;
  const body = new ReadableStream({
    start (c) { c.enqueue(encoder.encode(sse(TURN.slice(0, 3)))); },
    cancel () { cancelled = true; }
  });
  const seen = [];
  const outcome = await stream.streamChat({
    chatUrl: '/c',
    message: 'q',
    signal: controller.signal,
    fetchImpl: async () => new Response(body, { headers: { 'Content-Type': 'text/event-stream' } }),
    onEvent: (e) => { seen.push(e); if (seen.length === 3) controller.abort(); }
  });
  assert.deepEqual(outcome, { kind: 'aborted' });
  assert.equal(seen.length, 3);
  assert.equal(cancelled, true, 'the body is cancelled');
  assert.equal(events.finishTurn(events.startTurn('q'), { kind: 'aborted' }).status, 'cancelled');

  // the panel is a dialog; Escape and the close button close it, and closing aborts
  const panel = panelSource();
  assert.match(panel, /role="dialog"/);
  assert.match(panel, /aria-modal="true"/);
  assert.match(panel, /event\.key === 'Escape'/);
  assert.match(panel, /abortRef\.current\?\.abort\(\)/);
  assert.match(panel, /return \(\) => \{[^}]*abortRef\.current\?\.abort\(\)/, 'unmounting aborts too');
});

// --- README ---

test('the agent README names the extension point, the contract and how to try it', () => {
  const readme = read(join(agentDir, 'README.md'));
  assert.match(readme, /slots\.headerActions/);
  assert.match(readme, /studio_example_enterprise\.agent\.enabled/);
  assert.match(readme, /getFrontendConfig\(\)/);
  assert.match(readme, /system-notice/);
  assert.match(readme, /layout\/studio\.html\.twig/, 'names the layout that renders headerActions');
  assert.match(readme, /data-agent-button/);
});

// --- layout (verifier FAIL 2026-11-02: the phone page scrolled sideways, the sheet lay over the header) ---

test('AC2: the panel fits the window: below the header, never wider than the window, the page behind inert', () => {
  const panel = panelSource();
  assert.doesNotMatch(panel, /100vw/, 'the sheet is sized by its overlay, not the viewport (100vw counts the scrollbar)');
  assert.match(panel, /width: 'min\(440px, 100%\)', maxWidth: '100%', minWidth: 0/);
  assert.match(panel, /overflow: 'hidden'/, 'nothing in the overlay can widen the page');
  assert.match(panel, /getElementById\(HEADER_ID\)/, 'the overlay starts at the header\'s bottom');
  assert.match(panel, /position: 'fixed', top, left: 0, right: 0, bottom: 0/);
  assert.match(panel, /setAttribute\('inert', ''\)/, 'the page behind takes no focus or clicks');
  assert.match(panel, /removeAttribute\('inert'\)/, 'closing gives the page back');
  assert.match(panel, /visibility = query\?\.matches === true \? 'hidden'/, 'on a phone the covered page is not drawn');
  assert.match(panel, /askInputStyle: React\.CSSProperties = \{ flex: '1 1 auto', minWidth: 0 \}/, 'the question field may shrink');
});
