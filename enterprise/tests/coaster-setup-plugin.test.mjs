// F94: coaster-demo:setup enables the example portal plugin (StudioExampleEnterprisePortalPlugin::ID) in the demo
// portal's "Enabled plugins" (DR-F65-7 B). Needs the php CLI (8.1+). Same in-memory environment as
// coaster-setup.test.mjs (the fresh-setup case is there); the Pimcore side is checked in its source, the live run
// is LIVE_CHECK_talk_demo. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
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
                if (dirname($path) === $folder) { $assets[basename($path)] = $asset['content']; }
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
            $this->state['assets'][$folder . '/' . $filename] = ['content' => $content, 'metadata' => $metadata, 'demo' => true];
        }
        public function deleteAsset(string $folder, string $filename): void { $this->writes++; unset($this->state['assets'][$folder . '/' . $filename]); }
        public function assetMetadata(string $folder, string $filename): array { return $this->state['assets'][$folder . '/' . $filename]['metadata'] ?? []; }
        public function folderExists(string $folder): bool { return $this->state['folders'][$folder] ?? false; }
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
        $folder = '/Pimcore Kingdom/Thunder Loop';
        $env->deleteAsset($folder, 'thunder-loop.coaster');
        $env->createAsset($folder, 'thunder-loop.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev2.coaster'));
        $env->createAsset($folder, 'thunder-loop-rev3.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev3.coaster'));
    }
}
`;

// Runs the PHP snippet after the bootstrap and returns what it echoes, parsed as JSON.
const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const PLUGIN = 'studio-example-enterprise';
const demoPortal = (state) => Object.values(state.portals).find((portal) => portal.demo);

test('AC2: setup adds the plugin after the other enabled plugins with one change line, then changes nothing', () => {
  const { changes, plugins, again, writes, other } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $id = $env->portalId();
    $env->state['portals'][$id]['plugins'] = ['portal-a', 'portal-b'];
    $env->state['portals'][7]['plugins'] = ['portal-a'];
    $changes = demo($env)->setup();
    $plugins = $env->enabledPlugins($id);
    $writes = $env->writes;
    $again = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'plugins' => $plugins, 'again' => $again, 'writes' => $env->writes - $writes,
        'other' => $env->enabledPlugins(7)]);
  `);
  assert.deepEqual(changes, [`Enabled the plugin "${PLUGIN}" on the portal "Pimcore Kingdom"`]);
  assert.deepEqual(plugins, ['portal-a', 'portal-b', PLUGIN], 'the others stay, in their order, the plugin after them');
  assert.deepEqual(other, ['portal-a'], 'the other portal is untouched');
  assert.deepEqual(again, [], 'a second setup changes nothing');
  assert.equal(writes, 0, 'and writes nothing');
});

test('AC2: setup on a portal that has the plugin among others leaves the list as it is', () => {
  const { changes, plugins } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $id = $env->portalId();
    $env->state['portals'][$id]['plugins'] = ['portal-a', '${PLUGIN}', 'portal-b'];
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'plugins' => $env->enabledPlugins($id)]);
  `);
  assert.deepEqual(changes, []);
  assert.deepEqual(plugins, ['portal-a', PLUGIN, 'portal-b']);
});

test('AC3: reset --all and then setup enable the plugin again; reset at revision 1 does not touch the setting', () => {
  const { removed, setupChanges, state, resetChanges, enables, plugins } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $removed = demo($env)->reset(true);
    $setupChanges = demo($env)->setup();
    $state = $env->state;
    $env = new class extends MemoryEnvironment {
        public int $enables = 0;
        public function enablePlugin(int $portalId, string $pluginId): void { $this->enables++; parent::enablePlugin($portalId, $pluginId); }
    };
    demo($env)->setup();
    $id = $env->portalId();
    $env->state['portals'][$id]['plugins'] = ['portal-a', '${PLUGIN}'];
    $enables = $env->enables;
    $resetChanges = demo($env)->reset();
    echo json_encode(['removed' => $removed, 'setupChanges' => $setupChanges, 'state' => $state, 'resetChanges' => $resetChanges,
        'enables' => $env->enables - $enables, 'plugins' => $env->enabledPlugins($id)]);
  `);
  assert.ok(removed.some((line) => /Deleted the portal/.test(line)), 'reset --all removed the portal');
  assert.equal(setupChanges.length, 4, setupChanges.join('\n'));
  assert.deepEqual(demoPortal(state).plugins, [PLUGIN], 'the new portal has the plugin again');
  assert.deepEqual(resetChanges, [], 'reset at revision 1 changes nothing');
  assert.equal(enables, 0, 'reset at revision 1 does not write the setting');
  assert.deepEqual(plugins, ['portal-a', PLUGIN]);
});

test('AC4: setup stops with the error when enabling the plugin fails', () => {
  const { error } = php(`
    $env = new class extends MemoryEnvironment {
        public function enablePlugin(int $portalId, string $pluginId): void { throw new \\RuntimeException('save failed'); }
    };
    try { demo($env)->setup(); echo json_encode(['error' => null]); } catch (\\RuntimeException $e) { echo json_encode(['error' => $e->getMessage()]); }
  `);
  assert.equal(error, 'save failed');
});

test('AC4: on Pimcore, enablePlugin keeps the ids there, saves the portal page, then clears the cache; a failed save is not caught', () => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  assert.match(pimcore, /use Pimcore\\Bundle\\PortalEngineBundle\\Enum\\Document\\Editables\\PortalConfig;/);
  assert.match(pimcore, /use Pimcore\\Cache;/);
  const read_ = pimcore.slice(pimcore.indexOf('public function enabledPlugins('), pimcore.indexOf('public function enablePlugin('));
  assert.match(read_, /getEditable\(PortalConfig::ENABLED_PLUGINS\)/, 'reads the portal page\'s enabled_plugins');
  const start = pimcore.indexOf('public function enablePlugin(');
  assert.ok(start > 0, 'PimcoreDemoEnvironment::enablePlugin');
  const method = pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
  assert.match(method, /\$enabled = \$this->enabledPlugins\(\$portalId\);/, 'starts from the ids there');
  assert.match(method, /\$enabled\[\] = \$pluginId;/, 'appends the plugin');
  assert.match(method, /setRawEditable\(PortalConfig::ENABLED_PLUGINS, 'multiselect', \$enabled\)/);
  const save = method.indexOf('$portal->save();');
  const clear = method.indexOf('Cache::clearAll();');
  assert.ok(save > 0 && clear > save, 'saves, then clears the cache');
  assert.doesNotMatch(method, /\bcatch\b/, 'a failed save throws through setup');

  const command = read(join(src, 'Command/CoasterDemoSetupCommand.php'));
  assert.doesNotMatch(command, /\bcatch\b/, 'the setup command lets it through, so it exits non-zero');
});

test('AC4: the plugin id is one constant that getId() and setup both use', () => {
  const plugin = read(join(src, 'Portal/StudioExampleEnterprisePortalPlugin.php'));
  assert.match(plugin, /public const ID = 'studio-example-enterprise';/);
  assert.match(plugin, /public function getId\(\): string\s*\{\s*return self::ID;/);
  const demo = read(join(src, 'Command/CoasterDemo/CoasterDemo.php'));
  assert.match(demo, /StudioExampleEnterprisePortalPlugin::ID/);
  assert.doesNotMatch(demo, /'studio-example-enterprise'/, 'no second copy of the id');
});

test('AC4: the command README says setup enables the plugin; the portal README keeps the manual step', () => {
  const readme = read(join(src, 'Command/README.md'));
  assert.match(readme, /Enabled plugins/);
  assert.match(readme, /`studio-example-enterprise`/);
  const portal = read(join(enterpriseDir, 'assets/portal/README.md'));
  assert.match(portal, /Enabled plugins/, 'other portals still enable it by hand');
});
