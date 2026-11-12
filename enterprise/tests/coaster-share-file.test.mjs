// F334: the coaster file route (src/Portal/Coaster/CoasterFileController.php) serves a public share's guest, so the
// share page's 3D ride loads instead of "Not a .coaster file". On the demo, VIEW on the share's own coaster refused the
// guest (Portal Engine checks VIEW against the workspaces of the share's maker) and the firewall answered the fetch with
// the login page. The share guest now gets the checks of the portal's own share detail; every refusal is 403 or 404.
// The tests run the real controller with the php CLI against stubs of Portal Engine, Pimcore and Symfony; the stubbed
// VIEW refuses a share's guest as the demo's did, so a controller asking VIEW for the guest fails them.
// Run: node --test enterprise/tests/coaster-share-file.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const controllerFile = join(enterpriseDir, 'src/Portal/Coaster/CoasterFileController.php');

// Share A holds coaster 1 of pool 3; B holds coaster 2 of pool 3; EXPIRED held coaster 1. Coaster 2 is a portal user's
// coaster outside share A. A portal user "viewer" has VIEW, "noview" has not; a share's guest never has VIEW.
const stubs = `
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
    class HttpException extends \\RuntimeException { public function getStatusCode(): int { return 500; } }
    class NotFoundHttpException extends HttpException { public function getStatusCode(): int { return 404; } }
    class AccessDeniedHttpException extends HttpException { public function getStatusCode(): int { return 403; } }
}
namespace Symfony\\Component\\Security\\Core\\Exception {
    // both become the portal firewall's redirect to /auth/login for a request without a login
    class AuthenticationException extends \\RuntimeException {}
    class AccessDeniedException extends \\RuntimeException {}
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Exception { class PublicShareExpiredException extends \\Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException {} }
namespace Pimcore\\Bundle\\PortalEngineBundle\\Entity { class PublicShare { public function __construct(public string $hash) {} } }
namespace Pimcore\\Bundle\\PortalEngineBundle\\Enum {
    class Permission { public const PORTAL_ACCESS = 'portal-access'; public const DATA_POOL_ACCESS = 'data-pool-access'; public const VIEW = 'view'; }
}
namespace Pimcore\\Model {
    class Asset {
        public static array $assets = [];
        public function __construct(public int $id, private string $filename, private string $data) {}
        public static function getById(int $id): ?self { return self::$assets[$id] ?? null; }
        public function getFilename(): string { return $this->filename; }
        public function getData(): string { return $this->data; }
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security {
    class PortalUser {
        public function __construct(private bool $shareUser, public bool $mayView = false) {}
        public function isPortalShareUser(): bool { return $this->shareUser; }
    }
    class SecurityService {
        public ?PortalUser $user = null;
        public function getPortalUser(): ?PortalUser { return $this->user; }
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool {
    class DataPoolConfigService { public int $current = 0; public function setCurrentDataPoolConfigById(int $id): void { $this->current = $id; } }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare {
    use Pimcore\\Bundle\\PortalEngineBundle\\Entity\\PublicShare;
    use Pimcore\\Bundle\\PortalEngineBundle\\Exception\\PublicShareExpiredException;
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\{PortalUser, SecurityService};
    use Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException;
    class PublicShareService {
        public array $shares = [
            'A' => ['expired' => false, 'assets' => [1], 'pools' => ['3']],
            'B' => ['expired' => false, 'assets' => [2], 'pools' => ['3']],
            'EXPIRED' => ['expired' => true, 'assets' => [1], 'pools' => ['3']],
        ];
        public ?PublicShare $current = null;
        public array $calls = [];
        public function __construct(private SecurityService $security) {}
        public function validateByHash(?string $hash) {
            $this->calls[] = 'validateByHash';
            if (!isset($this->shares[$hash])) { throw new NotFoundHttpException('PublicShare not found.'); }
            if ($this->shares[$hash]['expired']) { throw new PublicShareExpiredException('PublicShare is expired.'); }
            return new PublicShare($hash);
        }
        public function setUpPublicShare(PublicShare $share): void {
            $this->calls[] = 'setUpPublicShare';
            $this->security->user = new PortalUser(true);
            $this->current = $share;
        }
        public function getCurrentPublicShare(): ?PublicShare { return $this->current; }
        public function getDataPoolConfigIdsByPublicShare(PublicShare $share): array { $this->calls[] = 'getDataPoolConfigIdsByPublicShare'; return $this->shares[$share->hash]['pools']; }
        public function isElementInPublicShare(PublicShare $share, \\Pimcore\\Model\\Asset $asset): bool {
            $this->calls[] = 'isElementInPublicShare';
            return in_array($asset->id, $this->shares[$share->hash]['assets'], true);
        }
    }
}
namespace Pimcore\\Controller {
    use Pimcore\\Bundle\\PortalEngineBundle\\Enum\\Permission;
    use Symfony\\Component\\Security\\Core\\Exception\\AccessDeniedException;
    abstract class FrontendController {
        public static \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService $security;
        public static array $asked = [];
        protected function isGranted(string $attribute, mixed $subject = null): bool {
            self::$asked[] = $attribute;
            $user = self::$security->getPortalUser();
            if ($user === null) { return false; }
            // as on the demo: VIEW for a share's guest checks the share maker's workspaces and refuses the share's coaster
            return $attribute !== Permission::VIEW || (!$user->isPortalShareUser() && $user->mayView);
        }
        protected function denyAccessUnlessGranted(string $attribute, mixed $subject = null): void {
            if (!$this->isGranted($attribute, $subject)) { throw new AccessDeniedException('Access Denied.'); }
        }
    }
}
namespace {
    require ${JSON.stringify(controllerFile)};
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\{PortalUser, SecurityService};
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService;
    use Pimcore\\Controller\\FrontendController;
    use Pimcore\\Model\\Asset;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Coaster\\CoasterFileController;
    Asset::$assets = [1 => new Asset(1, 'thunder-loop.coaster', '{"name":"Thunder Loop"}'), 2 => new Asset(2, 'night-fury.coaster', '{"name":"Night Fury"}')];
    // One request: who calls (null: nobody logged in, 'viewer' / 'noview': a portal user with or without VIEW), the
    // asset and the query. The answer: the HTTP status Symfony gives, the body, and what the controller asked.
    function call(?string $login, int $id, array $query): array {
        $security = new SecurityService();
        if ($login !== null) { $security->user = new PortalUser(false, $login === 'viewer'); }
        FrontendController::$security = $security;
        FrontendController::$asked = [];
        $shares = new PublicShareService($security);
        $controller = new CoasterFileController(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService(), $shares, $security);
        try {
            $response = $controller(new \\Symfony\\Component\\HttpFoundation\\Request($query + ['dataPoolId' => 3]), $id);
            $answer = ['status' => $response->status, 'body' => $response->content, 'type' => $response->headers['Content-Type'] ?? null];
        } catch (\\Symfony\\Component\\HttpKernel\\Exception\\HttpException $e) {
            $answer = ['status' => $e->getStatusCode(), 'error' => (new \\ReflectionClass($e))->getShortName(), 'message' => $e->getMessage()];
        } catch (\\Throwable $e) {
            // a security exception: the firewall's login redirect (302) for a request without a login, else its 403
            $answer = ['status' => 'login-or-firewall', 'error' => (new \\ReflectionClass($e))->getShortName(), 'message' => $e->getMessage()];
        }
        return $answer + ['calls' => $shares->calls, 'asked' => FrontendController::$asked];
    }
`;

const run = (calls) => JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${stubs}
    echo json_encode([${calls.map(([login, id, query]) => `call(${login ? `'${login}'` : 'null'}, ${id}, json_decode('${JSON.stringify(query)}', true))`).join(', ')}]);
  }`], { encoding: 'utf8' }));

const notFile = (answer, label) => {
  assert.ok(answer.status === 403 || answer.status === 404, `${label}: 403 or 404, got ${answer.status} (${answer.error}: ${answer.message})`);
  assert.equal(answer.body, undefined, `${label}: no file`);
};

test('AC1: a guest with a valid share hash of the coaster gets its .coaster file', () => {
  const [r] = run([[null, 1, { publicShareHash: 'A' }]]);
  assert.equal(r.status, 200, `got ${r.status} (${r.error}: ${r.message})`);
  assert.equal(r.body, '{"name":"Thunder Loop"}');
  assert.equal(r.type, 'application/json; charset=utf-8');
});

test('AC2: a wrong hash, an expired hash and a share without this coaster get 404 without the file', () => {
  const [wrong, expired, foreign] = run([
    [null, 1, { publicShareHash: 'nope' }],
    [null, 1, { publicShareHash: 'EXPIRED' }],
    [null, 1, { publicShareHash: 'B' }],
  ]);
  notFile(wrong, 'wrong hash');
  notFile(expired, 'expired hash');
  notFile(foreign, 'share B does not hold coaster 1');
  assert.equal(foreign.status, 404);
  assert.equal(foreign.message, 'Element not in PublicShare.');
});

test('AC2: no hash and no login gets 403, not the login redirect, and no file', () => {
  const [r] = run([[null, 1, {}]]);
  notFile(r, 'anonymous without a hash');
  assert.equal(r.status, 403);
  assert.deepEqual(r.calls, [], 'no share is looked up');
});

test('AC2: a valid share hash with a data pool the share has no items in gets 404', () => {
  const [r] = run([[null, 1, { publicShareHash: 'A', dataPoolId: 9 }]]);
  notFile(r, 'pool 9 is not share A\'s');
  assert.equal(r.status, 404);
});

test('AC3: the share check is the portal\'s own: validateByHash, setUpPublicShare, data pool access, the share\'s pools and isElementInPublicShare', () => {
  const [r] = run([[null, 1, { publicShareHash: 'A' }]]);
  assert.deepEqual(r.calls, ['validateByHash', 'setUpPublicShare', 'getDataPoolConfigIdsByPublicShare', 'isElementInPublicShare']);
  assert.deepEqual(r.asked, ['portal-access', 'data-pool-access'], 'the guest is checked for pool access, never for VIEW');
  const php = readFileSync(controllerFile, 'utf8');
  assert.doesNotMatch(php, /Db::get|fetchOne|portal_engine_public_share/, 'no hand-made share query');
});

test('AC3: a logged-in portal user is answered as before: VIEW decides, a share hash is ignored', () => {
  const [viewer, viewerWithHash, noView] = run([
    ['viewer', 2, {}],
    ['viewer', 2, { publicShareHash: 'A' }],
    ['noview', 2, {}],
  ]);
  assert.equal(viewer.status, 200);
  assert.equal(viewer.body, '{"name":"Night Fury"}');
  assert.deepEqual(viewer.asked, ['portal-access', 'data-pool-access', 'view']);
  assert.deepEqual(viewerWithHash, viewer, 'the hash changes nothing');
  assert.deepEqual(viewerWithHash.calls, [], 'the hash is not even looked at');
  assert.equal(noView.error, 'AccessDeniedException', 'without VIEW the portal\'s own access denied, as before');
  assert.equal(noView.body, undefined);
});
