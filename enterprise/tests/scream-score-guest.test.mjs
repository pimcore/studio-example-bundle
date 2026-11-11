// F317: the guest page of the scream score (src/Portal/ScreamScore/GuestController.php and its two templates). An
// annual-pass guest opens a coaster's link without a portal login and sends a score, a comment, pass number and code.
// The controller tests run the real controller with Symfony's Request, Twig and CSRF token manager from a Pimcore
// install's vendor/ (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php), with the worktree's own classes
// loaded first and the InMemory store, passes and failure counter; they skip without one (like f91-extension-alias).
// Run: node --test enterprise/tests/scream-score-guest.test.mjs
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

const ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';
const WRONG_PASS = "We don't know this pass number and code. Check the back of your pass.";

const bootstrap = `
require ${JSON.stringify(autoload)};
// The worktree's classes win over an installed copy of the bundle in vendor/.
spl_autoload_register(static function (string $class): void {
    $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
    if (str_starts_with($class, $prefix)) {
        $file = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
}, true, true);

use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\GuestController;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\ScreamScore;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\{InMemoryFeedbackStore, InMemoryAnnualPasses, InMemoryFailureCounter, InMemoryRides};
use Symfony\\Component\\HttpFoundation\\{Request, RequestStack};
use Symfony\\Component\\HttpFoundation\\Session\\Session;
use Symfony\\Component\\HttpFoundation\\Session\\Storage\\MockArraySessionStorage;
use Symfony\\Component\\Security\\Csrf\\CsrfTokenManager;
use Symfony\\Component\\Security\\Csrf\\TokenStorage\\SessionTokenStorage;

$store = new InMemoryFeedbackStore();
$service = new ScreamScore($store, InMemoryAnnualPasses::fromCodes(json_decode(${JSON.stringify(JSON.stringify(passes))}, true)), new InMemoryFailureCounter());
$requestStack = new RequestStack();
$session = new Session(new MockArraySessionStorage());
$loader = new \\Twig\\Loader\\FilesystemLoader();
$loader->addPath(${JSON.stringify(join(enterpriseDir, 'templates'))}, 'PimcoreStudioExampleEnterprise');
$services = [
    'twig' => new \\Twig\\Environment($loader, ['strict_variables' => true]),
    'pimcore.templating' => new class { public function isDelegate(): bool { return false; } },
    'security.csrf.token_manager' => new CsrfTokenManager(null, new SessionTokenStorage($requestStack)),
];
$container = new class($services) implements \\Psr\\Container\\ContainerInterface {
    public function __construct(private array $services) {}
    public function get(string $id): mixed { return $this->services[$id] ?? throw new \\RuntimeException("no service $id"); }
    public function has(string $id): bool { return isset($this->services[$id]); }
};
$controller = new GuestController($service, new InMemoryRides(['thunder-loop' => 'Thunder Loop', 'wild-mouse' => 'Wild Mouse']));
$controller->setContainer($container);

/** One request to the guest page of $ride, in the same browser session; returns status, location and body. */
function page(string $method, string $ride, array $post = [], string $ip = '203.0.113.7'): array {
    global $controller, $requestStack, $session;
    $request = Request::create('/_scream-score/' . $ride, $method, $post, [], [], ['REMOTE_ADDR' => $ip]);
    $request->setSession($session);
    $request->attributes->set('_route', ${JSON.stringify(ROUTE)});
    $requestStack->push($request);
    try {
        $response = $controller($request, $ride);
    } finally {
        $requestStack->pop();
    }
    return ['status' => $response->getStatusCode(), 'location' => $response->headers->get('Location'), 'body' => (string) $response->getContent()];
}
/** The CSRF token of the form the guest page shows now. */
function token(string $ride = 'thunder-loop'): string {
    preg_match('/name="_token" value="([^"]+)"/', page('GET', $ride)['body'], $m);
    return $m[1] ?? '';
}
function send(array $fields, string $ride = 'thunder-loop', string $ip = '203.0.113.7'): array {
    return page('POST', $ride, $fields + ['_token' => token($ride)], $ip);
}
function records(): array { global $store; return array_map(fn ($r) => ['ride' => $r->ride, 'score' => $r->screamScore, 'comment' => $r->comment, 'pass' => $r->passNumber], $store->all()); }
`;

const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\n${body}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};

const count = (text, needle) => text.split(needle).length - 1;
const valid = { score: '8', comment: 'My voice is gone <3', passNumber: 'PK-2026-0001', passCode: '4711' };

test('AC1: the route is GET|POST /{_portal_engine_prefix}scream-score/{ride} with Portal Engine\'s prefix requirement and Class::__invoke', () => {
  const routing = read('config/pimcore/routing.yaml');
  const block = routing.match(new RegExp(`^${ROUTE}:\\n((?: {4}.*\\n?)+)`, 'm'))?.[1];
  assert.ok(block, `${ROUTE} is declared`);
  assert.match(block, /^ {4}path: \/\{_portal_engine_prefix\}scream-score\/\{ride\}$/m);
  assert.match(block, /^ {4}controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\GuestController::__invoke$/m);
  assert.match(block, /^ {4}methods: \[GET, POST\]$/m);
  assert.match(block, /^ {4}condition: "request\.attributes\.get\('isPortalEngineSite'\)"$/m);
  assert.match(block, /^ {8}_portal_engine_prefix: \(\?!\\_\)\[\^\\\/\]\+\(\?:\\\/\[\^\\\/\]\+\)\*\\\/\|\\_$/m);
  assert.doesNotMatch(read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php'), /\*|scream-score\/|data_?pool/i,
    'the extension names the route, no pattern and no data pool');
});

test('AC1: the merged public-route list is the app\'s list plus exactly the guest route', { skip }, () => {
  const r = php(`
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
    $without = new ContainerBuilder();
    (new PimcoreStudioExampleEnterpriseExtension())->prepend($without);
    echo json_encode(['app' => $merged(['app_press_kit', 'app_imprint']), 'none' => $merged([]), 'withoutPortalEngine' => $without->getExtensionConfig('pimcore_portal_engine'),
      'routeConst' => GuestController::ROUTE]);
  `);
  assert.deepEqual([...r.app].sort(), ['app_imprint', 'app_press_kit', ROUTE].sort(), 'the app\'s routes stay, the guest route is added');
  assert.equal(r.app.length, 3);
  assert.deepEqual(r.none, [ROUTE]);
  assert.deepEqual(r.withoutPortalEngine, [], 'nothing is prepended without Portal Engine');
  assert.equal(r.routeConst, ROUTE);
});

test('AC1: the route matches a one-language portal\'s link /_scream-score/<ride> and a language prefix', { skip }, () => {
  const r = php(`
    use Symfony\\Component\\Config\\FileLocator;
    use Symfony\\Component\\Routing\\Loader\\YamlFileLoader;
    $route = (new YamlFileLoader(new FileLocator(${JSON.stringify(join(enterpriseDir, 'config/pimcore'))})))->load('routing.yaml')->get(${JSON.stringify(ROUTE)});
    $regex = $route->compile()->getRegex();
    $match = fn (string $path) => preg_match($regex, $path, $m) ? ['prefix' => $m['_portal_engine_prefix'], 'ride' => $m['ride']] : null;
    echo json_encode(['one' => $match('/_scream-score/thunder-loop'), 'en' => $match('/en/scream-score/thunder-loop'), 'none' => $match('/scream-score/thunder-loop'),
      'link' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ScreamScoreDemo::GUEST_PATH]);
  `);
  assert.deepEqual(r.one, { prefix: '_', ride: 'thunder-loop' });
  assert.deepEqual(r.en, { prefix: 'en/', ride: 'thunder-loop' });
  assert.equal(r.none, null, 'like every portal page, the link carries the prefix');
  assert.equal(r.link, '/_scream-score/', 'the links coaster-demo:setup prints open this page');
});

test('AC1: a guest without a login gets the form: score 1-10, optional comment, pass number, pass code, CSRF token, for phone and desktop', { skip }, () => {
  const { status, body } = php("echo json_encode(page('GET', 'thunder-loop'));");
  assert.equal(status, 200);
  assert.match(body, /How loud did you scream on Thunder Loop\?/);
  for (let score = 1; score <= 10; score++) {
    assert.match(body, new RegExp(`<input type="radio" name="score" value="${score}"[^>]*>`), `score ${score} is a radio button`);
  }
  assert.equal(count(body, 'name="score"'), 10, 'ten score buttons');
  assert.match(body, /barely a squeak/);
  assert.match(body, /lost my voice/);
  assert.match(body, /<textarea[^>]*name="comment"/);
  assert.doesNotMatch(body, /<textarea[^>]*required/, 'the comment is optional');
  assert.match(body, /Up to 280 characters/, 'the counter works without JS as plain text');
  assert.match(body, /<label for="passNumber">Annual-pass number<\/label>/);
  assert.match(body, /<input[^>]*name="passNumber"/);
  assert.match(body, /<label for="passCode">Pass code<\/label>/);
  assert.match(body, /<input[^>]*name="passCode"/);
  assert.match(body, /<input type="hidden" name="_token" value="[^"]+">/);
  assert.match(body, /<form method="post"/);
  assert.match(body, /<meta name="viewport" content="width=device-width, initial-scale=1">/, 'phone width');
  assert.doesNotMatch(body, /<script[^>]*src=|<nav\b|type="password"|_username/i, 'no plugin JavaScript, no portal navigation, no login form');
});

test('AC2: a valid send stores the rating and redirects 303 to the thanks page; a second send replaces the earlier score', { skip }, () => {
  const r = php(`
    $first = send(['score' => '6', 'comment' => 'Wow', 'passNumber' => 'PK-2026-0001', 'passCode' => '4711']);
    $afterFirst = records();
    $thanksFirst = page('GET', 'thunder-loop');
    $again = page('GET', 'thunder-loop');
    $second = send(${JSON.stringify(valid)});
    $thanksSecond = page('GET', 'thunder-loop');
    echo json_encode(compact('first', 'afterFirst', 'thanksFirst', 'again', 'second', 'thanksSecond') + ['records' => records()]);
  `);
  assert.equal(r.first.status, 303);
  assert.equal(r.first.location, '/_scream-score/thunder-loop');
  assert.deepEqual(r.afterFirst, [{ ride: 'thunder-loop', score: 6, comment: 'Wow', pass: 'PK-2026-0001' }]);
  assert.equal(r.thanksFirst.status, 200);
  assert.match(r.thanksFirst.body, /Thanks! Your scream score 6 for Thunder Loop is saved\./);
  assert.doesNotMatch(r.thanksFirst.body, /replaces/);
  assert.match(r.again.body, /How loud did you scream/, 'the thanks page shows once, then the form again');
  assert.equal(r.second.status, 303);
  assert.match(r.thanksSecond.body, /Thanks! Your scream score 8 for Thunder Loop is saved\. It replaces your earlier score 6\./);
  assert.match(r.thanksSecond.body, /My voice is gone &lt;3/, 'the guest\'s comment, escaped');
  assert.deepEqual(r.records, [{ ride: 'thunder-loop', score: 8, comment: 'My voice is gone <3', pass: 'PK-2026-0001' }], 'one record, replaced');
  assert.doesNotMatch(r.thanksSecond.body, /PK-2026-0002|average/i, 'no other guests\' ratings');
});

test('AC3: a wrong pass or code, a missing score or a long comment show the form again (422) with what was typed and one message per field', { skip }, () => {
  const r = php(`
    $wrongCode = send(['passCode' => '0000'] + ${JSON.stringify(valid)});
    $wrongPass = send(['passNumber' => 'PK-2026-0999'] + ${JSON.stringify(valid)});
    $noScore = send(['score' => '', 'comment' => '<script>alert(1)</script>'] + ${JSON.stringify(valid)});
    $longComment = send(['comment' => str_repeat('a', 281), 'score' => '3'] + ${JSON.stringify(valid)});
    $allWrong = send(['score' => '11', 'comment' => str_repeat('b', 281), 'passNumber' => 'nope', 'passCode' => ''], 'thunder-loop', '198.51.100.9');
    echo json_encode(compact('wrongCode', 'wrongPass', 'noScore', 'longComment', 'allWrong') + ['records' => records()]);
  `);
  const escapedWrongPass = WRONG_PASS.replace("'", '&#039;');
  for (const name of ['wrongCode', 'wrongPass']) {
    const { status, body } = r[name];
    assert.equal(status, 422, name);
    assert.equal(count(body, escapedWrongPass), 1, `${name}: the same message, once`);
    assert.match(body, /<input type="radio" name="score" value="8"[^>]*checked/, `${name}: the score stays chosen`);
    assert.match(body, /My voice is gone &lt;3<\/textarea>/, `${name}: the comment stays`);
    assert.match(body, /How loud did you scream on Thunder Loop\?/);
  }
  assert.match(r.wrongCode.body, /name="passNumber"[^>]*value="PK-2026-0001"/, 'the pass number stays');
  assert.match(r.wrongPass.body, /name="passNumber"[^>]*value="PK-2026-0999"/, 'the typed pass number stays');

  assert.equal(r.noScore.status, 422);
  assert.equal(count(r.noScore.body, 'Choose a score from 1 to 10.'), 1);
  assert.match(r.noScore.body, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/textarea>/, 'the comment stays, escaped');
  assert.doesNotMatch(r.noScore.body, /<script>alert/);
  assert.match(r.noScore.body, /name="passNumber"[^>]*value="PK-2026-0001"/);
  assert.match(r.noScore.body, /name="passCode"[^>]*value="4711"/, 'a right code stays when another field is wrong');
  assert.doesNotMatch(r.noScore.body, new RegExp(escapedWrongPass), 'no pass message for a right pass');

  assert.equal(r.longComment.status, 422);
  assert.equal(count(r.longComment.body, 'Keep the comment to 280 characters.'), 1);
  assert.match(r.longComment.body, new RegExp(`>${'a'.repeat(281)}</textarea>`), 'the long comment stays');
  assert.match(r.longComment.body, /<input type="radio" name="score" value="3"[^>]*checked/);

  const all = r.allWrong.body;
  assert.equal(r.allWrong.status, 422);
  assert.equal(count(all, 'Choose a score from 1 to 10.') + count(all, 'Keep the comment to 280 characters.') + count(all, escapedWrongPass), 3, 'one message per field');
  assert.doesNotMatch(all, /name="score" value="\d+"[^>]*checked/, 'no score 11 to keep');
  assert.match(all, /name="passNumber"[^>]*value="nope"/);
  assert.deepEqual(r.records, [], 'nothing is stored');
});

test('AC3: after five wrong tries the page answers 429 "Too many tries. Please wait 15 minutes." and stores nothing', { skip }, () => {
  const r = php(`
    for ($i = 0; $i < 5; $i++) { send(['passCode' => '0000'] + ${JSON.stringify(valid)}); }
    $locked = send(${JSON.stringify(valid)});
    echo json_encode(['locked' => $locked, 'records' => records()]);
  `);
  assert.equal(r.locked.status, 429);
  assert.match(r.locked.body, /Too many tries\. Please wait 15 minutes\./);
  assert.deepEqual(r.records, []);
});

test('AC4: an unknown ride key answers 404 "This ride has no scream score", a missing or wrong CSRF token 400, and nothing is stored', { skip }, () => {
  const r = php(`
    $unknown = page('GET', 'ghost-train');
    $badKey = page('GET', 'Thunder%20Loop');
    $unknownPost = page('POST', 'ghost-train', ['_token' => token()] + ${JSON.stringify(valid)});
    $noToken = page('POST', 'thunder-loop', ${JSON.stringify(valid)});
    $wrongToken = page('POST', 'thunder-loop', ['_token' => 'forged'] + ${JSON.stringify(valid)});
    $otherRideToken = page('POST', 'thunder-loop', ['_token' => token('wild-mouse')] + ${JSON.stringify(valid)});
    echo json_encode(compact('unknown', 'badKey', 'unknownPost', 'noToken', 'wrongToken', 'otherRideToken') + ['records' => records()]);
  `);
  for (const name of ['unknown', 'badKey', 'unknownPost']) {
    assert.equal(r[name].status, 404, name);
    assert.match(r[name].body, /This ride has no scream score/, name);
    assert.doesNotMatch(r[name].body, /<form|type="password"/i, `${name}: no form, no login form`);
  }
  for (const name of ['noToken', 'wrongToken', 'otherRideToken']) {
    assert.equal(r[name].status, 400, name);
    assert.match(r[name].body, /This form has expired/, name);
  }
  assert.deepEqual(r.records, [], 'nothing is stored');
});

test('AC4: the templates never print unescaped text and the page opens no data pool', () => {
  for (const file of ['templates/portal/scream-score/guest.html.twig', 'templates/portal/scream-score/guest-thanks.html.twig']) {
    assert.doesNotMatch(read(file), /\|\s*raw|autoescape\s+false/, `${file} escapes everything`);
  }
  assert.doesNotMatch(read('src/Portal/ScreamScore/GuestController.php'), /DataPool|denyAccessUnlessGranted/);
});

test('AC1: php -l passes for the guest page classes', () => {
  for (const file of ['src/Portal/ScreamScore/GuestController.php', 'src/ScreamScore/Rides.php', 'src/ScreamScore/InMemory/InMemoryRides.php',
    'src/ScreamScore/Pimcore/PimcoreRides.php', 'src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php']) {
    if (hasPhp) execFileSync('php', ['-l', join(enterpriseDir, file)], { stdio: 'pipe' });
    else assert.ok(existsSync(join(enterpriseDir, file)), file);
  }
});
