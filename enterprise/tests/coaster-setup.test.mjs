// F51: the coaster demo's setup and reset commands (src/Command/). Needs the php CLI (8.1+). The demo logic runs
// against an in-memory DemoEnvironment that stands for Pimcore and the Portal Engine (it runs the real coaster
// metadata extraction on upload, as the listener does), so no Pimcore install is needed.
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
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment',
              'Command/CoasterDemo/BriefHtml', 'Command/CoasterDemo/CoasterDemo'] as $file) {
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
        $folder = '/Theme Park of Tomorrow/Thunder Loop';
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
const COASTER = '/Theme Park of Tomorrow/Thunder Loop/thunder-loop.coaster';

test('AC1: setup creates the portal, the supplier with a demo login, the brief and revision 1 with its metadata', () => {
  const { changes, state, html } = php(`
    $env = new MemoryEnvironment();
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'state' => $env->state, 'html' => demo($env)->briefHtml()]);
  `);
  assert.equal(changes.length, 4, changes.join('\n'));

  const [portalId, portal] = Object.entries(state.portals).find(([, p]) => p.demo);
  assert.equal(portal.name, 'Theme Park of Tomorrow');
  assert.equal(portal.domain, 'portal.localhost');
  assert.equal(portal.language, 'en');
  const dataPoolId = portal.dataPools['Ride designs'];
  assert.ok(dataPoolId, 'has the asset data pool "Ride designs"');

  assert.equal(portal.brief.title, 'Brief: Thunder Loop');
  assert.equal(portal.brief.html, html);
  assert.match(html, /<h1>Design brief: Thunder Loop<\/h1>/);
  assert.match(html, /<li><strong>Maximum height: 45 m\.<\/strong> No point of the track/);
  assert.match(html, /<h2>Target audience<\/h2>\n<p>Families and teenagers/);

  const supplier = state.users['supplier@loopwerk.example'];
  assert.ok(supplier, 'the supplier user exists');
  assert.equal(`${supplier.firstname} ${supplier.lastname}`, 'Loopwerk Engineering');
  assert.equal(supplier.password, 'thunder-loop');
  assert.deepEqual(supplier.permissions, { [`portal-access___${portalId}`]: 'allow', [`data-pool-access___${dataPoolId}`]: 'allow' });
  assert.deepEqual(Object.keys(supplier.assetWorkspaces), ['/Theme Park of Tomorrow']);
  assert.ok(supplier.assetWorkspaces['/Theme Park of Tomorrow'].includes('create'), 'may upload');

  const coaster = state.assets[COASTER];
  assert.equal(coaster.content, rev1, 'revision 1 uploaded');
  const values = Object.fromEntries(Object.entries(coaster.metadata).map(([name, value]) => [name, Number(value)]));
  assert.deepEqual(values, golden.revisions['thunder-loop-rev1.coaster']);
});

test('AC1: setup stops with an error when the uploaded coaster gets no metadata', () => {
  const { error } = php(`
    $env = new class extends MemoryEnvironment { public function assetMetadata(string $folder, string $filename): array { return []; } };
    try { demo($env)->setup(); echo json_encode(['error' => null]); } catch (\\RuntimeException $e) { echo json_encode(['error' => $e->getMessage()]); }
  `);
  assert.match(error ?? '', /no metadata maxHeight, length, inversions, topSpeed, duration.*coaster listener/);
});

test('AC1: config/commands.yaml registers coaster-demo:setup and coaster-demo:reset on Pimcore and the Portal Engine', () => {
  const yaml = read(join(enterpriseDir, 'config/commands.yaml'));
  const ns = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\Command\\\\';
  for (const service of ['CoasterDemoSetupCommand', 'CoasterDemoResetCommand', 'CoasterDemo\\\\CoasterDemo', 'CoasterDemo\\\\PimcoreDemoEnvironment']) {
    assert.match(yaml, new RegExp(`^ {4}${ns}${service}:`, 'm'), service);
  }
  assert.match(yaml, new RegExp(`${ns}CoasterDemo\\\\DemoEnvironment:\\s*\\n\\s+alias: ${ns}CoasterDemo\\\\PimcoreDemoEnvironment`));
  assert.match(yaml, /autoconfigure: true/, 'the commands get their console.command tag');

  assert.match(read(join(src, 'Command/CoasterDemoSetupCommand.php')), /NAME = 'coaster-demo:setup'/);
  assert.match(read(join(src, 'Command/CoasterDemoResetCommand.php')), /NAME = 'coaster-demo:reset'/);
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  assert.match(pimcore, /implements DemoEnvironment/);
  assert.match(pimcore, /\$this->wizardService->createPortal\(\$key\)/, 'creates the portal through the Portal Engine wizard');
  assert.match(pimcore, /new PortalUser\(\)/);
  assert.match(pimcore, /Asset::create\(/);
});

test('AC2: a second setup changes nothing', () => {
  const { changes, writes, before, after } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $before = $env->state; $writes = $env->writes;
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'writes' => $env->writes - $writes, 'before' => $before, 'after' => $env->state]);
  `);
  assert.deepEqual(changes, []);
  assert.equal(writes, 0, 'no write at all');
  assert.deepEqual(after, before);
});

test('AC2: setup repairs what is missing and leaves the uploaded design alone', () => {
  const { changes, state } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    playDemo($env);
    $env->state['users']['supplier@loopwerk.example']['password'] = 'changed';
    $changes = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'state' => $env->state]);
  `);
  assert.equal(changes.length, 1, changes.join('\n'));
  assert.match(changes[0], /supplier/);
  assert.equal(state.users['supplier@loopwerk.example'].password, 'thunder-loop');
  assert.notEqual(state.assets[COASTER].content, rev1, 'setup does not overwrite the demo upload');
});

test('AC3: reset returns to revision 1 from the middle of the demo, three times in a row', () => {
  const { setupState, resets } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $setupState = $env->state;
    $resets = [];
    for ($run = 0; $run < 3; $run++) {
        playDemo($env);
        $changes = demo($env)->reset();
        $resets[] = ['changes' => $changes, 'state' => $env->state];
    }
    $writes = $env->writes;
    $again = demo($env)->reset();
    $resets[] = ['changes' => $again, 'state' => $env->state, 'writes' => $env->writes - $writes];
    echo json_encode(['setupState' => $setupState, 'resets' => $resets]);
  `);
  for (const [run, reset] of resets.slice(0, 3).entries()) {
    assert.deepEqual(reset.state, setupState, `run ${run + 1}: the state after setup`);
    assert.equal(reset.state.assets[COASTER].content, rev1);
    assert.ok(reset.changes.some((line) => /thunder-loop-rev3\.coaster/.test(line)), 'removes the extra upload');
    assert.ok(reset.changes.some((line) => /Uploaded revision 1/.test(line)), 'uploads revision 1 again');
  }
  const last = resets[3];
  assert.deepEqual(last.changes, [], 'a reset at revision 1 changes nothing');
  assert.equal(last.writes, 0);
});

test('AC3: reset --all returns to the state before setup and keeps what the demo did not create', () => {
  const { before, after, changes, again } = php(`
    $env = new MemoryEnvironment();
    $before = $env->state;
    demo($env)->setup();
    playDemo($env);
    $changes = demo($env)->reset(true);
    $after = $env->state;
    $again = demo($env)->reset(true);
    echo json_encode(['before' => $before, 'after' => $after, 'changes' => $changes, 'again' => $again]);
  `);
  assert.deepEqual(after, before);
  assert.equal(changes.length, 3, changes.join('\n'));
  assert.deepEqual(again, [], 'nothing left to remove');
});

test('AC3: the reset command dispatches the reset event first, so other demo state (a change set) can go too', () => {
  const command = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  const dispatch = command.indexOf('dispatch(new CoasterDemoResetEvent($removeAll))');
  assert.ok(dispatch > 0, 'dispatches CoasterDemoResetEvent');
  assert.ok(dispatch < command.indexOf('$this->demo->reset('), 'before the reset');
  assert.match(command, /addOption\('all'/);
});
