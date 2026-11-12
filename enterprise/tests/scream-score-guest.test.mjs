// F317: the guest link of the scream score (src/Portal/ScreamScore/GuestController.php), public, without a portal login.
// Since F326 (DR-P142) it has no form of its own: it answers 302 to the coaster's public share, or 404 without one
// (the GET and POST answers in full: scream-score-redirect.test.mjs). The controller tests run the real controller with
// Symfony's Request and Twig from a Pimcore install's vendor/ (PIMCORE_VENDOR_AUTOLOAD, else
// /var/www/html/vendor/autoload.php), with the worktree's own classes loaded first and a stand-in GuestShares; they
// skip without one (like f91-extension-alias).
// Run: node --test enterprise/tests/scream-score-guest.test.mjs
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
// F323: the coaster file is public too, for a public share's 3D ride (src/Portal/Coaster/CoasterFileController.php).
const COASTER_FILE_ROUTE = 'pimcore_studio_example_enterprise_coaster_file';
// F324: the scream score of a public share's coaster, as JSON (src/Portal/ScreamScore/ShareRatingController.php).
const SHARE_RATING_ROUTE = 'pimcore_studio_example_enterprise_scream_score_share';
const SHARE_LINK = 'http://portal.localhost/coasters/0123456789abcdef0123456789abcdef/public-share-a~17';

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
use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares;
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
// Thunder Loop has a share, Wild Mouse is a coaster without one, any other key is no coaster.
$shares = new class extends GuestShares {
    public function __construct() {}
    public function guestLink(string $ride): ?string { return ['thunder-loop' => ${JSON.stringify(SHARE_LINK)}][$ride] ?? null; }
};
$controller = new GuestController($shares);
$controller->setContainer($container);

/** One request to the guest link of $ride; returns status, location and body. */
function page(string $method, string $ride, array $post = []): array {
    global $controller;
    $request = Request::create('/_scream-score/' . $ride, $method, $post);
    $request->attributes->set('_route', ${JSON.stringify(ROUTE)});
    $response = $controller($request, $ride);
    return ['status' => $response->getStatusCode(), 'location' => $response->headers->get('Location'), 'body' => (string) $response->getContent()];
}
`;

const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\n${body}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};


test('AC1: the route is GET|POST /{_portal_engine_prefix}scream-score/{ride} with Portal Engine\'s prefix requirement and Class::__invoke', () => {
  const routing = read('config/pimcore/routing.yaml');
  const block = routing.match(new RegExp(`^${ROUTE}:\\n((?: {4}.*\\n?)+)`, 'm'))?.[1];
  assert.ok(block, `${ROUTE} is declared`);
  assert.match(block, /^ {4}path: \/\{_portal_engine_prefix\}scream-score\/\{ride\}$/m);
  assert.match(block, /^ {4}controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\ScreamScore\\GuestController::__invoke$/m);
  assert.match(block, /^ {4}methods: \[GET, POST\]$/m);
  assert.match(block, /^ {4}condition: "request\.attributes\.get\('isPortalEngineSite'\)"$/m);
  assert.match(block, /^ {8}_portal_engine_prefix: \(\?!\\_\)\[\^\\\/\]\+\(\?:\\\/\[\^\\\/\]\+\)\*\\\/\|\\_$/m);
  const extension = read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php');
  assert.match(extension, /prependExtensionConfig\(self::PORTAL_ENGINE, \['custom_public_routes' => \[GuestController::ROUTE, CoasterFileController::ROUTE, ShareRatingController::ROUTE\]\]\)/,
    'the extension names exactly the route, no pattern');
  assert.doesNotMatch(extension, /data_?pool/i, 'and opens no data pool');
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
  assert.deepEqual([...r.app].sort(), ['app_imprint', 'app_press_kit', ROUTE, COASTER_FILE_ROUTE, SHARE_RATING_ROUTE].sort(), 'the app\'s routes stay, the guest route is added');
  assert.equal(r.app.length, 5);
  assert.deepEqual(r.none, [ROUTE, COASTER_FILE_ROUTE, SHARE_RATING_ROUTE]);
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

test('AC1: a guest without a login opening a coaster\'s link is sent on to the coaster\'s share (302)', { skip }, () => {
  const { status, location, body } = php("echo json_encode(page('GET', 'thunder-loop'));");
  assert.equal(status, 302);
  assert.equal(location, SHARE_LINK);
  assert.doesNotMatch(body, /<form|type="password"|_username/i, 'no form, no login form');
});

test('AC4: an unknown ride key or a ride without a share answers 404 "This ride has no scream score"', { skip }, () => {
  const r = php(`
    $unknown = page('GET', 'ghost-train');
    $badKey = page('GET', 'Thunder%20Loop');
    $noShare = page('GET', 'wild-mouse');
    echo json_encode(compact('unknown', 'badKey', 'noShare'));
  `);
  for (const name of ['unknown', 'badKey', 'noShare']) {
    assert.equal(r[name].status, 404, name);
    assert.match(r[name].body, /<h1>This ride has no scream score<\/h1>/, name);
    assert.equal(r[name].location, null, `${name}: no redirect`);
    assert.doesNotMatch(r[name].body, /<form|type="password"/i, `${name}: no form, no login form`);
  }
});

test('AC1: php -l passes for the guest page classes', () => {
  for (const file of ['src/Portal/ScreamScore/GuestController.php', 'src/ScreamScore/Rides.php', 'src/ScreamScore/InMemory/InMemoryRides.php',
    'src/ScreamScore/Pimcore/PimcoreRides.php', 'src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php']) {
    if (hasPhp) execFileSync('php', ['-l', join(enterpriseDir, file)], { stdio: 'pipe' });
    else assert.ok(existsSync(join(enterpriseDir, file)), file);
  }
});
