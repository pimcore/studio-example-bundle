// F155: the portal's content pages (DR-P48 parts 1 and 4). coaster-demo:setup makes three marked content pages for
// suppliers from demo-data/pages/*.md and sets a navigation icon on every content page it makes, the brief included.
// Setup runs against an in-memory environment that implements DemoEnvironment and ContentPages; the Pimcore side is
// checked in its source; the icons are checked against portal_engine's bundled icon set (assets/icons of its clone,
// PORTAL_ENGINE_REPO, as bin/build-all.sh finds it), so a name the set lacks fails here instead of rendering blank.
// Needs the php CLI (8.1+). Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = join(enterpriseDir, 'demo-data', 'pages');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(path, 'utf8');

const PAGES = {
  'about-the-park': 'About the park',
  'working-with-the-kingdom': 'Working with the Kingdom',
  'safety-first': 'Safety first',
};
const BRIEF = 'Brief: Thunder Loop';

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
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ContentPages;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;

    // Pages live in the portal's language root: [key => ['title', 'icon', 'html', 'demo']]. An editor's own page has
    // 'demo' => false; a demo page whose key is taken gets the next free one and remembers its own as 'demoKey'.
    class PagesEnvironment implements DemoEnvironment, ContentPages {
        public int $writes = 0;
        public array $state = ['portal' => null, 'pages' => [], 'users' => [], 'assets' => [], 'branding' => null, 'plugins' => []];
        public array $translations = [];

        public function portalId(): ?int { return $this->state['portal'] ? 100 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int {
            $this->writes++;
            $this->state['portal'] = ['name' => $name];
            return 100;
        }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 101; }
        public function portalName(int $portalId): ?string { return $this->state['portal']['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portal']['name'] = $name; }
        // As in Pimcore: the portal's pages go with it, an editor's too.
        public function deletePortal(int $portalId): void { $this->writes++; $this->state['portal'] = null; $this->state['pages'] = []; }
        public function enabledPlugins(int $portalId): array { return $this->state['plugins']; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->writes++; $this->state['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->contentPage($portalId, 'brief')['html'] ?? null; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->saveContentPage($portalId, 'brief', $title, '', $html); }
        public function contentPage(int $portalId, string $key): ?array {
            foreach ($this->state['pages'] as $pageKey => $page) {
                if ($page['demo'] && ($page['demoKey'] ?? $pageKey) === $key) { return ['title' => $page['title'], 'icon' => $page['icon'], 'html' => $page['html']]; }
            }
            return null;
        }
        public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void {
            $this->writes++;
            foreach ($this->state['pages'] as $pageKey => $page) {
                if ($page['demo'] && ($page['demoKey'] ?? $pageKey) === $key) {
                    $this->state['pages'][$pageKey] = [...$page, 'title' => $title, 'icon' => $icon, 'html' => $html];
                    return;
                }
            }
            $free = $key;
            for ($i = 1; array_key_exists($free, $this->state['pages']); $i++) { $free = $key . '_' . $i; }
            $this->state['pages'][$free] = ['title' => $title, 'icon' => $icon, 'html' => $html, 'demo' => true] + ($free === $key ? [] : ['demoKey' => $key]);
        }
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
    }

    function demo(PagesEnvironment $env): \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo {
        return new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    }
    // The pages as the navigation lists them: [title => icon], demo pages and an editor's alike.
    function pages(PagesEnvironment $env): array {
        $pages = [];
        foreach ($env->state['pages'] as $key => $page) { $pages[] = ['key' => $key, 'title' => $page['title'], 'icon' => $page['icon'], 'demo' => $page['demo'], 'html' => $page['html']]; }
        return $pages;
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

// portal_engine's bundled icon set: the names its rail resolves (ContentExtension::extractInlineIconFileFromIcon reads
// assets/icons/<name>.svg). The talk runs on 2026.3, so its branch is read when the clone has it, else integration.
const iconSet = () => {
  const repo = process.env.PORTAL_ENGINE_REPO
    ?? join(process.env.ORCH_WORK ?? join(homedir(), '.local/share/agentic-orchestration'), 'portal-talk/repos/portal_engine');
  assert.ok(existsSync(repo), `portal_engine's clone is at ${repo} (set PORTAL_ENGINE_REPO): its icon set is what the icons are checked against`);
  for (const ref of ['origin/2026.3', '2026.3', 'integration']) {
    try {
      const list = execFileSync('git', ['-C', repo, 'ls-tree', '--name-only', `${ref}:assets/icons`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return { ref, names: new Set(list.split('\n').filter((name) => name.endsWith('.svg'))) };
    } catch { /* the next ref */ }
  }
  return { ref: 'working tree', names: new Set(readdirSync(join(repo, 'assets/icons')).filter((name) => name.endsWith('.svg'))) };
};

const pimcoreMethod = (name) => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  const start = pimcore.indexOf(`function ${name}(`);
  assert.ok(start > 0, `PimcoreDemoEnvironment has ${name}`);
  return pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
};

test('AC1: setup creates "About the park", "Working with the Kingdom" and "Safety first" with their text, and a second run leaves one copy each', () => {
  const { first, second, pages } = php(`
    $env = new PagesEnvironment();
    $first = demo($env)->setup();
    $second = demo($env)->setup();
    echo json_encode(['first' => $first, 'second' => $second, 'pages' => pages($env)]);
  `);
  for (const [key, title] of Object.entries(PAGES)) {
    const found = pages.filter((page) => page.title === title);
    assert.equal(found.length, 1, `one page "${title}"`);
    assert.equal(found[0].key, key);
    assert.ok(found[0].demo, `"${title}" is marked as the demo's`);
    assert.ok(first.some((line) => line.includes(`"${title}"`)), `a change line for "${title}": ${first.join('\n')}`);
    // The text of its demo-data file, a few short paragraphs, as the WYSIWYG brick's HTML.
    const md = read(join(pagesDir, `${key}.md`));
    assert.ok((found[0].html.match(/<p>/g) ?? []).length >= 2, `"${title}" has a few paragraphs`);
    const sentence = md.split('\n').find((line) => /^[A-Z][^#*-]/.test(line) && line.length > 40);
    assert.ok(found[0].html.includes(sentence.slice(0, 30).replace(/'/g, '&apos;')), `"${title}" carries its file's text`);
  }
  assert.deepEqual(second, [], 'the second run changes nothing');
  assert.deepEqual(pages.map((page) => page.title), [BRIEF, ...Object.values(PAGES)], 'the brief, then the three pages, once each');
});

test('AC1: demo-data/pages has one Markdown file per page: a heading and a few short paragraphs of fictional Pimcore Kingdom text', () => {
  assert.deepEqual(readdirSync(pagesDir).filter((file) => file.endsWith('.md')).sort(), Object.keys(PAGES).map((key) => `${key}.md`).sort());
  for (const [key, title] of Object.entries(PAGES)) {
    const md = read(join(pagesDir, `${key}.md`));
    assert.match(md, new RegExp(`^# ${title}\\n`), `${key}.md starts with its title`);
    assert.match(md, /Pimcore Kingdom/);
    const paragraphs = md.split(/\n\s*\n/).filter((block) => !/^#/.test(block.trim()) && block.trim() !== '');
    assert.ok(paragraphs.length >= 2 && paragraphs.length <= 8, `${key}.md: a few paragraphs (${paragraphs.length})`);
  }
});

test('AC1: reset and reset --all keep one copy of each page, and an editor\'s own page of the same name stays untouched', () => {
  const { afterReset, afterAll, again } = php(`
    $env = new PagesEnvironment();
    demo($env)->setup();
    $env->state['pages']['about-the-park']['html'] = '<p>edited by hand</p>';
    $env->state['pages']['own-page'] = ['title' => 'Our own page', 'icon' => '', 'html' => '<p>mine</p>', 'demo' => false];
    demo($env)->reset();
    $afterReset = pages($env);
    demo($env)->reset(true);
    $afterAll = pages($env);
    // A fresh setup where an editor already has a page under the key "safety-first": theirs stays as it is.
    $env->state['portal'] = ['name' => 'Pimcore Kingdom'];
    $env->state['pages'] = ['safety-first' => ['title' => 'Safety first', 'icon' => 'bell.svg', 'html' => '<p>the editor\\'s</p>', 'demo' => false]];
    demo($env)->setup();
    demo($env)->setup();
    echo json_encode(['afterReset' => $afterReset, 'afterAll' => $afterAll, 'again' => pages($env)]);
  `);
  for (const title of Object.values(PAGES)) {
    assert.equal(afterReset.filter((page) => page.title === title && page.demo).length, 1, `reset: one "${title}"`);
  }
  assert.ok(!afterReset.find((page) => page.key === 'about-the-park').html.includes('edited by hand'), 'reset repairs the text');
  assert.deepEqual(afterReset.find((page) => page.key === 'own-page'), { key: 'own-page', title: 'Our own page', icon: '', demo: false, html: '<p>mine</p>' });
  assert.deepEqual(afterAll, [], 'reset --all removes the portal with its pages');
  assert.deepEqual(again.find((page) => page.key === 'safety-first'), { key: 'safety-first', title: 'Safety first', icon: 'bell.svg', demo: false, html: '<p>the editor\'s</p>' });
  assert.equal(again.filter((page) => page.title === 'Safety first' && page.demo).length, 1, 'one demo copy beside the editor\'s, after two runs');
});

test('AC2: every demo content page gets a navigation icon from portal_engine\'s icon set, the brief included, each its own', () => {
  const { ref, names } = iconSet();
  assert.ok(names.size > 100, `portal_engine ${ref} has its icon set (${names.size} icons)`);
  const { pages } = php(`
    $env = new PagesEnvironment();
    demo($env)->setup();
    echo json_encode(['pages' => pages($env)]);
  `);
  assert.equal(pages.length, 4);
  for (const page of pages) {
    assert.ok(page.icon, `"${page.title}" has a navigation icon`);
    assert.ok(names.has(page.icon), `"${page.title}": ${page.icon} is in portal_engine ${ref}'s assets/icons`);
    assert.notEqual(page.icon, 'menu.inline.svg', 'not the rail\'s generic icon');
  }
  assert.equal(new Set(pages.map((page) => page.icon)).size, pages.length, 'each page its own icon');
});

test('AC2: the icon check fails for a name the set lacks', () => {
  const { names } = iconSet();
  assert.ok(!names.has('roller-coaster-made-up.svg'));
  const demo = read(join(src, 'Command/CoasterDemo/CoasterDemo.php'));
  const icons = [...demo.matchAll(/_ICON = '([^']+)'/g)].map((match) => match[1]);
  assert.ok(icons.length >= 4, `CoasterDemo names the icons: ${icons.join(', ')}`);
  for (const icon of icons) assert.ok(names.has(icon), `${icon} is in portal_engine's icon set`);
});

test('AC2: an existing brief without its icon gets it on the next setup, with one change line, then nothing', () => {
  const { changes, again, brief } = php(`
    $env = new PagesEnvironment();
    demo($env)->setup();
    $env->state['pages']['brief']['icon'] = '';
    $changes = demo($env)->setup();
    $again = demo($env)->setup();
    echo json_encode(['changes' => $changes, 'again' => $again, 'brief' => $env->state['pages']['brief']]);
  `);
  assert.equal(changes.length, 1, changes.join('\n'));
  assert.match(changes[0], /icon .*"Brief: Thunder Loop"/);
  assert.ok(brief.icon);
  assert.deepEqual(again, []);
});

test('AC2: on Pimcore, a content page is saved with its navigation_icon select, its title in the navigation, and its other editables kept', () => {
  const save = pimcoreMethod('saveContentPage');
  assert.match(save, /setRawEditable\(ContentConfig::NAVIGATION_ICON, 'select', \$icon\)/);
  assert.match(save, /setProperty\('navigation_name'/);
  assert.match(save, /setProperty\(self::MARK/);
  assert.match(save, /setController\(ControllerReference::PORTAL_CONTENT_PAGE\)/);
  const load = save.indexOf('->getEditables();');
  assert.ok(load > 0 && load < save.indexOf('->setRawEditable('), 'loads the page\'s editables before setting one, so a save keeps the others');
  assert.match(pimcoreMethod('saveBrief'), /saveContentPage\(/, 'the brief is saved the same way, with its icon');
  assert.match(pimcoreMethod('contentPage'), /self::MARK/, 'only the demo\'s own pages are found as its pages');
  assert.match(pimcoreMethod('contentPage'), /NAVIGATION_ICON/);
});
