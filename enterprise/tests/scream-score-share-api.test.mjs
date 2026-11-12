// F324: the scream score's JSON endpoint for a public share's coaster page
// (src/Portal/ScreamScore/ShareRatingController.php): GET gives the share's coaster and a CSRF token, POST stores a
// guest's rating through ScreamScore's rules. The ride is found from the share's hash and the asset id only.
// The controller tests run the real controller with Symfony's Request and CSRF token manager from a Pimcore install's
// vendor/ (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php), the worktree's own classes loaded first,
// the InMemory store, passes and failure counter, and stand-ins for Portal Engine's PublicShareService and Pimcore's
// Asset; they skip without one (like scream-score-guest).
// Run: node --test enterprise/tests/scream-score-share-api.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');
const passes = JSON.parse(read('tests/fixtures/scream-score/passes.json'));
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const hasPhp = (() => {
  try {
    execFileSync('php', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const skip = !hasPhp ? 'no php CLI' : !existsSync(autoload) ? `no Pimcore vendor at ${autoload}` : false;

const ROUTE = 'pimcore_studio_example_enterprise_scream_score_share';
const GUEST_ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';
const COASTER_FILE_ROUTE = 'pimcore_studio_example_enterprise_coaster_file';
const HASH = 'a'.repeat(32);
const EXPIRED_HASH = 'e'.repeat(32);
const OTHER_HASH = 'b'.repeat(32);
const NO_RIDE = { error: 'This ride has no scream score' };
const WRONG_PASS = "We don't know this pass number and code. Check the back of your pass.";
const PORTAL = 'http://portal.localhost';

// Assets: 101 thunder-loop.coaster and 103 photo.jpg in share HASH, 102 wild-mouse.coaster in share OTHER_HASH only,
// 104 unknown-ride.coaster (no such ride) in share HASH, 105 thunder-loop.coaster in the expired share.
const bootstrap = `
namespace Pimcore\\Model {
    class Asset {
        public static array $byId = [];
        public function __construct(private int $id, private string $filename) { self::$byId[$id] = $this; }
        public static function getById(int|string $id, array $params = []): ?static { return self::$byId[(int) $id] ?? null; }
        public function getId(): ?int { return $this->id; }
        public function getFilename(): ?string { return $this->filename; }
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare {
    // Like Portal Engine's: validateByHash() throws NotFoundHttpException for an unknown hash, PublicShareExpiredException for an expired one.
    class PublicShareService {
        public function __construct(private array $items, private array $expired) {}
        public function validateByHash(?string $hash) {
            if (in_array($hash, $this->expired, true)) { throw new \\Pimcore\\Bundle\\PortalEngineBundle\\Exception\\PublicShareExpiredException('PublicShare is expired.'); }
            if (!isset($this->items[$hash])) { throw new \\Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException('PublicShare not found.'); }
            return (object) ['hash' => $hash];
        }
        public function isElementInPublicShare($share, $element) { return in_array($element->getId(), $this->items[$share->hash] ?? [], true); }
    }
}
namespace {
require ${JSON.stringify(autoload)};
// The worktree's classes win over an installed copy of the bundle in vendor/.
spl_autoload_register(static function (string $class): void {
    $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
    if (str_starts_with($class, $prefix)) {
        $file = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
}, true, true);

use Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\ShareRatingController;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\ScreamScore;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\{InMemoryFeedbackStore, InMemoryAnnualPasses, InMemoryFailureCounter, InMemoryRides};
use Pimcore\\Model\\Asset;
use Symfony\\Component\\HttpFoundation\\{Request, RequestStack};
use Symfony\\Component\\HttpFoundation\\Session\\Session;
use Symfony\\Component\\HttpFoundation\\Session\\Storage\\MockArraySessionStorage;
use Symfony\\Component\\Security\\Csrf\\CsrfTokenManager;
use Symfony\\Component\\Security\\Csrf\\TokenStorage\\SessionTokenStorage;

new Asset(101, 'thunder-loop.coaster');
new Asset(102, 'wild-mouse.coaster');
new Asset(103, 'photo.jpg');
new Asset(104, 'unknown-ride.coaster');
new Asset(105, 'thunder-loop.coaster');
$shares = new PublicShareService(['${HASH}' => [101, 103, 104], '${OTHER_HASH}' => [102], '${EXPIRED_HASH}' => [105]], ['${EXPIRED_HASH}']);

$store = new InMemoryFeedbackStore();
$service = new ScreamScore($store, InMemoryAnnualPasses::fromCodes(json_decode(${JSON.stringify(JSON.stringify(passes))}, true)), new InMemoryFailureCounter());
$requestStack = new RequestStack();
// the share page's anonymous session; not started until something needs it
$session = new Session(new MockArraySessionStorage());
$services = ['security.csrf.token_manager' => new CsrfTokenManager(null, new SessionTokenStorage($requestStack))];
$container = new class($services) implements \\Psr\\Container\\ContainerInterface {
    public function __construct(private array $services) {}
    public function get(string $id): mixed { return $this->services[$id] ?? throw new \\RuntimeException("no service $id"); }
    public function has(string $id): bool { return isset($this->services[$id]); }
};
$controller = new ShareRatingController($service, new InMemoryRides(['thunder-loop' => 'Thunder Loop', 'wild-mouse' => 'Wild Mouse']), $shares);
$controller->setContainer($container);

/** One request to the endpoint, in the same browser session; $origin false sends no Origin header. */
function api(string $method, string $hash, int $assetId, ?array $body = null, string|false $origin = '${PORTAL}', string $ip = '203.0.113.7'): array {
    global $controller, $requestStack, $session;
    $server = ['REMOTE_ADDR' => $ip, 'CONTENT_TYPE' => 'application/json'];
    if ($origin !== false) { $server['HTTP_ORIGIN'] = $origin; }
    $request = Request::create('${PORTAL}/studio-example-enterprise/scream-score/' . $hash . '/' . $assetId, $method, [], [], [], $server, $body === null ? null : json_encode($body));
    $request->setSession($session);
    $request->attributes->set('_route', '${ROUTE}');
    $requestStack->push($request);
    try {
        $response = $controller($request, $hash, $assetId);
    } finally {
        $requestStack->pop();
    }
    return ['status' => $response->getStatusCode(), 'cache' => $response->headers->get('Cache-Control'), 'type' => $response->headers->get('Content-Type'),
      'json' => json_decode((string) $response->getContent(), true)];
}
function token(string $hash = '${HASH}', int $assetId = 101): string { return (string) (api('GET', $hash, $assetId)['json']['token'] ?? ''); }
function send(array $fields, string $hash = '${HASH}', int $assetId = 101, string|false $origin = '${PORTAL}', string $ip = '203.0.113.7'): array {
    return api('POST', $hash, $assetId, $fields + ['token' => token()], $origin, $ip);
}
function records(): array { global $store; return array_map(fn ($r) => ['ride' => $r->ride, 'score' => $r->screamScore, 'comment' => $r->comment, 'pass' => $r->passNumber, 'visible' => $r->visible], $store->all()); }
`;

const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\n${body}\n}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};

const valid = { score: 8, comment: 'My voice is gone <3', passNumber: 'PK-2026-0004', passCode: '9999' };
const VALID = `json_decode(${JSON.stringify(JSON.stringify(valid))}, true)`;

test('AC1: the route is GET|POST /studio-example-enterprise/scream-score/{hash}/{assetId}, portal sites only, Class::__invoke, a tagged service', () => {
  const routing = read('config/pimcore/routing.yaml');
  const block = routing.match(new RegExp(`^${ROUTE}:\\n((?: {4}.*\\n?)+)`, 'm'))?.[1];
  assert.ok(block, `${ROUTE} is declared`);
  assert.match(block, /^ {4}path: \/studio-example-enterprise\/scream-score\/\{hash\}\/\{assetId\}$/m, 'no language prefix');
  assert.match(block, /^ {4}controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\ShareRatingController::__invoke$/m);
  assert.match(block, /^ {4}methods: \[GET, POST\]$/m);
  assert.match(block, /^ {4}condition: "request\.attributes\.get\('isPortalEngineSite'\)"$/m);
  assert.match(block, /^ {8}assetId: '\\d\+'$/m);
  assert.match(read('src/Portal/ScreamScore/ShareRatingController.php'), new RegExp(`public const ROUTE = '${ROUTE}';`));
  assert.match(read('config/scream-score-demo.yaml'), /Portal\\ScreamScore\\ShareRatingController:\n\s+tags: \['controller\.service_arguments', 'container\.service_subscriber'\]/);
});

test('AC1: a GET without a portal login names the share\'s coaster and gives a CSRF token, and starts the session', { skip }, () => {
  const r = php(`
    $before = $session->isStarted();
    $get = api('GET', '${HASH}', 101, null, false);
    echo json_encode(['before' => $before, 'get' => $get, 'after' => $session->isStarted(), 'records' => records()]);
  `);
  assert.equal(r.before, false);
  assert.equal(r.get.status, 200);
  assert.deepEqual(r.get.json.ride, { key: 'thunder-loop', name: 'Thunder Loop' });
  assert.equal(typeof r.get.json.token, 'string');
  assert.ok(r.get.json.token.length > 10, 'a CSRF token');
  assert.deepEqual(Object.keys(r.get.json).sort(), ['ride', 'token']);
  assert.match(r.get.type, /application\/json/);
  assert.equal(r.after, true, 'the token lives in the share page\'s session, started by the GET');
  assert.deepEqual(r.records, []);
});

test('AC1: an unknown or expired hash, an asset not in the share or not a coaster get the JSON 404 and store nothing', { skip }, () => {
  const r = php(`
    $cases = [
      'unknown' => ['${'c'.repeat(32)}', 101], 'expired' => ['${EXPIRED_HASH}', 105], 'otherShare' => ['${HASH}', 102],
      'notCoaster' => ['${HASH}', 103], 'noRide' => ['${HASH}', 104], 'noAsset' => ['${HASH}', 999],
    ];
    $out = [];
    foreach ($cases as $name => [$hash, $id]) {
      $out[$name] = ['get' => api('GET', $hash, $id), 'post' => api('POST', $hash, $id, ${VALID} + ['token' => token()])];
    }
    echo json_encode(['out' => $out, 'records' => records()]);
  `);
  for (const [name, { get, post }] of Object.entries(r.out)) {
    for (const [method, answer] of Object.entries({ get, post })) {
      assert.equal(answer.status, 404, `${name} ${method}`);
      assert.deepEqual(answer.json, NO_RIDE, `${name} ${method}: JSON, never the portal's expired page`);
    }
  }
  assert.deepEqual(r.records, [], 'nothing is stored');
});

test('AC2: a valid POST stores the rating for the share\'s coaster; a second send answers replaced with the earlier score', { skip }, () => {
  const r = php(`
    $first = send(['score' => 6, 'comment' => 'Wow', 'passNumber' => 'pk-2026-0004', 'passCode' => '9999', 'ride' => 'wild-mouse', 'visible' => false]);
    $afterFirst = records();
    $second = send(${VALID});
    echo json_encode(compact('first', 'afterFirst', 'second') + ['records' => records()]);
  `);
  assert.equal(r.first.status, 200);
  assert.deepEqual(r.first.json, { saved: true, ride: 'Thunder Loop', score: 6, replaced: null });
  assert.deepEqual(r.afterFirst, [{ ride: 'thunder-loop', score: 6, comment: 'Wow', pass: 'PK-2026-0004', visible: true }],
    'the share\'s ride, never one sent by the browser; visible is never the guest\'s');
  assert.equal(r.second.status, 200);
  assert.deepEqual(r.second.json, { saved: true, ride: 'Thunder Loop', score: 8, replaced: 6 });
  assert.deepEqual(r.records, [{ ride: 'thunder-loop', score: 8, comment: valid.comment, pass: 'PK-2026-0004', visible: true }], 'one rating per pass and coaster');
});

test('AC3: a wrong pass or code, a missing score or a long comment get 422 with one plain message per field', { skip }, () => {
  const r = php(`
    $wrongCode = send(['passCode' => '0000'] + ${VALID});
    $unknownPass = send(['passNumber' => 'PK-2026-9999'] + ${VALID}, ip: '203.0.113.8');
    $noScore = send(array_diff_key(${VALID}, ['score' => 1]), ip: '203.0.113.9');
    $tooHigh = send(['score' => 11] + ${VALID}, ip: '203.0.113.9');
    $longComment = send(['comment' => str_repeat('a', 281)] + ${VALID}, ip: '203.0.113.9');
    $all = send(['score' => null, 'comment' => str_repeat('b', 281), 'passCode' => '1'] + ${VALID}, ip: '203.0.113.10');
    echo json_encode(compact('wrongCode', 'unknownPass', 'noScore', 'tooHigh', 'longComment', 'all') + ['records' => records()]);
  `);
  for (const name of ['wrongCode', 'unknownPass', 'noScore', 'tooHigh', 'longComment', 'all']) assert.equal(r[name].status, 422, name);
  assert.deepEqual(r.wrongCode.json, { errors: { pass: WRONG_PASS } });
  assert.deepEqual(r.unknownPass.json, r.wrongCode.json, 'the same message for an unknown pass and a wrong code');
  assert.deepEqual(r.noScore.json, { errors: { score: 'Choose a score from 1 to 10.' } });
  assert.deepEqual(r.tooHigh.json, r.noScore.json, 'refused, not clamped');
  assert.deepEqual(r.longComment.json, { errors: { comment: 'Keep the comment to 280 characters.' } });
  assert.deepEqual(r.all.json, { errors: { score: 'Choose a score from 1 to 10.', comment: 'Keep the comment to 280 characters.', pass: WRONG_PASS } });
  assert.deepEqual(r.records, []);
});

test('AC3: after five wrong tries the endpoint answers 429 "Too many tries. Please wait 15 minutes." and stores nothing', { skip }, () => {
  const r = php(`
    $tries = [];
    for ($i = 0; $i < 5; $i++) { $tries[] = send(['passCode' => '0000'] + ${VALID})['status']; }
    $locked = send(${VALID});
    echo json_encode(['tries' => $tries, 'locked' => $locked, 'records' => records()]);
  `);
  assert.deepEqual(r.tries, [422, 422, 422, 422, 422]);
  assert.equal(r.locked.status, 429);
  assert.deepEqual(r.locked.json, { error: 'Too many tries. Please wait 15 minutes.' });
  assert.deepEqual(r.records, []);
});

test('AC4: a missing or wrong token, a missing or foreign Origin get 400 and store nothing', { skip }, () => {
  const r = php(`
    $noToken = api('POST', '${HASH}', 101, ${VALID});
    $wrongToken = api('POST', '${HASH}', 101, ${VALID} + ['token' => 'not-the-token']);
    $otherRide = api('POST', '${OTHER_HASH}', 102, ${VALID} + ['token' => token()]);
    $noOrigin = send(${VALID}, origin: false);
    $foreign = send(${VALID}, origin: 'http://evil.example');
    $otherPort = send(${VALID}, origin: '${PORTAL}:8080');
    $notJson = api('POST', '${HASH}', 101, null);
    echo json_encode(compact('noToken', 'wrongToken', 'otherRide', 'noOrigin', 'foreign', 'otherPort', 'notJson') + ['records' => records()]);
  `);
  for (const name of ['noToken', 'wrongToken', 'otherRide', 'noOrigin', 'foreign', 'otherPort', 'notJson']) {
    assert.equal(r[name].status, 400, name);
    assert.deepEqual(r[name].json, { error: 'This form has expired. Please try again.' }, name);
  }
  assert.deepEqual(r.records, [], 'nothing is stored');
});

test('AC4: every GET and POST answer carries Cache-Control: no-store', { skip }, () => {
  const r = php(`
    $answers = [
      'get' => api('GET', '${HASH}', 101), 'get404' => api('GET', '${'c'.repeat(32)}', 101), 'post404' => api('POST', '${EXPIRED_HASH}', 105, ${VALID}),
      'post400' => api('POST', '${HASH}', 101, ${VALID}), 'post422' => send(['score' => 0] + ${VALID}, ip: '203.0.113.20'),
      'post200' => send(${VALID}, ip: '203.0.113.21'),
    ];
    for ($i = 0; $i < 5; $i++) { send(['passCode' => '0000'] + ${VALID}, ip: '203.0.113.22'); }
    $answers['post429'] = send(${VALID}, ip: '203.0.113.22');
    echo json_encode(array_map(fn ($a) => [$a['status'], $a['cache']], $answers));
  `);
  assert.deepEqual(Object.values(r).map(([status]) => status), [200, 404, 404, 400, 422, 200, 429]);
  for (const [name, [, cache]] of Object.entries(r)) assert.match(cache ?? '', /(^|,\s*)no-store(\s*,|$)/, name);
});

test('AC4: the public route list is the app\'s list plus exactly the guest page, the coaster file and this route', { skip }, () => {
  const extension = read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php');
  const prepends = [...extension.matchAll(/prependExtensionConfig\(([^;]+)\);/g)].map((m) => m[1]);
  assert.deepEqual(prepends, ["self::PORTAL_ENGINE, ['custom_public_routes' => [GuestController::ROUTE, CoasterFileController::ROUTE, ShareRatingController::ROUTE]]"]);
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `
    require ${JSON.stringify(autoload)};
    spl_autoload_register(static function (string $class): void {
        $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
        if (str_starts_with($class, $prefix)) {
            $file = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) { require $file; }
        }
    }, true, true);
    use Pimcore\\Bundle\\PortalEngineBundle\\DependencyInjection\\{Configuration, PimcorePortalEngineExtension};
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\DependencyInjection\\PimcoreStudioExampleEnterpriseExtension;
    use Symfony\\Component\\Config\\Definition\\Processor;
    use Symfony\\Component\\DependencyInjection\\ContainerBuilder;
    $merged = function (array $appRoutes): array {
        $container = new ContainerBuilder();
        $container->registerExtension(new PimcorePortalEngineExtension());
        if ($appRoutes !== []) { $container->loadFromExtension('pimcore_portal_engine', ['custom_public_routes' => $appRoutes]); }
        (new PimcoreStudioExampleEnterpriseExtension())->prepend($container);
        return (new Processor())->processConfiguration(new Configuration(), $container->getExtensionConfig('pimcore_portal_engine'))['custom_public_routes'];
    };
    echo json_encode(['app' => $merged(['app_press_kit', 'app_imprint']), 'none' => $merged([])]);
  `], { encoding: 'utf8' });
  const r = JSON.parse(out);
  assert.deepEqual([...r.app].sort(), ['app_imprint', 'app_press_kit', GUEST_ROUTE, COASTER_FILE_ROUTE, ROUTE].sort());
  assert.equal(r.app.length, 5);
  assert.deepEqual(r.none, [GUEST_ROUTE, COASTER_FILE_ROUTE, ROUTE]);
});
