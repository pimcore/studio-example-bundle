// F157: the Talk entry moves from the navigation rail to a small icon link in the portal footer (DR-P48 part 5).
// The footer is Twig (portal_engine has no footer plugin slot): templates/portal/footer-talk.html.twig is the link,
// shown through a marked footer snippet coaster-demo:setup makes the portal's footer. Setup runs against an
// in-memory environment that implements DemoEnvironment and PortalFooter; the Pimcore side and the templates are
// checked in their source; the icon name against portal_engine's bundled icon set (its assets/icons, which
// portalEngine_inline_icon reads: it returns null for a name the set lacks), so a missing set fails here.
// Needs the php CLI (8.1+). Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const templates = join(enterpriseDir, 'templates/portal');
const read = (path) => readFileSync(path, 'utf8');

/** The icon names of portal_engine's bundled set, from PORTAL_ENGINE_DIR (default: this project's clone). */
const iconSet = () => {
  const repo = process.env.PORTAL_ENGINE_DIR
    ?? join(process.env.ORCH_WORK ?? join(homedir(), '.local/share/agentic-orchestration'), 'portal-talk/repos/portal_engine');
  const dir = join(repo, 'assets/icons');
  assert.ok(existsSync(dir), `portal_engine's icon set is at ${dir} (set PORTAL_ENGINE_DIR): the footer icon is checked against it`);
  return new Set(readdirSync(dir).filter((name) => name.endsWith('.svg')));
};

const footerTalk = () => read(join(templates, 'footer-talk.html.twig'));

// --- AC1: no rail entry; the footer template links the Talk page with an icon of portal_engine's set ---

test('AC1: the plugin registers no Talk entry in slots.navEntries', () => {
  const plugin = read(join(enterpriseDir, 'assets/portal/js/src/plugin.tsx'));
  assert.doesNotMatch(plugin, /slots\.navEntries/, 'nothing registered in the navigation rail');
  assert.doesNotMatch(plugin, /TalkNavEntry/, 'the rail entry is not imported');
  assert.equal(existsSync(join(enterpriseDir, 'assets/portal/talk/TalkNavEntry.tsx')), false, 'the rail entry is gone');
  // the other registrations stay
  assert.match(plugin, /registerToSlot\(slots\.headerActions, \{ name: 'studio-example-enterprise\/ask-brief', component: AskBriefButton \}\)/);
});

test('AC1: the footer template links the Talk URL with an inline icon of portal_engine\'s set, named "Talk"', () => {
  const twig = footerTalk();
  const link = twig.match(/<a\b[^>]*>[\s\S]*?<\/a>/);
  assert.ok(link, 'the template has a link');
  assert.match(link[0], /href="\{\{\s*talk\.url\s*\}\}"/, 'to the Talk page\'s URL');
  assert.match(link[0], /aria-label="\{\{\s*talk\.label\s*\}\}"/, 'its accessible name is the label');
  assert.match(link[0], /title="\{\{\s*talk\.label\s*\}\}"/, 'and its tooltip');
  const icon = link[0].match(/portalEngine_inline_icon\('([^']+)'\)/);
  assert.ok(icon, 'the icon is portalEngine_inline_icon with a fixed name');
  const name = icon[1].endsWith('.svg') ? icon[1] : `${icon[1]}.svg`;
  const names = iconSet();
  assert.ok(names.size > 100, `portal_engine's icon set is there (${names.size} icons)`);
  assert.ok(names.has(name), `${name} is in portal_engine's assets/icons`);
  // no visible text: the icon alone, decorative inside the named link
  assert.equal(link[0].replace(/\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|<[^>]+>/g, '').trim(), '', 'an icon-only link');

  // the URL and the label come from the server's TalkPage (the label is "Talk"), through the bundle's Twig function
  const fn = twig.match(/\{%\s*set talk = (\w+)\(\)\s*%\}/);
  assert.ok(fn, 'the template reads the link from a Twig function');
  assert.match(twig, /\{%\s*if talk\s*%\}/, 'and renders nothing outside a portal');
  const extension = read(join(src, 'Portal/Talk/TalkTwigExtension.php'));
  assert.match(extension, new RegExp(`new TwigFunction\\('${fn[1]}'`));
  assert.match(extension, /->getNavEntry\(\)/);
  assert.match(read(join(src, 'Portal/Talk/TalkPage.php')), /public const LABEL = 'Talk';/);
  // a theme class of the bundle, sized in em so it stays small next to the footer's text
  assert.doesNotMatch(twig, /<script/i);
});

test('AC1: the icon check fails for a name the set lacks', () => {
  const names = iconSet();
  assert.equal(names.has('no-such-talk-icon.svg'), false);
});

// --- AC2: setup sets the marked footer, or keeps another footer and adds the link once in a marked block ---

const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Coaster/CoasterValidator', 'Coaster/CoasterMetadataExtractor', 'Command/CoasterDemo/DemoEnvironment',
              'Command/CoasterDemo/PortalFooter', 'Command/CoasterDemo/BriefHtml', 'Command/CoasterDemo/CoasterDemo',
              'Portal/StudioExampleEnterprisePortalPlugin'] as $file) {
        require ${JSON.stringify(src)} . '/' . $file . '.php';
    }

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\PortalFooter;

    // Footers are snippets: [id => ['path', 'demo', 'wraps', 'content']]; 'portalFooter' is the portal's footer relation.
    class FooterEnvironment implements DemoEnvironment, PortalFooter {
        public int $writes = 0;
        public array $state = ['portal' => null, 'brief' => null, 'users' => [], 'assets' => [], 'branding' => null, 'plugins' => [], 'footers' => [], 'portalFooter' => null];
        public array $translations = [];

        public function footer(int $portalId): ?array {
            $id = $this->state['portalFooter'];
            if ($id === null || !isset($this->state['footers'][$id])) { return null; }
            $f = $this->state['footers'][$id];
            $wrapsPath = $f['wraps'] === null ? null : ($this->state['footers'][$f['wraps']]['path'] ?? null);
            return ['id' => $id, 'path' => $f['path'], 'demo' => $f['demo'], 'wraps' => $f['wraps'], 'wrapsPath' => $wrapsPath];
        }
        public function setDemoFooter(int $portalId, ?int $wraps): void {
            $this->writes++;
            $id = null;
            foreach ($this->state['footers'] as $fid => $f) { if ($f['demo']) { $id = $fid; } }
            $id ??= 900 + count($this->state['footers']);
            $this->state['footers'][$id] = ['path' => '/Pimcore Kingdom/snippets/coaster-demo-footer', 'demo' => true, 'wraps' => $wraps, 'content' => 'talk-link'];
            $this->state['portalFooter'] = $id;
        }
        public function removeDemoFooter(int $portalId): void {
            $this->writes++;
            foreach ($this->state['footers'] as $fid => $f) {
                if ($f['demo']) {
                    if ($this->state['portalFooter'] === $fid) { $this->state['portalFooter'] = $f['wraps']; }
                    unset($this->state['footers'][$fid]);
                }
            }
        }

        public function portalId(): ?int { return $this->state['portal'] ? 100 : null; }
        public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int { $this->writes++; $this->state['portal'] = ['name' => $name]; return 100; }
        public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 101; }
        public function portalName(int $portalId): ?string { return $this->state['portal']['name'] ?? null; }
        public function renamePortal(int $portalId, string $name): void { $this->writes++; $this->state['portal']['name'] = $name; }
        public function deletePortal(int $portalId): void { $this->writes++; $this->state['portal'] = null; }
        public function enabledPlugins(int $portalId): array { return $this->state['plugins']; }
        public function enablePlugin(int $portalId, string $pluginId): void { $this->writes++; $this->state['plugins'][] = $pluginId; }
        public function briefHtml(int $portalId): ?string { return $this->state['brief']; }
        public function saveBrief(int $portalId, string $title, string $html): void { $this->writes++; $this->state['brief'] = $html; }
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
            foreach ($this->state['assets'] as $path => $asset) { if (dirname($path) === $folder) { $assets[basename($path)] = base64_decode($asset['content']); } }
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

    function demo(FooterEnvironment $env): \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo {
        return new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    }
    // A set-up demo whose portal has the install's footer (as the Portal Engine wizard makes it), or none, or $own.
    function portalWith(?string $footer): FooterEnvironment {
        $env = new FooterEnvironment();
        demo($env)->setup();
        $env->state['footers'] = [];
        $env->state['portalFooter'] = null;
        if ($footer === 'install') {
            $env->state['footers'][341] = ['path' => '/Pimcore Kingdom/snippets/footer', 'demo' => false, 'wraps' => null, 'content' => 'copyright by pimcore'];
            $env->state['portalFooter'] = 341;
        }
        return $env;
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

test('AC2: on a portal without a footer, setup sets the demo\'s marked footer with the Talk link, once', () => {
  const r = php(`
    $env = portalWith(null);
    $first = demo($env)->setup();
    $afterFirst = $env->state;
    $second = demo($env)->setup();
    echo json_encode(['first' => $first, 'second' => $second, 'footers' => $afterFirst['footers'], 'portalFooter' => $afterFirst['portalFooter'], 'same' => $afterFirst === $env->state]);
  `);
  assert.deepEqual(r.first.filter((line) => /footer/i.test(line)), ['Set the portal footer with the Talk link']);
  const ids = Object.keys(r.footers);
  assert.equal(ids.length, 1, 'one footer snippet');
  assert.equal(r.footers[ids[0]].demo, true, 'marked as the demo\'s');
  assert.equal(r.footers[ids[0]].wraps, null, 'wrapping no other footer');
  assert.equal(String(r.portalFooter), ids[0], 'and the portal\'s footer');
  assert.deepEqual(r.second, [], 'a second run changes nothing');
  assert.ok(r.same, 'the state stays as it was');
});

test('AC2: on a portal with another footer, setup keeps it and adds the Talk link once in a marked block that reset --all removes', () => {
  const r = php(`
    $env = portalWith('install');
    $installFooter = $env->state['footers'][341];
    $first = demo($env)->setup();
    $afterFirst = $env->state;
    $second = demo($env)->setup();
    $reset = demo($env)->reset();
    $afterReset = $env->state;
    $all = demo($env)->reset(true);
    echo json_encode(['installFooter' => $installFooter, 'first' => $first, 'afterFirst' => $afterFirst, 'second' => $second,
      'reset' => $reset, 'resetFooters' => $afterReset['footers'], 'all' => $all, 'end' => $env->state]);
  `);
  assert.deepEqual(r.first.filter((line) => /footer/i.test(line)), ['Kept the portal footer /Pimcore Kingdom/snippets/footer and added the Talk link at its end']);
  const demoFooters = Object.entries(r.afterFirst.footers).filter(([, f]) => f.demo);
  assert.equal(demoFooters.length, 1, 'one marked block');
  assert.equal(demoFooters[0][1].wraps, 341, 'that shows the install\'s footer first, then the Talk link');
  assert.equal(String(r.afterFirst.portalFooter), demoFooters[0][0]);
  assert.deepEqual(r.afterFirst.footers[341], r.installFooter, 'the install\'s footer itself is untouched');
  assert.deepEqual(r.second, [], 'a second run adds nothing');
  assert.equal(r.reset.filter((line) => /footer/i.test(line)).length, 0, 'reset (to revision 1) keeps the link');
  assert.deepEqual(r.resetFooters, r.afterFirst.footers);

  assert.ok(r.all.includes('Removed the Talk link from the portal footer /Pimcore Kingdom/snippets/footer'), r.all.join('\n'));
  assert.deepEqual(r.end.footers, { 341: r.installFooter }, 'only the marked block is gone, the rest untouched');
  assert.equal(r.end.portalFooter, 341, 'the portal\'s footer is the install\'s again');
});

test('AC2: setup with the demo\'s footer in place changes nothing; an editor\'s new footer gets the one marked block, not a second', () => {
  const r = php(`
    $env = portalWith(null);
    demo($env)->setup();
    $same = demo($env)->setup();
    // an editor points the portal at their own footer
    $env->state['footers'][500] = ['path' => '/Pimcore Kingdom/snippets/editors-footer', 'demo' => false, 'wraps' => null, 'content' => 'imprint'];
    $env->state['portalFooter'] = 500;
    $changed = demo($env)->setup();
    echo json_encode(['same' => $same, 'changed' => $changed, 'state' => $env->state]);
  `);
  assert.deepEqual(r.same, []);
  assert.deepEqual(r.changed, ['Kept the portal footer /Pimcore Kingdom/snippets/editors-footer and added the Talk link at its end']);
  const demoFooters = Object.values(r.state.footers).filter((f) => f.demo);
  assert.equal(demoFooters.length, 1, 'still one marked block');
  assert.equal(demoFooters[0].wraps, 500);
  assert.equal(r.state.footers[500].content, 'imprint', 'the editor\'s footer is untouched');
});

test('AC2: on Pimcore, the demo footer is a marked snippet rendering footer-talk after the footer it wraps, set as the portal\'s footer', () => {
  const pimcore = read(join(src, 'Command/CoasterDemo/PimcoreDemoEnvironment.php'));
  assert.match(pimcore, /class PimcoreDemoEnvironment implements [^{]*\bPortalFooter\b/);
  const method = (name) => {
    const start = pimcore.indexOf(`function ${name}(`);
    assert.ok(start > 0, `PimcoreDemoEnvironment has ${name}`);
    return pimcore.slice(start, pimcore.indexOf('\n    }\n', start));
  };
  const set = method('setDemoFooter');
  assert.match(set, /new Document\\Snippet\(\)/);
  assert.match(set, /setProperty\(self::MARK, 'bool', true/);
  assert.match(set, /setController\(TalkFooterController::class \. '::footerAction'\)/);
  assert.match(set, /setProperty\(self::FOOTER_WRAPS, 'document'/);
  assert.match(set, /setRawEditable\(PortalConfig::FOOTER_SNIPPET, 'relation'/);
  assert.match(set, /getEditables\(\)/, 'the portal keeps its other settings');
  assert.match(set, /Cache::clearAll\(\)/);
  const remove = method('removeDemoFooter');
  assert.match(remove, /setRawEditable\(PortalConfig::FOOTER_SNIPPET, 'relation'/);
  assert.match(remove, /->delete\(\)/);
  assert.match(method('footer'), /getProperty\(self::MARK\)/, 'the demo\'s footer is found by its mark');

  // the snippet's controller renders the bundle template: the wrapped footer first, then footer-talk
  const controller = read(join(src, 'Portal/Talk/TalkFooterController.php'));
  const template = controller.match(/'@PimcoreStudioExampleEnterprise\/([^']+\.html\.twig)'/);
  assert.ok(template, 'the controller renders a template of the bundle');
  const snippet = read(join(enterpriseDir, 'templates', template[1]));
  const wrapped = snippet.indexOf('portalEngine_localizedInc(');
  const talk = snippet.search(/include\('@PimcoreStudioExampleEnterprise\/portal\/footer-talk\.html\.twig'\)/);
  assert.ok(wrapped > 0 && talk > wrapped, 'the wrapped footer, then the Talk link at its end');
  assert.match(read(join(enterpriseDir, 'config/portal-talk.yaml')), /Portal\\Talk\\TalkFooterController:[\s\S]*?controller\.service_arguments/);
});
