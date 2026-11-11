// F318: the park's page of the scream score (src/Portal/ScreamScore/ParkController.php, StaffAccess.php and the
// templates park.html.twig and park-ride.html.twig). Pimcore Kingdom staff see per coaster average, count and guest
// link, a coaster's newest comments, and hide a comment or show it again. Like scream-score-guest.test.mjs, the
// controller tests run the real controller with Symfony's Request, Twig and CSRF token manager from a Pimcore install's
// vendor/ (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php), the worktree's classes loaded first, the
// InMemory store and rides, and a stand-in portal user; they skip without one.
// Run: node --test enterprise/tests/scream-score-park.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');
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

const PREFIX = 'pimcore_studio_example_enterprise_scream_score_';
const SHARE_LINK = 'http://portal.localhost/coasters/0123456789abcdef0123456789abcdef/public-share-a~17';
const CONTROLLER = 'Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\ParkController::__invoke';

// Thunder Loop: 8 ratings, one a day from 1 Nov 2026, scores 9 8 7 6 10 5 7 4 (average 7.0); the newest has no comment.
const bootstrap = `
require ${JSON.stringify(autoload)};
spl_autoload_register(static function (string $class): void {
    $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
    if (str_starts_with($class, $prefix)) {
        $file = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
}, true, true);
date_default_timezone_set('UTC');

use Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\{ParkController, StaffAccess};
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\{ScreamScore, GuestFeedback};
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\{InMemoryFeedbackStore, InMemoryAnnualPasses, InMemoryFailureCounter, InMemoryRides};
use Symfony\\Component\\HttpFoundation\\{Request, RequestStack};
use Symfony\\Component\\HttpFoundation\\Session\\Session;
use Symfony\\Component\\HttpFoundation\\Session\\Storage\\MockArraySessionStorage;
use Symfony\\Component\\Security\\Csrf\\CsrfTokenManager;
use Symfony\\Component\\Security\\Csrf\\TokenStorage\\SessionTokenStorage;

// A stand-in portal user: every method of PortalUserInterface, answering from $values.
$methods = '';
foreach ((new \\ReflectionClass(PortalUserInterface::class))->getMethods() as $method) {
    $params = [];
    foreach ($method->getParameters() as $p) {
        $params[] = ($p->hasType() ? (string) $p->getType() . ' ' : '') . '$' . $p->getName() . ($p->isDefaultValueAvailable() ? ' = ' . var_export($p->getDefaultValue(), true) : '');
    }
    $type = $method->hasReturnType() ? (string) $method->getReturnType() : '';
    $body = $type === 'static' ? 'return $this;' : ($type === 'void' ? '' : 'return $this->values[' . var_export($method->getName(), true) . '] ?? null;');
    $methods .= 'public function ' . $method->getName() . '(' . implode(', ', $params) . ')' . ($type !== '' ? ': ' . $type : '') . ' { ' . $body . ' }' . "\\n";
}
eval('class StandInPortalUser implements \\\\' . PortalUserInterface::class . ' { public function __construct(public array $values) {} ' . $methods . ' }');
class StandInGroup { public function __construct(private string $key) {} public function getKey(): ?string { return $this->key; } }
function portalUser(?int $id, array $groups, bool $guest = false, bool $share = false): PortalUserInterface {
    return new StandInPortalUser(['getId' => $id, 'getGroups' => array_map(fn ($g) => new StandInGroup($g), $groups), 'isGuestUser' => $guest, 'isPortalShareUser' => $share,
        'getEmail' => 'staff@pimcore-kingdom.example', 'getKey' => 'park-staff']);
}
$staff = portalUser(42, ['Editors', ScreamScore::STAFF_GROUP]);
$access = new class extends StaffAccess {
    public ?PortalUserInterface $user = null;
    public function __construct() {}
    protected function portalUser(): ?PortalUserInterface { return $this->user; }
};
$access->user = $staff;

$store = new InMemoryFeedbackStore();
$service = new ScreamScore($store, InMemoryAnnualPasses::fromCodes([]), new InMemoryFailureCounter());
foreach ([9, 8, 7, 6, 10, 5, 7, 4] as $i => $score) {
    $n = $i + 1;
    $store->save(new GuestFeedback(null, 'thunder-loop', $score, $n === 8 ? null : 'Comment ' . $n, sprintf('PK-2026-%04d', $n), true,
        new \\DateTimeImmutable(sprintf('2026-11-%02dT10:00:00+00:00', $n))));
}
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
// F326: the guest link is the coaster's public share (GuestShares::guestLink()); Thunder Loop has one, Wild Mouse not.
$shares = new class extends GuestShares {
    public function __construct() {}
    public function guestLink(string $ride): ?string { return ['thunder-loop' => ${JSON.stringify(SHARE_LINK)}][$ride] ?? null; }
};
$controller = new ParkController($service, new InMemoryRides(['wild-mouse' => 'Wild Mouse', 'thunder-loop' => 'Thunder Loop']), $access, $shares);
$controller->setContainer($container);

/** One request in the same browser session: $path below /_scream-scores, the route's ride or id. */
function page(string $method, string $path, ?string $ride = null, ?string $id = null, array $post = []): array {
    global $controller, $requestStack, $session;
    $request = Request::create('http://portal.localhost/_scream-scores' . $path, $method, $post);
    $request->setSession($session);
    $request->attributes->set('_portal_engine_prefix', '_');
    $requestStack->push($request);
    try {
        $response = $controller($request, $ride, $id);
    } finally {
        $requestStack->pop();
    }
    return ['status' => $response->getStatusCode(), 'location' => $response->headers->get('Location'), 'body' => (string) $response->getContent()];
}
function overview(): array { return page('GET', ''); }
function ride(string $ride = 'thunder-loop'): array { return page('GET', '/' . $ride, $ride); }
function token(): string { preg_match('/name="_token" value="([^"]+)"/', ride()['body'], $m); return $m[1] ?? ''; }
function visibility(string $id, string $visible, ?string $token = null): array {
    return page('POST', '/' . $id . '/visibility', null, $id, ['_token' => $token ?? token(), 'visible' => $visible]);
}
function records(): array { global $store; return array_map(fn ($r) => [$r->id, $r->visible], $store->all()); }
`;

const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\n${body}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};
const before = (body, marker) => body.split(marker)[0];

test('AC1: the three park routes come after the guest route, behind the portal login, as ParkController::__invoke', () => {
  const routing = read('config/pimcore/routing.yaml');
  const block = (name) => routing.match(new RegExp(`^${PREFIX}${name}:\\n((?: {4}.*\\n?)+)`, 'm'))?.[1];
  const expected = {
    park: ['/{_portal_engine_prefix}scream-scores', '[GET]'],
    park_ride: ['/{_portal_engine_prefix}scream-scores/{ride}', '[GET]'],
    park_visibility: ['/{_portal_engine_prefix}scream-scores/{id}/visibility', '[POST]'],
  };
  for (const [name, [path, methods]] of Object.entries(expected)) {
    const body = block(name);
    assert.ok(body, `${PREFIX}${name} is declared`);
    assert.ok(body.includes(`    path: ${path}\n`), `${name}: ${path}`);
    assert.ok(body.includes(`    controller: ${CONTROLLER}\n`), `${name}: Class::__invoke`);
    assert.ok(body.includes(`    methods: ${methods}\n`), `${name}: ${methods}`);
    assert.ok(body.includes("    condition: \"request.attributes.get('isPortalEngineSite')\""), `${name}: portal sites only`);
    assert.ok(routing.indexOf(`${PREFIX}${name}:`) > routing.indexOf(`${PREFIX}guest:`), `${name} comes after F317's route`);
  }
  assert.match(block('park_visibility'), /^ {8}id: '\\d\+'$/m, 'the id is a number');
  const extension = read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php');
  assert.doesNotMatch(extension, /ParkController::ROUTE|scream_score_park/, 'none of them is made public: the portal login stays');
});

test('AC1: staff see per coaster the average to one decimal, the number of ratings and the guest link, or "No ratings yet"', { skip }, () => {
  const { status, body } = php("echo json_encode(overview());");
  assert.equal(status, 200);
  assert.match(body, /<h1>Scream scores<\/h1>/);
  const [, thunder] = body.split('Thunder Loop</a>');
  assert.ok(thunder, 'Thunder Loop has a row');
  const thunderRow = before(thunder, 'Wild Mouse');
  assert.match(thunderRow, /7\.0 \/ 10/, 'the average to one decimal, 56 / 8');
  assert.match(thunderRow, /8 ratings/);
  assert.ok(thunderRow.includes(`value="${SHARE_LINK}" readonly`), 'the guest link to copy: the coaster\'s share');
  assert.ok(thunderRow.includes(`<a class="ss-link" href="${SHARE_LINK}" target="_blank" rel="noopener noreferrer">Open as a guest</a>`), 'opened in a new tab');
  assert.doesNotMatch(thunderRow, /No ratings yet/);
  assert.ok(body.indexOf('Thunder Loop') < body.indexOf('Wild Mouse'), 'sorted by name');
  const wild = body.split('Wild Mouse</a>')[1];
  assert.match(wild, /No ratings yet/);
  assert.match(wild, /No guest link yet\. Run coaster-demo:setup\./, 'a coaster without a share has no guest link yet');
  assert.doesNotMatch(wild, /_scream-score\/|Open as a guest/);
  assert.doesNotMatch(wild, /\/ 10|ratings<|0 ratings/);
  assert.match(body, /href="\/_scream-scores\/thunder-loop"/, 'each coaster opens its page');
  assert.doesNotMatch(body, /PK-2026-/, 'no pass numbers');
});

test('AC2: a coaster shows its 5 newest visible comments, newest first, with score and date, and no pass numbers', { skip }, () => {
  const { status, body } = php("echo json_encode(ride());");
  assert.equal(status, 200);
  assert.match(body, /<h1>Thunder Loop<\/h1>/);
  assert.match(body, /7\.0 \/ 10/);
  assert.match(body, /8 ratings/);
  const shown = [...body.matchAll(/<p>Comment (\d)<\/p>/g)].map((m) => Number(m[1]));
  assert.deepEqual(shown, [7, 6, 5, 4, 3], 'the 5 newest with a comment, newest first');
  assert.match(body, /<strong>7 \/ 10<\/strong> <span class="ss-hint">7 Nov 2026, 10:00<\/span>\s*<\/p>\s*<p>Comment 7<\/p>/, 'score and date per comment');
  assert.match(body, /<strong>10 \/ 10<\/strong> <span class="ss-hint">5 Nov 2026, 10:00<\/span>\s*<\/p>\s*<p>Comment 5<\/p>/);
  assert.equal(body.split('>Hide</button>').length - 1, 5, 'one Hide button per comment');
  assert.doesNotMatch(body, /PK-2026-|pass/i, 'no pass numbers');
  assert.doesNotMatch(body, /comment hidden|Show hidden/, 'nothing hidden yet');
});

test('AC3: Hide takes the comment out of the list, keeps average and count, says "1 comment hidden"; Show again lists it again', { skip }, () => {
  const r = php(`
    $hide = visibility('7', '0');
    $hidden = ride();
    $overview = overview();
    $show = visibility('7', '1');
    $again = ride();
    echo json_encode(compact('hide', 'hidden', 'overview', 'show', 'again') + ['records' => records()]);
  `);
  assert.equal(r.hide.status, 303, 'Post/Redirect/Get');
  assert.equal(r.hide.location, '/_scream-scores/thunder-loop', 'back to the coaster');
  const list = before(r.hidden.body, '<details');
  assert.doesNotMatch(list, /Comment 7/, 'the hidden comment left the list');
  assert.deepEqual([...list.matchAll(/<p>Comment (\d)<\/p>/g)].map((m) => Number(m[1])), [6, 5, 4, 3, 2], 'the next one moves up');
  assert.match(r.hidden.body, /7\.0 \/ 10/, 'the average stays');
  assert.match(r.hidden.body, /8 ratings/, 'the count stays');
  assert.match(r.hidden.body, /1 comment hidden/);
  assert.match(r.hidden.body, /<summary>Show hidden \(1\)<\/summary>/);
  const hiddenPart = r.hidden.body.split('<details')[1];
  assert.match(hiddenPart, /Comment 7[\s\S]*name="visible" value="1"[\s\S]*>Show again<\/button>/, 'the hidden one with Show again');
  assert.match(r.overview.body, /7\.0 \/ 10/);
  assert.match(r.overview.body, /8 ratings/);
  assert.equal(r.show.status, 303);
  assert.deepEqual([...r.again.body.matchAll(/<p>Comment (\d)<\/p>/g)].map((m) => Number(m[1])), [7, 6, 5, 4, 3], 'Show again lists it again');
  assert.doesNotMatch(r.again.body, /comment hidden|Show hidden/);
  assert.ok(r.records.every(([, visible]) => visible === true));
});

test('AC4: anyone but park staff gets 403 on all three pages and changes nothing', { skip }, () => {
  const r = php(`
    $token = token();
    $who = ['anonymous' => null, 'other portal user' => portalUser(43, ['Editors']), 'guest' => portalUser(44, [ScreamScore::STAFF_GROUP], true),
      'public share' => portalUser(45, [ScreamScore::STAFF_GROUP], false, true), 'not saved' => portalUser(null, [ScreamScore::STAFF_GROUP]),
      'named like staff' => portalUser(46, ['Park staff (old)'])];
    $out = [];
    foreach ($who as $name => $user) {
        $access->user = $user;
        $out[$name] = array_map(fn ($a) => $a['status'], [overview(), ride(), visibility('7', '0', $token)]);
        $out[$name][] = str_contains(overview()['body'], 'Thunder Loop');
    }
    echo json_encode(['out' => $out, 'records' => records()]);
  `);
  for (const [name, [overview, ride, visibility, leaks]] of Object.entries(r.out)) {
    assert.deepEqual([overview, ride, visibility], [403, 403, 403], `${name}: 403`);
    assert.equal(leaks, false, `${name} sees no coaster`);
  }
  assert.ok(r.records.every(([, visible]) => visible === true), 'nothing was hidden');
});

test('AC4: a hide without a valid CSRF token gets 400, an unknown id or ride 404, and none changes anything', { skip }, () => {
  const r = php(`
    $noToken = page('POST', '/7/visibility', null, '7', ['visible' => '0']);
    $wrongToken = visibility('7', '0', 'not-the-token');
    $unknown = visibility('999', '0');
    $zero = visibility('0', '0');
    $get = page('GET', '/7/visibility', null, '7');
    $unknownRide = ride('ghost-train');
    $badRide = ride('Thunder_Loop');
    echo json_encode(compact('noToken', 'wrongToken', 'unknown', 'zero', 'get', 'unknownRide', 'badRide') + ['records' => records()]);
  `);
  assert.equal(r.noToken.status, 400);
  assert.equal(r.wrongToken.status, 400);
  assert.equal(r.unknown.status, 404);
  assert.equal(r.zero.status, 404);
  assert.notEqual(r.get.status, 200, 'a GET never hides');
  assert.equal(r.unknownRide.status, 404);
  assert.equal(r.badRide.status, 404);
  assert.ok(r.records.every(([, visible]) => visible === true), 'nothing was hidden');
});

test('AC4: staff are checked by the portal user group, never by name, and the id only as a GuestFeedback in the feedback folder', () => {
  const access = read('src/Portal/ScreamScore/StaffAccess.php');
  assert.match(access, /ScreamScore::STAFF_GROUP/);
  assert.match(access, /getGroups\(\)/);
  assert.doesNotMatch(access, /getEmail|getFirstname|getLastname|getKey\(\) === ['"]|getPimcoreUser/, 'no user name or e-mail');
  const controller = read('src/Portal/ScreamScore/ParkController.php');
  assert.doesNotMatch(controller, /DataObject|FeedbackStore/, 'everything goes through ScreamScore');
  const store = read('src/ScreamScore/Pimcore/PimcoreFeedbackStore.php');
  assert.match(store, /public function find\(int \$id\)[\s\S]*?getRealFullPath\(\) === self::FOLDER[\s\S]*?self::feedback\(/, 'find() only takes a GuestFeedback in the folder');
  assert.match(store, /public const FOLDER = '\/Pimcore Kingdom\/Guest feedback';/);
  for (const file of ['templates/portal/scream-score/park.html.twig', 'templates/portal/scream-score/park-ride.html.twig']) {
    assert.doesNotMatch(read(file), /\|\s*raw|autoescape\s+false|passNumber/, `${file} escapes everything and shows no pass number`);
  }
});

test('AC1: php -l passes for the park page classes', () => {
  for (const file of ['src/Portal/ScreamScore/ParkController.php', 'src/Portal/ScreamScore/StaffAccess.php', 'src/ScreamScore/Rides.php',
    'src/ScreamScore/InMemory/InMemoryRides.php', 'src/ScreamScore/Pimcore/PimcoreRides.php', 'src/ScreamScore/ScreamScore.php']) {
    if (hasPhp) execFileSync('php', ['-l', join(enterpriseDir, file)], { stdio: 'pipe' });
    else assert.ok(existsSync(join(enterpriseDir, file)), file);
  }
});
