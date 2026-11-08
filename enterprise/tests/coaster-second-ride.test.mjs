// F238: a second demo ride design, Thunder Loop Twister (demo-data/thunder-loop-twister.coaster): Loopwerk's
// alternative design for the same ride, which the supplier uploads live into /Pimcore Kingdom/Ride designs/Thunder Loop in demo 1
// (DR-P95). Its golden figures sit under expected-metadata.json's `variants`; setup never uploads it, reset removes it
// after the supplier uploaded it, and the agent's recorded brief check still answers for thunder-loop.coaster only.
// Needs the php CLI (8.1+). The setup and reset tests use the in-memory environment of coaster-setup.test.mjs, the
// agent tests the stubs of agent-replay.test.mjs; no Pimcore install is needed.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoData = join(enterpriseDir, 'demo-data');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(path, 'utf8');
const readJson = (path) => JSON.parse(read(path));

const TWISTER = 'thunder-loop-twister.coaster';
const FOLDER = '/Pimcore Kingdom/Ride designs/Thunder Loop';
const COASTER = `${FOLDER}/thunder-loop.coaster`;
const SUPPLIER = 'supplier@loopwerk.example';
const FIVE = ['maxHeight', 'length', 'inversions', 'topSpeed', 'duration'];
const golden = readJson(join(demoData, 'expected-metadata.json'));
const twisterText = read(join(demoData, TWISTER));
const twister = JSON.parse(twisterText);
const rev1 = read(join(demoData, 'thunder-loop-rev1.coaster'));
const revisions = [1, 2, 3].map((n) => `thunder-loop-rev${n}.coaster`);

const { extractCoasterMetadata } = await import(join(enterpriseDir, 'assets/shared/coaster/metadata/metadata.ts'));
const { validateCoaster } = await import(join(enterpriseDir, 'assets/shared/coaster/schema/validate.mjs'));

const runPhp = (script) => {
  try {
    return JSON.parse(execFileSync('php', ['-d', 'display_errors=1', '-d', 'html_errors=0', '-r', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    throw new Error(`php failed: ${e.stderr || ''} ${e.stdout || ''} ${e.stderr || e.stdout ? '' : e.message}`.slice(-1500));
  }
};

// --- AC1: the file and its golden figures

test('AC1: thunder-loop-twister.coaster is valid, Loopwerk\'s own design of the ride, and its TS figures are the golden variants', () => {
  assert.deepEqual(validateCoaster(twister), { valid: true, errors: [] });
  assert.equal(twister.meta.name, 'Thunder Loop Twister');
  assert.equal(twister.meta.designer, 'Loopwerk Engineering');
  assert.equal(twister.meta.park, 'Pimcore Kingdom');
  assert.deepEqual(Object.keys(golden.variants), [TWISTER], 'one variant, under its own key');
  assert.deepEqual(Object.keys(golden.revisions), revisions, 'the three revisions stay as they are');
  assert.deepEqual(extractCoasterMetadata(twister), golden.variants[TWISTER]);
  // Its own track: no revision's track with a number changed (another element sequence and train).
  for (const file of revisions) {
    const revision = readJson(join(demoData, file));
    assert.notDeepEqual(twister.track.map((e) => e.type), revision.track.map((e) => e.type), file);
  }
  assert.notEqual(twister.meta.name, readJson(join(demoData, 'agent-fixtures/night-fury.coaster')).meta.name);
});

test('AC1: the PHP extraction and the listener give exactly the golden variants figures', () => {
  const { extracted, valid } = runPhp(`
    namespace {
      require ${JSON.stringify(join(src, 'Coaster/CoasterValidator.php'))};
      require ${JSON.stringify(join(src, 'Coaster/CoasterMetadataExtractor.php'))};
      $design = json_decode(file_get_contents(${JSON.stringify(join(demoData, TWISTER))}));
      $errors = (new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterValidator())->validate($design);
      echo json_encode(['valid' => $errors === [], 'extracted' => (new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor())->extract($design)]);
    }
  `);
  assert.equal(valid, true, 'the PHP validator accepts it');
  assert.deepEqual(extracted, golden.variants[TWISTER]);
});

test('AC1: within the brief (max height <= 45 m) and all five figures differ from each of revisions 1 to 3', () => {
  const figures = golden.variants[TWISTER];
  assert.ok(figures.maxHeight <= 45, `max height ${figures.maxHeight} m`);
  for (const file of revisions) {
    for (const name of FIVE) {
      assert.notEqual(figures[name], golden.revisions[file][name], `${name} differs from ${file}`);
    }
  }
  const readme = read(join(demoData, 'README.md'));
  assert.match(readme, /^\| `thunder-loop-twister\.coaster` \| .+\|$/m, 'the README table has its row');
});

// --- AC2, AC3: setup and reset in the in-memory environment of coaster-setup.test.mjs

// The listener's Pimcore and psr/log stubs (as coaster-php.test.mjs), so an upload runs the real CoasterMetadataListener.
const listenerStubs = `
namespace Psr\\Log {
    interface LoggerInterface { public function warning(string|\\Stringable $message, array $context = []): void; }
}
namespace Pimcore\\Model {
    class Asset {
        public array $metadata = [];
        public ?int $userOwner = null;
        public function __construct(private string $folder, private ?string $filename, private string $data) {}
        public function getFilename(): ?string { return $this->filename; }
        public function getRealFullPath(): string { return $this->folder . '/' . $this->filename; }
        public function getData(): string { return $this->data; }
        public function setUserOwner(?int $id): static { $this->userOwner = $id; return $this; }
        public function addMetadata(string $name, string $type, mixed $data = null, ?string $language = null): static {
            $this->metadata[$name] = $data;
            return $this;
        }
    }
}
namespace Pimcore\\Event\\Model {
    class AssetEvent { public function __construct(private \\Pimcore\\Model\\Asset $asset) {} public function getAsset(): \\Pimcore\\Model\\Asset { return $this->asset; } }
}
`;

// coaster-setup.test.mjs's MemoryEnvironment, verbatim (its namespace block stays open for setupTail).
const setupBootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    // Stubs of the Portal Engine interfaces the plugin class implements: setup reads its id constant.
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment',
              'Command/CoasterDemo/BriefHtml', 'Command/CoasterDemo/CoasterDemo', 'Portal/StudioExampleEnterprisePortalPlugin'] as $file) {
        require ${JSON.stringify(src)} . '/' . $file . '.php';
    }

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;

    class MemoryEnvironment implements DemoEnvironment {
        public int $writes = 0;
        private int $nextId = 100;
        public array $state = [
            'portals' => [7 => ['name' => 'Existing portal', 'domain' => 'other.localhost', 'demo' => false, 'dataPools' => [], 'brief' => null]],
            'users' => ['buyer@park.example' => ['firstname' => 'Park', 'lastname' => 'Buyer', 'password' => 'secret', 'permissions' => ['portal-access___7' => 'allow'], 'assetWorkspaces' => [], 'demo' => false]],
            'folders' => ['/Marketing' => false],
            'assets' => ['/Marketing/poster.jpg' => ['content' => 'jpeg', 'metadata' => [], 'demo' => false]],
        ];

        public function portalId(): ?int {
            foreach ($this->state['portals'] as $id => $portal) { if ($portal['demo']) { return $id; } }
            return null;
        }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int {
            $this->writes++;
            $id = $this->nextId++;
            $this->state['portals'][$id] = ['name' => $name, 'domain' => $domain, 'language' => $language, 'demo' => true,
                'dataPools' => [$dataPoolName => $this->nextId++], 'brief' => null];
            return $id;
        }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return $this->state['portals'][$portalId]['dataPools'][$dataPoolName] ?? null; }
        public function deletePortal(int $portalId): void { $this->writes++; unset($this->state['portals'][$portalId]); }
        public function portalName(int $portalId): ?string { return $this->state['portals'][$portalId]['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portals'][$portalId]['name'] = $name; }
        // As in Pimcore, a workspace points at the folder itself, so it follows the rename.
        public function renameFolder(string $folder, string $name): void {
            $this->writes++;
            $to = dirname($folder) === '/' ? '/' . $name : dirname($folder) . '/' . $name;
            $move = fn (string $path) => $path === $folder || str_starts_with($path, $folder . '/') ? $to . substr($path, strlen($folder)) : $path;
            foreach (['folders', 'assets'] as $kind) {
                $this->state[$kind] = array_combine(array_map($move, array_keys($this->state[$kind])), $this->state[$kind]);
            }
            foreach ($this->state['users'] as $email => $user) {
                $this->state['users'][$email]['assetWorkspaces'] = array_combine(array_map($move, array_keys($user['assetWorkspaces'])), $user['assetWorkspaces']);
            }
        }
        public function enabledPlugins(int $portalId): array { return $this->state['portals'][$portalId]['plugins'] ?? []; }
        public function enablePlugin(int $portalId, string $pluginId): void {
            $this->writes++;
            $this->state['portals'][$portalId]['plugins'] = [...$this->enabledPlugins($portalId), $pluginId];
        }
        public function briefHtml(int $portalId): ?string { return $this->state['portals'][$portalId]['brief']['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void {
            $this->writes++;
            $this->state['portals'][$portalId]['brief'] = ['title' => $title, 'html' => $html];
        }
        public function supplier(string $email, string $password): ?array {
            $user = $this->state['users'][$email] ?? null;
            if ($user === null) { return null; }
            return ['email' => $email, 'firstname' => $user['firstname'], 'lastname' => $user['lastname'],
                'passwordValid' => $user['password'] === $password, 'permissions' => $user['permissions'], 'assetWorkspaces' => $user['assetWorkspaces']];
        }
        public function saveSupplier(array $supplier): void {
            $this->writes++;
            $old = $this->state['users'][$supplier['email']] ?? ['permissions' => [], 'demo' => true];
            $this->state['users'][$supplier['email']] = ['firstname' => $supplier['firstname'], 'lastname' => $supplier['lastname'],
                'password' => $supplier['password'], 'permissions' => [...$old['permissions'], ...$supplier['permissions']],
                'assetWorkspaces' => $supplier['assetWorkspaces'], 'demo' => $old['demo']];
        }
        public function deleteSupplier(string $email): void {
            if ($this->state['users'][$email]['demo'] ?? false) { $this->writes++; unset($this->state['users'][$email]); }
        }
        public function assets(string $folder): array {
            $assets = [];
            foreach ($this->state['assets'] as $path => $asset) {
                if (dirname($path) === $folder) { $assets[basename($path)] = self::load($asset['content']); }
            }
            return $assets;
        }
        // An upload: the coaster listener fills the metadata of a valid .coaster file.
        public function createAsset(string $folder, string $filename, string $content): void {
            $this->writes++;
            for ($path = $folder; $path !== '/'; $path = dirname($path)) {
                if (!array_key_exists($path, $this->state['folders'])) { $this->state['folders'][$path] = true; }
            }
            $metadata = [];
            if (str_ends_with($filename, '.coaster')) {
                foreach ((new CoasterMetadataExtractor())->extract(json_decode($content)) as $name => $value) { $metadata[$name] = (string) $value; }
            }
            $this->state['assets'][$folder . '/' . $filename] = ['content' => self::store($content), 'metadata' => $metadata, 'demo' => true];
        }
        // Binary content (the PNG logo, F101) is kept base64-tagged, so the state stays JSON.
        public static function store(string $content): string { return mb_check_encoding($content, 'UTF-8') ? $content : 'base64:' . base64_encode($content); }
        public static function load(string $content): string { return str_starts_with($content, 'base64:') ? base64_decode(substr($content, 7)) : $content; }
        // The portal's logo and brand colours (F101).
        public function portalBranding(int $portalId): array {
            return $this->state['portals'][$portalId]['branding'] ?? ['logo' => null, 'brand_primary' => null, 'brand_accent' => null];
        }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
            $this->writes++;
            $this->state['portals'][$portalId]['branding'] = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
        }
        public function deleteAsset(string $folder, string $filename): void { $this->writes++; unset($this->state['assets'][$folder . '/' . $filename]); }
        public function assetMetadata(string $folder, string $filename): array { return $this->state['assets'][$folder . '/' . $filename]['metadata'] ?? []; }
        public function folderExists(string $folder): bool { return $this->state['folders'][$folder] ?? false; }
        // Pimcore translations (F135): kept beside the state, as reset --all leaves the text setup added.
        public array $translations = [];
        public function translation(string $domain, string $key, string $language): ?string { return $this->translations[$domain][$key][$language] ?? null; }
        public function saveTranslation(string $domain, string $key, string $language, string $text): void { $this->writes++; $this->translations[$domain][$key][$language] = $text; }
        public function deleteFolder(string $folder): void {
            if (!$this->folderExists($folder)) { return; }
            $this->writes++;
            foreach (['folders', 'assets'] as $kind) {
                foreach (array_keys($this->state[$kind]) as $path) {
                    if ($path === $folder || str_starts_with($path, $folder . '/')) { unset($this->state[$kind][$path]); }
                }
            }
        }
    }

`;

const setupTail = `
    function demo(MemoryEnvironment $env): \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo {
        return new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    }
    foreach (['Coaster/CoasterMetadataListener'] as $file) { require ${JSON.stringify(src)} . '/' . $file . '.php'; }
    class NullLogger implements \\Psr\\Log\\LoggerInterface { public array $warnings = []; public function warning(string|\\Stringable $message, array $context = []): void { $this->warnings[] = (string) $message; } }
    // The supplier's upload as the portal leaves it: a new asset in the folder, the supplier's user as its owner, the
    // listener's metadata set on preAdd (before the asset is written), no demo mark.
    function supplierUpload(MemoryEnvironment $env, string $folder, string $filename, string $content, int $ownerId): void {
        $asset = (new \\Pimcore\\Model\\Asset($folder, $filename, $content))->setUserOwner($ownerId);
        $listener = new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataListener(new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterValidator(), new CoasterMetadataExtractor(), new NullLogger());
        $listener->onAssetSave(new \\Pimcore\\Event\\Model\\AssetEvent($asset));
        $env->writes++;
        $env->state['assets'][$asset->getRealFullPath()] = ['content' => MemoryEnvironment::store($asset->getData()),
            'metadata' => $asset->metadata, 'owner' => $asset->userOwner, 'demo' => false];
    }
    function twister(): string { return file_get_contents(${JSON.stringify(join(demoData, TWISTER))}); }
}
`;

const php = (body) => runPhp(`${listenerStubs}${setupBootstrap}${setupTail}\nnamespace {\nuse Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo;\n${body}\n}\n`);


const twisterPaths = (state) => Object.keys(state.assets).filter((path) => path.endsWith(`/${TWISTER}`));

test('AC2: setup on a fresh and on an already set-up demo never uploads the Twister and keeps the supplier\'s workspaces', () => {
  const { fresh, again, againChanges, permissions } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $fresh = $env->state;
    $againChanges = demo($env)->setup();
    echo json_encode(['fresh' => $fresh, 'again' => $env->state, 'againChanges' => $againChanges, 'permissions' => CoasterDemo::WORKSPACE_PERMISSIONS]);
  `);
  for (const [name, state] of [['fresh', fresh], ['again', again]]) {
    assert.deepEqual(twisterPaths(state), [], `${name}: no Twister uploaded`);
    assert.deepEqual(Object.keys(state.assets).filter((p) => p.startsWith(`${FOLDER}/`)), [COASTER], `${name}: only thunder-loop.coaster`);
    assert.equal(state.assets[COASTER].content, rev1);
  }
  assert.deepEqual(againChanges, []);
  assert.deepEqual(again.users[SUPPLIER].assetWorkspaces, fresh.users[SUPPLIER].assetWorkspaces);
  assert.deepEqual(fresh.users[SUPPLIER].assetWorkspaces[FOLDER], permissions);
  // WORKSPACE_PERMISSIONS byte for byte (no rights change, DR-P95).
  assert.deepEqual(permissions, ['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder']);
  assert.match(read(join(src, 'Command/CoasterDemo/CoasterDemo.php')),
    /public const WORKSPACE_PERMISSIONS = \['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder'\];/);
});

test('AC2: setup after the supplier uploaded the Twister leaves it, the workspaces and their permissions as they are', () => {
  const { before, after, changes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    supplierUpload($env, CoasterDemo::COASTER_FOLDER, ${JSON.stringify(TWISTER)}, twister(), 42);
    $before = $env->state;
    $changes = demo($env)->setup();
    echo json_encode(['before' => $before, 'after' => $env->state, 'changes' => $changes]);
  `);
  assert.deepEqual(changes, []);
  assert.deepEqual(after, before);
  assert.deepEqual(twisterPaths(after), [`${FOLDER}/${TWISTER}`]);
});

test('AC3: the supplier\'s Twister upload (supplier as owner, listener metadata on preAdd) is removed by reset; revision 1 stays; a second reset has nothing to do', () => {
  const { uploaded, setupState, changes, afterReset, again, againWrites } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $setupState = $env->state;
    supplierUpload($env, CoasterDemo::COASTER_FOLDER, ${JSON.stringify(TWISTER)}, twister(), 42);
    $uploaded = $env->state['assets'][CoasterDemo::COASTER_FOLDER . '/' . ${JSON.stringify(TWISTER)}];
    $changes = demo($env)->reset();
    $afterReset = $env->state;
    $writes = $env->writes;
    $again = demo($env)->reset();
    echo json_encode(['uploaded' => $uploaded, 'setupState' => $setupState, 'changes' => $changes, 'afterReset' => $afterReset, 'again' => $again, 'againWrites' => $env->writes - $writes]);
  `);
  // The fixture is the supplier's upload: owned by the supplier, not marked as the demo's, with the listener's metadata.
  assert.equal(uploaded.owner, 42);
  assert.equal(uploaded.demo, false);
  assert.deepEqual(Object.fromEntries(Object.entries(uploaded.metadata).map(([k, v]) => [k, Number(v)])), golden.variants[TWISTER]);
  assert.ok(Object.values(uploaded.metadata).every((v) => typeof v === 'string'), 'input metadata, as strings');

  assert.deepEqual(changes, [`Deleted ${FOLDER}/${TWISTER}`]);
  assert.deepEqual(twisterPaths(afterReset), []);
  assert.equal(afterReset.assets[COASTER].content, rev1, 'revision 1 as thunder-loop.coaster');
  assert.deepEqual(afterReset, setupState, 'the state after setup');
  assert.deepEqual(again, [], 'a second reset reports nothing to do');
  assert.equal(againWrites, 0);
});

test('AC3: on Pimcore, reset sees and deletes an asset the demo did not mark (the supplier\'s upload)', () => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const method = (name) => {
    const start = pimcore.indexOf(`public function ${name}(`);
    return pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
  };
  assert.match(method('assets'), /getChildren\(\)/);
  assert.doesNotMatch(method('assets'), /MARK|getProperty|getUserOwner/, 'lists every file of the folder, whoever uploaded it');
  assert.match(method('deleteAsset'), /Asset::getByPath\(\$folder \. '\/' \. \$filename\)\?->delete\(\)/);
  assert.doesNotMatch(method('deleteAsset'), /MARK|getProperty|getUserOwner/);
});

// --- AC4: the agent: the revision tool lists both designs, the brief check answers for thunder-loop.coaster only

const agentSrc = join(src, 'Agent');
const routeSrc = join(src, 'Portal/Agent');
const replayFile = join(demoData, 'agent/kingdom-brief-check.replay.json');
// The recording stays as it is: its sha256 on integration before this feature.
const REPLAY_SHA256 = 'a33f811fd8a5ccb9f1da8c26ce01485f5385e77b2e28ab2c63687d1a296fcf8e';

const agentStubs = `
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
namespace {
    foreach (['NoPortalUserException', 'KingdomSource', 'PortalUserContext', 'ProposalStore', 'KingdomBriefTools'] as $class) {
        require ${JSON.stringify(agentSrc)} . '/' . $class . '.php';
    }
    foreach (['Command/CoasterDemo/DemoEnvironment', 'Command/CoasterDemo/CoasterDemo', 'Portal/Agent/ReplayPlayer'] as $file) {
        require ${JSON.stringify(src)} . '/' . $file . '.php';
    }
    use Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent as A;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Agent as R;

    class TestPortalUser implements PortalUserInterface {
        public function __construct(public ?int $id, public array $workspaces) {}
        public function getId(): ?int { return $this->id; }
        public function isGuestUser(): bool { return false; }
        public function isPortalShareUser(): bool { return false; }
    }
    class TestTokenStorage implements \\Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage\\TokenStorageInterface {
        public function getToken(): ?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface { return null; }
        public function setToken(?\\Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface $token): void {}
    }
    class TestItem implements \\Psr\\Cache\\CacheItemInterface {
        public mixed $value = null; public bool $hit = false;
        public function __construct(public string $key) {}
        public function getKey(): string { return $this->key; }
        public function get(): mixed { return $this->value; }
        public function isHit(): bool { return $this->hit; }
        public function set(mixed $value): static { $this->value = $value; return $this; }
        public function expiresAt(?\\DateTimeInterface $expiration): static { return $this; }
        public function expiresAfter(int|\\DateInterval|null $time): static { return $this; }
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
    // The .coaster assets: [assetId => [path, [[maxHeightM, lengthM], ... one per revision]]], listed by asset id as
    // PimcoreKingdomSource does; the user may view what lies in one of its workspaces.
    class TwoDesignsSource implements A\\KingdomSource {
        public function __construct(private array $assets) {}
        public function briefText(): ?string { return 'No point of the track may be higher than 45 m.'; }
        public function coasterRevisions(): array {
            $revisions = [];
            ksort($this->assets);
            foreach ($this->assets as $assetId => [$path, $figures]) {
                foreach ($figures as $i => [$height, $length]) {
                    $revisions[] = ['assetId' => $assetId, 'path' => $path, 'revision' => $i + 1, 'maxHeightM' => (float) $height, 'lengthM' => (float) $length];
                }
            }
            return $revisions;
        }
        public function mayView(PortalUserInterface $user, int $assetId): bool {
            foreach ($user->workspaces as $workspace) { if (str_starts_with($this->assets[$assetId][0], $workspace . '/')) return true; }
            return false;
        }
    }
    // The supplier, portal user 7, its workspace the Thunder Loop folder; a brief check with these assets.
    function check(array $assets): array {
        $source = new TwoDesignsSource($assets);
        $pool = new TestPool();
        $tools = new A\\KingdomBriefTools(new A\\PortalUserContext(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService(new TestPortalUser(7, ['/Pimcore Kingdom/Ride designs/Thunder Loop'])), new TestTokenStorage()), $source, new A\\ProposalStore($pool, 900));
        $player = new R\\ReplayPlayer($tools, ${JSON.stringify(replayFile)}, static function (int $ms): void {}, static fn (): int => 0, static fn (): string => 'm1', $source);
        $events = [];
        $player->play('Does my latest Thunder Loop revision meet the brief?', function (array $e) use (&$events): void { $events[] = $e; });
        $text = implode('', array_map(static fn ($e) => $e['text'] ?? '', $events));
        $widgets = array_values(array_filter($events, static fn ($e) => $e['type'] === 'widget'));
        return ['tool' => $tools->listRevisions(), 'text' => $text, 'widgets' => $widgets, 'proposals' => array_map(static fn ($i) => $i->value, array_values($pool->items))];
    }
}
`;
const agent = (body) => runPhp(`${agentStubs}\nnamespace {\n${body}\n}\n`);

const rev = (file) => [golden.revisions[file].maxHeight, golden.revisions[file].length];
const twisterFigures = [golden.variants[TWISTER].maxHeight, golden.variants[TWISTER].length];
const NIGHT_FURY = [20, '/Pimcore Kingdom/Ride designs/Night Fury/night-fury.coaster', [[40, 500]]];
// Asset ids: the Twister 5 (listed first), thunder-loop.coaster 10, night-fury 20 (outside the workspace).
const assets = (thunderLoop, twisterRevisions) => ({
  5: [`${FOLDER}/${TWISTER}`, twisterRevisions],
  10: [COASTER, thunderLoop],
  [NIGHT_FURY[0]]: [NIGHT_FURY[1], NIGHT_FURY[2]],
});
const runCheck = (thunderLoop, twisterRevisions) => agent(`echo json_encode(check(json_decode(${JSON.stringify(JSON.stringify(assets(thunderLoop, twisterRevisions)))}, true)));`);

test('AC4: on a tie (both at revision 1, the Twister listed first) the brief check answers for thunder-loop.coaster; the tool lists both', () => {
  // thunder-loop.coaster's only revision is 52 m high (above the brief); the Twister's 38 m (within).
  const result = runCheck([rev('thunder-loop-rev3.coaster')], [twisterFigures]);
  assert.deepEqual(result.tool.map((r) => [r.assetId, r.revision]), [[5, 1], [10, 1]], 'the tool lists both assets by assetId');
  assert.ok(result.tool.every((r) => !('path' in r)), 'no file names');
  assert.match(result.text, /You may view 1 revisions of the design: revision 1 \(52 m\)\. /);
  assert.match(result.text, /Revision 1 reaches 52 m, 7 m above/);
  assert.equal(result.widgets.length, 1, 'the Supplier note card');
  assert.equal(result.widgets[0].data.assetId, 10);
  assert.equal(result.widgets[0].data.revision, 1);
  assert.deepEqual(result.proposals.map((p) => p.assetId), [10]);
});

test('AC4: with the Twister at a higher revision the check, its count and list stay with thunder-loop.coaster', () => {
  const thunderLoop = revisions.map(rev);
  const result = runCheck(thunderLoop, [twisterFigures, twisterFigures, twisterFigures, twisterFigures, twisterFigures]);
  assert.deepEqual(result.tool.filter((r) => r.assetId === 5).map((r) => r.revision), [1, 2, 3, 4, 5]);
  assert.deepEqual(result.tool.filter((r) => r.assetId === 10).map((r) => r.revision), [1, 2, 3]);
  assert.match(result.text, /You may view 3 revisions of the design: revision 1 \(40 m\), revision 2 \(45 m\), revision 3 \(52 m\)\. /);
  assert.match(result.text, /Revision 3 reaches 52 m/);
  assert.deepEqual(result.widgets.map((w) => [w.data.assetId, w.data.revision]), [[10, 3]]);
});

test('AC4: with thunder-loop.coaster within the brief and the Twister too, the answer is about thunder-loop.coaster\'s revision', () => {
  const result = runCheck([rev('thunder-loop-rev1.coaster'), rev('thunder-loop-rev2.coaster')], [twisterFigures, twisterFigures, twisterFigures]);
  assert.match(result.text, /You may view 2 revisions of the design: revision 1 \(40 m\), revision 2 \(45 m\)\. /);
  assert.match(result.text, /Revision 2 stays within the limit at 45 m/);
  assert.deepEqual(result.widgets, []);
});

test('AC4: night-fury stays unlisted, and the recording is unchanged', () => {
  const result = runCheck([rev('thunder-loop-rev3.coaster')], [twisterFigures]);
  assert.ok(result.tool.every((r) => r.assetId !== NIGHT_FURY[0]), 'night-fury not in the tool list');
  assert.doesNotMatch(result.text, /40 m.*500|Night Fury/);
  assert.equal(createHash('sha256').update(readFileSync(replayFile)).digest('hex'), REPLAY_SHA256);
});

test('AC4: the portal wires the player to the same KingdomSource the tools read', () => {
  const yaml = read(join(enterpriseDir, 'config/portal-agent.yaml'));
  assert.match(yaml, /Portal\\Agent\\ReplayPlayer:\s*\n\s+arguments:\s*\n\s+\$source: '@Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\KingdomSource'/);
});
