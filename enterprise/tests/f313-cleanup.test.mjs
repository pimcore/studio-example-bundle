// F313: the PR cleanup after the talk. The talk-only plumbing leaves the bundle: the portal page "Talk" (route,
// controller, viewer, config), its footer link (templates, Twig extension, icon, the demo's footer snippet), the
// talk-slides Studio example. coaster-demo:setup and reset --all remove the footer snippet an earlier setup wrote.
// The coaster demo stays: Ride designs, Open briefs, start and content pages, Ask the brief, Confirm.
// Needs git and the php CLI (8.1+). Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = join(enterpriseDir, '..');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');
const T = ['T', 'alk'].join('');
const t = T.toLowerCase();

test('AC1: git grep on enterprise/ and assets/js/src finds no talk page, footer link, route or talk-slides example', () => {
  // built from parts, so this file is no hit itself
  const pattern = [
    `${t}-slides`, `${T}Slides`, `${T}Page`, `${T}Icon`, `${T}Viewer`, `${T}Controller`, `${T}FooterController`,
    `${T}TwigExtension`, `${T}NavEntry`, `Portal\\\\${T}`, `footer-${t}`, `footer-snippet`, `sx-footer-${t}`,
    `pimcore_studio_example_enterprise_${t}`, `studioExampleEnterprise_${t}`, `/${t}/${t}.html`, `portal-${t}.yaml`,
    `assets/portal/${t}`, `${t}\\.url`, `implements[^{]*PortalFooter`, `PortalFooter;`, `coaster-demo-footer'`,
  ].join('\\|');
  const r = spawnSync('git', ['-C', repoDir, 'grep', '-n', '-i', pattern, '--', 'enterprise', 'assets/js/src'], { encoding: 'utf8' });
  assert.equal(r.status, 1, `git grep hits:\n${r.stdout}${r.stderr}`);
});

test('AC4: the removed code is gone: the talk page, its footer link and config, the talk-slides example and its tests', () => {
  for (const path of [
    `assets/portal/${t}`, `src/Portal/${T}`, `config/portal-${t}.yaml`, `templates/portal/${t}.html.twig`,
    `templates/portal/footer-${t}.html.twig`, 'templates/portal/footer-snippet.html.twig', `assets/portal/js/src/icons/${T}Icon.tsx`,
    'src/Command/CoasterDemo/PortalFooter.php', `public/${t}`,
    ...['footer', 'viewer', '', 'theme'].map((s) => `tests/portal-${t}${s ? `-${s}` : ''}.test.mjs`), 'tests/footer-end-padding.test.mjs',
  ]) assert.ok(!existsSync(join(enterpriseDir, path)), `enterprise/${path} is removed`);
  assert.ok(!existsSync(join(repoDir, `assets/js/src/examples/${t}-slides`)), `the ${t}-slides example is removed`);
  assert.doesNotMatch(readFileSync(join(repoDir, 'assets/js/src/plugins.ts'), 'utf8'), new RegExp(`${T}Slides|${t}-slides`));
  const routing = read('config/pimcore/routing.yaml');
  assert.doesNotMatch(routing, new RegExp(`_${t}:|\\{_portal_engine_prefix\\}${t}`), `no ${t} route`);
  const plugin = read('src/Portal/StudioExampleEnterprisePortalPlugin.php');
  assert.doesNotMatch(plugin, new RegExp(`${T}Page|config\\['${t}'\\]`), `no ${T}Page and no config['${t}']`);
  assert.doesNotMatch(read('assets/portal/tsconfig.json'), new RegExp(`"${t}"`), `the tsconfig includes no ${t} folder`);
});

test('AC4: the coaster demo stays: its routes, the portal plugin\'s pieces, the agent config and the setup steps', () => {
  const routing = read('config/pimcore/routing.yaml');
  for (const route of ['pimcore_studio_example_enterprise_coaster_file', 'pimcore_studio_example_enterprise_agent_chat',
    'pimcore_studio_example_enterprise_agent_proposal_confirm']) assert.match(routing, new RegExp(`^${route}:`, 'm'), `${route} is kept`);
  for (const path of ['assets/portal/js/src/plugin.tsx', 'assets/portal/js/src/agent/AskBriefButton.tsx',
    'assets/portal/js/src/coaster/tile/CoasterTileMedia.tsx', 'assets/portal/js/src/coaster/preview-stage/CoasterPreviewStage.tsx',
    'assets/portal/js/src/icons/RideIcon.tsx', 'assets/portal/js/src/icons/ReviewIcon.tsx', 'src/Agent/Note/ConfirmController.php',
    'src/Command/CoasterDemo/ContentPages.php', 'src/Command/CoasterDemo/StartPage.php', 'src/Command/CoasterDemo/RideBriefs.php',
  ]) assert.ok(existsSync(join(enterpriseDir, path)), `${path} is kept`);
  const plugin = read('src/Portal/StudioExampleEnterprisePortalPlugin.php');
  assert.match(plugin, /\$config\['agent'\] = \$agent;/, 'the "Ask the brief" config stays');
  const demo = read('src/Command/CoasterDemo/CoasterDemo.php');
  for (const name of ["DATA_POOL_NAME = 'Ride designs'", 'startPageStep(', 'contentPages(', 'briefs(']) assert.ok(demo.includes(name), `CoasterDemo keeps ${name}`);
});

// CoasterDemo's private retiredFooter() against a stand-in RetiredFooter: the change lines setup and reset --all print
function retiredFooter (answer) {
  const php = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin {
    interface PortalPluginProviderInterface {}
    interface PortalPluginConfigProviderInterface {}
}
namespace {
    foreach (['Command/CoasterDemo/DemoEnvironment', 'Command/CoasterDemo/RetiredFooter', 'Command/CoasterDemo/BriefHtml',
              'Command/CoasterDemo/CoasterDemo', 'Portal/StudioExampleEnterprisePortalPlugin'] as $file) {
        require_once ${JSON.stringify(src)} . '/' . $file . '.php';
    }
    $env = new class(${JSON.stringify(JSON.stringify(answer))}) implements Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\RetiredFooter {
        public array $calls = [];
        public function __construct(private string $answer) {}
        public function removeDemoFooter(int $portalId): ?array { $this->calls[] = $portalId; return json_decode($this->answer, true); }
    };
    $class = new ReflectionClass(Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo::class);
    $demo = $class->newInstanceWithoutConstructor();
    $changes = $class->getMethod('retiredFooter')->invoke($demo, $env, 100);
    echo json_encode(['changes' => $changes, 'calls' => $env->calls]);
}`;
  return JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', php], { encoding: 'utf8' }));
}

test('AC4: setup and reset --all remove the footer snippet an earlier setup wrote, with one change line, and nothing when there is none', () => {
  assert.deepEqual(retiredFooter(null), { changes: [], calls: [100] }, 'no old footer: no change line');
  assert.deepEqual(retiredFooter({ wrapsPath: null }).changes, ['Removed the demo\'s old portal footer']);
  assert.deepEqual(retiredFooter({ wrapsPath: '/Pimcore Kingdom/snippets/footer' }).changes,
    ['Removed the demo\'s old portal footer, the portal shows /Pimcore Kingdom/snippets/footer again']);
  const demo = read('src/Command/CoasterDemo/CoasterDemo.php');
  assert.equal(demo.match(/\$env instanceof RetiredFooter/g)?.length, 2, 'setup and reset --all both call it');
  assert.doesNotMatch(demo, /setDemoFooter|PortalFooter/, 'setup writes no footer any more');
  const pimcore = read('src/Command/CoasterDemo/PimcoreDemoEnvironment.php');
  assert.match(pimcore, /implements DemoEnvironment, ContentPages, RetiredFooter, StartPage/);
  const remove = pimcore.slice(pimcore.indexOf('function removeDemoFooter('), pimcore.indexOf('\n    }\n', pimcore.indexOf('function removeDemoFooter(')));
  assert.match(remove, /setRawEditable\(PortalConfig::FOOTER_SNIPPET/, 'the portal gets its footer back');
  assert.match(remove, /\$snippet->delete\(\);/, 'the old snippet is deleted');
  assert.doesNotMatch(pimcore, /setDemoFooter|FooterController/, 'no footer is written any more');
});
