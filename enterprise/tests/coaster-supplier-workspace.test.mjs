// F134: the supplier's asset workspace is the Thunder Loop folder only, not the park root (spike F105 P1, DR-P32):
// with the park root, the Branding logo files showed in the supplier's "Ride designs" grid with Replace and Delete.
// Needs the php CLI (8.1+). Same in-memory environment as coaster-setup.test.mjs.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoData = join(enterpriseDir, 'demo-data');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(path, 'utf8');

// The in-memory environment: the whole state is one array, so a test can compare states before and after. Elements
// carry 'demo' => true when the demo created them, as PimcoreDemoEnvironment marks them with a property.
const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    // Stubs of the Portal Engine interfaces the plugin class implements: setup reads its id constant.
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
    interface PublicSharePluginProviderInterface { public function isAvailableForPublicShare(): bool; }
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

    function demo(MemoryEnvironment $env): \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo {
        return new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    }
    // The demo in its middle: revision 2 uploaded over revision 1, and a second design next to it.
    function playDemo(MemoryEnvironment $env): void {
        $folder = '/Pimcore Kingdom/Ride designs/Thunder Loop';
        $env->deleteAsset($folder, 'thunder-loop.coaster');
        $env->createAsset($folder, 'thunder-loop.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev2.coaster'));
        $env->createAsset($folder, 'thunder-loop-rev3.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev3.coaster'));
    }
}
`;

// Runs the PHP snippet after the bootstrap and returns what it echoes, parsed as JSON.
const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const golden = JSON.parse(read(join(demoData, 'expected-metadata.json')));
const rev1 = read(join(demoData, 'thunder-loop-rev1.coaster'));
const COASTER = '/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster';
const SUPPLIER = 'supplier@loopwerk.example';
const THUNDER_LOOP = '/Pimcore Kingdom/Ride designs/Thunder Loop';
const BRANDING = '/Pimcore Kingdom/Branding';
const PERMISSIONS = ['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder'];
const LEGACY = 'Theme Park of Tomorrow';
const covers = (workspace, path) => path === workspace || path.startsWith(`${workspace}/`);

test('AC1: setup gives the supplier the Thunder Loop folder as asset workspace, not the park root', () => {
  const { state } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    echo json_encode(['state' => $env->state]);
  `);
  const workspaces = state.users[SUPPLIER].assetWorkspaces;
  assert.deepEqual(Object.keys(workspaces), [THUNDER_LOOP]);
  assert.deepEqual([...workspaces[THUNDER_LOOP]].sort(), [...PERMISSIONS].sort(), 'may still upload, replace and delete ride designs');
  for (const path of [`${BRANDING}/pimcore-kingdom-logo.svg`, `${BRANDING}/pimcore-kingdom-logo.png`]) {
    assert.ok(state.assets[path], `${path} is uploaded`);
    assert.ok(!Object.keys(workspaces).some((workspace) => covers(workspace, path)), `${path} is outside the supplier's workspace`);
  }
  assert.ok(Object.keys(workspaces).some((workspace) => covers(workspace, COASTER)), 'the coaster is inside it');
});

test('AC2: setup narrows a supplier who still has the park root, once; a second run changes nothing', () => {
  const { changes, workspaces, again, writes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $env->state['users']['${SUPPLIER}']['assetWorkspaces'] = ['/Pimcore Kingdom' => ${JSON.stringify(PERMISSIONS).replace(/"/g, "'")}];
    $changes = demo($env)->setup();
    $workspaces = $env->state['users']['${SUPPLIER}']['assetWorkspaces']; $writes = $env->writes;
    $again = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'workspaces' => $workspaces, 'again' => $again, 'writes' => $env->writes - $writes]);
  `);
  assert.deepEqual(changes, ['Set up the supplier Loopwerk Engineering (supplier@loopwerk.example)']);
  assert.deepEqual(Object.keys(workspaces), [THUNDER_LOOP]);
  assert.deepEqual(again, [], 'a second setup changes nothing');
  assert.equal(writes, 0);
});

test('AC2: after the legacy rename path, setup narrows the supplier\'s renamed park root too, then changes nothing', () => {
  const { changes, workspaces, again, writes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $env->state['users']['${SUPPLIER}']['assetWorkspaces'] = ['/Pimcore Kingdom' => ${JSON.stringify(PERMISSIONS).replace(/"/g, "'")}];
    $env->state = json_decode(str_replace('Pimcore Kingdom', '${LEGACY}', json_encode($env->state)), true);
    $changes = demo($env)->setup();
    $workspaces = $env->state['users']['${SUPPLIER}']['assetWorkspaces']; $writes = $env->writes;
    $again = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'workspaces' => $workspaces, 'again' => $again, 'writes' => $env->writes - $writes]);
  `);
  assert.ok(changes.includes(`Renamed the folder /${LEGACY} to /Pimcore Kingdom`), changes.join('\n'));
  assert.ok(changes.includes('Set up the supplier Loopwerk Engineering (supplier@loopwerk.example)'), changes.join('\n'));
  assert.deepEqual(Object.keys(workspaces), [THUNDER_LOOP]);
  assert.deepEqual(again, [], 'a second setup changes nothing');
  assert.equal(writes, 0);
});

test('AC3: reset --all still removes the logo assets and the Branding folder', () => {
  const { setupState, changes, state, before } = php(`
    $before = (new MemoryEnvironment())->state;
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $setupState = $env->state;
    $changes = demo($env)->reset(true);
    echo json_encode(['setupState' => $setupState, 'changes' => $changes, 'state' => $env->state, 'before' => $before]);
  `);
  assert.ok(setupState.assets[`${BRANDING}/pimcore-kingdom-logo.svg`], 'setup uploaded the logo');
  assert.ok(changes.includes('Deleted the folder /Pimcore Kingdom with the demo assets'), changes.join('\n'));
  assert.equal(Object.keys(state.assets).some((path) => path.startsWith(BRANDING)), false, 'no logo asset left');
  assert.equal(Object.keys(state.folders).some((path) => path.startsWith(BRANDING)), false, 'no Branding folder left');
  assert.deepEqual(state, before, 'the state before setup');
});

test('AC4: after setup the portal\'s logo still points at the Branding folder\'s SVG', () => {
  const { state } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    echo json_encode(['state' => $env->state]);
  `);
  const portal = Object.values(state.portals).find((p) => p.demo);
  assert.equal(portal.branding.logo, `${BRANDING}/pimcore-kingdom-logo.svg`);
  assert.ok(state.assets[portal.branding.logo], 'the logo asset exists');
});
