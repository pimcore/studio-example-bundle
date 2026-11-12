// F323: the example portal plugin opts in to public shares. A share's guest sees the coaster tile and the preview stage
// with the 3D ride, never "Ask the brief"; the 3D ride's file route (src/Portal/Coaster/CoasterFileController.php) is
// public and checks a portal login or the share's hash itself.
// The plugin and controller tests run the real classes with the php CLI against stubs of Portal Engine, Pimcore and
// Symfony (no Pimcore install needed). The merged route list test runs the real extension with a Pimcore install's
// vendor/ (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php) and skips without one.
// Run: node --test enterprise/tests/portal-public-share.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const vendorSkip = existsSync(autoload) ? false : `no Pimcore vendor at ${autoload}`;

const GUEST_ROUTE = 'pimcore_studio_example_enterprise_scream_score_guest';
const COASTER_FILE_ROUTE = 'pimcore_studio_example_enterprise_coaster_file';
// F324: the scream score of a share's coaster joins the list.
const SHARE_RATING_ROUTE = 'pimcore_studio_example_enterprise_scream_score_share';

const runPhp = (script) => JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', script], { encoding: 'utf8' }));

// --- the plugin provider ---------------------------------------------------------------------------------------------

const pluginStubs = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
    interface PublicSharePluginProviderInterface { public function isAvailableForPublicShare(): bool; }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare {
    class PublicShareService {
        public function __construct(private ?object $current) {}
        public function getCurrentPublicShare(): ?object { return $this->current; }
    }
}
namespace Symfony\\Component\\Routing\\Exception { interface ExceptionInterface {} }
namespace Symfony\\Component\\Routing\\Generator {
    interface UrlGeneratorInterface { public function generate(string $name, array $parameters = [], int $referenceType = 1): string; }
}
namespace {
    require ${JSON.stringify(join(src, 'Portal/StudioExampleEnterprisePortalPlugin.php'))};
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\StudioExampleEnterprisePortalPlugin as Plugin;
    $generator = new class implements Symfony\\Component\\Routing\\Generator\\UrlGeneratorInterface {
        public function generate(string $name, array $parameters = [], int $referenceType = 1): string { return '/studio-example-enterprise/agent/chat'; }
    };
`;

test('AC1: the plugin provider implements PublicSharePluginProviderInterface and opts in', () => {
  const r = runPhp(`${pluginStubs}
    $plugin = new Plugin($generator);
    echo json_encode([
      'implements' => $plugin instanceof Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin\\PublicSharePluginProviderInterface,
      'available' => $plugin->isAvailableForPublicShare(),
    ]);
  }`);
  assert.deepEqual(r, { implements: true, available: true });
  assert.match(read('src/Portal/StudioExampleEnterprisePortalPlugin.php'),
    /use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin\\PublicSharePluginProviderInterface;/);
});

test('AC2: on a public share the frontend config has no agent part; for a portal user it is as today', () => {
  const r = runPhp(`${pluginStubs}
    $share = new stdClass();
    echo json_encode([
      'share' => (new Plugin($generator, true, new PublicShareService($share)))->getFrontendConfig(),
      'portalUser' => (new Plugin($generator, true, new PublicShareService(null)))->getFrontendConfig(),
      'noService' => (new Plugin($generator, true))->getFrontendConfig(),
    ]);
  }`);
  assert.deepEqual(r.share, [], 'a share guest gets no chat URL');
  const agent = { chatUrl: '/studio-example-enterprise/agent/chat', label: 'Ask the brief', mode: 'replay' };
  assert.deepEqual(r.portalUser, { agent });
  assert.deepEqual(r.noService, { agent });
  assert.match(read('config/portal.yaml'),
    /\$publicShareService: '@Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService'/,
    'the container gives the provider Portal Engine\'s share service');
});

// --- the coaster file route --------------------------------------------------------------------------------------------

// Share A holds coaster 1, not coaster 2; EXPIRED is an expired share holding coaster 1. Like Portal Engine's voters,
// the stubbed isGranted() lets any portal user through, a share's guest included (VIEW passes for every pool asset).
const controllerStubs = `
namespace Symfony\\Component\\HttpFoundation {
    class ParameterBag {
        public function __construct(private array $values) {}
        public function getInt(string $key): int { return (int) ($this->values[$key] ?? 0); }
        public function getString(string $key): string { return (string) ($this->values[$key] ?? ''); }
    }
    class Request { public ParameterBag $query; public function __construct(array $query) { $this->query = new ParameterBag($query); } }
    class Response {
        public const HTTP_OK = 200;
        public function __construct(public string $content, public int $status, public array $headers) {}
    }
}
namespace Symfony\\Component\\HttpKernel\\Exception {
    class NotFoundHttpException extends \\RuntimeException {}
    class AccessDeniedHttpException extends \\RuntimeException {}
}
namespace Symfony\\Component\\Security\\Core\\Exception {
    class AuthenticationException extends \\RuntimeException {}
    class AccessDeniedException extends \\RuntimeException {}
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Exception { class PublicShareExpiredException extends \\Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException {} }
namespace Pimcore\\Bundle\\PortalEngineBundle\\Enum {
    class Permission { public const PORTAL_ACCESS = 'portal-access'; public const DATA_POOL_ACCESS = 'data-pool-access'; public const VIEW = 'view'; }
}
namespace Pimcore\\Model {
    class Asset {
        public static array $assets = [];
        public function __construct(public int $id, private string $filename, private string $data) {}
        public static function getById(int $id): ?self { $GLOBALS['assetLoads'][] = $id; return self::$assets[$id] ?? null; }
        public function getFilename(): string { return $this->filename; }
        public function getData(): string { return $this->data; }
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security {
    class PortalUser { public function __construct(private bool $shareUser) {} public function isPortalShareUser(): bool { return $this->shareUser; } }
    class SecurityService {
        public ?PortalUser $user = null;
        public function getPortalUser(): ?PortalUser { return $this->user; }
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool { class DataPoolConfigService { public function setCurrentDataPoolConfigById(int $id): void {} } }
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare {
    use Pimcore\\Bundle\\PortalEngineBundle\\Exception\\PublicShareExpiredException;
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\{PortalUser, SecurityService};
    use Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException;
    class PublicShareService {
        public array $shares = ['A' => ['expired' => false, 'assets' => [1]], 'EXPIRED' => ['expired' => true, 'assets' => [1]]];
        public ?string $current = null;
        public array $validated = [];
        public function __construct(private SecurityService $security) {}
        public function validateByHash(?string $hash): string {
            $this->validated[] = $hash;
            if (!isset($this->shares[$hash])) { throw new NotFoundHttpException('PublicShare not found.'); }
            if ($this->shares[$hash]['expired']) { throw new PublicShareExpiredException('PublicShare is expired.'); }
            return $hash;
        }
        public function setUpPublicShare(string $share): void { $this->security->user = new PortalUser(true); $this->current = $share; }
        public function getCurrentPublicShare(): ?string { return $this->current; }
        // F334: the share guest's pool must be one of the share's; every share here holds items of pool 3
        public function getDataPoolConfigIdsByPublicShare(string $share): array { return [3]; }
        public function isElementInPublicShare(string $share, \\Pimcore\\Model\\Asset $asset): bool { return in_array($asset->id, $this->shares[$share]['assets'], true); }
    }
}
namespace Pimcore\\Controller {
    use Symfony\\Component\\Security\\Core\\Exception\\AccessDeniedException;
    abstract class FrontendController {
        public static \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService $security;
        protected function isGranted(string $attribute, mixed $subject = null): bool { return self::$security->getPortalUser() !== null; }
        protected function denyAccessUnlessGranted(string $attribute, mixed $subject = null): void {
            if (!$this->isGranted($attribute, $subject)) { throw new AccessDeniedException('Access Denied.'); }
        }
    }
}
namespace {
    require ${JSON.stringify(join(src, 'Portal/Coaster/CoasterFileController.php'))};
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\{PortalUser, SecurityService};
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService;
    use Pimcore\\Model\\Asset;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Coaster\\CoasterFileController;
    Asset::$assets = [1 => new Asset(1, 'thunder-loop.coaster', '{"name":"Thunder Loop"}'), 2 => new Asset(2, 'night-fury.coaster', '{"name":"Night Fury"}')];
    // One request: who calls (null: nobody logged in, 'portal': a portal user) and the query; the answer or the exception.
    function call(?string $login, int $id, array $query): array {
        $GLOBALS['assetLoads'] = [];
        $security = new SecurityService();
        if ($login === 'portal') { $security->user = new PortalUser(false); }
        \\Pimcore\\Controller\\FrontendController::$security = $security;
        $shares = new PublicShareService($security);
        $controller = new CoasterFileController(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService(), $shares, $security);
        try {
            $response = $controller(new \\Symfony\\Component\\HttpFoundation\\Request($query + ['dataPoolId' => 3]), $id);
            $answer = ['status' => $response->status, 'body' => $response->content];
        } catch (\\Throwable $e) {
            $answer = ['error' => (new \\ReflectionClass($e))->getShortName(), 'message' => $e->getMessage()];
        }
        return $answer + ['validated' => $shares->validated, 'share' => $shares->current, 'assetLoads' => $GLOBALS['assetLoads']];
    }
`;

const coasterFile = (calls) => runPhp(`${controllerStubs}
    echo json_encode([${calls.map(([login, id, query]) => `call(${login ? `'${login}'` : 'null'}, ${id}, json_decode('${JSON.stringify(query)}', true))`).join(', ')}]);
  }`);

test('AC3: without a portal login, a valid share hash returns the coaster text of a coaster in that share', () => {
  const [r] = coasterFile([[null, 1, { publicShareHash: 'A' }]]);
  assert.equal(r.status, 200);
  assert.equal(r.body, '{"name":"Thunder Loop"}');
  assert.deepEqual(r.validated, ['A']);
  assert.equal(r.share, 'A', 'the share\'s guest is set up before the pool and VIEW checks');
});

test('AC3: an unknown or expired hash, or a coaster outside the share, gets 404', () => {
  const [unknown, expired, outside] = coasterFile([
    [null, 1, { publicShareHash: 'nope' }],
    [null, 1, { publicShareHash: 'EXPIRED' }],
    [null, 2, { publicShareHash: 'A' }],
  ]);
  assert.equal(unknown.error, 'NotFoundHttpException');
  assert.equal(unknown.share, null);
  assert.equal(expired.error, 'NotFoundHttpException', 'the expired share is caught and answered 404');
  assert.equal(expired.message, 'PublicShare not found.');
  assert.equal(expired.share, null);
  assert.equal(outside.error, 'NotFoundHttpException', 'coaster 2 is not in share A');
  assert.equal(outside.message, 'Element not in PublicShare.');
  assert.equal(outside.body, undefined);
});

// F334: 403 instead of Portal Engine's "invalid login", whose login redirect the 3D ride's fetch read as the file
test('AC4: with neither a portal login nor a share hash the route is refused with 403', () => {
  const [r] = coasterFile([[null, 1, {}]]);
  assert.equal(r.error, 'AccessDeniedHttpException');
  assert.equal(r.message, 'No portal login and no public share.');
  assert.deepEqual(r.assetLoads, [], 'refused before the asset is looked up');
  assert.deepEqual(r.validated, []);
});

test('AC4: a logged-in portal user is answered as today, a foreign share hash is ignored', () => {
  const [plain, foreign] = coasterFile([['portal', 2, {}], ['portal', 2, { publicShareHash: 'A' }]]);
  assert.equal(plain.status, 200);
  assert.equal(plain.body, '{"name":"Night Fury"}');
  assert.deepEqual(foreign, plain, 'the hash changes nothing');
  assert.deepEqual(foreign.validated, [], 'the hash is not even looked at');
  assert.equal(foreign.share, null);
});

// --- the public route list -----------------------------------------------------------------------------------------------

test('AC4: the extension prepends exactly the guest route, the coaster file route and the share scream score route, by their constants', () => {
  const extension = read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php');
  const prepends = [...extension.matchAll(/prependExtensionConfig\(([^;]+)\);/g)].map((m) => m[1]);
  assert.deepEqual(prepends, ["self::PORTAL_ENGINE, ['custom_public_routes' => [GuestController::ROUTE, CoasterFileController::ROUTE, ShareRatingController::ROUTE]]"]);
  assert.match(read('src/Portal/Coaster/CoasterFileController.php'), new RegExp(`public const ROUTE = '${COASTER_FILE_ROUTE}';`));
  assert.match(read('config/pimcore/routing.yaml'), new RegExp(`^${COASTER_FILE_ROUTE}:\\n {4}path: /studio-example-enterprise/coaster-file/\\{id\\}$`, 'm'));
});

test('AC4: the merged public route list is the app\'s list plus the guest route and the coaster file route', { skip: vendorSkip }, () => {
  const r = runPhp(`
    require ${JSON.stringify(autoload)};
    spl_autoload_register(static function (string $class): void {
        $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
        if (str_starts_with($class, $prefix)) {
            $file = ${JSON.stringify(src)} . '/' . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
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
  `);
  assert.deepEqual([...r.app].sort(), ['app_imprint', 'app_press_kit', GUEST_ROUTE, COASTER_FILE_ROUTE, SHARE_RATING_ROUTE].sort());
  assert.equal(r.app.length, 5);
  assert.deepEqual(r.none, [GUEST_ROUTE, COASTER_FILE_ROUTE, SHARE_RATING_ROUTE]);
});
