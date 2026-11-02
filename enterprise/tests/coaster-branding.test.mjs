// F101: Pimcore Kingdom's logo and brand colours on its portal (DR-P22 items 2 and 5). Needs the php CLI (8.1+).
// Setup runs against the same kind of in-memory DemoEnvironment as coaster-setup.test.mjs; the Pimcore side is
// checked in its source, the header itself in the feature's screenshots (desktop and phone).
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const branding = join(enterpriseDir, 'demo-data', 'branding');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(path, 'utf8');

const FOLDER = '/Pimcore Kingdom/Branding';
const SVG = 'pimcore-kingdom-logo.svg';
const PNG = 'pimcore-kingdom-logo.png';

const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
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

    // As in coaster-setup.test.mjs, plus the portal's branding settings.
    class MemoryEnvironment implements DemoEnvironment {
        public int $writes = 0;
        private int $nextId = 100;
        public array $state = ['portals' => [7 => ['name' => 'Existing portal', 'demo' => false, 'dataPools' => [], 'brief' => null,
            'branding' => ['logo' => '/Marketing/acme.svg', 'brand_primary' => '#ff0000', 'brand_accent' => null]]],
            'users' => [], 'folders' => [], 'assets' => []];

        public function portalId(): ?int { foreach ($this->state['portals'] as $id => $p) { if ($p['demo']) { return $id; } } return null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int {
            $this->writes++; $id = $this->nextId++;
            $this->state['portals'][$id] = ['name' => $name, 'demo' => true, 'dataPools' => [$dataPoolName => $this->nextId++], 'brief' => null];
            return $id;
        }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return $this->state['portals'][$portalId]['dataPools'][$dataPoolName] ?? null; }
        public function portalName(int $portalId): ?string { return $this->state['portals'][$portalId]['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portals'][$portalId]['name'] = $name; }
        public function deletePortal(int $portalId): void { $this->writes++; unset($this->state['portals'][$portalId]); }
        public function enabledPlugins(int $portalId): array { return $this->state['portals'][$portalId]['plugins'] ?? []; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->writes++; $this->state['portals'][$portalId]['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->state['portals'][$portalId]['brief'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->writes++; $this->state['portals'][$portalId]['brief'] = $html; }
        public function portalBranding(int $portalId): array {
            return $this->state['portals'][$portalId]['branding'] ?? ['logo' => null, 'brand_primary' => null, 'brand_accent' => null];
        }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
            $this->writes++;
            $this->state['portals'][$portalId]['branding'] = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
        }
        public function supplier(string $email, string $password): ?array {
            $u = $this->state['users'][$email] ?? null;
            return $u === null ? null : [...$u, 'email' => $email, 'passwordValid' => $u['password'] === $password];
        }
        public function saveSupplier(array $supplier): void { $this->writes++; $this->state['users'][$supplier['email']] = $supplier; }
        public function deleteSupplier(string $email): void { $this->writes++; unset($this->state['users'][$email]); }
        public function assets(string $folder): array {
            $assets = [];
            foreach ($this->state['assets'] as $path => $a) { if (dirname($path) === $folder) { $assets[basename($path)] = self::load($a['content']); } }
            return $assets;
        }
        public function createAsset(string $folder, string $filename, string $content): void {
            $this->writes++;
            for ($path = $folder; $path !== '/'; $path = dirname($path)) { $this->state['folders'][$path] ??= true; }
            $metadata = [];
            if (str_ends_with($filename, '.coaster')) {
                foreach ((new CoasterMetadataExtractor())->extract(json_decode($content)) as $name => $value) { $metadata[$name] = (string) $value; }
            }
            $this->state['assets'][$folder . '/' . $filename] = ['content' => self::store($content), 'metadata' => $metadata, 'demo' => true];
        }
        // Binary content (the PNG logo) is kept base64-tagged, so the state stays JSON.
        public static function store(string $content): string { return mb_check_encoding($content, 'UTF-8') ? $content : 'base64:' . base64_encode($content); }
        public static function load(string $content): string { return str_starts_with($content, 'base64:') ? base64_decode(substr($content, 7)) : $content; }
        public function deleteAsset(string $folder, string $filename): void { $this->writes++; unset($this->state['assets'][$folder . '/' . $filename]); }
        public function assetMetadata(string $folder, string $filename): array { return $this->state['assets'][$folder . '/' . $filename]['metadata'] ?? []; }
        public function folderExists(string $folder): bool { return $this->state['folders'][$folder] ?? false; }
        public function renameFolder(string $folder, string $name): void { $this->writes++; }
        public function deleteFolder(string $folder): void {
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
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const coasterDemo = read(join(src, 'Command/CoasterDemo/CoasterDemo.php'));
const constant = (name) => {
  const match = coasterDemo.match(new RegExp(`const ${name} = '([^']+)'`));
  assert.ok(match, `CoasterDemo has the constant ${name}`);
  return match[1];
};
const pimcoreMethod = (name) => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const start = pimcore.indexOf(`function ${name}(`);
  assert.ok(start > 0, `PimcoreDemoEnvironment has ${name}`);
  return pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
};

test('AC1: setup uploads both logo files into /Pimcore Kingdom/Branding and sets the portal\'s logo and brand colours', () => {
  const { changes, state, primary, accent } = php(`
    $env = new MemoryEnvironment();
    $changes = demo($env)->setup();
    $c = \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo::class;
    echo json_encode(['changes' => $changes, 'state' => $env->state, 'primary' => $c::BRAND_PRIMARY, 'accent' => $c::BRAND_ACCENT]);
  `);
  for (const file of [SVG, PNG]) {
    const asset = state.assets[`${FOLDER}/${file}`];
    assert.ok(asset, `${file} uploaded into ${FOLDER}`);
  }
  assert.deepEqual(Buffer.from(state.assets[`${FOLDER}/${PNG}`].content.replace(/^base64:/, ''), 'base64'), readFileSync(join(branding, PNG)), 'the PNG byte for byte');
  assert.equal(state.assets[`${FOLDER}/${SVG}`].content, read(join(branding, SVG)), 'the SVG as it is in demo-data/branding');
  assert.equal(state.folders[FOLDER], true, 'the Branding folder is the demo\'s (marked)');
  const portal = Object.values(state.portals).find((p) => p.demo);
  assert.deepEqual(portal.branding, { logo: `${FOLDER}/${SVG}`, brand_primary: primary, brand_accent: accent });
  assert.match(primary, /^#[0-9a-f]{6}$/);
  assert.match(accent, /^#[0-9a-f]{6}$/);
  assert.ok(changes.includes(`Uploaded the logo files ${SVG}, ${PNG} to ${FOLDER}`), changes.join('\n'));
  assert.ok(changes.includes(`Set the logo and the brand colours ${primary} and ${accent} on the portal "Pimcore Kingdom"`), changes.join('\n'));
  assert.deepEqual(state.portals[7].branding, { logo: '/Marketing/acme.svg', brand_primary: '#ff0000', brand_accent: null }, 'the other portal is untouched');
});

test('AC1: a second setup reports no change and writes nothing', () => {
  const { changes, writes } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $writes = $env->writes;
    echo json_encode(['changes' => demo($env)->setup(), 'writes' => $env->writes - $writes]);
  `);
  assert.deepEqual(changes, []);
  assert.equal(writes, 0);
});

test('AC1: setup puts back a changed colour or a missing logo file, one line each, then changes nothing', () => {
  const { colour, file, again } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $id = $env->portalId();
    $env->state['portals'][$id]['branding']['brand_accent'] = '#00ff00';
    $colour = demo($env)->setup();
    unset($env->state['assets']['${FOLDER}/${PNG}']);
    $file = demo($env)->setup();
    echo json_encode(['colour' => $colour, 'file' => $file, 'again' => demo($env)->setup()]);
  `);
  assert.equal(colour.length, 1, colour.join('\n'));
  assert.match(colour[0], /^Set the logo and the brand colours/);
  assert.deepEqual(file.filter((l) => l.startsWith('Uploaded the logo files')), [`Uploaded the logo files ${PNG} to ${FOLDER}`]);
  assert.deepEqual(again, []);
});

test('AC1: on Pimcore, setPortalBranding sets the logo image editable and the brand inputs after loading the editables, then clears the cache', () => {
  const set = pimcoreMethod('setPortalBranding');
  const load = set.indexOf('$portal->getEditables();');
  assert.ok(load > 0 && load < set.indexOf('setRawEditable('), 'loads the other settings first, so the save keeps them');
  assert.match(set, /setRawEditable\(PortalConfig::LOGO, 'image', \['id' => \$[a-z]+->getId\(\)\]\)/);
  assert.match(set, /setRawEditable\(PortalConfig::BRAND_PRIMARY, 'input', \$brandPrimary\)/);
  assert.match(set, /setRawEditable\(PortalConfig::BRAND_ACCENT, 'input', \$brandAccent\)/);
  assert.match(set, /->save\(\);[\s\S]*Cache::clearAll\(\)/);
  const get = pimcoreMethod('portalBranding');
  assert.match(get, /PortalConfig::LOGO/);
  assert.match(get, /getImage\(\)/);
  assert.match(get, /PortalConfig::BRAND_PRIMARY/);
  assert.match(get, /PortalConfig::BRAND_ACCENT/);
});

const svgs = readdirSync(branding).filter((f) => f.endsWith('.svg'));

test('AC2: the branding carries a license note that says the logo is own-made', () => {
  assert.match(read(join(branding, 'LICENSE.md')), /own-made/i);
  assert.match(read(join(branding, 'LICENSE.md')), /not the Pimcore mark/);
  for (const file of svgs) {
    assert.match(read(join(branding, file)), /own-made/i, `${file} names its origin too`);
  }
});

test('AC2: no SVG has a <script>, an on*= attribute or an external href', () => {
  assert.ok(svgs.length >= 1, 'there is an SVG logo');
  for (const file of svgs) {
    const svg = read(join(branding, file));
    assert.doesNotMatch(svg, /<script/i, `${file}: no <script>`);
    assert.doesNotMatch(svg, /\son[a-z]+\s*=/i, `${file}: no on*= attribute`);
    for (const [, href] of svg.matchAll(/(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
      assert.match(href, /^#/, `${file}: href "${href}" is not external`);
    }
    assert.doesNotMatch(svg, /url\(\s*["']?(?!#)/i, `${file}: no external url()`);
    assert.doesNotMatch(svg, /<foreignObject|<iframe|<image/i, `${file}: no embedded content`);
  }
});

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('AC3: the contrast helper matches the WCAG reference values', () => {
  assert.equal(contrast('#000000', '#ffffff').toFixed(1), '21.0');
  assert.equal(contrast('#777777', '#ffffff').toFixed(2), '4.48');
});

test('AC3: header text on brand_primary and brand_accent keeps a contrast of at least 4.5:1', () => {
  const primary = constant('BRAND_PRIMARY');
  const accent = constant('BRAND_ACCENT');
  // White text on a primary or accent fill (avatar, active item, buttons), and either colour as text on the
  // header's light ground (the inlined logo's words take --p-primary; #F7F7F9 is the kit's neutral canvas).
  for (const [fg, bg] of [['#ffffff', primary], ['#ffffff', accent], [primary, '#ffffff'], [primary, '#f7f7f9'], [accent, '#f7f7f9']]) {
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}:1 is below 4.5:1`);
  }
});

test('AC3: the header shows the Kingdom logo: the SVG names Pimcore Kingdom, draws in the header colour and is the logo setup sets', () => {
  const svg = read(join(branding, SVG));
  assert.match(svg, /<title[^>]*>Pimcore Kingdom<\/title>/);
  assert.match(svg, />Pimcore Kingdom<\/text>/);
  assert.match(svg, /fill="currentColor"/, 'the inlined logo follows --p-primary in the header');
  assert.match(svg, /viewBox="0 0 (\d+) (\d+)"/);
  const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/).map(Number);
  assert.ok(w / h <= 220 / 32, 'fits the header\'s 32 px high, 220 px wide logo box without shrinking');
  assert.match(coasterDemo, /LOGO_SVG = 'pimcore-kingdom-logo\.svg'/);
  const png = readFileSync(join(branding, PNG));
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG', 'the PNG is a PNG');
});
