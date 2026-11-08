// F292: the coasters get their own area in the demo portal. The "Ride designs" data pool lists from
// /Pimcore Kingdom/Ride designs (its workspace, which the Portal Engine takes as the listing root), with Thunder Loop
// below it; the page pictures (/Pimcore Kingdom/Pages) and the branding (/Pimcore Kingdom/Branding) stay where the
// content pages and the portal's logo point at them, outside the pool. Setup moves an existing demo's Thunder Loop
// folder in place (same asset, so its versions and the supplier's workspace follow), reset keeps working.
// Needs the php CLI (8.1+); runs on coaster-setup.test.mjs's in-memory environment (copied verbatim below), extended by
// the RideArea part, so no Pimcore install is needed.
// Run: node --test enterprise/tests/coaster-ride-area.test.mjs
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

const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    // Stubs of the Portal Engine interfaces the plugin class implements: setup reads its id constant.
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment', 'Command/CoasterDemo/RideArea',
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
        $folder = '/Pimcore Kingdom/Thunder Loop';
        $env->deleteAsset($folder, 'thunder-loop.coaster');
        $env->createAsset($folder, 'thunder-loop.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev2.coaster'));
        $env->createAsset($folder, 'thunder-loop-rev3.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-rev3.coaster'));
    }
}
    // The RideArea part (F292): the data pool's listing root, and a folder moved under another one, as in Pimcore
    // (the same element: what is in it and the workspaces pointing at it follow).
    class AreaEnvironment extends MemoryEnvironment implements \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\RideArea {
        public array $roots = [];
        public array $uploadFolders = [];
        public function dataPoolRoot(int $dataPoolId): ?string { return $this->roots[$dataPoolId] ?? '/'; }
        public function uploadFolder(int $dataPoolId): ?string { return $this->uploadFolders[$dataPoolId] ?? null; }
        public function setUploadFolder(int $dataPoolId, string $folder): void { $this->writes++; $this->uploadFolders[$dataPoolId] = $folder; }
        public function setDataPoolRoot(int $dataPoolId, string $folder): void {
            $this->writes++;
            for ($path = $folder; $path !== '/'; $path = dirname($path)) {
                if (!array_key_exists($path, $this->state['folders'])) { $this->state['folders'][$path] = true; }
            }
            $this->roots[$dataPoolId] = $folder;
        }
        public function moveFolder(string $folder, string $parent): void {
            $this->writes++;
            for ($path = $parent; $path !== '/'; $path = dirname($path)) {
                if (!array_key_exists($path, $this->state['folders'])) { $this->state['folders'][$path] = true; }
            }
            $to = $parent . '/' . basename($folder);
            $move = fn (string $path) => $path === $folder || str_starts_with($path, $folder . '/') ? $to . substr($path, strlen($folder)) : $path;
            foreach (['folders', 'assets'] as $kind) {
                $this->state[$kind] = array_combine(array_map($move, array_keys($this->state[$kind])), $this->state[$kind]);
            }
            foreach ($this->state['users'] as $email => $user) {
                $this->state['users'][$email]['assetWorkspaces'] = array_combine(array_map($move, array_keys($user['assetWorkspaces'])), $user['assetWorkspaces']);
            }
        }
        // What the supplier browses in the pool: the folders below its root the supplier has a workspace on.
        public function poolFolders(int $dataPoolId, string $email): array {
            $root = $this->dataPoolRoot($dataPoolId);
            $workspaces = array_keys($this->state['users'][$email]['assetWorkspaces']);
            $seen = [];
            foreach (array_keys($this->state['folders']) as $path) {
                if ($path === $root || !str_starts_with($path, rtrim($root, '/') . '/')) { continue; }
                foreach ($workspaces as $ws) {
                    if ($path === $ws || str_starts_with($path, $ws . '/') || str_starts_with($ws, $path . '/')) { $seen[] = $path; break; }
                }
            }
            sort($seen);
            return $seen;
        }
    }
    function dataPool(MemoryEnvironment $env): int {
        $id = $env->portalId();
        return $env->dataPoolId($id, 'Ride designs');
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const rev1 = read(join(demoData, 'thunder-loop-rev1.coaster'));
const RIDE_DESIGNS = '/Pimcore Kingdom/Ride designs';
const THUNDER_LOOP = `${RIDE_DESIGNS}/Thunder Loop`;
const OLD_THUNDER_LOOP = '/Pimcore Kingdom/Thunder Loop';
const SUPPLIER = 'supplier@loopwerk.example';

test('AC1: the Ride designs pool lists from /Pimcore Kingdom/Ride designs: only Thunder Loop below it, no Pages or Branding folder', () => {
  const { changes, root, folders, assets } = php(`
    $env = new AreaEnvironment();
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'root' => $env->dataPoolRoot(dataPool($env)),
      'folders' => $env->poolFolders(dataPool($env), '${SUPPLIER}'), 'assets' => array_keys($env->state['assets'])]);
  `);
  assert.equal(root, RIDE_DESIGNS, 'the pool\'s listing root is the ride-designs folder');
  assert.deepEqual(folders, [THUNDER_LOOP], 'the supplier browses Thunder Loop only');
  assert.ok(changes.includes(`Set the listing root of the data pool "Ride designs" to ${RIDE_DESIGNS}`), changes.join('\n'));
  assert.ok(assets.includes(`${THUNDER_LOOP}/thunder-loop.coaster`), 'revision 1 is in the ride-designs folder');
  assert.ok(assets.some((path) => path.startsWith('/Pimcore Kingdom/Pages/')), 'the page pictures are still uploaded');
  assert.ok(assets.includes('/Pimcore Kingdom/Branding/pimcore-kingdom-logo.svg'), 'the logo is still uploaded');
  for (const path of assets.filter((p) => p.startsWith('/Pimcore Kingdom/'))) {
    if (path.startsWith('/Pimcore Kingdom/Pages/') || path.startsWith('/Pimcore Kingdom/Branding/')) {
      assert.ok(!path.startsWith(RIDE_DESIGNS), `${path} is outside the pool`);
    }
  }
});

test('AC1: a second setup on the new layout changes nothing', () => {
  const { second } = php(`
    $env = new AreaEnvironment();
    demo($env)->setup();
    echo json_encode(['second' => demo($env)->setup()]);
  `);
  assert.deepEqual(second, []);
});

test('AC1: the pages keep their pictures and the portal its logo (paths unchanged)', () => {
  const { portal, supplier } = php(`
    $env = new AreaEnvironment();
    demo($env)->setup();
    $id = $env->portalId();
    echo json_encode(['portal' => $env->state['portals'][$id], 'supplier' => $env->state['users']['${SUPPLIER}']]);
  `);
  assert.equal(portal.branding.logo, '/Pimcore Kingdom/Branding/pimcore-kingdom-logo.svg');
  assert.deepEqual(Object.keys(supplier.assetWorkspaces), [THUNDER_LOOP, '/Pimcore Kingdom/Pages']);
  assert.deepEqual(supplier.assetWorkspaces['/Pimcore Kingdom/Pages'], ['view'], 'the pictures stay viewable, outside the pool');
});

test('AC3: setup moves today\'s demo (Thunder Loop at the park root, pool on /) to the new layout in place', () => {
  const { changes, state, root, folders } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    // Today's demo: made before F292, with the supplier's Twister uploaded next to revision 1.
    $state = $env->state;
    $old = fn (string $path) => str_replace('${RIDE_DESIGNS}/', '/Pimcore Kingdom/', $path);
    foreach (['folders', 'assets'] as $kind) { $state[$kind] = array_combine(array_map($old, array_keys($state[$kind])), $state[$kind]); }
    foreach ($state['users'] as $email => $user) { $state['users'][$email]['assetWorkspaces'] = array_combine(array_map($old, array_keys($user['assetWorkspaces'])), $user['assetWorkspaces']); }
    unset($state['folders']['${RIDE_DESIGNS}']);
    $area = new AreaEnvironment();
    $area->state = $state;
    $area->translations = $env->translations;
    $area->createAsset('${OLD_THUNDER_LOOP}', 'thunder-loop-twister.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-twister.coaster'));
    $changes = demo($area)->setup();
    echo json_encode(['changes' => $changes, 'state' => $area->state, 'root' => $area->dataPoolRoot(dataPool($area)),
      'folders' => $area->poolFolders(dataPool($area), '${SUPPLIER}')]);
  `);
  assert.deepEqual(changes, [
    `Moved the folder ${OLD_THUNDER_LOOP} to ${THUNDER_LOOP}`,
    `Set the listing root of the data pool "Ride designs" to ${RIDE_DESIGNS}`,
    `Set the upload folder of the data pool "Ride designs" to ${THUNDER_LOOP}`,
    'Set up the supplier Loopwerk Engineering (supplier@loopwerk.example)',
  ], 'the move, the root, the upload folder and the supplier\'s review right, nothing uploaded again');
  assert.equal(root, RIDE_DESIGNS);
  assert.deepEqual(folders, [THUNDER_LOOP]);
  assert.deepEqual(Object.keys(state.assets).filter((p) => p.includes('/Thunder Loop/')).sort(),
    [`${THUNDER_LOOP}/thunder-loop-twister.coaster`, `${THUNDER_LOOP}/thunder-loop.coaster`], 'both files moved with the folder');
  assert.equal(state.folders[OLD_THUNDER_LOOP], undefined, 'no Thunder Loop folder left at the park root');
  assert.deepEqual(Object.keys(state.users[SUPPLIER].assetWorkspaces), [THUNDER_LOOP, '/Pimcore Kingdom/Pages'], 'the workspace followed the folder');
});

test('AC3: reset after the move brings back one tile in Thunder Loop; reset --all removes the ride-designs folder too', () => {
  const { reset, files, all, left } = php(`
    $env = new AreaEnvironment();
    demo($env)->setup();
    $env->createAsset('${THUNDER_LOOP}', 'thunder-loop-twister.coaster', file_get_contents(${JSON.stringify(demoData)} . '/thunder-loop-twister.coaster'));
    $reset = demo($env)->reset();
    $files = array_keys($env->assets('${THUNDER_LOOP}'));
    $all = demo($env)->reset(true);
    echo json_encode(['reset' => $reset, 'files' => $files, 'all' => $all,
      'left' => array_values(array_filter(array_keys($env->state['folders']), fn ($p) => str_starts_with($p, '/Pimcore Kingdom')))]);
  `);
  assert.deepEqual(reset, [`Deleted ${THUNDER_LOOP}/thunder-loop-twister.coaster`]);
  assert.deepEqual(files, ['thunder-loop.coaster'], 'one tile');
  assert.ok(all.includes('Deleted the folder /Pimcore Kingdom with the demo assets'), all.join('\n'));
  assert.deepEqual(left, []);
});

test('AC3: the Pimcore environment moves the folder as the same element and sets the pool\'s first workspace to it', () => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  assert.match(pimcore, /class PimcoreDemoEnvironment implements [^{]*\bRideArea\b/);
  const method = (name) => pimcore.slice(pimcore.indexOf(`public function ${name}(`), pimcore.indexOf('\n    }\n', pimcore.indexOf(`public function ${name}(`)));
  assert.match(method('moveFolder'), /setParentId\(/, 'moved, not copied');
  assert.match(method('setDataPoolRoot'), /WorkspaceConfig::WORKSPACE_PATH/);
  assert.match(method('setDataPoolRoot'), /DataPoolConfig::WORKSPACE_DEFINITION/);
  assert.match(method('setDataPoolRoot'), /Cache::clearAll\(\)/, 'the portal config cache is cleared');
  assert.match(method('dataPoolRoot'), /getRealFullPath\(\)/);
});

// AC2 (DR-F292-1, answer A): portal_engine 2026.x shows an Upload button only on a pool's Upload Folder screen
// (AssetGrid: "Upload Folder" in the listing when /list returns `uploadFolder`, then "Upload new assets" there).
// /list returns it when the pool has an upload folder and the user holds create on it; the screen lists every
// contributor's files only with asset-upload-folder-reviewing___<pool>, else only the user's own.
test('AC2: setup makes Thunder Loop the pool\'s upload folder and lets the supplier review it, so the Upload button shows', () => {
  const { changes, uploadFolder, permissions, poolId, workspaces, second } = php(`
    $env = new AreaEnvironment();
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'uploadFolder' => $env->uploadFolder(dataPool($env)), 'poolId' => dataPool($env),
      'permissions' => $env->state['users']['${SUPPLIER}']['permissions'],
      'workspaces' => $env->state['users']['${SUPPLIER}']['assetWorkspaces'], 'second' => demo($env)->setup()]);
  `);
  assert.equal(uploadFolder, THUNDER_LOOP, 'uploads through the button land in Thunder Loop, as a dropped file does');
  assert.ok(changes.includes(`Set the upload folder of the data pool "Ride designs" to ${THUNDER_LOOP}`), changes.join('\n'));
  assert.equal(permissions[`asset-upload-folder-reviewing___${poolId}`], 'allow', 'the Upload Folder screen shows revision 1 too');
  assert.ok(workspaces[THUNDER_LOOP].includes('create'), 'create on the upload folder: /list offers the Upload Folder button');
  assert.deepEqual(second, [], 'a second setup changes nothing');
});

test('AC2: the Pimcore environment writes the pool\'s upload_folder relation and reads it back', () => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const method = (name) => pimcore.slice(pimcore.indexOf(`public function ${name}(`), pimcore.indexOf('\n    }\n', pimcore.indexOf(`public function ${name}(`)));
  assert.match(method('setUploadFolder'), /AssetConfig::UPLOAD_FOLDER/);
  assert.match(method('setUploadFolder'), /Editable\\Relation/);
  assert.match(method('setUploadFolder'), /Cache::clearAll\(\)/, 'the portal config cache is cleared');
  assert.match(method('uploadFolder'), /AssetConfig::UPLOAD_FOLDER/);
  assert.match(method('uploadFolder'), /getRealFullPath\(\)/);
  const area = read(join(src, 'Command/CoasterDemo/RideArea.php'));
  assert.match(area, /public function uploadFolder\(int \$dataPoolId\): \?string;/);
  assert.match(area, /public function setUploadFolder\(int \$dataPoolId, string \$folder\): void;/);
});

