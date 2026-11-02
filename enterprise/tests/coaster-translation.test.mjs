// F135: the asset tree's first line on Ride designs (spike F105 P2, DR-P32). This stale 2026.x install has no text for
// portal-engine.listing.root-folder and shows the raw key; a real 2026.3 ships "/ (root)". Setup adds the English text
// "All ride designs" in the portal's frontend domain, once and only where it is missing or empty.
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

const DOMAIN = 'portal_engine_frontend';
const KEY = 'portal-engine.listing.root-folder';
const TEXT = 'All ride designs';
const LINE = `Added the English text "${TEXT}" for ${KEY}`;
const seed = (text) => `$env->translations['${DOMAIN}']['${KEY}']['en'] = ${JSON.stringify(text)};`;

test('AC1: setup adds the English text "All ride designs" for listing.root-folder in the portal\'s frontend domain and says so', () => {
  const { changes, translations } = php(`
    $env = new MemoryEnvironment();
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'translations' => $env->translations]);
  `);
  assert.deepEqual(translations, { [DOMAIN]: { [KEY]: { en: TEXT } } }, 'one text, English only, in the frontend domain');
  assert.deepEqual(changes.filter((line) => line === LINE), [LINE], changes.join('\n'));
});

test('AC1: on Pimcore, the text is a Pimcore translation of the key in its domain, saved (which clears the translator cache)', () => {
  const env = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const body = (name) => env.slice(env.indexOf(`public function ${name}(`), env.indexOf('\n    }\n', env.indexOf(`public function ${name}(`)));
  assert.match(env, /^use Pimcore\\Model\\Translation;$/m);
  assert.match(body('translation'), /Translation::getByKey\(\$key, \$domain\)\?->getTranslation\(\$language\)/);
  const save = body('saveTranslation');
  assert.match(save, /Translation::getByKey\(\$key, \$domain\)/, 'an existing row is updated, its other languages stay');
  assert.match(save, /setDomain\(\$domain\)/);
  assert.match(save, /setKey\(\$key\)/);
  assert.match(save, /addTranslation\(\$language, \$text\)/);
  assert.match(save, /->save\(\)/);
});

test('AC2: a second setup changes nothing and writes nothing', () => {
  const { again, writes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $writes = $env->writes;
    $again = demo($env)->setup();
    echo json_encode(['again' => $again, 'writes' => $env->writes - $writes]);
  `);
  assert.deepEqual(again, []);
  assert.equal(writes, 0);
});

test('AC2: an edited (non-empty) text stays and gets no change line; an empty one counts as missing', () => {
  const { edited, editedChanges, empty, emptyChanges, again } = php(`
    $env = new MemoryEnvironment();
    ${seed('Alle Fahrgeschäfte')}
    $editedChanges = demo($env)->setup();
    $edited = $env->translations;
    $env = new MemoryEnvironment();
    ${seed('')}
    $emptyChanges = demo($env)->setup();
    $empty = $env->translations;
    echo json_encode(['edited' => $edited, 'editedChanges' => $editedChanges, 'empty' => $empty, 'emptyChanges' => $emptyChanges, 'again' => demo($env)->setup()]);
  `);
  assert.equal(edited[DOMAIN][KEY].en, 'Alle Fahrgeschäfte', 'the edited text stays');
  assert.equal(editedChanges.some((line) => line.startsWith('Added the English text')), false, editedChanges.join('\n'));
  assert.equal(empty[DOMAIN][KEY].en, TEXT, 'the empty text is filled');
  assert.deepEqual(emptyChanges.filter((line) => line.startsWith('Added the English text')), [LINE], emptyChanges.join('\n'));
  assert.deepEqual(again, []);
});

test('AC3: the tree\'s first line reads "All ride designs" after setup, also after a reset (the text is not demo data and stays)', () => {
  const demo = read(join(src, 'Command/CoasterDemo/CoasterDemo.php'));
  assert.match(demo, /TRANSLATION_DOMAIN = 'portal_engine_frontend';/);
  assert.match(demo, /ROOT_FOLDER_KEY = 'portal-engine\.listing\.root-folder';/);
  assert.match(demo, /ROOT_FOLDER_TEXT = 'All ride designs';/);
  const { afterReset, afterResetAll, changes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $changes = demo($env)->reset();
    $afterReset = $env->translations;
    demo($env)->reset(true);
    echo json_encode(['afterReset' => $afterReset, 'afterResetAll' => $env->translations, 'changes' => $changes]);
  `);
  assert.deepEqual(changes, [], 'a reset at revision 1 changes nothing');
  assert.equal(afterReset[DOMAIN][KEY].en, TEXT);
  assert.equal(afterResetAll[DOMAIN][KEY].en, TEXT, 'reset --all leaves the text');
});
