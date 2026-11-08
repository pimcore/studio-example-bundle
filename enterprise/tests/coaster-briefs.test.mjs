// F293: the park's ride briefs as data objects the supplier browses (Marvin, 2026-11-08: "Browse only"). Setup makes a
// data object class "Ride brief", three open briefs (Thunder Loop at 45 m, as the brief page stated, and two more) in
// /Pimcore Kingdom/Open briefs, and a data-object data pool "Open briefs" right after the ride designs in the
// navigation, view only for the supplier. It replaces the brief page "Brief: Thunder Loop"; the start page's brief tile
// opens the pool. The Ask the brief agent reads Thunder Loop's brief object; its recorded answer keeps the 45 m.
// Needs the php CLI (8.1+); runs on coaster-ride-area.test.mjs's in-memory environment (copied verbatim below),
// extended by the ContentPages, StartPage and RideBriefs parts, so no Pimcore install is needed.
// Run: node --test enterprise/tests/coaster-briefs.test.mjs
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
              'Command/CoasterDemo/ContentPages', 'Command/CoasterDemo/StartPage', 'Command/CoasterDemo/RideBriefs',
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

    // F293: the content pages (the brief page the open briefs replace), the start page and the RideBriefs part. The
    // navigation is the portal's pages in order: the data pool first, then the pages as setup saves them.
    class BriefsEnvironment extends AreaEnvironment implements \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ContentPages,
        \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\StartPage, \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\RideBriefs {
        public array $pages = [];
        public array $icons = [];
        public array $navigation = [];
        public array $bricks = [];
        public ?string $variant = null;
        public ?array $classFields = null;
        public array $objects = [];
        public array $objectFolders = [];
        public array $pools = [];
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int {
            $this->navigation = ['data-pool:' . $dataPoolName];
            return parent::createPortal($name, $domain, $language, $dataPoolName);
        }
        public function contentPage(int $portalId, string $key): ?array { return $this->pages[$key] ?? null; }
        public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void {
            $this->writes++;
            if (!isset($this->pages[$key])) { $this->navigation[] = 'page:' . $key; }
            $this->pages[$key] = ['title' => $title, 'icon' => $icon, 'html' => $html];
        }
        public function deleteContentPage(int $portalId, string $key): void {
            $this->writes++;
            unset($this->pages[$key]);
            $this->navigation = array_values(array_diff($this->navigation, ['page:' . $key]));
        }
        public function navigationIcon(int $documentId): string { return $this->icons[$documentId] ?? ''; }
        public function setNavigationIcon(int $documentId, string $icon): void { $this->writes++; $this->icons[$documentId] = $icon; }
        public function startPageBricks(int $portalId): array { return $this->bricks; }
        public function saveStartPage(int $portalId, array $bricks): void { $this->writes++; $this->bricks = array_map(fn ($b) => $b + ['demo' => true], $bricks); }
        public function frontendVariant(int $portalId): ?string { return $this->variant; }
        public function setFrontendVariant(int $portalId, string $variant): void { $this->writes++; $this->variant = $variant; }
        public function removeStartPage(int $portalId): void { $this->writes++; $this->bricks = []; }
        public function briefClassFields(string $className): ?array { return $className === 'RideBrief' ? $this->classFields : null; }
        public function saveBriefClass(string $className, string $title, array $fields): void { $this->writes++; $this->classFields = $fields; }
        public function deleteBriefClass(string $className): void {
            if ($this->objects === []) { $this->writes++; $this->classFields = null; }
        }
        public function briefs(string $className, string $folder): array {
            $briefs = [];
            foreach ($this->objects as $path => $object) {
                if (dirname($path) === $folder && $object['class'] === $className) { $briefs[basename($path)] = $object['values']; }
            }
            return $briefs;
        }
        public function saveRideBrief(string $className, string $folder, string $key, array $values): void {
            $this->writes++;
            for ($path = $folder; $path !== '/'; $path = dirname($path)) {
                if (!array_key_exists($path, $this->objectFolders)) { $this->objectFolders[$path] = true; }
            }
            $this->objects[$folder . '/' . $key] = ['class' => $className, 'values' => $values];
        }
        public function objectFolderExists(string $folder): bool { return $this->objectFolders[$folder] ?? false; }
        public function deleteObjectFolder(string $folder): void {
            if (!$this->objectFolderExists($folder)) { return; }
            $this->writes++;
            foreach (['objectFolders', 'objects'] as $kind) {
                foreach (array_keys($this->{$kind}) as $path) {
                    if ($path === $folder || str_starts_with($path, $folder . '/')) { unset($this->{$kind}[$path]); }
                }
            }
        }
        public function briefsPool(int $portalId, string $name): ?array {
            $pool = $this->pools[$name] ?? null;
            if ($pool === null) { return null; }
            $at = array_search('data-pool:' . $name, $this->navigation, true);
            return $pool + ['after' => $at === 0 ? null : substr($this->navigation[$at - 1], strpos($this->navigation[$at - 1], ':') + 1)];
        }
        public function saveBriefsPool(int $portalId, string $name, string $className, string $folder, string $icon, array $permissions, int $afterDataPoolId): int {
            $this->writes++;
            $id = $this->pools[$name]['id'] ?? 900;
            $this->pools[$name] = ['id' => $id, 'class' => $className, 'root' => $folder, 'icon' => $icon, 'permissions' => $permissions];
            $nav = array_values(array_diff($this->navigation, ['data-pool:' . $name]));
            array_splice($nav, array_search('data-pool:Ride designs', $nav, true) + 1, 0, ['data-pool:' . $name]);
            $this->navigation = $nav;
            return $id;
        }
        // What the supplier sees in a data-object pool: its objects below the pool's root that the supplier's object
        // workspace covers, for a supplier with access to the pool.
        public function poolObjects(string $name, string $email): array {
            $pool = $this->pools[$name];
            $user = $this->state['users'][$email];
            if (($user['permissions']['data-pool-access___' . $pool['id']] ?? null) !== 'allow') { return []; }
            $seen = [];
            foreach ($this->objects as $path => $object) {
                if (!str_starts_with($path, $pool['root'] . '/') || $object['class'] !== $pool['class']) { continue; }
                foreach ($user['objectWorkspaces'] ?? [] as $ws => $perms) {
                    if (str_starts_with($path, $ws . '/') && in_array('view', $perms, true)) { $seen[] = basename($path); break; }
                }
            }
            return $seen;
        }
        public function supplier(string $email, string $password): ?array {
            $supplier = parent::supplier($email, $password);
            return $supplier === null ? null : $supplier + ['objectWorkspaces' => $this->state['users'][$email]['objectWorkspaces'] ?? []];
        }
        public function saveSupplier(array $supplier): void {
            parent::saveSupplier($supplier);
            if (array_key_exists('objectWorkspaces', $supplier)) { $this->state['users'][$supplier['email']]['objectWorkspaces'] = $supplier['objectWorkspaces']; }
        }
    }
    // Today's demo (before F293): the brief page in the navigation after the data pool, the start page's tile on it.
    function todaysDemo(): BriefsEnvironment {
        $env = new BriefsEnvironment();
        $env->navigation = ['data-pool:Ride designs'];
        $before = new AreaEnvironment();
        demo($before)->setup();
        $env->state = $before->state;
        $env->translations = $before->translations;
        $env->roots = $before->roots;
        $env->uploadFolders = $before->uploadFolders;
        $demo = new \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo($env);
        $env->saveContentPage(0, 'brief', 'Brief: Thunder Loop', 'clipboard-list.svg', $demo->briefHtml());
        return $env;
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const SUPPLIER = 'supplier@loopwerk.example';
const BRIEFS_FOLDER = '/Pimcore Kingdom/Open briefs';
const FIELDS = {
  title: ['input', 'Title'],
  rideType: ['input', 'Ride type'],
  maxHeight: ['numeric', 'Max height (m)'],
  maxLength: ['numeric', 'Max length (m)'],
  inversionsAllowed: ['numeric', 'Inversions allowed'],
  targetOpening: ['input', 'Target opening'],
  status: ['select', 'Status', { open: 'Open', closed: 'Closed' }],
  description: ['textarea', 'Description'],
};
const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
const method = (name) => pimcore.slice(pimcore.indexOf(`public function ${name}(`), pimcore.indexOf('\n    }\n', pimcore.indexOf(`public function ${name}(`)));

test('AC1: the Open briefs pool comes right after Ride designs and lists three open briefs, Thunder Loop among them', () => {
  const { navigation, pool, seen, briefs } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    echo json_encode(['navigation' => $env->navigation, 'pool' => $env->briefsPool(0, 'Open briefs'),
      'seen' => $env->poolObjects('Open briefs', '${SUPPLIER}'), 'briefs' => $env->briefs('RideBrief', '${BRIEFS_FOLDER}')]);
  `);
  assert.deepEqual(navigation, ['data-pool:Ride designs', 'data-pool:Open briefs', 'page:about-the-park', 'page:working-with-the-kingdom', 'page:safety-first'],
    'Open briefs takes the brief page\'s place; no "Brief: Thunder Loop" entry');
  assert.equal(pool.class, 'RideBrief');
  assert.equal(pool.root, BRIEFS_FOLDER);
  assert.equal(pool.icon, 'clipboard-list.svg', 'its own navigation icon from portal_engine\'s set');
  assert.deepEqual(seen, ['Thunder Loop', 'Splash Canyon', 'Little Thunder'], 'the supplier browses three briefs');
  for (const [key, brief] of Object.entries(briefs)) {
    assert.equal(brief.status, 'open', `${key} is open`);
  }
});

test('AC1: the Ride brief class has the fields in plain words, in the detail page\'s order', () => {
  const { fields } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    echo json_encode(['fields' => $env->classFields]);
  `);
  assert.deepEqual(fields, FIELDS);
});

test('AC2: the Thunder Loop brief states the brief page\'s facts: a family coaster, max height 45 m, two inversions at most', () => {
  const { brief } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    echo json_encode(['brief' => $env->briefs('RideBrief', '${BRIEFS_FOLDER}')['Thunder Loop']]);
  `);
  assert.equal(brief.title, 'Thunder Loop');
  assert.equal(brief.maxHeight, 45);
  assert.equal(brief.inversionsAllowed, 2);
  assert.match(brief.rideType, /family/i);
  assert.match(brief.description, /45 m/);
  assert.match(brief.description, /Storm Valley/);
  const page = read(join(demoData, 'brief.md'));
  assert.match(page, /Maximum height: 45 m/, 'the brief page stated 45 m');
  assert.match(page, /two inversions at most/);
});

test('AC2: the supplier may only view the open briefs: no edit, no apply', () => {
  const { pool, supplier } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    echo json_encode(['pool' => $env->briefsPool(0, 'Open briefs'), 'supplier' => $env->state['users']['${SUPPLIER}']]);
  `);
  assert.deepEqual(pool.permissions, ['view'], 'the pool\'s workspace allows view only');
  assert.deepEqual(supplier.objectWorkspaces, { [BRIEFS_FOLDER]: ['view'] }, 'the supplier\'s object workspace is view only');
  assert.equal(supplier.permissions[`data-pool-access___${pool.id}`], 'allow');
  const all = [read(join(src, 'Command/CoasterDemo/CoasterDemo.php')), pimcore, read(join(demoData, 'open-briefs.json'))].join('\n');
  assert.doesNotMatch(all, /\bApply\b/, 'no Apply action anywhere');
  assert.match(method('saveBriefsPool'), /DATA_POOL_DATA_OBJECTS_LIST/);
  assert.match(method('saveBriefsPool'), /DETAIL_PAGE_LAYOUT/, 'the detail page shows the fields (a custom layout)');
  assert.match(method('saveBriefClass'), /CustomLayout/);
});

test('AC3: setup brings today\'s demo to the open briefs in place: class, three briefs, the pool, the brief page gone, the start tile on the pool', () => {
  const { changes, second, pages, navigation, bricks } = php(`
    $env = todaysDemo();
    $env->bricks = array_map(fn ($b) => $b + ['demo' => true], demo(new BriefsEnvironment())->startPage());
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'second' => demo($env)->setup(), 'pages' => array_keys($env->pages),
      'navigation' => $env->navigation, 'bricks' => $env->bricks]);
  `);
  for (const line of [
    'Created the data object class "RideBrief" (Ride brief)',
    `Wrote the open briefs Thunder Loop, Splash Canyon, Little Thunder to ${BRIEFS_FOLDER}`,
    `Created the data pool "Open briefs" (RideBrief objects in ${BRIEFS_FOLDER}, view only) after "Ride designs"`,
    'Removed the brief page "Brief: Thunder Loop": the data pool "Open briefs" replaces it',
  ]) {
    assert.ok(changes.includes(line), `${line}\n--\n${changes.join('\n')}`);
  }
  assert.deepEqual(second, [], 'a second setup changes nothing');
  assert.ok(!pages.includes('brief'), 'the brief page is gone');
  assert.equal(navigation[1], 'data-pool:Open briefs');
  const tile = bricks.find((b) => b.type === 'portal-engine-entry-tiles').tiles[0];
  assert.equal(tile.title, 'Open briefs');
  assert.equal(tile.link, 'data-pool:Open briefs', 'the start page\'s brief tile opens the new area');
});

test('AC3: reset keeps the open briefs; reset --all removes the briefs, their class and the pool with the portal', () => {
  const { reset, kept, all, objects, folders, classFields } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    $reset = demo($env)->reset();
    $kept = array_keys($env->briefs('RideBrief', '${BRIEFS_FOLDER}'));
    $all = demo($env)->reset(true);
    echo json_encode(['reset' => $reset, 'kept' => $kept, 'all' => $all, 'objects' => $env->objects,
      'folders' => $env->objectFolders, 'classFields' => $env->classFields]);
  `);
  assert.deepEqual(reset, []);
  assert.deepEqual(kept, ['Thunder Loop', 'Splash Canyon', 'Little Thunder']);
  assert.ok(all.includes('Deleted the data object folder /Pimcore Kingdom with the open briefs'), all.join('\n'));
  assert.ok(all.includes('Deleted the data object class "RideBrief"'), all.join('\n'));
  assert.ok(all.includes('Deleted the portal "Pimcore Kingdom"'), all.join('\n'));
  assert.deepEqual(objects, []);
  assert.deepEqual(folders, []);
  assert.equal(classFields, null);
});

test('AC3: Ask the brief reads Thunder Loop\'s brief object, 45 m included; the recorded answer keeps the 45 m limit', () => {
  const { text } = php(`
    $env = new BriefsEnvironment();
    demo($env)->setup();
    echo json_encode(['text' => \Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo::briefText($env->briefs('RideBrief', '${BRIEFS_FOLDER}')['Thunder Loop'])]);
  `);
  assert.match(text, /^Ride brief: Thunder Loop\n/);
  assert.match(text, /\nMax height \(m\): 45\n/);
  assert.match(text, /\nStatus: Open\n/);
  assert.match(text, /no point of the track may be higher than 45 m above the station/i);
  const source = read(join(src, 'Agent/PimcoreKingdomSource.php'));
  const briefText = source.slice(source.indexOf('public function briefText('), source.indexOf('public function coasterRevisions('));
  assert.match(briefText, /instanceof RideBriefs/);
  assert.match(briefText, /THUNDER_LOOP_BRIEF/);
  assert.match(briefText, /CoasterDemo::briefText\(/);
  const replay = JSON.parse(read(join(demoData, 'agent/kingdom-brief-check.replay.json')));
  assert.equal(replay.briefLimitM, 45, 'the recorded answer\'s limit');
  assert.match(JSON.stringify(replay.turns[0].steps), /no point of the track may be higher than \{briefLimitM\} m above the station/);
});
