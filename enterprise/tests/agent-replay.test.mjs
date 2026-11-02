// F127: the portal's agent chat route POST /studio-example-enterprise/agent/chat (src/Portal/Agent) replays a recorded
// turn as PimcoreAgentBundle's own AgentEvents over text/event-stream. The text is recorded
// (demo-data/agent/kingdom-brief-check.replay.json); the tool results come live from F126's KingdomBriefTools, so the
// answer shows the real permission filter. No key, no network, no agent-server, no Mercure.
// The logic tests need the php CLI only (the Portal Engine, Pimcore, Symfony security and PSR-6 are stubbed below).
// The HTTP tests also use symfony/http-foundation from a Pimcore vendor/ (PIMCORE_VENDOR_AUTOLOAD, else
// /var/www/html/vendor/autoload.php); they skip without one.
// The 2026.3 events.ts union is pinned in fixtures/agent-server-events-2026.3.json (path and commit inside).
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentSrc = join(enterpriseDir, 'src/Agent');
const routeSrc = join(enterpriseDir, 'src/Portal/Agent');
const demoData = join(enterpriseDir, 'demo-data');
const replayFile = join(demoData, 'agent/kingdom-brief-check.replay.json');
const read = (path) => readFileSync(path, 'utf8');
const eventsFixture = JSON.parse(read(join(enterpriseDir, 'tests/fixtures/agent-server-events-2026.3.json')));
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const httpFoundation = join(dirname(autoload), 'symfony/http-foundation/StreamedResponse.php');
const vendorSkip = !existsSync(autoload)
  ? `no Pimcore vendor at ${autoload}`
  : !existsSync(httpFoundation) ? 'symfony/http-foundation is not in that vendor/' : false;

const golden = JSON.parse(read(join(demoData, 'expected-metadata.json')));
const thunderLoop = [1, 2, 3].map((n) => golden.revisions[`thunder-loop-rev${n}.coaster`]);
const SUPPLIER_EMAIL = 'supplier@loopwerk.example';

// Stubs of what src/Agent and src/Portal/Agent use, then the classes under test (no PimcoreAgentBundle class at all),
// an in-memory KingdomSource (Thunder Loop, asset 10, revisions 1-3, in the supplier's workspace; Night Fury, asset 20,
// outside it) and a fake clock: sleep() only moves now() on, and both are recorded.
const stubs = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject {
    interface PortalUserInterface {
        public function getId(): ?int;
        public function isGuestUser(): bool;
        public function isPortalShareUser(): bool;
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security {
    class SecurityService {
        public function __construct(public ?\\Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface $user = null) {}
        public function getPortalUser(): ?\\Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface { return $this->user; }
    }
}
`;
const nonVendorStubs = `
namespace Symfony\\Component\\Security\\Core\\Authentication\\Token {
    interface TokenInterface {}
}
namespace Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage {
    interface TokenStorageInterface { public function getToken(): ?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface; public function setToken(?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface $token): void; }
}
namespace Psr\\Cache {
    interface CacheItemInterface { public function get(): mixed; public function isHit(): bool; public function set(mixed $value): static; public function expiresAfter(int|\\DateInterval|null $time): static; }
    interface CacheItemPoolInterface { public function getItem(string $key): CacheItemInterface; public function save(CacheItemInterface $item): bool; public function deleteItem(string $key): bool; }
}
`;
const classes = `
namespace {
    foreach (['NoPortalUserException', 'KingdomSource', 'PortalUserContext', 'ProposalStore', 'KingdomBriefTools'] as $class) {
        require ${JSON.stringify(agentSrc)} . '/' . $class . '.php';
    }
    foreach (['ChatAccess', 'ReplayPlayer'] as $class) {
        require ${JSON.stringify(routeSrc)} . '/' . $class . '.php';
    }
    use Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent as A;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Agent as R;

    class TestPortalUser implements PortalUserInterface {
        public function __construct(public ?int $id, public array $workspaces, public bool $guest = false, public bool $share = false, public string $email = ${JSON.stringify(SUPPLIER_EMAIL)}) {}
        public function getId(): ?int { return $this->id; }
        public function isGuestUser(): bool { return $this->guest; }
        public function isPortalShareUser(): bool { return $this->share; }
    }
    class TestTokenStorage implements \\Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage\\TokenStorageInterface {
        public function getToken(): ?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface { return null; }
        public function setToken(?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface $token): void {}
    }
    class TestItem implements \\Psr\\Cache\\CacheItemInterface {
        public mixed $value = null; public bool $hit = false; public ?int $ttl = null;
        public function __construct(public string $key) {}
        public function getKey(): string { return $this->key; }
        public function get(): mixed { return $this->value; }
        public function isHit(): bool { return $this->hit; }
        public function set(mixed $value): static { $this->value = $value; return $this; }
        public function expiresAt(?\\DateTimeInterface $expiration): static { return $this; }
        public function expiresAfter(int|\\DateInterval|null $time): static { $this->ttl = $time; return $this; }
    }
    class TestPool implements \\Psr\\Cache\\CacheItemPoolInterface {
        public array $items = [];
        public function getItem(string $key): \\Psr\\Cache\\CacheItemInterface { return isset($this->items[$key]) ? clone $this->items[$key] : new TestItem($key); }
        public function getItems(array $keys = []): iterable { return []; }
        public function hasItem(string $key): bool { return isset($this->items[$key]); }
        public function clear(): bool { $this->items = []; return true; }
        public function deleteItems(array $keys): bool { return true; }
        public function saveDeferred(\\Psr\\Cache\\CacheItemInterface $item): bool { return $this->save($item); }
        public function commit(): bool { return true; }
        public function save(\\Psr\\Cache\\CacheItemInterface $item): bool { $item->hit = true; $this->items[$item->key] = clone $item; return true; }
        public function deleteItem(string $key): bool { unset($this->items[$key]); return true; }
    }
    class TestSource implements A\\KingdomSource {
        public function briefText(): ?string { return ${JSON.stringify(read(join(demoData, 'brief.md')))}; }
        public function coasterRevisions(): array {
            $revisions = [];
            foreach (json_decode(${JSON.stringify(JSON.stringify(thunderLoop))}, true) as $i => $m) {
                $revisions[] = ['assetId' => 10, 'path' => '/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster', 'revision' => $i + 1, 'maxHeightM' => (float) $m['maxHeight'], 'lengthM' => (float) $m['length']];
            }
            $revisions[] = ['assetId' => 20, 'path' => '/Pimcore Kingdom/Night Fury/night-fury.coaster', 'revision' => 1, 'maxHeightM' => 40.0, 'lengthM' => 500.0];
            return $revisions;
        }
        public function mayView(PortalUserInterface $user, int $assetId): bool {
            $path = $assetId === 10 ? '/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster' : '/Pimcore Kingdom/Night Fury/night-fury.coaster';
            foreach ($user->workspaces as $workspace) { if (str_starts_with($path, $workspace . '/')) return true; }
            return false;
        }
    }
    class FakeClock {
        public int $nowMs = 1700000000000;
        public array $sleeps = [];
        public function sleep(): \\Closure { return function (int $ms): void { $this->sleeps[] = $ms; $this->nowMs += $ms; }; }
        public function now(): \\Closure { return fn (): int => $this->nowMs; }
    }

    // The Loopwerk supplier: portal user 7, its workspace the Thunder Loop folder.
    function supplier(): TestPortalUser { return new TestPortalUser(7, ['/Pimcore Kingdom/Thunder Loop']); }
    function security(?PortalUserInterface $user): \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService {
        return new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService($user);
    }
    function player(?PortalUserInterface $user, TestPool $pool, FakeClock $clock): R\\ReplayPlayer {
        $tools = new A\\KingdomBriefTools(new A\\PortalUserContext(security($user), new TestTokenStorage()), new TestSource(), new A\\ProposalStore($pool, 900));
        return new R\\ReplayPlayer($tools, ${JSON.stringify(replayFile)}, $clock->sleep(), $clock->now());
    }
    // Plays one question and returns the events, each with the sleeps made before it, and the stored proposals.
    function replay(string $question, ?PortalUserInterface $user = null): array {
        $pool = new TestPool();
        $clock = new FakeClock();
        $events = [];
        player($user ?? supplier(), $pool, $clock)->play($question, function (array $event) use (&$events, $clock): void {
            $events[] = ['event' => $event, 'sleptBefore' => count($clock->sleeps)];
        });
        return ['events' => $events, 'sleeps' => $clock->sleeps, 'proposals' => array_map(static fn ($i) => $i->value, array_values($pool->items))];
    }
}
`;

const runPhp = (script) => {
  try {
    return JSON.parse(execFileSync('php', ['-d', 'display_errors=1', '-d', 'html_errors=0', '-r', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    // a PHP error is in its output; a JSON error (or a crash without output) in the message
    throw new Error(`php failed: ${e.stderr || ''} ${e.stdout || ''} ${e.stderr || e.stdout ? '' : e.message}`.slice(-1500));
  }
};
const useLines = 'use Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface;\nuse Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent as A;\nuse Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Agent as R;';
// Logic tests: stubs only.
const php = (body) => runPhp(`${stubs}${nonVendorStubs}${classes}\nnamespace {\n${useLines}\n${body}\n}\n`);
// HTTP tests: the stubs first (so the vendor's own Portal Engine classes are never loaded), then the vendor autoloader
// for Symfony's HttpFoundation, security and PSR-6, then the controller.
const phpHttp = (body) => runPhp(`${stubs}\nnamespace { require ${JSON.stringify(autoload)}; }\n${classes}
namespace {
${useLines}
require ${JSON.stringify(routeSrc)} . '/AgentChatController.php';
use Symfony\\Component\\HttpFoundation\\Request;
class TestAuthorization implements \\Symfony\\Component\\Security\\Core\\Authorization\\AuthorizationCheckerInterface {
    public array $asked = [];
    public function __construct(private bool $portalAccess) {}
    public function isGranted(mixed $attribute, mixed $subject = null): bool { $this->asked[] = $attribute; return $this->portalAccess && $attribute === 'portal-access'; }
}
// A POST to the chat route on the portal host https://portal.kingdom.test.
function chatRequest(string $message, ?string $origin = 'https://portal.kingdom.test'): Request {
    $request = Request::create('https://portal.kingdom.test/studio-example-enterprise/agent/chat', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['message' => $message]));
    if ($origin !== null) { $request->headers->set('Origin', $origin); }
    return $request;
}
// Calls the controller and sends the response; every flush is one chunk of the body.
function send(Request $request, ?PortalUserInterface $user, bool $portalAccess = true): array {
    $pool = new TestPool();
    $clock = new FakeClock();
    $authorization = new TestAuthorization($portalAccess);
    $controller = new R\\AgentChatController(security($user), $authorization, player($user, $pool, $clock));
    $response = $controller($request);
    $chunks = [];
    ob_start(function (string $buffer) use (&$chunks): string { if ($buffer !== '') { $chunks[] = $buffer; } return ''; }, 1);
    $response->sendContent();
    ob_end_flush();
    return [
        'status' => $response->getStatusCode(),
        'class' => get_class($response),
        'headers' => array_map(static fn ($v) => $v[0], $response->headers->all()),
        'chunks' => $chunks,
        'body' => implode('', $chunks),
        'asked' => $authorization->asked,
        'proposals' => array_map(static fn ($i) => $i->value, array_values($pool->items)),
    ];
}
${body}
}
`);

const QUESTION = 'Does my latest Thunder Loop revision meet the brief?';
const types = (result) => result.events.map((e) => e.event.type);
const texts = (result) => result.events.filter((e) => e.event.type === 'text-delta').map((e) => e.event.text).join('');
const widgetOf = (result) => result.events.find((e) => e.event.type === 'widget')?.event;
const sseEvents = (body) => body.split('\n\n').filter(Boolean).map((block) => {
  assert.match(block, /^data: /, `an SSE data line: ${block}`);
  return JSON.parse(block.slice('data: '.length));
});

// An event is in the pinned 2026.3 union: a known type, its required fields of the right kind, no unknown field.
function assertAgentEvent (event) {
  const fields = eventsFixture.types[event.type];
  assert.ok(fields, `${event.type} is an AgentEvent type of events.ts on 2026.3`);
  const kinds = { ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k.replace(/\?$/, ''), v])), ...eventsFixture.addedBySse };
  for (const [name, kind] of Object.entries(fields)) {
    const key = name.replace(/\?$/, '');
    if (name.endsWith('?') && !(key in event)) continue;
    assert.ok(key in event, `${event.type} has ${key}`);
  }
  for (const [key, value] of Object.entries(event)) {
    if (key === 'type') continue;
    const kind = kinds[key];
    assert.ok(kind, `${event.type} has no field ${key} in events.ts`);
    if (Array.isArray(kind)) assert.ok(kind.includes(value), `${event.type}.${key} is one of ${kind}`);
    else if (kind === 'array') assert.ok(Array.isArray(value), `${event.type}.${key} is an array`);
    else if (kind === 'object') assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${event.type}.${key} is an object`);
    else assert.equal(typeof value, kind, `${event.type}.${key} is a ${kind}`);
  }
}

// What must never be in the replay file or the stream (AC4).
const LEAKS = [
  [/cookie/i, 'a cookie'],
  [/PHPSESSID|session[_-]?id/i, 'a session id'],
  [/pmcp_/, 'a pmcp_ token'],
  [/user[_-]?id/i, 'a user id'],
  [/[\w.+-]+@[\w-]+\.[\w.]+/, 'an e-mail address'],
  [/api[_-]?key|access[_-]?key|private[_-]?key|secret|bearer|\bsk-[A-Za-z0-9]/i, 'a key'],
];
function assertNoLeak (text, where) {
  for (const [pattern, what] of LEAKS) assert.doesNotMatch(text, pattern, `no ${what} in ${where}`);
}

// ---- AC1 ----

test('AC1: no portal login, a guest, a public-share user or the stand-in admin get 401; without PORTAL_ACCESS or from another Origin 403; else nothing is denied', () => {
  const result = php(`
    $portal = 'https://portal.kingdom.test';
    $deny = static fn (?PortalUserInterface $user, bool $access = true, ?string $origin = 'https://portal.kingdom.test') => R\\ChatAccess::deny($user, $access, $origin, $portal);
    echo json_encode([
      'nobody' => $deny(null),
      'guest' => $deny(new TestPortalUser(9, [], guest: true)),
      'publicShare' => $deny(new TestPortalUser(9, [], share: true)),
      'standInAdmin' => $deny(new TestPortalUser(null, [])),
      'nobodyFromElsewhere' => $deny(null, false, 'https://evil.test'),
      'noPortalAccess' => $deny(supplier(), false),
      'otherOrigin' => $deny(supplier(), true, 'https://evil.test'),
      'otherPort' => $deny(supplier(), true, 'https://portal.kingdom.test:8443'),
      'noOrigin' => $deny(supplier(), true, null),
      'nullOrigin' => $deny(supplier(), true, 'null'),
      'supplier' => $deny(supplier()),
    ]);
  `);
  for (const who of ['nobody', 'guest', 'publicShare', 'standInAdmin', 'nobodyFromElsewhere']) assert.equal(result[who]?.[0], 401, `${who}: 401`);
  for (const who of ['noPortalAccess', 'otherOrigin', 'otherPort', 'noOrigin', 'nullOrigin']) assert.equal(result[who]?.[0], 403, `${who}: 403`);
  assert.equal(result.supplier, null);
});

test('AC1: the route answers JSON 401 (never a redirect) without a portal login, 403 without PORTAL_ACCESS or from another Origin, and stores nothing', { skip: vendorSkip }, () => {
  const result = phpHttp(`
    echo json_encode([
      'nobody' => send(chatRequest('${QUESTION}'), null),
      'guest' => send(chatRequest('${QUESTION}'), new TestPortalUser(9, [], guest: true)),
      'noPortalAccess' => send(chatRequest('${QUESTION}'), supplier(), false),
      'otherOrigin' => send(chatRequest('${QUESTION}', 'https://evil.test'), supplier()),
      'noOrigin' => send(chatRequest('${QUESTION}', null), supplier()),
    ]);
  `);
  for (const [who, status] of [['nobody', 401], ['guest', 401], ['noPortalAccess', 403], ['otherOrigin', 403], ['noOrigin', 403]]) {
    const r = result[who];
    assert.equal(r.status, status, `${who}: ${status}`);
    assert.equal(r.headers.location, undefined, `${who}: no redirect`);
    assert.match(r.headers['content-type'], /^application\/json/, `${who}: JSON`);
    assert.equal(typeof JSON.parse(r.body).error, 'string', `${who}: an error message`);
    assert.deepEqual(r.proposals, [], `${who}: no proposal`);
    assert.doesNotMatch(r.body, /data: /, `${who}: no event stream`);
  }
});

test('AC1: the route is POST-only on portal sites at /studio-example-enterprise/agent/chat, and its code makes no outbound call', () => {
  const routing = read(join(enterpriseDir, 'config/pimcore/routing.yaml'));
  const block = routing.match(/^pimcore_studio_example_enterprise_agent_chat:\n((?: {4}.*\n?|\s*#.*\n?)+)/m)?.[1];
  assert.ok(block, 'the route pimcore_studio_example_enterprise_agent_chat is declared');
  assert.match(block, /^ {4}path: \/studio-example-enterprise\/agent\/chat$/m);
  assert.match(block, /^ {4}controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Agent\\AgentChatController::__invoke$/m);
  assert.match(block, /^ {4}condition: "request\.attributes\.get\('isPortalEngineSite'\)"$/m);
  assert.match(block, /^ {4}methods: \[POST\]$/m);

  for (const file of readdirSync(routeSrc).filter((f) => f.endsWith('.php'))) {
    const code = read(join(routeSrc, file));
    for (const outbound of [/curl_/, /HttpClient/, /fsockopen|stream_socket_client/, /Mercure|HubInterface/, /['"]https?:\/\//, /getenv|\$_ENV|\$_SERVER/]) {
      assert.doesNotMatch(code, outbound, `${file}: no ${outbound}`);
    }
  }
});

// ---- AC2 ----

test('AC2: the recorded question streams AgentEvents of the 2026.3 union: the recorded notice first, then turn-started, text in several deltas, the widget, turn-ended and complete', () => {
  const result = php(`echo json_encode(replay('${QUESTION}'));`);
  for (const { event } of result.events) assertAgentEvent(event);
  const seen = types(result);
  assert.deepEqual(result.events[0].event, { type: 'system-notice', messageKey: 'recorded', ts: result.events[0].event.ts });
  assert.equal(seen[1], 'turn-started');
  assert.equal(result.events[1].event.agentName, 'kingdom-brief-check');
  assert.match(result.events[1].event.messageId, /^[0-9a-f]{32}$/);
  assert.ok(seen.filter((t) => t === 'text-delta').length >= 5, 'the text comes in several deltas');
  assert.ok(seen.indexOf('widget') > seen.indexOf('text-delta'), 'the widget follows the first text');
  assert.deepEqual(seen.slice(-2), ['turn-ended', 'complete']);
  assert.equal(result.events.at(-2).event.status, 'completed');
});

test('AC2: with the injected clock the deltas are spaced out: a sleep before every next delta, and each event stamped with the clock', () => {
  const result = php(`echo json_encode(replay('${QUESTION}'));`);
  const deltas = result.events.filter((e) => e.event.type === 'text-delta');
  for (let i = 1; i < deltas.length; i++) {
    assert.ok(deltas[i].sleptBefore > deltas[i - 1].sleptBefore, `a sleep between delta ${i - 1} and ${i}`);
  }
  assert.ok(result.sleeps.every((ms) => ms > 0 && ms <= 1000), 'every sleep is short and positive');
  const stamps = result.events.map((e) => e.event.ts);
  assert.equal(stamps[0], 1700000000000, 'the first event is stamped with the clock\'s time');
  for (let i = 1; i < stamps.length; i++) assert.ok(stamps[i] >= stamps[i - 1], 'time stamps never go back');
  assert.equal(stamps.at(-1) - stamps[0], result.sleeps.reduce((a, b) => a + b, 0), 'the stamps move with the sleeps, never the wall clock');
});

test('AC2: the answer is read live: it names the revisions the supplier may view (Night Fury is filtered out), and a supplier who may view none gets no proposal', () => {
  const result = php(`echo json_encode(['supplier' => replay('${QUESTION}'), 'elsewhere' => replay('${QUESTION}', new TestPortalUser(7, ['/Somewhere Else']))]);`);
  const answer = texts(result.supplier);
  assert.match(answer, /45 m/);
  assert.match(answer, /\b3 revisions\b/);
  assert.match(answer, /revision 3[^.]*52 m/i);
  assert.doesNotMatch(answer, /Night Fury|\{|\}/);

  const none = result.elsewhere;
  for (const { event } of none.events) assertAgentEvent(event);
  assert.match(texts(none), /can't see any revision/);
  assert.equal(widgetOf(none), undefined);
  assert.deepEqual(none.proposals, []);
  assert.deepEqual(types(none).slice(-2), ['turn-ended', 'complete']);
});

test('AC2: any other question gets the one fixed "recorded questions only" reply, in the same event format, and proposes nothing', () => {
  const result = php(`echo json_encode(replay('What is the weather in Storm Valley?'));`);
  for (const { event } of result.events) assertAgentEvent(event);
  assert.equal(result.events[0].event.messageKey, 'recorded');
  assert.match(texts(result), /recorded questions only/);
  assert.ok(texts(result).includes(QUESTION), 'it names the recorded question');
  assert.equal(widgetOf(result), undefined);
  assert.deepEqual(result.proposals, []);
  assert.deepEqual(types(result).slice(-2), ['turn-ended', 'complete']);
});

test('AC2: the question matches regardless of case, spacing and the final punctuation', () => {
  const result = php(`echo json_encode(replay('  does my LATEST thunder loop   revision meet the brief  '));`);
  assert.ok(widgetOf(result), 'the recorded turn ran');
});

test('AC2: the route streams text/event-stream with X-Accel-Buffering: no, flushed in several chunks of SSE data lines', { skip: vendorSkip }, () => {
  const result = phpHttp(`echo json_encode(send(chatRequest('${QUESTION}'), supplier()));`);
  assert.equal(result.status, 200);
  assert.match(result.headers['content-type'], /^text\/event-stream/);
  assert.equal(result.headers['x-accel-buffering'], 'no');
  assert.match(result.headers['cache-control'], /no-cache/);
  const events = sseEvents(result.body);
  for (const event of events) assertAgentEvent(event);
  assert.equal(events[0].messageKey, 'recorded');
  assert.equal(events.at(-1).type, 'complete');
  assert.ok(result.chunks.length >= events.length, `one flush per event (${result.chunks.length} chunks for ${events.length} events)`);
});

test('AC2: a request without a message gets JSON 400 and no stream', { skip: vendorSkip }, () => {
  const result = phpHttp(`
    $request = Request::create('https://portal.kingdom.test/studio-example-enterprise/agent/chat', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json'], '{"message": ""}');
    $request->headers->set('Origin', 'https://portal.kingdom.test');
    echo json_encode(send($request, supplier()));
  `);
  assert.equal(result.status, 400);
  assert.match(result.headers['content-type'], /^application\/json/);
});

// ---- AC3 ----

test('AC3: at its proposal the turn calls F126\'s propose tool for the portal user and sends the stored proposal\'s id in the kingdom-supplier-note widget', () => {
  const result = php(`echo json_encode(replay('${QUESTION}'));`);
  const widget = widgetOf(result);
  assert.equal(widget.widgetType, 'kingdom-supplier-note');
  assert.equal(result.proposals.length, 1, 'one proposal is stored');
  const [stored] = result.proposals;
  assert.equal(stored.portalUserId, 7, 'for the signed-in portal user');
  assert.deepEqual([stored.assetId, stored.revision], [10, 3], 'on the latest revision it may view');
  assert.match(stored.text, /52 m/);
  assert.deepEqual(widget.data, { proposalId: stored.id, assetId: 10, revision: 3, text: stored.text, expiresInSeconds: 900 });
});

test('AC3: through the route, the widget\'s proposal id is the one stored for the portal user', { skip: vendorSkip }, () => {
  const result = phpHttp(`echo json_encode(send(chatRequest('${QUESTION}'), supplier()));`);
  const widget = sseEvents(result.body).find((e) => e.type === 'widget');
  assert.equal(result.proposals.length, 1);
  assert.equal(widget.data.proposalId, result.proposals[0].id);
  assert.equal(result.proposals[0].portalUserId, 7);
});

// ---- AC4 ----

test('AC4: the replay file holds no cookie, session id, pmcp_ token, user id, e-mail or key', () => {
  const text = read(replayFile);
  assertNoLeak(text, 'demo-data/agent/kingdom-brief-check.replay.json');
  const replay = JSON.parse(text);
  assert.equal(replay.agentName, 'kingdom-brief-check');
  assert.ok(replay.turns.length >= 1);
});

test('AC4: the streamed events hold none of them either, nor the supplier\'s e-mail or portal user id', () => {
  const result = php(`echo json_encode([replay('${QUESTION}'), replay('Hello?')]);`);
  for (const run of result) {
    const stream = JSON.stringify(run.events.map((e) => e.event));
    assertNoLeak(stream, 'the stream');
    assert.ok(!stream.includes(SUPPLIER_EMAIL));
    assert.ok(!run.events.some((e) => JSON.stringify(e.event.data ?? {}).match(/"portalUserId"|":7[,}]/)), 'no portal user id in a widget');
  }
});

// ---- AC5 ----

test('AC5: the replay needs only F126\'s service: no PimcoreAgentBundle or MCP class in src/Portal/Agent, and its services load on every boot', () => {
  for (const file of readdirSync(routeSrc).filter((f) => f.endsWith('.php'))) {
    const code = read(join(routeSrc, file));
    assert.doesNotMatch(code, /Bundle\\PimcoreAgentBundle|\\Mcp\\|Agent\\Tools\\/, `${file} uses no PimcoreAgentBundle class`);
  }
  const config = read(join(enterpriseDir, 'config/portal-agent.yaml'));
  assert.doesNotMatch(config, /^\s*pimcore_agent:/m, 'no pimcore_agent key (an unknown extension stops the boot)');
  assert.match(config, /Portal\\Agent\\AgentChatController:/);
  assert.match(config, /Portal\\Agent\\ReplayPlayer:/);
  assert.match(read(join(routeSrc, 'ReplayPlayer.php')), /DEFAULT_REPLAY = 'demo-data\/agent\/kingdom-brief-check\.replay\.json'/);
  // the logic tests above ran with no PimcoreAgentBundle class defined at all
  const result = php(`echo json_encode(['agentBundle' => class_exists('Pimcore\\\\Bundle\\\\PimcoreAgentBundle\\\\PimcoreAgentBundle', false), 'played' => count(replay('${QUESTION}')['events']) > 0]);`);
  assert.deepEqual(result, { agentBundle: false, played: true });
});

test('AC5: the test pins the 2026.3 events.ts union with its path and commit', () => {
  assert.equal(eventsFixture.source.branch, '2026.3');
  assert.equal(eventsFixture.source.path, 'bundles/PimcoreAgentBundle/agent-server/src/types/events.ts');
  assert.match(eventsFixture.source.commit, /^[0-9a-f]{40}$/);
  for (const type of ['system-notice', 'turn-started', 'text-delta', 'widget', 'turn-ended', 'complete']) {
    assert.ok(eventsFixture.types[type], `${type} is pinned`);
  }
});
