// F161: the pictures of the three content pages (DR-P50, rounds 148 and 150). Each page in demo-data/pages has one hero
// image line right under its title and at most two more; the files sit in demo-data/pages/img with a rights list
// (images.json: source `own` or `coaster-render`, a credit for any non-own one) and a licence. The SVGs stay small and
// inert (no script, no event attribute, no external reference, no embedded bitmap); a hero at most 150 KB, a page's
// images at most 300 KB. Setup runs against in-memory environments (as coaster-page-images.test.mjs) on the real
// demo-data. Needs the php CLI (8.1+). Run: node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const pagesDir = join(enterpriseDir, 'demo-data', 'pages');
const imgDir = join(pagesDir, 'img');
const PAGE_FILES = ['about-the-park.md', 'working-with-the-kingdom.md', 'safety-first.md'];
const KB = 1024;
// BriefHtml::IMAGE_LINE: ![alt](file) or ![alt](file "credit")
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(\s*([^\s)"]+)(?:\s+"([^"]*)")?\s*\)\s*$/;

const pageImages = (file) => {
  const lines = readFileSync(join(pagesDir, file), 'utf8').split('\n');
  return lines
    .map((line, index) => ({ index, match: line.match(IMAGE_LINE) }))
    .filter(({ match }) => match)
    .map(({ index, match }) => ({ index, alt: match[1], file: match[2], credit: match[3] }));
};
const rights = () => JSON.parse(readFileSync(join(imgDir, 'images.json'), 'utf8'));
const imageFiles = () => readdirSync(imgDir).filter((name) => /\.(svg|webp)$/i.test(name));
const size = (file) => statSync(join(imgDir, file)).size;

test('AC1: each page has exactly one hero image line right after its title and at most two more, alt texts unique and telling, files in pages/img', () => {
  for (const page of PAGE_FILES) {
    const lines = readFileSync(join(pagesDir, page), 'utf8').split('\n');
    assert.match(lines[0], /^# \S/, `${page} starts with its title`);
    const next = lines.findIndex((line, index) => index > 0 && line.trim() !== '');
    const images = pageImages(page);
    assert.ok(images.length >= 1 && images.length <= 3, `${page}: a hero and at most two more (${images.length})`);
    assert.equal(images[0].index, next, `${page}: the hero is the first line after the title`);
    const alts = images.map(({ alt }) => alt.trim().toLowerCase());
    assert.equal(new Set(alts).size, alts.length, `${page}: alt texts unique on the page`);
    for (const { alt, file } of images) {
      assert.ok(alt.trim().length >= 10, `${page}: ${file} has a telling alt text`);
      assert.doesNotMatch(alt.trim(), /^(an? )?(image|picture|img|photo|graphic)\.?$/i, `${page}: ${file}'s alt is more than "image"`);
      assert.notEqual(alt.trim().toLowerCase(), file.toLowerCase(), `${page}: alt is not the file name`);
      assert.notEqual(alt.trim().toLowerCase(), basename(file, extname(file)).toLowerCase(), `${page}: alt is not the file name`);
      assert.ok(!file.includes('/'), `${page}: ${file} names a file in pages/img itself`);
      assert.ok(existsSync(join(imgDir, file)), `${page}: ${file} is in pages/img`);
    }
  }
});

test('AC1: setup on the demo data writes each page with its pictures as figures and uploads each picture once', () => {
  const { pages, uploads, workspaces } = php(`
    $env = new PicturesEnvironment();
    setupDemo($env);
    echo json_encode(['pages' => $env->state['pages'], 'uploads' => $env->uploads,
      'workspaces' => $env->state['users']['supplier@loopwerk.example']['assetWorkspaces']]);
  `);
  const named = [];
  for (const page of PAGE_FILES) {
    const html = pages[basename(page, '.md')].html;
    const images = pageImages(page);
    assert.equal((html.match(/<figure>/g) ?? []).length, images.length, `${page}: a figure per image line`);
    images.forEach(({ file }, index) => {
      const img = html.match(new RegExp(`<img src="/Pimcore%20Kingdom/Pages/${file.replace('.', '\\.')}"[^>]*>`));
      assert.ok(img, `${page}: ${file} is shown`);
      assert.equal(img[0].includes('loading="lazy"'), index > 0, `${page}: only the hero loads eagerly`);
      assert.match(img[0], /width="\d+" height="\d+"/, `${page}: ${file} has its size`);
    });
    assert.ok(html.indexOf('<figure>') < html.indexOf('<p>'), `${page}: the hero comes before the text`);
    named.push(...images.map(({ file }) => `/Pimcore Kingdom/Pages/${file}`));
  }
  assert.deepEqual(uploads.filter((path) => path.startsWith('/Pimcore Kingdom/Pages/')).sort(), [...new Set(named)].sort(), 'each picture uploaded once');
  assert.deepEqual(workspaces['/Pimcore Kingdom/Pages'], ['view'], 'the supplier may view the pictures');
});

test('AC2: every file in pages/img is in images.json as own or coaster-render, a non-own one with a credit the page shows, and a licence for the own ones', () => {
  const list = rights();
  const files = imageFiles();
  assert.ok(files.length >= 3, 'the pages have pictures');
  assert.deepEqual(Object.keys(list).sort(), [...files].sort(), 'images.json lists exactly the files in pages/img');
  const credits = Object.fromEntries(PAGE_FILES.flatMap(pageImages).map(({ file, credit }) => [file, credit]));
  for (const [file, entry] of Object.entries(list)) {
    assert.ok(['own', 'coaster-render'].includes(entry.source), `${file}: source own or coaster-render (${entry.source})`);
    assert.ok(typeof entry.made === 'string' && entry.made.trim() !== '', `${file}: says how it was made`);
    if (entry.source !== 'own') {
      assert.ok(entry.ride && entry.ride.trim() !== '', `${file}: a render names its ride`);
      assert.ok(entry.credit && entry.credit.trim() !== '', `${file}: a non-own image has a credit line`);
      assert.equal(credits[file], entry.credit, `${file}: its page shows the credit as the caption`);
    }
    assert.ok(file in credits, `${file}: a page names it`);
  }
  const licence = readFileSync(join(imgDir, 'LICENSE.md'), 'utf8');
  assert.match(licence, /CC0/, 'the own-made files are under the bundle\'s demo licence (as demo-data/branding)');
});

test('AC2: every SVG at most 40 KB with no script, on* attribute, external href or embedded bitmap; a hero at most 150 KB, a page at most 300 KB', () => {
  for (const file of imageFiles().filter((name) => name.endsWith('.svg'))) {
    const svg = readFileSync(join(imgDir, file), 'utf8');
    assert.ok(size(file) <= 40 * KB, `${file}: ${size(file)} bytes, at most 40 KB`);
    assert.match(svg, /^<svg[^>]*\sviewBox="0 0 \d+ \d+"/, `${file}: an SVG with a viewBox`);
    assert.doesNotMatch(svg, /<script|javascript:/i, `${file}: no script`);
    assert.doesNotMatch(svg, /\son[a-z]+\s*=/i, `${file}: no event attribute`);
    assert.doesNotMatch(svg, /\shref\s*=\s*["'](?!#)/i, `${file}: no external href`);
    assert.doesNotMatch(svg, /url\(\s*["']?(?!#)/i, `${file}: no external url()`);
    assert.doesNotMatch(svg, /<image|<foreignObject|data:/i, `${file}: no embedded bitmap`);
    assert.doesNotMatch(svg, /@import|<!ENTITY/i, `${file}: no import or entity`);
  }
  for (const page of PAGE_FILES) {
    const images = pageImages(page);
    assert.ok(size(images[0].file) <= 150 * KB, `${page}: hero ${images[0].file} at most 150 KB`);
    const total = images.reduce((sum, { file }) => sum + size(file), 0);
    assert.ok(total <= 300 * KB, `${page}: ${total} bytes of images, at most 300 KB`);
  }
});

test('AC4: setup on an environment without content pages (the existing tests\' kind) writes only the brief, uploads no page picture and keeps the supplier on the Thunder Loop workspace', () => {
  const { uploads, workspaces } = php(`
    $env = new BriefOnlyEnvironment();
    setupDemo($env);
    echo json_encode(['uploads' => $env->uploads, 'workspaces' => $env->state['users']['supplier@loopwerk.example']['assetWorkspaces']]);
  `);
  assert.deepEqual(uploads.filter((path) => path.startsWith('/Pimcore Kingdom/Pages/')), [], 'no page picture uploaded');
  assert.deepEqual(Object.keys(workspaces), ['/Pimcore Kingdom/Ride designs/Thunder Loop']);
});

const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment',
              'Command/CoasterDemo/ContentPages', 'Command/CoasterDemo/BriefHtml', 'Command/CoasterDemo/CoasterDemo',
              'Portal/StudioExampleEnterprisePortalPlugin'] as $file) {
        require ${JSON.stringify(src)} . '/' . $file . '.php';
    }

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ContentPages;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;

    // The demo environment without content pages: setup writes only the brief (saveBrief) there.
    class BriefOnlyEnvironment implements DemoEnvironment {
        public array $uploads = [];
        public array $state = ['portal' => null, 'pages' => [], 'users' => [], 'assets' => [], 'branding' => null, 'plugins' => [], 'icons' => []];
        public array $translations = [];

        public function portalId(): ?int { return $this->state['portal'] ? 100 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int { $this->state['portal'] = ['name' => $name]; return 100; }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 101; }
        public function portalName(int $portalId): ?string { return $this->state['portal']['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->state['portal']['name'] = $name; }
        public function deletePortal(int $portalId): void { $this->state['portal'] = null; $this->state['pages'] = []; }
        public function enabledPlugins(int $portalId): array { return $this->state['plugins']; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->state['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->state['pages']['brief']['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->state['pages']['brief'] = ['title' => $title, 'icon' => '', 'html' => $html]; }
        public function portalBranding(int $portalId): array { return $this->state['branding'] ?? ['logo' => null, 'brand_primary' => null, 'brand_accent' => null]; }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
            $this->state['branding'] = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
        }
        public function supplier(string $email, string $password): ?array {
            $user = $this->state['users'][$email] ?? null;
            return $user === null ? null : [...$user, 'email' => $email, 'passwordValid' => $user['password'] === $password];
        }
        public function saveSupplier(array $supplier): void { $this->state['users'][$supplier['email']] = $supplier; }
        public function deleteSupplier(string $email): void { unset($this->state['users'][$email]); }
        public function assets(string $folder): array {
            $assets = [];
            foreach ($this->state['assets'] as $path => $asset) { if (dirname($path) === $folder) { $assets[basename($path)] = $asset['content']; } }
            return $assets;
        }
        public function createAsset(string $folder, string $filename, string $content): void {
            $this->uploads[] = $folder . '/' . $filename;
            $metadata = [];
            if (str_ends_with($filename, '.coaster')) {
                foreach ((new CoasterMetadataExtractor())->extract(json_decode($content)) as $name => $value) { $metadata[$name] = (string) $value; }
            }
            $this->state['assets'][$folder . '/' . $filename] = ['content' => $content, 'metadata' => $metadata];
        }
        public function deleteAsset(string $folder, string $filename): void { unset($this->state['assets'][$folder . '/' . $filename]); }
        public function assetMetadata(string $folder, string $filename): array { return $this->state['assets'][$folder . '/' . $filename]['metadata'] ?? []; }
        public function folderExists(string $folder): bool {
            foreach (array_keys($this->state['assets']) as $path) { if (str_starts_with($path, $folder . '/')) { return true; } }
            return false;
        }
        public function renameFolder(string $folder, string $name): void {}
        public function deleteFolder(string $folder): void {
            foreach (array_keys($this->state['assets']) as $path) { if (str_starts_with($path, $folder . '/')) { unset($this->state['assets'][$path]); } }
        }
        public function translation(string $domain, string $key, string $language): ?string { return $this->translations[$domain][$key][$language] ?? null; }
        public function saveTranslation(string $domain, string $key, string $language, string $text): void { $this->translations[$domain][$key][$language] = $text; }
    }

    // With content pages: setup writes the brief and the three pages.
    class PicturesEnvironment extends BriefOnlyEnvironment implements ContentPages {
        public function briefHtml(int $portalId): ?string { return $this->contentPage($portalId, 'brief')['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->saveContentPage($portalId, 'brief', $title, '', $html); }
        public function contentPage(int $portalId, string $key): ?array { return $this->state['pages'][$key] ?? null; }
        public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void {
            $this->state['pages'][$key] = ['title' => $title, 'icon' => $icon, 'html' => $html];
        }
        public function navigationIcon(int $documentId): string { return $this->state['icons'][$documentId] ?? ''; }
        public function setNavigationIcon(int $documentId, string $icon): void { $this->state['icons'][$documentId] = $icon; }
    }

    // Setup on the real demo-data.
    function setupDemo(DemoEnvironment $env): array { return (new CoasterDemo($env))->setup(); }
}
`;

const php = (body) => JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));
