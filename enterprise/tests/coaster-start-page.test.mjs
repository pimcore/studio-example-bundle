// F208 (DR-P72): the Pimcore Kingdom portal's start page. coaster-demo:setup writes, on the portal root document's
// "content" areablock, portal_engine's own Studio start-page bricks in this order: portal-engine-feature (the park
// picture), portal-engine-hero (headline and purpose line) and portal-engine-entry-tiles (large) to the brief, the ride
// designs data pool and every demo content page. Its text is in demo-data/start-page.md, its pictures are the pages'
// files in demo-data/pages/img. Setup runs against an in-memory environment that implements DemoEnvironment,
// ContentPages and StartPage; the Pimcore side is checked in its source.
// Needs the php CLI (8.1+). Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const demoData = join(enterpriseDir, 'demo-data');
const imgDir = join(demoData, 'pages', 'img');
const read = (path) => readFileSync(path, 'utf8');
const KB = 1024;
const IMAGE_LINE = /^\s*!\[([^\]]*)\]\(\s*([^\s)"]+)(?:\s+"([^"]*)")?\s*\)\s*$/;

const PAGES_FOLDER = '/Pimcore Kingdom/Pages';
const TILE_LINKS = {
  'page:brief': 'Brief: Thunder Loop',
  'data-pool:Ride designs': 'Ride designs',
  'page:about-the-park': 'About the park',
  'page:working-with-the-kingdom': 'Working with the Kingdom',
  'page:safety-first': 'Safety first',
};

const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment',
              'Command/CoasterDemo/ContentPages', 'Command/CoasterDemo/StartPage', 'Command/CoasterDemo/BriefHtml',
              'Command/CoasterDemo/CoasterDemo', 'Portal/StudioExampleEnterprisePortalPlugin'] as $file) {
        require ${JSON.stringify(src)} . '/' . $file . '.php';
    }

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ContentPages;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\StartPage;

    // The root's areablock is $state['start']: a list of bricks, each ['type', 'demo' => bool] + its fields. A save
    // checks every link and picture against what is there, as Pimcore would resolve them.
    class StartEnvironment implements DemoEnvironment, ContentPages, StartPage {
        public int $writes = 0;
        public array $state = ['portal' => null, 'pages' => [], 'users' => [], 'assets' => [], 'branding' => null, 'plugins' => [], 'start' => [], 'variant' => null];
        public array $translations = [];
        // the root's bricks at the moment the portal was deleted (reset --all)
        public ?array $startWhenDeleted = null;

        public function portalId(): ?int { return $this->state['portal'] ? 100 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int {
            $this->writes++; $this->state['portal'] = ['name' => $name]; return 100;
        }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 101; }
        public function portalName(int $portalId): ?string { return $this->state['portal']['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portal']['name'] = $name; }
        public function deletePortal(int $portalId): void {
            $this->writes++; $this->startWhenDeleted = $this->state['start'];
            $this->state['portal'] = null; $this->state['pages'] = []; $this->state['start'] = []; $this->state['variant'] = null;
        }
        public function enabledPlugins(int $portalId): array { return $this->state['plugins']; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->writes++; $this->state['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->contentPage($portalId, 'brief')['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->saveContentPage($portalId, 'brief', $title, '', $html); }
        public function contentPage(int $portalId, string $key): ?array {
            $page = $this->state['pages'][$key] ?? null;
            return $page === null ? null : ['title' => $page['title'], 'icon' => $page['icon'], 'html' => $page['html']];
        }
        public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void {
            $this->writes++; $this->state['pages'][$key] = ['title' => $title, 'icon' => $icon, 'html' => $html];
        }
        public function navigationIcon(int $documentId): string { return $this->state['icons'][$documentId] ?? ''; }
        public function setNavigationIcon(int $documentId, string $icon): void { $this->writes++; $this->state['icons'][$documentId] = $icon; }
        public function portalBranding(int $portalId): array { return $this->state['branding'] ?? ['logo' => null, 'brand_primary' => null, 'brand_accent' => null]; }
        public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
            $this->writes++; $this->state['branding'] = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
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
            $metadata = [];
            if (str_ends_with($filename, '.coaster')) {
                foreach ((new CoasterMetadataExtractor())->extract(json_decode($content)) as $name => $value) { $metadata[$name] = (string) $value; }
            }
            $this->state['assets'][$folder . '/' . $filename] = ['content' => base64_encode($content), 'metadata' => $metadata];
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

        public function startPageBricks(int $portalId): array { return $this->state['start']; }
        public function saveStartPage(int $portalId, array $bricks): void {
            $this->writes++;
            foreach ($this->state['start'] as $brick) {
                if (!$brick['demo']) { throw new \\LogicException('saveStartPage over a brick that is not the demo\\'s'); }
            }
            foreach ($bricks as $brick) {
                $links = array_filter([$brick['link']['page'] ?? null, ...array_column($brick['tiles'] ?? [], 'link')]);
                foreach ($links as $link) { $this->resolve($link); }
                $images = array_filter([$brick['image'] ?? null, ...array_column($brick['tiles'] ?? [], 'image')]);
                foreach ($images as $image) {
                    if (!isset($this->state['assets'][$image])) { throw new \\LogicException("no asset $image"); }
                }
            }
            $this->state['start'] = array_map(static fn (array $brick) => ['demo' => true] + $brick, $bricks);
        }
        public function frontendVariant(int $portalId): ?string { return $this->state['variant']; }
        public function setFrontendVariant(int $portalId, string $variant): void { $this->writes++; $this->state['variant'] = $variant; }
        public function removeStartPage(int $portalId): void {
            $this->writes++;
            $this->state['start'] = array_values(array_filter($this->state['start'], static fn (array $brick) => !$brick['demo']));
        }
        // A link target: a page setup made, as "page:<key>" or "data-pool:<name>"; anything else is an error.
        public function resolve(string $link): string {
            if (str_starts_with($link, 'page:') && isset($this->state['pages'][substr($link, 5)])) { return $this->state['pages'][substr($link, 5)]['title']; }
            if ($link === 'data-pool:Ride designs') { return 'Ride designs'; }
            throw new \\LogicException("the link $link points at no page setup made");
        }
    }

    function demo(StartEnvironment $env): \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo {
        return new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const pimcoreMethod = (name) => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const start = pimcore.indexOf(`function ${name}(`);
  assert.ok(start > 0, `PimcoreDemoEnvironment has ${name}`);
  return pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
};

const startImages = () => read(join(demoData, 'start-page.md')).split('\n')
  .map((line) => line.match(IMAGE_LINE)).filter(Boolean).map((match) => match[2]);

test('AC1: setup without a start page writes the feature with the park picture, the hero and large entry tiles to the brief, the ride designs and every demo content page', () => {
  const { changes, start, assets, titles } = php(`
    $env = new StartEnvironment();
    $changes = demo($env)->setup();
    $titles = [];
    foreach ($env->state['start'] as $brick) {
        foreach ($brick['tiles'] ?? [] as $tile) { $titles[$tile['link']] = $env->resolve($tile['link']); }
    }
    echo json_encode(['changes' => $changes, 'start' => $env->state['start'], 'assets' => array_keys($env->state['assets']), 'titles' => $titles]);
  `);
  assert.deepEqual(start.map((brick) => brick.type), ['portal-engine-feature', 'portal-engine-hero', 'portal-engine-entry-tiles'], 'feature, hero, entry tiles, in this order');
  assert.ok(start.every((brick) => brick.demo), 'every brick is the demo\'s');
  assert.ok(changes.some((line) => /start page/i.test(line)), `a change line for the start page: ${changes.join('\n')}`);

  const [feature, hero, tiles] = start;
  assert.equal(feature.image, `${PAGES_FOLDER}/about-park-hero.svg`, 'the feature shows the park picture');
  assert.ok(feature.alt.length >= 10, 'the park picture has an alt text');
  assert.equal(feature.link.page, 'page:about-the-park');
  assert.ok(feature.title && feature.description.includes('<p>'), 'the feature has a title and a description');

  assert.match(hero.headline, /Pimcore Kingdom/, 'the headline names the Pimcore Kingdom');
  assert.match(hero.intro, /supplier/i, 'the purpose line says who the portal is for');
  assert.match(hero.intro, /ride/i);

  assert.equal(tiles.size, 'large');
  assert.deepEqual(tiles.tiles.map((tile) => tile.link), Object.keys(TILE_LINKS), 'one tile per main area, in navigation order, none to nothing');
  assert.deepEqual(titles, TILE_LINKS, 'each tile links to a page setup made');
  for (const tile of tiles.tiles) {
    assert.equal(tile.title, TILE_LINKS[tile.link], `the tile is named like its page (${tile.link})`);
    assert.ok(tile.meta && tile.cta, `${tile.link}: a meta line and a button text`);
    assert.ok(assets.includes(tile.image), `${tile.link}: its picture ${tile.image} is uploaded`);
    assert.ok(!/\d/.test(tile.meta + tile.cta), `${tile.link}: no live count in the tile`);
  }
  for (const key of ['about-the-park', 'working-with-the-kingdom', 'safety-first']) {
    const page = read(join(demoData, 'pages', `${key}.md`)).split('\n').map((line) => line.match(IMAGE_LINE)).find(Boolean)[2];
    assert.equal(tiles.tiles.find((tile) => tile.link === `page:${key}`).image, `${PAGES_FOLDER}/${page}`, `${key}'s tile shows the page's hero`);
  }
});

test('AC1: the start page text is in demo-data/start-page.md, and on Pimcore it goes on the portal root\'s content areablock with portal_engine\'s own bricks, no own template or CSS', () => {
  const md = read(join(demoData, 'start-page.md'));
  assert.match(md, /^# .*Pimcore Kingdom/);
  for (const key of ['brief', 'ride-designs', 'about-the-park', 'working-with-the-kingdom', 'safety-first']) {
    assert.match(md, new RegExp(`^## Tile: ${key}$`, 'm'), `a tile section for ${key}`);
  }
  const save = pimcoreMethod('saveStartPage');
  assert.match(save, /Document\\Page::getById\(\$portalId/, 'on the portal root document');
  assert.match(save, /getEditables\(\);/, 'loads the root\'s editables first, so the portal\'s settings stay');
  assert.match(save, /self::AREABLOCK, 'areablock'/);
  assert.match(save, /self::START_BRICKS/, 'remembers which bricks are the demo\'s');
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  assert.match(pimcore, /implements DemoEnvironment, ContentPages, PortalFooter, StartPage/);
  for (const type of ['portal-engine-feature', 'portal-engine-hero', 'portal-engine-entry-tiles']) {
    assert.ok(read(join(src, 'Command/CoasterDemo/CoasterDemo.php')).includes(`'${type}'`), `CoasterDemo names ${type}`);
  }
  assert.ok(!existsSync(join(enterpriseDir, 'templates/bundles/PimcorePortalEngineBundle/Areas')), 'no template override of the bricks');
});

test('AC2: a second setup writes nothing; an edited demo brick is repaired', () => {
  const { second, writes, repaired, again } = php(`
    $env = new StartEnvironment();
    demo($env)->setup();
    $writes = $env->writes;
    $second = demo($env)->setup();
    $writes = $env->writes - $writes;
    $env->state['start'][1]['headline'] = 'edited by hand';
    $repaired = demo($env)->setup();
    $again = demo($env)->setup();
    echo json_encode(['second' => $second, 'writes' => $writes, 'repaired' => $repaired, 'again' => $again]);
  `);
  assert.deepEqual(second, [], 'the second run changes nothing');
  assert.equal(writes, 0, 'and writes nothing');
  assert.equal(repaired.length, 1, repaired.join('\n'));
  assert.match(repaired[0], /start page/i);
  assert.deepEqual(again, []);
});

test('AC2: a start page holding a brick that is not the demo\'s stays as it is, with a line saying why', () => {
  const { changes, again, start, mixed } = php(`
    $env = new StartEnvironment();
    $own = ['type' => 'portal-engine-wysiwyg', 'demo' => false];
    $env->state['start'] = [$own];
    $changes = demo($env)->setup();
    $again = demo($env)->setup();
    $start = $env->state['start'];
    // an editor added a brick after the demo wrote its own: both stay
    $env2 = new StartEnvironment();
    demo($env2)->setup();
    $env2->state['start'][] = $own;
    $before = $env2->state['start'];
    $env2->state['start'][1]['headline'] = 'edited by hand';
    demo($env2)->setup();
    echo json_encode(['changes' => $changes, 'again' => $again, 'start' => $start, 'mixed' => $env2->state['start'] === array_replace_recursive($before, [1 => ['headline' => 'edited by hand']])]);
  `);
  assert.deepEqual(start, [{ type: 'portal-engine-wysiwyg', demo: false }], 'the editor\'s start page is unchanged');
  const line = changes.find((text) => /start page/i.test(text));
  assert.ok(line, `a line about the start page: ${changes.join('\n')}`);
  assert.match(line, /not the demo's/i, 'it says why');
  assert.match(line, /portal-engine-wysiwyg/, 'and names the brick');
  assert.ok(again.some((text) => /start page/i.test(text)) && again.length === 1, `the next run only says it again: ${again.join('\n')}`);
  assert.ok(mixed, 'a start page with the demo\'s and an editor\'s bricks stays as it is');
});

test('AC2: reset --all removes only the demo\'s bricks from the start page', () => {
  const { left, after } = php(`
    $env = new StartEnvironment();
    demo($env)->setup();
    $env->state['start'][] = ['type' => 'portal-engine-wysiwyg', 'demo' => false];
    $changes = demo($env)->reset(true);
    echo json_encode(['left' => $env->startWhenDeleted, 'after' => $changes]);
  `);
  assert.deepEqual(left, [{ type: 'portal-engine-wysiwyg', demo: false }], 'only the editor\'s brick is left when the portal goes');
  assert.ok(after.some((line) => /start page/i.test(line)), after.join('\n'));
  const remove = pimcoreMethod('removeStartPage');
  assert.match(remove, /self::START_BRICKS/, 'on Pimcore, only the bricks the demo remembers as its own');
});

test('AC1: setup sets the portal\'s frontend variant to new when it is empty, so the Studio frontend shows the start page; on Pimcore it is the root\'s frontend_variant select', () => {
  for (const empty of [null, '']) {
    const { changes, variant } = php(`
      $env = new StartEnvironment();
      $env->state['variant'] = ${JSON.stringify(empty)};
      $changes = demo($env)->setup();
      echo json_encode(['changes' => $changes, 'variant' => $env->state['variant']]);
    `);
    assert.equal(variant, 'new', `an empty variant (${JSON.stringify(empty)}) becomes new`);
    assert.ok(changes.some((line) => /frontend variant/i.test(line) && /new/.test(line)), `a change line for the variant: ${changes.join('\n')}`);
  }
  const set = pimcoreMethod('setFrontendVariant');
  assert.match(set, /getEditables\(\);/, 'loads the root\'s editables first, so the portal\'s settings stay');
  assert.match(set, /PortalConfig::FRONTEND_VARIANT, 'select'/, 'as the portal\'s "Frontend" select saves it');
  assert.match(pimcoreMethod('frontendVariant'), /PortalConfig::FRONTEND_VARIANT/);
});

test('AC2: a frontend variant that is already set stays as it is: new writes nothing, another value gets a line saying why', () => {
  const { keptNew, writesNew, old, keptOld, againOld } = php(`
    $env = new StartEnvironment();
    $env->state['variant'] = 'new';
    $keptNew = demo($env)->setup();
    $writes = $env->writes;
    demo($env)->setup();
    $writesNew = $env->writes - $writes;
    $env2 = new StartEnvironment();
    $env2->state['variant'] = 'old';
    $old = demo($env2)->setup();
    $againOld = demo($env2)->setup();
    echo json_encode(['keptNew' => $keptNew, 'writesNew' => $writesNew, 'old' => $old, 'keptOld' => $env2->state['variant'], 'againOld' => $againOld]);
  `);
  assert.ok(!keptNew.some((line) => /frontend variant/i.test(line)), `new is left without a line: ${keptNew.join('\n')}`);
  assert.equal(writesNew, 0, 'a second run writes nothing');
  assert.equal(keptOld, 'old', 'another value is left as it is');
  const line = old.find((text) => /frontend variant/i.test(text));
  assert.ok(line, `a line about the variant: ${old.join('\n')}`);
  assert.match(line, /"old"/, 'it names the value');
  assert.match(line, /start page/i, 'and says why it matters: the start page shows only on new');
  assert.deepEqual(againOld, [line], 'the next run only says it again');
});

test('AC3: the start page\'s pictures are files in demo-data/pages/img listed in images.json, together at most 200 KB, with no external URL, font or script', () => {
  const files = [...new Set(startImages())];
  assert.ok(files.includes('about-park-hero.svg'), 'the park picture');
  const rights = JSON.parse(read(join(imgDir, 'images.json')));
  let total = 0;
  for (const file of files) {
    assert.ok(!file.includes('/'), `${file} names a file in pages/img itself`);
    assert.ok(existsSync(join(imgDir, file)), `${file} is in pages/img`);
    assert.ok(rights[file], `${file} is in images.json`);
    total += statSync(join(imgDir, file)).size;
    const content = read(join(imgDir, file));
    assert.doesNotMatch(content, /<script|\son\w+\s*=|@import|@font-face|font-family|url\(\s*['"]?(?!#)|(?:href|src)\s*=\s*["'](?!#|data:)/i, `${file}: no script, font or external reference`);
    assert.doesNotMatch(content, /https?:\/\/(?!www\.w3\.org\/)/i, `${file}: no external URL`);
  }
  assert.ok(total <= 200 * KB, `together ${Math.round(total / KB)} KB`);
  assert.doesNotMatch(read(join(demoData, 'start-page.md')), /https?:\/\//, 'start-page.md has no URL');
  const { images } = php(`
    $env = new StartEnvironment();
    demo($env)->setup();
    $images = [];
    foreach ($env->state['start'] as $brick) {
        $images = [...$images, ...array_filter([$brick['image'] ?? null, ...array_column($brick['tiles'] ?? [], 'image')])];
    }
    echo json_encode(['images' => $images]);
  `);
  assert.deepEqual([...new Set(images)].sort(), files.map((file) => `${PAGES_FOLDER}/${file}`).sort(), 'the bricks show exactly those files');
});
