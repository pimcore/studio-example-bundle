// F326: the old guest link /_scream-score/<ride> (src/Portal/ScreamScore/GuestController.php) has no page of its own any
// more (DR-P142): GET and POST answer 302 to the coaster's current public share (GuestShares::guestLink(), F322), or the
// plain 404 page without one; the park's page (ParkController, F318) shows that share as the guest link. The controller
// tests run the real controllers with Symfony's Request and Twig from a Pimcore install's vendor/
// (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php), the worktree's classes loaded first and a stand-in
// GuestShares that only answers guestLink(); they skip without one.
// Run: node --test enterprise/tests/scream-score-redirect.test.mjs
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

const ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';
// Thunder Loop's share, as GuestShares::guestLink() builds it with the portal site's domain.
const SHARE_LINK = 'http://portal.localhost/coasters/0123456789abcdef0123456789abcdef/public-share-a~17';
const FIELDS = { score: '8', comment: 'Wow', passNumber: 'PK-2026-0001', passCode: '4711', _token: 'any' };

const bootstrap = `
require ${JSON.stringify(autoload)};
spl_autoload_register(static function (string $class): void {
    $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
    if (str_starts_with($class, $prefix)) {
        $file = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) { require $file; }
    }
}, true, true);

use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\{GuestController, ParkController, StaffAccess};
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\ScreamScore;
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\{InMemoryFeedbackStore, InMemoryAnnualPasses, InMemoryFailureCounter, InMemoryRides};
use Symfony\\Component\\HttpFoundation\\Request;

$loader = new \\Twig\\Loader\\FilesystemLoader();
$loader->addPath(${JSON.stringify(join(enterpriseDir, 'templates'))}, 'PimcoreStudioExampleEnterprise');
$services = [
    'twig' => new \\Twig\\Environment($loader, ['strict_variables' => true]),
    'pimcore.templating' => new class { public function isDelegate(): bool { return false; } },
];
$container = new class($services) implements \\Psr\\Container\\ContainerInterface {
    public function __construct(private array $services) {}
    public function get(string $id): mixed { return $this->services[$id] ?? throw new \\RuntimeException("no service $id"); }
    public function has(string $id): bool { return isset($this->services[$id]); }
};
// Thunder Loop has a share, Wild Mouse is a coaster without one. Only guestLink() may be called: the rest writes.
$shares = new class extends GuestShares {
    public bool $portalMissing = false;
    public array $asked = [];
    public function __construct() {}
    public function guestLink(string $ride): ?string {
        $this->asked[] = $ride;
        if ($this->portalMissing) { throw new \\RuntimeException('There is no "Pimcore Kingdom" portal site.'); }
        return ['thunder-loop' => ${JSON.stringify(SHARE_LINK)}][$ride] ?? null;
    }
    public function setup(): array { throw new \\LogicException('setup() called'); }
    public function reset(): array { throw new \\LogicException('reset() called'); }
    public function remove(): array { throw new \\LogicException('remove() called'); }
};
$guest = new GuestController($shares);
$guest->setContainer($container);

/** One request to the old guest link of $ride; $url lets the request carry another host or prefix. */
function guest(string $method, string $ride, array $post = [], ?string $url = null): array {
    global $guest;
    $request = Request::create($url ?? '/_scream-score/' . $ride, $method, $post, [], [], ['REMOTE_ADDR' => '203.0.113.7']);
    $request->attributes->set('_route', ${JSON.stringify(ROUTE)});
    $response = $guest($request, $ride);
    return ['status' => $response->getStatusCode(), 'location' => $response->headers->get('Location'), 'body' => (string) $response->getContent(),
        'cache' => $response->headers->get('Cache-Control')];
}
`;

const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\n${body}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};
const FIELDS_PHP = `json_decode(${JSON.stringify(JSON.stringify(FIELDS))}, true)`;

test('AC1: GET /_scream-score/<ride> answers 302 to the ride\'s share, whatever host or prefix the request names', { skip }, () => {
  const r = php(`
    $plain = guest('GET', 'thunder-loop');
    $otherHost = guest('GET', 'thunder-loop', [], 'http://evil.example/_scream-score/thunder-loop');
    $language = guest('GET', 'thunder-loop', [], 'https://portal.localhost/en/scream-score/thunder-loop');
    echo json_encode(compact('plain', 'otherHost', 'language') + ['asked' => $shares->asked]);
  `);
  for (const name of ['plain', 'otherHost', 'language']) {
    assert.equal(r[name].status, 302, name);
    assert.equal(r[name].location, SHARE_LINK, `${name}: the stored share, never the request's host`);
    assert.match(r[name].cache, /no-store/, `${name}: a reset changes the share, so no cache keeps the answer`);
  }
  assert.deepEqual(r.asked, ['thunder-loop', 'thunder-loop', 'thunder-loop'], 'the ride key only selects a share');
});

test('AC1: POST /_scream-score/<ride> answers 302 to the share as well and stores nothing', { skip }, () => {
  const r = php(`
    $post = guest('POST', 'thunder-loop', ${FIELDS_PHP});
    $params = array_map(fn ($p) => (string) $p->getType(), (new \\ReflectionMethod(GuestController::class, '__construct'))->getParameters());
    echo json_encode(['post' => $post, 'params' => $params]);
  `);
  assert.equal(r.post.status, 302);
  assert.equal(r.post.location, SHARE_LINK);
  assert.deepEqual(r.params, ['Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares'],
    'the controller gets only the shares: no ScreamScore, no store to write to');
});

test('AC1: the guest controller never rates and the form and thanks templates are gone', () => {
  const source = read('src/Portal/ScreamScore/GuestController.php');
  assert.doesNotMatch(source, /->rate\(|FeedbackStore|getSession|getHost|getSchemeAndHttpHost|->get\('Host'\)/, 'no rating, no session, no link from the request');
  assert.match(source, /\$this->guestShares->guestLink\(\$ride\)/);
  assert.match(source, /Response::HTTP_FOUND/);
  for (const file of ['guest.html.twig', 'guest-thanks.html.twig']) {
    assert.equal(existsSync(join(enterpriseDir, 'templates/portal/scream-score', file)), false, `${file} is deleted`);
  }
  assert.match(read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php'), /'custom_public_routes' => \[GuestController::ROUTE,/, 'the route stays public');
  assert.match(read('config/pimcore/routing.yaml'), new RegExp(`^${ROUTE}:\\n(?: {4}.*\\n)*? {4}methods: \\[GET, POST\\]$`, 'm'), 'GET and POST stay');
});

test('AC2: an unknown ride key or a ride without a share answers the plain 404 page, for GET and POST', { skip }, () => {
  const r = php(`
    $out = [];
    foreach (['GET', 'POST'] as $method) {
        $out[$method . ' unknown'] = guest($method, 'ghost-train', ${FIELDS_PHP});
        $out[$method . ' bad key'] = guest($method, 'Thunder%20Loop', ${FIELDS_PHP});
        $out[$method . ' no share'] = guest($method, 'wild-mouse', ${FIELDS_PHP});
    }
    $shares->portalMissing = true;
    $out['GET portal not set up'] = guest('GET', 'thunder-loop');
    echo json_encode($out);
  `);
  assert.equal(Object.keys(r).length, 7);
  for (const [name, answer] of Object.entries(r)) {
    assert.equal(answer.status, 404, name);
    assert.equal(answer.location, null, `${name}: no redirect`);
    assert.match(answer.body, /<title>This ride has no scream score<\/title>/, name);
    assert.match(answer.body, /<h1>This ride has no scream score<\/h1>/, name);
    assert.doesNotMatch(answer.body, /<form|type="password"|_username|<script[^>]*src=/i, `${name}: a plain page, not the portal login`);
  }
});

test('AC3: the park\'s page shows the share as guest link with "Open as a guest", or "No guest link yet"', { skip }, () => {
  const r = php(`
    $access = new class extends StaffAccess {
        public function __construct() {}
        public function allows(): bool { return true; }
    };
    $service = new ScreamScore(new InMemoryFeedbackStore(), InMemoryAnnualPasses::fromCodes([]), new InMemoryFailureCounter());
    $park = new ParkController($service, new InMemoryRides(['wild-mouse' => 'Wild Mouse', 'thunder-loop' => 'Thunder Loop']), $access, $shares);
    $park->setContainer($container);
    $request = Request::create('http://evil.example/_scream-scores');
    $request->attributes->set('_portal_engine_prefix', '_');
    $response = $park($request);
    echo json_encode(['status' => $response->getStatusCode(), 'body' => (string) $response->getContent()]);
  `);
  assert.equal(r.status, 200);
  const [, thunder] = r.body.split('Thunder Loop</a>');
  const thunderRow = thunder.split('Wild Mouse')[0];
  assert.ok(thunderRow.includes(`<input type="text" id="link-thunder-loop" value="${SHARE_LINK}" readonly>`), 'the share to copy');
  assert.ok(thunderRow.includes(`<a class="ss-link" href="${SHARE_LINK}" target="_blank" rel="noopener noreferrer">Open as a guest</a>`), 'opened in a new tab');
  const wild = r.body.split('Wild Mouse</a>')[1];
  assert.match(wild, /No guest link yet\. Run coaster-demo:setup\./);
  assert.doesNotMatch(wild, /Open as a guest|<input/);
  assert.doesNotMatch(r.body, /_scream-score\/|evil\.example/, 'no old link, nothing from the request\'s host');
});

test('AC1: php -l passes for the guest and park controllers', () => {
  for (const file of ['src/Portal/ScreamScore/GuestController.php', 'src/Portal/ScreamScore/ParkController.php']) {
    if (hasPhp) execFileSync('php', ['-l', join(enterpriseDir, file)], { stdio: 'pipe' });
    else assert.ok(existsSync(join(enterpriseDir, file)), file);
  }
});
