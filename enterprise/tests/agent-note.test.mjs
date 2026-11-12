// F129: the confirmed write of the agent demo. POST /studio-example-enterprise/agent/proposal/{id}/confirm
// (src/Agent/Note) writes one Pimcore note of type "Supplier note" on the revision's asset, from the proposal F126
// stored server-side for the portal user (never from the request body), after re-checking `edit` through the Portal
// Engine's data-pool voter. `coaster-demo:agent-reset` removes those notes and the pending proposals.
// The logic tests need the php CLI only (the Portal Engine, Pimcore's Note and Asset, Symfony security and PSR-6 are
// stubbed below). The HTTP and console tests also use Symfony from a Pimcore vendor/ (PIMCORE_VENDOR_AUTOLOAD, else
// /var/www/html/vendor/autoload.php); they skip without one.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentSrc = join(enterpriseDir, 'src/Agent');
const noteSrc = join(agentSrc, 'Note');
const routeSrc = join(enterpriseDir, 'src/Portal/Agent');
const demoSrc = join(enterpriseDir, 'src/Command/CoasterDemo');
const read = (path) => readFileSync(path, 'utf8');
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const vendorDir = dirname(autoload);
const vendorSkip = !existsSync(autoload)
  ? `no Pimcore vendor at ${autoload}`
  : !['symfony/http-foundation/JsonResponse.php', 'symfony/console/Tester/CommandTester.php', 'symfony/cache/Adapter/ArrayAdapter.php']
      .every((f) => existsSync(join(vendorDir, f))) ? 'symfony/http-foundation, console or cache is not in that vendor/' : false;

const NOTE_TEXT = 'rev3 exceeds the 45 m limit, rev4 will lower the lift hill';

// Stubs of the Portal Engine and Pimcore's models (never the vendor's own: they would need a booted Pimcore).
const stubs = String.raw`
namespace Pimcore\Bundle\PortalEngineBundle\Model\DataObject {
    interface PortalUserInterface {
        public function getId(): ?int;
        public function isGuestUser(): bool;
        public function isPortalShareUser(): bool;
        public function getFirstname(): ?string;
        public function getLastname(): ?string;
        public function getEmail(): ?string;
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Enum {
    class Permission { public const PORTAL_ACCESS = 'portal-access'; public const VIEW = 'view'; public const EDIT = 'edit'; }
}
namespace Pimcore\Bundle\PortalEngineBundle\Service\Security {
    class SecurityService {
        public function __construct(public ?\Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface $user = null) {}
        public function getPortalUser(): ?\Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface { return $this->user; }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Service\DataPool {
    class TestPoolConfig { public function __construct(public int $id) {} public function getId(): int { return $this->id; } }
    class DataPoolConfigService {
        public $current = null;
        public array $known = [];
        public function getCurrentDataPoolConfig() { return $this->current; }
        public function setCurrentDataPoolConfig($config): void { $this->current = $config; }
        public function setCurrentDataPoolConfigById(int $documentId) { if (in_array($documentId, $this->known, true)) { $this->current = new TestPoolConfig($documentId); } }
    }
}
namespace Pimcore\Model {
    class Asset {
        public static array $assets = [];
        public static array $listed = [];
        public function __construct(public int $id, public string $path) {}
        public function getId(): int { return $this->id; }
        public function getRealFullPath(): string { return $this->path; }
        public static function getById(int $id): ?static { return self::$assets[$id] ?? null; }
    }
}
namespace Pimcore\Model\Asset {
    class Listing {
        public static array $conditions = [];
        private array $condition = [];
        public function setCondition(string $condition, mixed $variables = null): static { $this->condition = [$condition, $variables]; self::$conditions[] = $this->condition; return $this; }
        // the stub ignores the condition (the code must filter too); the test checks the condition text itself
        public function loadIdList(): array { return array_map(static fn ($a) => $a->getId(), array_values(\Pimcore\Model\Asset::$listed)); }
        public function getAssets(): array { return array_values(\Pimcore\Model\Asset::$listed); }
    }
}
namespace Pimcore\Model\Element {
    class Note {
        public static array $all = [];
        public static int $nextId = 100;
        public static array $calls = [];
        public ?int $id = null; public string $type = ''; public string $ctype = ''; public int $cid = 0; public string $title = '';
        public string $description = ''; public array $data = []; public ?int $user = null; public int $date = 0; public bool $deleted = false;
        public function setElement($element): static { $this->cid = $element->getId(); $this->ctype = 'asset'; return $this; }
        public function setType(string $type): static { $this->type = $type; return $this; }
        public function setTitle(string $title): static { $this->title = $title; return $this; }
        public function setDescription(string $description): static { $this->description = $description; return $this; }
        public function setDate(int $date): static { $this->date = $date; return $this; }
        public function setUser(int $user): static { self::$calls[] = 'setUser'; $this->user = $user; return $this; }
        public function setCid(int $cid): static { $this->cid = $cid; return $this; }
        public function setCtype(string $ctype): static { $this->ctype = $ctype; return $this; }
        public function addData(string $name, string $type, mixed $data): static { $this->data[$name] = ['type' => $type, 'data' => $data]; return $this; }
        public function getId(): ?int { return $this->id; }
        public function getType(): string { return $this->type; }
        public function getCtype(): string { return $this->ctype; }
        public function getCid(): int { return $this->cid; }
        public function getUser(): ?int { return $this->user; }
        public function save(): void { self::$calls[] = 'save'; $this->id ??= self::$nextId++; self::$all[$this->id] = $this; }
        public function delete(): void { self::$calls[] = 'delete ' . $this->id; $this->deleted = true; unset(self::$all[$this->id]); }
    }
}
namespace Pimcore\Model\Element\Note {
    class Listing {
        public static array $conditions = [];
        public function setCondition(string $condition, mixed $variables = null): static { self::$conditions[] = [$condition, $variables]; return $this; }
        // the stub returns every note, so the code's own filter is what keeps the other notes
        public function getNotes(): array { return array_values(\Pimcore\Model\Element\Note::$all); }
    }
}
`;
const nonVendorStubs = String.raw`
namespace Symfony\Component\Security\Core\Authorization {
    interface AuthorizationCheckerInterface { public function isGranted(mixed $attribute, mixed $subject = null): bool; }
}
namespace Psr\Cache {
    interface CacheItemInterface { public function get(): mixed; public function isHit(): bool; public function set(mixed $value): static; public function expiresAfter(int|\DateInterval|null $time): static; }
    interface CacheItemPoolInterface { public function getItem(string $key): CacheItemInterface; public function save(CacheItemInterface $item): bool; public function deleteItem(string $key): bool; public function clear(): bool; }
}
namespace Symfony\Component\Cache\Adapter {
    interface AdapterInterface extends \Psr\Cache\CacheItemPoolInterface { public function clear(string $prefix = ''): bool; }
}
namespace {
    class TestItem implements \Psr\Cache\CacheItemInterface {
        public mixed $value = null; public bool $hit = false; public ?int $ttl = null;
        public function __construct(public string $key) {}
        public function get(): mixed { return $this->value; }
        public function isHit(): bool { return $this->hit; }
        public function set(mixed $value): static { $this->value = $value; return $this; }
        public function expiresAfter(int|\DateInterval|null $time): static { $this->ttl = $time; return $this; }
    }
    // A Symfony-like pool: clear($prefix) removes only the keys with that prefix.
    class TestPool implements \Symfony\Component\Cache\Adapter\AdapterInterface {
        public array $items = [];
        public function getItem(string $key): \Psr\Cache\CacheItemInterface { return isset($this->items[$key]) ? clone $this->items[$key] : new TestItem($key); }
        public function save(\Psr\Cache\CacheItemInterface $item): bool { $item->hit = true; $this->items[$item->key] = clone $item; return true; }
        public function deleteItem(string $key): bool { unset($this->items[$key]); return true; }
        public function clear(string $prefix = ''): bool { foreach (array_keys($this->items) as $k) { if ($prefix === '' || str_starts_with($k, $prefix)) unset($this->items[$k]); } return true; }
    }
    function testPool(): TestPool { return new TestPool(); }
}
`;
const vendorPool = String.raw`
namespace {
    function testPool(): \Symfony\Component\Cache\Adapter\ArrayAdapter { return new \Symfony\Component\Cache\Adapter\ArrayAdapter(); }
}
`;
const classes = String.raw`
namespace {
    require ${JSON.stringify(agentSrc)} . '/ProposalStore.php';
    require ${JSON.stringify(demoSrc)} . '/DemoEnvironment.php';
    require ${JSON.stringify(demoSrc)} . '/CoasterDemo.php';
    require ${JSON.stringify(routeSrc)} . '/ChatAccess.php';
    foreach (['SupplierNoteBackend', 'PimcoreSupplierNoteBackend', 'ProposalConfirmer'] as $class) {
        require ${JSON.stringify(noteSrc)} . '/' . $class . '.php';
    }
    use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
    use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent as A;
    use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note as N;

    class TestPortalUser implements PortalUserInterface {
        public function __construct(public ?int $id, public bool $guest = false, public bool $share = false, public ?string $first = 'Loopwerk', public ?string $last = 'Engineering') {}
        public function getId(): ?int { return $this->id; }
        public function isGuestUser(): bool { return $this->guest; }
        public function isPortalShareUser(): bool { return $this->share; }
        public function getFirstname(): ?string { return $this->first; }
        public function getLastname(): ?string { return $this->last; }
        public function getEmail(): ?string { return 'supplier@loopwerk.example'; }
    }
    // In memory: which portal user may edit which asset, and the notes written or removed.
    class TestBackend implements N\SupplierNoteBackend {
        public array $written = [];
        public array $editChecks = [];
        public array $removedOn = [];
        public function __construct(public array $editable = [7 => [10]], public array $demoAssets = [10, 20]) {}
        public function mayEdit(PortalUserInterface $user, int $assetId): bool { $this->editChecks[] = [$user->getId(), $assetId]; return in_array($assetId, $this->editable[$user->getId()] ?? [], true); }
        public function writeSupplierNote(int $assetId, int $revision, string $supplierName, string $text): int { $this->written[] = compact('assetId', 'revision', 'supplierName', 'text'); return 500 + count($this->written); }
        public function demoAssetIds(): array { return $this->demoAssets; }
        public function removeSupplierNotes(array $assetIds): int { $this->removedOn[] = $assetIds; return 2; }
    }
    class TestClock { public int $now = 1700000000; public function clock(): \Closure { return fn (): int => $this->now; } }
    // The demo portal 1 with its data pool "Ride designs" (document 33); nothing else is used.
    class TestEnvironmentStub implements \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\DemoEnvironment {
        public function portalId(): ?int { return 1; }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return $dataPoolName === 'Ride designs' ? 33 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int { throw new \LogicException(); }
        public function portalName(int $portalId): ?string { return null; }
        public function renamePortal(int $portalId, string $name): void {}
        public function deletePortal(int $portalId): void {}
        public function enabledPlugins(int $portalId): array { return []; }
        public function enablePlugin(int $portalId, string $pluginId): void {}
        public function briefHtml(int $portalId): ?string { return null; }
        public function saveBrief(int $portalId, string $title, string $html): void {}
        public function portalBranding(int $portalId): array { return []; }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {}
        public function supplier(string $email, string $password): ?array { return null; }
        public function saveSupplier(array $supplier): void {}
        public function deleteSupplier(string $email): void {}
        public function assets(string $folder): array { return []; }
        public function createAsset(string $folder, string $filename, string $content): void {}
        public function deleteAsset(string $folder, string $filename): void {}
        public function assetMetadata(string $folder, string $filename): array { return []; }
        public function folderExists(string $folder): bool { return false; }
        public function renameFolder(string $folder, string $name): void {}
        public function deleteFolder(string $folder): void {}
        public function translation(string $domain, string $key, string $language): ?string { return null; }
        public function saveTranslation(string $domain, string $key, string $language, string $text): void {}
    }
    class TestAuthorization implements \Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface {
        public array $asked = [];
        public function __construct(public array $granted = ['portal-access'], public $pools = null) {}
        public function isGranted(mixed $attribute, mixed $subject = null): bool {
            $this->asked[] = [$attribute, $subject === null ? null : (is_object($subject) ? $subject->getId() : $subject), $this->pools?->getCurrentDataPoolConfig()?->getId()];
            return in_array($attribute, $this->granted, true);
        }
    }

    // The Loopwerk supplier: portal user 7, may edit Thunder Loop (asset 10).
    function supplier(): TestPortalUser { return new TestPortalUser(7); }
    function store($pool, TestClock $clock): A\ProposalStore { return new A\ProposalStore($pool, 900, $clock->clock()); }
}
`;

const runPhp = (script) => {
  try {
    return JSON.parse(execFileSync('php', ['-d', 'display_errors=1', '-d', 'html_errors=0', '-r', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    // the exit status and the PHP output first: a long script would push them out of the message
    throw new Error(`php failed (status ${e.status}, signal ${e.signal}, ${e.code || ''}): ${(e.stderr || '').slice(-1200)} ${(e.stdout || '').slice(-1200)} ${e.stderr || e.stdout ? '' : String(e.message).slice(0, 300)}`);
  }
};
const useLines = String.raw`use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent as A;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note as N;`;
// Logic tests: stubs only.
const php = (body) => runPhp(`${stubs}${nonVendorStubs}${classes}\nnamespace {\n${useLines}\n${body}\n}\n`);
// HTTP and console tests: the stubs first (so the vendor's own Portal Engine and Pimcore classes are never loaded),
// then the vendor autoloader for Symfony, then the controller and the command.
const phpVendor = (body) => runPhp(String.raw`${stubs}
namespace { require ${JSON.stringify(autoload)}; }
${vendorPool}${classes}
namespace {
${useLines}
require ${JSON.stringify(noteSrc)} . '/ConfirmController.php';
require ${JSON.stringify(noteSrc)} . '/ResetCommand.php';
use Symfony\Component\HttpFoundation\Request;
// A POST to the confirm route on the portal host; the body tries to smuggle in another note.
function confirmRequest(string $id, ?string $origin = 'https://portal.kingdom.test'): Request {
    $request = Request::create('https://portal.kingdom.test/studio-example-enterprise/agent/proposal/' . $id . '/confirm', 'POST', [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode(['text' => 'smuggled', 'assetId' => 20, 'revision' => 1, 'portalUserId' => 9]));
    if ($origin !== null) { $request->headers->set('Origin', $origin); }
    return $request;
}
function send($controller, Request $request, string $id): array {
    $response = $controller($request, $id);
    return ['status' => $response->getStatusCode(), 'type' => $response->headers->get('Content-Type'), 'location' => $response->headers->get('Location'), 'body' => json_decode($response->getContent(), true)];
}
function controller(?PortalUserInterface $user, A\ProposalStore $store, TestBackend $backend, bool $portalAccess = true): N\ConfirmController {
    return new N\ConfirmController(new \Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService($user), new TestAuthorization($portalAccess ? ['portal-access'] : []), new N\ProposalConfirmer($store, $backend));
}
${body}
}
`);

// ---- AC1 ----

test('AC1: the owner confirms a pending proposal: edit is re-checked on the revision\'s asset and exactly one Supplier note with the supplier\'s name and the stored text is written', () => {
  const r = php(`
    $clock = new TestClock(); $store = store(testPool(), $clock); $backend = new TestBackend();
    $id = $store->add(7, 10, 3, ${JSON.stringify(NOTE_TEXT)});
    $result = (new N\\ProposalConfirmer($store, $backend))->confirm(supplier(), $id);
    echo json_encode(['result' => $result, 'written' => $backend->written, 'editChecks' => $backend->editChecks, 'stored' => $store->get($id)]);
  `);
  assert.equal(r.result[0], 200);
  assert.equal(r.result[1].noteId, 501);
  assert.equal(r.result[1].assetId, 10);
  assert.equal(r.result[1].revision, 3);
  assert.deepEqual(r.editChecks, [[7, 10]], 'edit is checked once, for the portal user, on the proposal\'s asset');
  assert.deepEqual(r.written, [{ assetId: 10, revision: 3, supplierName: 'Loopwerk Engineering', text: NOTE_TEXT }]);
  assert.equal(typeof r.stored?.confirmedAt, 'number', 'the proposal is marked confirmed');
});

test('AC1: the Pimcore writer saves one note of type "Supplier note" on the asset with the text and the supplier\'s name in its data, and sets no Pimcore author', () => {
  const r = php(`
    \\Pimcore\\Model\\Asset::$assets[10] = new \\Pimcore\\Model\\Asset(10, '/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster');
    $pools = new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService();
    $backend = new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), $pools, new TestAuthorization());
    $noteId = $backend->writeSupplierNote(10, 3, 'Loopwerk Engineering', ${JSON.stringify(NOTE_TEXT)});
    $notes = array_map(static fn ($n) => get_object_vars($n), array_values(\\Pimcore\\Model\\Element\\Note::$all));
    echo json_encode(['noteId' => $noteId, 'notes' => $notes, 'calls' => \\Pimcore\\Model\\Element\\Note::$calls]);
  `);
  assert.equal(r.notes.length, 1);
  const [note] = r.notes;
  assert.equal(r.noteId, note.id);
  assert.equal(note.type, 'Supplier note');
  assert.equal(note.ctype, 'asset');
  assert.equal(note.cid, 10);
  assert.equal(note.description, NOTE_TEXT);
  assert.equal(note.data.supplier?.data, 'Loopwerk Engineering');
  assert.equal(String(note.data.revision?.data), '3');
  assert.ok(note.date > 0, 'dated');
  assert.equal(note.user, null, 'no Pimcore author');
  assert.ok(!r.calls.includes('setUser'), 'setUser is never called (never the shared fallback user)');
  assert.deepEqual(r.calls, ['save']);
});

test('AC1: the edit re-check goes through the Portal Engine\'s data-pool voter: isGranted(edit, asset) with the demo\'s data pool current, which is restored afterwards', () => {
  const r = php(`
    \\Pimcore\\Model\\Asset::$assets[10] = new \\Pimcore\\Model\\Asset(10, '/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster');
    $pools = new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService();
    $pools->known = [33];
    $granted = new TestAuthorization(['edit'], $pools);
    $denied = new TestAuthorization(['view'], $pools);
    echo json_encode([
      'granted' => (new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), $pools, $granted))->mayEdit(supplier(), 10),
      'grantedAsked' => $granted->asked,
      'denied' => (new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), $pools, $denied))->mayEdit(supplier(), 10),
      'unknownAsset' => (new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), $pools, $granted))->mayEdit(supplier(), 99),
      'currentAfter' => $pools->current,
    ]);
  `);
  assert.equal(r.granted, true);
  assert.deepEqual(r.grantedAsked, [['edit', 10, 33]], 'asked for edit on the asset object while the demo\'s data pool is current');
  assert.equal(r.denied, false, 'view alone is not enough');
  assert.equal(r.unknownAsset, false);
  assert.equal(r.currentAfter, null, 'the current data pool is restored');
  const src = read(join(noteSrc, 'PimcoreSupplierNoteBackend.php'));
  assert.match(src, /isGranted\(Permission::EDIT, \$asset\)/);
});

// ---- AC2 ----

test('AC2: an unknown or malformed id answers 404, another portal user\'s proposal 403, a confirmed one 409; none writes a (second) note', () => {
  const r = php(`
    $clock = new TestClock(); $store = store(testPool(), $clock); $backend = new TestBackend([7 => [10], 9 => [10]]);
    $confirmer = new N\\ProposalConfirmer($store, $backend);
    $id = $store->add(7, 10, 3, ${JSON.stringify(NOTE_TEXT)});
    $out = [
      'unknown' => $confirmer->confirm(supplier(), bin2hex(random_bytes(16)))[0],
      'malformed' => $confirmer->confirm(supplier(), '../x')[0],
      'otherUser' => $confirmer->confirm(new TestPortalUser(9), $id)[0],
      'first' => $confirmer->confirm(supplier(), $id)[0],
      'second' => $confirmer->confirm(supplier(), $id)[0],
      'otherUserAfter' => $confirmer->confirm(new TestPortalUser(9), $id)[0],
    ];
    $out['written'] = count($backend->written);
    $out['editChecks'] = $backend->editChecks;
    echo json_encode($out);
  `);
  assert.equal(r.unknown, 404);
  assert.equal(r.malformed, 404);
  assert.equal(r.otherUser, 403);
  assert.equal(r.first, 200);
  assert.equal(r.second, 409);
  assert.equal(r.otherUserAfter, 403, 'another user learns nothing about the confirmed state');
  assert.equal(r.written, 1, 'exactly one note');
  assert.deepEqual(r.editChecks, [[7, 10]], 'no edit check for 404, 403 or 409');
});

test('AC2: through the route: anonymous or guest 401, wrong or missing Origin or no PORTAL_ACCESS 403 (JSON, no redirect), unknown 404, other user 403, then 200 and 409; the body is never read', { skip: vendorSkip }, () => {
  const r = phpVendor(`
    $clock = new TestClock(); $store = store(testPool(), $clock); $backend = new TestBackend([7 => [10], 9 => [10]]);
    $id = $store->add(7, 10, 3, ${JSON.stringify(NOTE_TEXT)});
    $out = [
      'anonymous' => send(controller(null, $store, $backend), confirmRequest($id), $id),
      'guest' => send(controller(new TestPortalUser(9, guest: true), $store, $backend), confirmRequest($id), $id),
      'standInAdmin' => send(controller(new TestPortalUser(null), $store, $backend), confirmRequest($id), $id),
      'otherOrigin' => send(controller(supplier(), $store, $backend), confirmRequest($id, 'https://evil.test'), $id),
      'noOrigin' => send(controller(supplier(), $store, $backend), confirmRequest($id, null), $id),
      'noPortalAccess' => send(controller(supplier(), $store, $backend, false), confirmRequest($id), $id),
      'unknown' => send(controller(supplier(), $store, $backend), confirmRequest(str_repeat('a', 32)), str_repeat('a', 32)),
      'otherUser' => send(controller(new TestPortalUser(9), $store, $backend), confirmRequest($id), $id),
      'first' => send(controller(supplier(), $store, $backend), confirmRequest($id), $id),
      'second' => send(controller(supplier(), $store, $backend), confirmRequest($id), $id),
    ];
    $out['written'] = $backend->written;
    echo json_encode($out);
  `);
  for (const [who, status] of [['anonymous', 401], ['guest', 401], ['standInAdmin', 401], ['otherOrigin', 403], ['noOrigin', 403], ['noPortalAccess', 403], ['unknown', 404], ['otherUser', 403], ['first', 200], ['second', 409]]) {
    assert.equal(r[who].status, status, `${who}: ${status}`);
    assert.match(r[who].type, /^application\/json/, `${who}: JSON`);
    assert.equal(r[who].location, null, `${who}: no redirect`);
    if (status !== 200) assert.equal(typeof r[who].body.error, 'string', `${who}: an error message`);
  }
  assert.deepEqual(r.written, [{ assetId: 10, revision: 3, supplierName: 'Loopwerk Engineering', text: NOTE_TEXT }], 'one note, from the stored proposal, not the body');
});

test('AC2: the route is POST-only on portal sites at /studio-example-enterprise/agent/proposal/{id}/confirm, and does not use the bundle\'s proposal pipeline or the ChangeControl bundle', () => {
  const routing = read(join(enterpriseDir, 'config/pimcore/routing.yaml'));
  const block = routing.match(/^pimcore_studio_example_enterprise_agent_proposal_confirm:\n((?: {4}.*\n?|\s*#.*\n?)+)/m)?.[1];
  assert.ok(block, 'the route pimcore_studio_example_enterprise_agent_proposal_confirm is declared');
  assert.match(block, /^ {4}path: \/studio-example-enterprise\/agent\/proposal\/\{id\}\/confirm$/m);
  assert.match(block, /^ {4}controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\Note\\ConfirmController::__invoke$/m);
  assert.match(block, /^ {4}condition: "request\.attributes\.get\('isPortalEngineSite'\)"$/m);
  assert.match(block, /^ {4}methods: \[POST\]$/m);
  assert.match(block, /id: '\[0-9a-f\]\{32\}'/);
  const services = read(join(enterpriseDir, 'config/agent-note.yaml'));
  assert.doesNotMatch(services, /^pimcore_agent:/m);
  for (const file of readdirSync(noteSrc).filter((f) => f.endsWith('.php'))) {
    // the code, not its comments (they name what it does not use)
    const src = read(join(noteSrc, file)).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(src, /PimcoreAgentBundle|ChangeControl|getContent\(\)|->request->|toArray\(\)/, `${file}: no agent bundle, no ChangeControl, no request body`);
  }
});

// ---- AC3 ----

test('AC3: a supplier without edit on the asset gets 403 and nothing is written; the proposal stays pending', () => {
  const r = php(`
    $clock = new TestClock(); $store = store(testPool(), $clock); $backend = new TestBackend([7 => []]);
    $id = $store->add(7, 10, 3, ${JSON.stringify(NOTE_TEXT)});
    $result = (new N\\ProposalConfirmer($store, $backend))->confirm(supplier(), $id);
    echo json_encode(['result' => $result, 'written' => $backend->written, 'stored' => $store->get($id)]);
  `);
  assert.equal(r.result[0], 403);
  assert.equal(typeof r.result[1].error, 'string');
  assert.deepEqual(r.written, []);
  assert.ok(r.stored, 'still pending');
  assert.equal(r.stored.confirmedAt, undefined);
});

test('AC3: when writing the note fails, nothing is confirmed and the owner may try again', () => {
  const r = php(`
    $clock = new TestClock(); $store = store(testPool(), $clock);
    $backend = new class extends TestBackend { public bool $fail = true; public function writeSupplierNote(int $assetId, int $revision, string $supplierName, string $text): int { if ($this->fail) { throw new \\RuntimeException('db down'); } return parent::writeSupplierNote($assetId, $revision, $supplierName, $text); } };
    $confirmer = new N\\ProposalConfirmer($store, $backend);
    $id = $store->add(7, 10, 3, 'x');
    try { $confirmer->confirm(supplier(), $id); $threw = false; } catch (\\RuntimeException $e) { $threw = true; }
    $backend->fail = false;
    echo json_encode(['threw' => $threw, 'retry' => $confirmer->confirm(supplier(), $id)[0], 'written' => count($backend->written)]);
  `);
  assert.equal(r.threw, true);
  assert.equal(r.retry, 200);
  assert.equal(r.written, 1);
});

// ---- AC4 ----

test('AC4: the Pimcore backend removes only notes of type "Supplier note" on the given assets, never other notes', () => {
  const r = php(`
    $make = function (int $cid, string $type, string $ctype = 'asset') { $n = new \\Pimcore\\Model\\Element\\Note(); $n->setCid($cid)->setCtype($ctype)->setType($type); $n->save(); return $n->getId(); };
    $ids = [
      'supplierOn10' => $make(10, 'Supplier note'),
      'supplierOn20' => $make(20, 'Supplier note'),
      'commentOn10' => $make(10, 'comment'),
      'supplierOnOtherAsset' => $make(77, 'Supplier note'),
      'supplierOnObject10' => $make(10, 'Supplier note', 'object'),
    ];
    $backend = new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService(), new TestAuthorization());
    $removed = $backend->removeSupplierNotes([10, 20]);
    $none = $backend->removeSupplierNotes([]);
    echo json_encode(['ids' => $ids, 'removed' => $removed, 'none' => $none, 'left' => array_keys(\\Pimcore\\Model\\Element\\Note::$all), 'conditions' => \\Pimcore\\Model\\Element\\Note\\Listing::$conditions]);
  `);
  assert.equal(r.removed, 2);
  assert.equal(r.none, 0);
  assert.deepEqual(r.left.sort(), [r.ids.commentOn10, r.ids.supplierOnOtherAsset, r.ids.supplierOnObject10].sort());
  assert.equal(r.conditions.length, 1, 'no listing without assets');
  const [condition, vars] = r.conditions[0];
  assert.match(condition, /ctype = \?/);
  assert.match(condition, /type = \?/);
  assert.match(condition, /cid IN \(\?, \?\)/);
  assert.deepEqual(vars, ['asset', 'Supplier note', 10, 20]);
});

test('AC4: the demo\'s fixture assets are the assets under the park\'s asset folder', () => {
  const r = php(`
    \\Pimcore\\Model\\Asset::$listed = [new \\Pimcore\\Model\\Asset(10, '/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster'), new \\Pimcore\\Model\\Asset(20, '/Pimcore Kingdom/Ride designs/Night Fury/night-fury.coaster')];
    $backend = new N\\PimcoreSupplierNoteBackend(new TestEnvironmentStub(), new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService(), new TestAuthorization());
    echo json_encode(['ids' => $backend->demoAssetIds(), 'conditions' => \\Pimcore\\Model\\Asset\\Listing::$conditions]);
  `);
  assert.deepEqual(r.ids, [10, 20]);
  assert.equal(r.conditions.length, 1);
  assert.match(r.conditions[0][0], /path/);
  assert.deepEqual(r.conditions[0][1], ['/Pimcore Kingdom/%']);
});

test('AC4: removing the pending proposals clears only the proposals\' keys of the cache pool', () => {
  const r = php(`
    $clock = new TestClock(); $pool = testPool(); $store = store($pool, $clock);
    $a = $store->add(7, 10, 3, 'a'); $b = $store->add(9, 10, 2, 'b');
    $other = $pool->getItem('someone_else'); $other->set('keep'); $pool->save($other);
    $store->removeAll();
    echo json_encode(['a' => $store->get($a), 'b' => $store->get($b), 'other' => $pool->getItem('someone_else')->get()]);
  `);
  assert.equal(r.a, null);
  assert.equal(r.b, null);
  assert.equal(r.other, 'keep');
});

test('AC4: proposal ids are random; an expired proposal answers 404; a missing (null) owner never matches', () => {
  const r = php(`
    $clock = new TestClock(); $pool = testPool(); $store = store($pool, $clock); $backend = new TestBackend([7 => [10], 0 => [10]]);
    $confirmer = new N\\ProposalConfirmer($store, $backend);
    $ids = [$store->add(7, 10, 3, 'a'), $store->add(7, 10, 3, 'a')];
    $clock->now += 901;
    $expired = $confirmer->confirm(supplier(), $ids[0])[0];
    $clock->now -= 901;
    $nullOwner = $store->add(0, 10, 3, 'a');
    echo json_encode([
      'ids' => $ids,
      'expired' => $expired,
      'standInVsNullOwner' => $confirmer->confirm(new TestPortalUser(null), $nullOwner)[0],
      'zeroVsNullOwner' => $confirmer->confirm(new TestPortalUser(0), $nullOwner)[0],
      'written' => count($backend->written),
    ]);
  `);
  assert.notEqual(r.ids[0], r.ids[1]);
  for (const id of r.ids) assert.match(id, /^[0-9a-f]{32}$/);
  assert.equal(r.expired, 404);
  assert.equal(r.standInVsNullOwner, 403);
  assert.equal(r.zeroVsNullOwner, 403);
  assert.equal(r.written, 0);
});

test('AC4: coaster-demo:agent-reset removes the Supplier notes on the demo\'s fixture assets and the pending proposals', { skip: vendorSkip }, () => {
  const r = phpVendor(`
    $clock = new TestClock(); $pool = testPool(); $store = store($pool, $clock); $backend = new TestBackend();
    $id = $store->add(7, 10, 3, 'a');
    $command = new N\\ResetCommand($backend, $store);
    $tester = new \\Symfony\\Component\\Console\\Tester\\CommandTester($command);
    $code = $tester->execute([]);
    echo json_encode(['name' => $command->getName(), 'code' => $code, 'removedOn' => $backend->removedOn, 'proposal' => $store->get($id), 'output' => $tester->getDisplay()]);
  `);
  assert.equal(r.name, 'coaster-demo:agent-reset');
  assert.equal(r.code, 0);
  assert.deepEqual(r.removedOn, [[10, 20]]);
  assert.equal(r.proposal, null);
  assert.match(r.output, /2 Supplier note/);
});

test('AC4: the reset command lives in src/Agent/Note/ResetCommand.php and its services are wired in config/agent-note.yaml', () => {
  assert.ok(existsSync(join(noteSrc, 'ResetCommand.php')));
  const services = read(join(enterpriseDir, 'config/agent-note.yaml'));
  for (const cls of ['ResetCommand', 'ConfirmController', 'ProposalConfirmer', 'PimcoreSupplierNoteBackend', 'SupplierNoteBackend']) {
    assert.match(services, new RegExp(`Agent\\\\Note\\\\${cls}:`), `${cls} is a service`);
  }
});
