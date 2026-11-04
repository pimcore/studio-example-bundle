// F160: the content pages can carry pictures (DR-P50). An image line in a page's Markdown, `![alt](file.svg)` or
// `![alt](file.webp "credit")`, becomes a <figure> with the <img> (and a <figcaption> only with a credit); setup uploads
// each file the pages name from demo-data/pages/img into the demo-marked /Pimcore Kingdom/Pages and lets the supplier
// view that folder. Setup runs against an in-memory environment (DemoEnvironment and ContentPages) on a copy of
// demo-data with the fixture page fixtures/page-images/pages/about-the-park.md and its two images.
// Needs the php CLI (8.1+). Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
const read = (path) => readFileSync(path, 'utf8');
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const fixtures = join(enterpriseDir, 'tests', 'fixtures', 'page-images');
const PAGES = '/Pimcore Kingdom/Pages';
const SUPPLIER = 'supplier@loopwerk.example';
const HERO = '<img src="/Pimcore%20Kingdom/Pages/park-entrance.svg" alt="The park&apos;s entrance gate at dusk" width="1200" height="600" style="max-width:100%;height:auto">';
const LAZY = '<img src="/Pimcore%20Kingdom/Pages/ride-sketch.webp" alt="A sketch of the next ride" width="64" height="36" loading="lazy" style="max-width:100%;height:auto">';

// A copy of demo-data with the fixture's about-the-park page and images; $page replaces that page's Markdown.
const demoData = (page) => {
  const dir = mkdtempSync(join(tmpdir(), 'f160-demo-data-'));
  cpSync(join(enterpriseDir, 'demo-data'), dir, { recursive: true });
  cpSync(join(fixtures, 'pages'), join(dir, 'pages'), { recursive: true });
  if (page) writeFileSync(join(dir, 'pages', 'about-the-park.md'), readFileSync(join(fixtures, 'bad', page)));
  return dir;
};

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
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ContentPages;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;

    // Assets: [path => ['content' (base64), 'metadata', 'id']]; a new upload gets a new id. Folders exist while an asset
    // is in them (the demo's, made by createAsset).
    class ImagesEnvironment implements DemoEnvironment, ContentPages {
        public int $writes = 0;
        public int $nextId = 1;
        public array $uploads = [];
        public array $state = ['portal' => null, 'pages' => [], 'users' => [], 'assets' => [], 'branding' => null, 'plugins' => []];
        public array $translations = [];

        public function portalId(): ?int { return $this->state['portal'] ? 100 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int { $this->writes++; $this->state['portal'] = ['name' => $name]; return 100; }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 101; }
        public function portalName(int $portalId): ?string { return $this->state['portal']['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portal']['name'] = $name; }
        public function deletePortal(int $portalId): void { $this->writes++; $this->state['portal'] = null; $this->state['pages'] = []; }
        public function enabledPlugins(int $portalId): array { return $this->state['plugins']; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->writes++; $this->state['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->contentPage($portalId, 'brief')['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->saveContentPage($portalId, 'brief', $title, '', $html); }
        public function contentPage(int $portalId, string $key): ?array { return $this->state['pages'][$key] ?? null; }
        public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void {
            $this->writes++;
            $this->state['pages'][$key] = ['title' => $title, 'icon' => $icon, 'html' => $html];
        }
        public function navigationIcon(int $documentId): string { return $this->state['icons'][$documentId] ?? ''; }
        public function setNavigationIcon(int $documentId, string $icon): void { $this->writes++; $this->state['icons'][$documentId] = $icon; }
        public function portalBranding(int $portalId): array { return $this->state['branding'] ?? ['logo' => null, 'brand_primary' => null, 'brand_accent' => null]; }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
            $this->writes++;
            $this->state['branding'] = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
        }
        public function supplier(string $email, string $password): ?array {
            $user = $this->state['users'][$email] ?? null;
            return $user === null ? null : [...$user, 'email' => $email, 'passwordValid' => $user['password'] === $password];
        }
        public function saveSupplier(array $supplier): void { $this->writes++; $this->state['users'][$supplier['email']] = $supplier; }
        public function deleteSupplier(string $email): void { $this->writes++; unset($this->state['users'][$email]); }
        public function assets(string $folder): array {
            $assets = [];
            foreach ($this->state['assets'] as $path => $asset) {
                if (dirname($path) === $folder) { $assets[basename($path)] = base64_decode($asset['content']); }
            }
            return $assets;
        }
        public function createAsset(string $folder, string $filename, string $content): void {
            $this->writes++;
            $this->uploads[] = $folder . '/' . $filename;
            $metadata = [];
            if (str_ends_with($filename, '.coaster')) {
                foreach ((new CoasterMetadataExtractor())->extract(json_decode($content)) as $name => $value) { $metadata[$name] = (string) $value; }
            }
            $this->state['assets'][$folder . '/' . $filename] = ['content' => base64_encode($content), 'metadata' => $metadata, 'id' => $this->nextId++];
        }
        public function deleteAsset(string $folder, string $filename): void { $this->writes++; unset($this->state['assets'][$folder . '/' . $filename]); }
        public function assetMetadata(string $folder, string $filename): array { return $this->state['assets'][$folder . '/' . $filename]['metadata'] ?? []; }
        public function folderExists(string $folder): bool {
            foreach (array_keys($this->state['assets']) as $path) { if (str_starts_with($path, $folder . '/')) { return true; } }
            return false;
        }
        public function renameFolder(string $folder, string $name): void { $this->writes++; }
        public function deleteFolder(string $folder): void {
            $this->writes++;
            foreach (array_keys($this->state['assets']) as $path) { if (str_starts_with($path, $folder . '/')) { unset($this->state['assets'][$path]); } }
        }
        public function translation(string $domain, string $key, string $language): ?string { return $this->translations[$domain][$key][$language] ?? null; }
        public function saveTranslation(string $domain, string $key, string $language, string $text): void { $this->writes++; $this->translations[$domain][$key][$language] = $text; }
    }

    function demo(ImagesEnvironment $env, ?string $dir = null): CoasterDemo { return new CoasterDemo($env, $dir); }
    // The assets in /Pimcore Kingdom/Pages: [filename => id].
    function images(ImagesEnvironment $env): array {
        $images = [];
        foreach ($env->state['assets'] as $path => $asset) { if (dirname($path) === '${PAGES}') { $images[basename($path)] = $asset['id']; } }
        return $images;
    }
}
`;

const php = (body, dir) => {
  try {
    return JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n$dir = ${JSON.stringify(dir ?? null)};\n${body}\n}\n`], { encoding: 'utf8' }));
  } finally {
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
};

test('AC1: an image line becomes a <figure> with the <img> (URL-encoded src, alt, width, height, max-width style), the first eager, the next lazy with its credit as <figcaption>', () => {
  const { html } = php(`
    $env = new ImagesEnvironment();
    demo($env, $dir)->setup();
    echo json_encode(['html' => $env->state['pages']['about-the-park']['html']]);
  `, demoData());
  assert.ok(html.includes(`<figure>${HERO}</figure>`), `the hero, eager and without a caption:\n${html}`);
  assert.ok(html.includes(`<figure>${LAZY}<figcaption>Sketch: Loopwerk Engineering</figcaption></figure>`), `the second image, lazy, with its credit:\n${html}`);
  assert.equal((html.match(/<figcaption>/g) ?? []).length, 1, 'a caption only where a credit is given');
  assert.ok(html.indexOf(HERO) < html.indexOf('<p>Pimcore Kingdom is a fictional park') && html.indexOf('<p>Pimcore Kingdom is a fictional park') < html.indexOf(LAZY), 'in the order of the Markdown');
  assert.ok(!/!\[|\]\(/.test(html), 'no Markdown left in the HTML');
});

test('AC1: width and height come from the file: an SVG\'s viewBox, a WebP\'s VP8, VP8L or VP8X header', () => {
  const sizes = php(`
    $vp8x = 'RIFF' . pack('V', 30) . 'WEBP' . 'VP8X' . pack('V', 10) . "\\x10\\0\\0\\0" . substr(pack('V', 1919), 0, 3) . substr(pack('V', 1079), 0, 3);
    $vp8l = 'RIFF' . pack('V', 30) . 'WEBP' . 'VP8L' . pack('V', 10) . "\\x2f" . pack('V', (49) | (29 << 14));
    echo json_encode([
        'svg' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::imageSize('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450.4"></svg>'),
        'svgAttributes' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::imageSize('<svg width="320" height="200" xmlns="http://www.w3.org/2000/svg"></svg>'),
        'vp8' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::imageSize(file_get_contents(${JSON.stringify(join(fixtures, 'pages/img/ride-sketch.webp'))})),
        'vp8x' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::imageSize($vp8x),
        'vp8l' => \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::imageSize($vp8l),
    ]);
  `);
  assert.deepEqual(sizes, { svg: [800, 450], svgAttributes: [320, 200], vp8: [64, 36], vp8x: [1920, 1080], vp8l: [50, 30] });
});

for (const [page, file, message] of [
  ['no-alt.md', 'ride-sketch.webp', /no alt text/],
  ['missing-file.md', 'not-there.svg', /not in demo-data\/pages\/img/],
]) {
  test(`AC1: an image line ${page === 'no-alt.md' ? 'without alt text' : 'naming a file not in demo-data/pages/img/'} fails setup with the file named, before setup changes anything`, () => {
    const { error, writes } = php(`
      $env = new ImagesEnvironment();
      try { demo($env, $dir)->setup(); $error = null; } catch (\\RuntimeException $e) { $error = $e->getMessage(); }
      echo json_encode(['error' => $error, 'writes' => $env->writes]);
    `, demoData(page));
    assert.ok(error, 'setup fails');
    assert.ok(error.includes(file), `the message names ${file}: ${error}`);
    assert.ok(error.includes('pages/about-the-park.md'), `and the page: ${error}`);
    assert.match(error, message);
    assert.equal(writes, 0, 'nothing written');
  });
}

test('AC2: setup uploads each referenced image once into /Pimcore Kingdom/Pages; a second run uploads nothing and leaves the page HTML as it was', () => {
  const { first, uploads, images, html, second, writes, htmlAgain } = php(`
    $env = new ImagesEnvironment();
    $first = demo($env, $dir)->setup();
    $uploads = $env->uploads; $images = images($env); $html = $env->state['pages']['about-the-park']['html']; $writes = $env->writes;
    $second = demo($env, $dir)->setup();
    echo json_encode(['first' => $first, 'uploads' => $uploads, 'images' => $images, 'html' => $html, 'second' => $second,
        'writes' => $env->writes - $writes, 'htmlAgain' => $env->state['pages']['about-the-park']['html']]);
  `, demoData());
  assert.deepEqual(Object.keys(images).sort(), ['park-entrance.svg', 'ride-sketch.webp']);
  assert.equal(uploads.filter((path) => path.startsWith(`${PAGES}/`)).length, 2, `each uploaded once: ${uploads.join(', ')}`);
  assert.ok(first.some((line) => line.includes('park-entrance.svg') && line.includes(PAGES)), first.join('\n'));
  assert.deepEqual(second, [], 'a second setup changes nothing');
  assert.equal(writes, 0, 'and writes nothing');
  assert.equal(htmlAgain, html);
});

test('AC2: a changed image file replaces its asset (the page HTML stays), and reset --all removes the images with the pages', () => {
  const dir = demoData();
  const { changes, before, after, html, htmlAfter, removed, assets, pages } = php(`
    $env = new ImagesEnvironment();
    demo($env, $dir)->setup();
    $before = images($env); $html = $env->state['pages']['about-the-park']['html'];
    file_put_contents($dir . '/pages/img/park-entrance.svg', str_replace('#fff', '#ffd700', file_get_contents($dir . '/pages/img/park-entrance.svg')));
    $changes = demo($env, $dir)->setup();
    $after = images($env); $htmlAfter = $env->state['pages']['about-the-park']['html'];
    $removed = demo($env, $dir)->reset(true);
    echo json_encode(['changes' => $changes, 'before' => $before, 'after' => $after, 'html' => $html, 'htmlAfter' => $htmlAfter,
        'removed' => $removed, 'assets' => array_keys($env->state['assets']), 'pages' => $env->state['pages']]);
  `, dir);
  assert.deepEqual(changes, [`Uploaded the page images park-entrance.svg to ${PAGES}`]);
  assert.notEqual(after['park-entrance.svg'], before['park-entrance.svg'], 'a new asset for the changed file');
  assert.equal(after['ride-sketch.webp'], before['ride-sketch.webp'], 'the other stays');
  assert.equal(htmlAfter, html, 'the page points at the same path');
  assert.ok(removed.includes('Deleted the folder /Pimcore Kingdom with the demo assets'), removed.join('\n'));
  assert.deepEqual(assets.filter((path) => path.startsWith(`${PAGES}/`)), [], 'no image left');
  assert.deepEqual(pages, [], 'and no page');
});

test('AC2: an image no page names any more is removed on the next setup; pages without image lines upload nothing', () => {
  const dir = demoData();
  const { changes, images, plain } = php(`
    $env = new ImagesEnvironment();
    demo($env, $dir)->setup();
    file_put_contents($dir . '/pages/about-the-park.md', preg_replace('/^!\\[A sketch.*$/m', '', file_get_contents($dir . '/pages/about-the-park.md')));
    $changes = demo($env, $dir)->setup();
    $images = images($env);
    $plain = new ImagesEnvironment();
    demo($plain)->setup();
    echo json_encode(['changes' => $changes, 'images' => $images, 'plain' => ['images' => images($plain), 'workspaces' => $plain->state['users']['${SUPPLIER}']['assetWorkspaces']]]);
  `, dir);
  assert.ok(changes.includes(`Deleted ${PAGES}/ride-sketch.webp, which no page names any more`), changes.join('\n'));
  assert.deepEqual(Object.keys(images), ['park-entrance.svg']);
  assert.deepEqual(Object.keys(plain.images), [], 'the demo\'s own pages name no images yet: nothing uploaded');
  assert.deepEqual(Object.keys(plain.workspaces), ['/Pimcore Kingdom/Thunder Loop'], 'and the supplier\'s workspace stays the ride designs');
});

test('AC3: setup gives the supplier view access to /Pimcore Kingdom/Pages, nothing more, and keeps the Thunder Loop workspace', () => {
  const { workspaces, again } = php(`
    $env = new ImagesEnvironment();
    demo($env, $dir)->setup();
    $workspaces = $env->state['users']['${SUPPLIER}']['assetWorkspaces'];
    $again = demo($env, $dir)->setup();
    echo json_encode(['workspaces' => $workspaces, 'again' => $again]);
  `, demoData());
  assert.deepEqual(Object.keys(workspaces), ['/Pimcore Kingdom/Thunder Loop', PAGES]);
  assert.deepEqual(workspaces[PAGES], ['view'], 'view only');
  assert.deepEqual([...workspaces['/Pimcore Kingdom/Thunder Loop']].sort(), ['create', 'delete', 'download', 'edit', 'subfolder', 'update', 'view']);
  assert.deepEqual(again, []);
});

test('AC3: on Pimcore, the supplier\'s workspaces are saved per folder from what setup gives, the Pages folder marked as the demo\'s', () => {
  const pimcore = readFileSync(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'), 'utf8');
  const save = pimcore.slice(pimcore.indexOf('function saveSupplier('), pimcore.indexOf('function deleteSupplier('));
  assert.match(save, /foreach \(\$supplier\['assetWorkspaces'\] as \$path => \$permissions\)/);
  assert.match(save, /\$this->markedFolder\(\$path\)/);
  const create = pimcore.slice(pimcore.indexOf('function createAsset('), pimcore.indexOf('function deleteAsset('));
  assert.match(create, /markedFolder\(\$folder\)/, 'the Pages folder is made marked, so reset --all removes it');
});

// DR-F160-1 A: Pimcore saves a wysiwyg through its HTML sanitizer, which drops <figure> with the image inside. The
// bundle's WysiwygFigurePass adds figure, figcaption and the img's width, height and loading to it, nothing else. Run
// against Pimcore's own sanitizer config (its default.yaml) with the Symfony of a Pimcore vendor; skips without one.
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const pimcoreDefaults = join(dirname(autoload), 'pimcore/pimcore/bundles/CoreBundle/config/pimcore/default.yaml');
const vendorSkip = !existsSync(autoload) || !existsSync(pimcoreDefaults) ? `no Pimcore vendor at ${autoload}` : false;

const sanitize = (html, withPass) => execFileSync('php', ['-d', 'display_errors=stderr', '-d', 'error_reporting=-1', '-r', `
  require ${JSON.stringify(autoload)};
  require ${JSON.stringify(join(src, 'DependencyInjection/Compiler/WysiwygFigurePass.php'))};
  use Symfony\\Component\\DependencyInjection\\ContainerBuilder;
  use Symfony\\Component\\HtmlSanitizer\\HtmlSanitizer;
  use Symfony\\Component\\HtmlSanitizer\\HtmlSanitizerConfig;
  use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\DependencyInjection\\Compiler\\WysiwygFigurePass;
  $config = Symfony\\Component\\Yaml\\Yaml::parseFile(${JSON.stringify(pimcoreDefaults)}, Symfony\\Component\\Yaml\\Yaml::PARSE_CONSTANT | Symfony\\Component\\Yaml\\Yaml::PARSE_CUSTOM_TAGS)['framework']['html_sanitizer']['sanitizers']['pimcore.wysiwyg_sanitizer'];
  $container = new ContainerBuilder();
  // as FrameworkExtension::registerHtmlSanitizerConfiguration() registers it
  $def = $container->register(WysiwygFigurePass::SANITIZER_CONFIG, HtmlSanitizerConfig::class)->setPublic(true);
  foreach ($config['allow_elements'] as $element => $attributes) { $def->addMethodCall('allowElement', [$element, $attributes], true); }
  foreach ($config['allow_attributes'] ?? [] as $attribute => $elements) { $def->addMethodCall('allowAttribute', [$attribute, $elements], true); }
  $def->addMethodCall('allowRelativeLinks', [$config['allow_relative_links'] ?? false], true);
  $def->addMethodCall('allowRelativeMedias', [$config['allow_relative_medias'] ?? false], true);
  $def->addMethodCall('withMaxInputLength', [$config['max_input_length'] ?? 20000], true);
  ${withPass ? '$container->addCompilerPass(new WysiwygFigurePass());' : ''}
  $container->compile();
  echo (new HtmlSanitizer($container->get(WysiwygFigurePass::SANITIZER_CONFIG)))->sanitizeFor('body', ${JSON.stringify(html)});
`], { encoding: 'utf8' });

test('AC1: Pimcore\'s wysiwyg sanitizer keeps the figure, its img (src, alt, width, height, loading, style) and the caption with the bundle\'s pass, and only those', { skip: vendorSkip }, () => {
  const figure = `<figure>${LAZY}<figcaption>Sketch: Loopwerk Engineering</figcaption></figure>`;
  assert.ok(!sanitize(figure, false).includes('<img'), 'without the pass Pimcore drops the figure with its image (why the pass exists)');
  const kept = sanitize(`<h1>About</h1>\n<figure>${HERO}</figure>\n${figure}\n<p>Text</p>`, true);
  const attrs = (tag) => Object.fromEntries([...tag.matchAll(/(\w+)="([^"]*)"/g)].map((m) => [m[1], m[2]]));
  const imgs = [...kept.matchAll(/<img [^>]*>/g)].map((m) => attrs(m[0]));
  assert.equal(imgs.length, 2, kept);
  assert.deepEqual(imgs[0], { src: '/Pimcore%20Kingdom/Pages/park-entrance.svg', alt: 'The park&#039;s entrance gate at dusk', width: '1200', height: '600', style: 'max-width:100%;height:auto' });
  assert.deepEqual(imgs[1], { src: '/Pimcore%20Kingdom/Pages/ride-sketch.webp', alt: 'A sketch of the next ride', width: '64', height: '36', loading: 'lazy', style: 'max-width:100%;height:auto' });
  assert.match(kept, /<figure><img [^>]*><figcaption>Sketch: Loopwerk Engineering<\/figcaption><\/figure>/);
  const hostile = sanitize('<figure onclick="x()"><img src="/a.svg" alt="a" onerror="x()" srcset="/b.svg 2x"><figcaption onmouseover="x()">c</figcaption></figure><script>x()</script><video src="/v.mp4"></video>', true);
  assert.ok(!/onclick|onerror|onmouseover|srcset|<script|<video/.test(hostile), `nothing else gets through: ${hostile}`);
});

test('AC1: the bundle registers the pass, and the pass adds only figure, figcaption and img width/height/loading', () => {
  assert.match(read(join(src, 'PimcoreStudioExampleEnterpriseBundle.php')), /addCompilerPass\(new WysiwygFigurePass\(\)\)/);
  const pass = read(join(src, 'DependencyInjection/Compiler/WysiwygFigurePass.php'));
  assert.match(pass, /'html_sanitizer\.config\.pimcore\.wysiwyg_sanitizer'/);
  const allowed = pass.slice(pass.indexOf('ALLOWED = ['), pass.indexOf('];', pass.indexOf('ALLOWED = [')));
  assert.deepEqual([...allowed.matchAll(/'(\w+)' => \[([^\]]*)\]/g)].map((m) => [m[1], m[2]]), [['figure', "'class'"], ['figcaption', "'class'"], ['img', "'width', 'height', 'loading'"]]);
});
