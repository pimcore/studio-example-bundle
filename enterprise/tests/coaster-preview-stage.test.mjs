// F48: the portal plugin's preview stage for .coaster assets (assets/portal/js/src/coaster/preview-stage/). Run (node 24
// needs the glob): node --test 'enterprise/tests/*.test.mjs'
// The stage's decisions (coaster-stage-model.ts) run in Node; the component, its registration, the file route and the
// README are read. The PHP route's file name check runs with the php CLI (8.1+), Pimcore stubbed as in
// coaster-php.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const stageDir = join(portalSrc, 'coaster/preview-stage');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const read = (path) => readFileSync(path, 'utf8');
const model = await import(join(stageDir, 'coaster-stage-model.ts'));
const { buildCoasterScene } = await import(join(viewerDir, 'scene.mjs'));
const { readCoasterFile } = await import(join(viewerDir, 'orbit.mjs'));

// the registered stage (CoasterPreviewStage.tsx) and its body, loaded on demand (F88, CoasterStageView.tsx)
const stageSource = () => ['CoasterPreviewStage.tsx', 'CoasterStageView.tsx'].map((f) => read(join(stageDir, f))).join('\n');
const pluginSource = () => read(join(portalSrc, 'plugin.tsx'));
const rev3Text = read(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster'));

// The asset as the portal hands it to a stage (PreviewStageAsset of the portal's plugin SDK).
const asset = (filename, extension, type = 'unknown') => ({ id: 7, filename, fullPath: `/Coasters/${filename}`, type, extension, thumbnail: null });

test('AC1: a .coaster asset is taken by the stage, by its extension or its file name, in any case', () => {
  assert.equal(model.isCoasterAsset(asset('thunder-loop-rev3.coaster', 'coaster')), true);
  assert.equal(model.isCoasterAsset(asset('THUNDER.COASTER', 'COASTER')), true);
  assert.equal(model.isCoasterAsset(asset('thunder-loop.coaster', undefined)), true, 'no extension sent: the file name decides');
  assert.equal(model.isCoasterAsset({ filename: 'thunder-loop.coaster', extension: '' }), true);
});

test('AC1: the plugin registers the stage under the portal previewStage name, with accepts', () => {
  const plugin = pluginSource();
  assert.match(plugin, /import \{[^}]*\bpreviewStage\b[^}]*\} from '@pimcore\/portal-plugin-sdk'/);
  assert.match(plugin, /import \{ CoasterPreviewStage \} from '\.\/coaster\/preview-stage\/CoasterPreviewStage'/);
  assert.match(plugin, /componentRegistry\.register\(\{ name: previewStage, component: CoasterPreviewStage \}\)/);
  // the Talk entry left the rail (F157, DR-F157-1)
  assert.doesNotMatch(plugin, /slots\.navEntries/);

  const stage = stageSource();
  assert.match(stage, /export const CoasterPreviewStage: PreviewStageComponent/);
  assert.match(stage, /CoasterPreviewStage\.accepts = isCoasterAsset/);
});

test('AC1: the stage shows the viewer, orbit and ride view, on the asset file text', () => {
  const stage = stageSource();
  assert.match(stage, /from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/shared\/coaster\/viewer\/react\.mjs'/);
  assert.ok(existsSync(resolve(stageDir, '../../../../../shared/coaster/viewer/react.mjs')), 'the import resolves');
  assert.match(stage, /createCoasterViewer\(React\)/);
  assert.match(stage, /createCoasterRide\(React\)/);
  assert.match(stage, /<CoasterViewer file=\{ result\.file \}/);
  assert.match(stage, /<CoasterRide file=\{ result\.file \}/);
  assert.deepEqual(model.STAGE_VIEWS.map((view) => view.key), ['orbit', 'ride']);
  assert.equal(model.DEFAULT_VIEW, 'orbit');
  // the kit's buttons, not own markup (projects/_shared/design/portal-look.md)
  assert.match(stage, /import \{[^}]*\bButton\b[^}]*\} from '@pimcore\/portal-ui-kit\/components'/);
  assert.doesNotMatch(stage, /<button/);

  // the answer of the file route is handed to the viewer as it is, and the viewer draws it
  const result = model.readCoasterResponse(200, rev3Text);
  assert.equal(result.file, rev3Text);
  const design = readCoasterFile(result.file);
  assert.ok(!design.error, 'the viewer reads the file');
  const scene = buildCoasterScene(design.design);
  assert.ok(scene, 'the viewer builds the track');
});

test('AC1: the stage reads the file from the bundle route, scoped by data pool and share', () => {
  assert.equal(model.coasterFileUrl(7, 3), '/studio-example-enterprise/coaster-file/7?dataPoolId=3');
  assert.equal(model.coasterFileUrl(7, 3, 'abc'), '/studio-example-enterprise/coaster-file/7?dataPoolId=3&publicShareHash=abc');
  assert.match(stageSource(), /fetch\(coasterFileUrl\(id, dataPoolId, shareHash\), \{ credentials: 'include' \}\)/);
  assert.deepEqual(model.readCoasterResponse(403, ''), { error: 'You may not view this ride design.' });
  assert.deepEqual(model.readCoasterResponse(404, ''), { error: 'The ride design was not found.' });
  assert.match(model.readCoasterResponse(500, '').error, /HTTP 500/);
  assert.ok('error' in model.readCoasterResponse(200, '  '), 'an empty file is an error, not a blank stage');

  const routing = read(join(enterpriseDir, 'config/pimcore/routing.yaml'));
  const route = routing.match(/^pimcore_studio_example_enterprise_coaster_file:\n((?: {4}.*\n?)+)/m);
  assert.ok(route, 'the route is declared');
  assert.match(route[1], new RegExp(`path: ${model.COASTER_FILE_PATH}/\\{id\\}`));
  assert.match(route[1], /controller: Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Coaster\\CoasterFileController/);
  assert.match(route[1], /condition: "request\.attributes\.get\('isPortalEngineSite'\)"/);
  assert.match(route[1], /methods: \[GET\]/);
  assert.match(read(join(enterpriseDir, 'config/portal.yaml')), /Portal\\Coaster\\CoasterFileController:\n\s+tags: \['controller\.service_arguments', 'container\.service_subscriber'\]/);

  const php = read(join(enterpriseDir, 'src/Portal/Coaster/CoasterFileController.php'));
  assert.match(php, /class CoasterFileController extends FrontendController/);
  assert.match(php, /setCurrentDataPoolConfigById\(\$request->query->getInt\('dataPoolId'\)\)/);
  assert.match(php, /denyAccessUnlessGranted\(Permission::DATA_POOL_ACCESS\)/);
  assert.match(php, /denyAccessUnlessGranted\(Permission::VIEW, \$asset\)/);
  assert.match(php, /isElementInPublicShare\(\$publicShare, \$asset\)/);
});

test('AC1: the file route serves .coaster files only', () => {
  const controller = join(enterpriseDir, 'src/Portal/Coaster/CoasterFileController.php');
  execFileSync('php', ['-l', controller], { encoding: 'utf8' });
  // Stubs of the classes the controller names, then the controller; only the static check is called.
  const script = `
namespace Pimcore\\Controller { abstract class FrontendController {} }
namespace {
  require ${JSON.stringify(controller)};
  use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Coaster\\CoasterFileController as C;
  echo json_encode(array_map(fn ($name) => C::isCoasterFilename($name),
    ['thunder-loop-rev3.coaster', 'RIDE.COASTER', 'photo.jpg', 'coaster.jpg', 'ride.coaster.bak', '', null]));
}`;
  const answers = JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', script], { encoding: 'utf8' }));
  assert.deepEqual(answers, [true, true, false, false, false, false, false]);
});

test('AC2: every other asset is declined, so the portal keeps its default stage', () => {
  for (const other of [
    asset('photo.jpg', 'jpg', 'image'),
    asset('clip.mp4', 'mp4', 'video'),
    asset('manual.pdf', 'pdf', 'document'),
    asset('coaster.jpg', 'jpg', 'image'),
    asset('ride.coaster.bak', 'bak'),
    asset('thunder-loop.coaster', 'json'), // the portal's extension wins over the name
    asset('README', undefined),
    { id: 1 },
  ]) {
    assert.equal(model.isCoasterAsset(other), false, `${other.filename ?? 'no file name'} is declined`);
  }
  assert.equal(model.isCoasterAsset(undefined), false);
  assert.equal(model.isCoasterAsset(null), false);
  // it declines through accepts, not by rendering null (null would be an empty stage)
  assert.doesNotMatch(stageSource(), /return null/);
});

test('AC3: the README explains the extension point and links to the portal doc', () => {
  const readme = read(join(stageDir, 'README.md'));
  for (const heading of ['What it shows', 'How to run', 'Extension point']) {
    assert.match(readme, new RegExp(`^## ${heading}$`, 'm'), `has "## ${heading}"`);
  }
  const point = readme.match(/^## Extension point\n([\s\S]*?)(?=^## )/m)[1];
  assert.match(point, /`previewStage`/);
  assert.match(point, /`accepts\(asset\)`/);
  assert.match(point, /componentRegistry\.register\(\{ name: previewStage, component: CoasterPreviewStage \}\)/);
  assert.match(point, /return `null`/, 'says why a decline is not a null render');
  assert.match(point,
    /\]\(https:\/\/github\.com\/pimcore\/portal-engine\/blob\/2026\.3\/doc\/15_Development_Documentation\/15_Customize_and_Extend_Behavior\/16_Portal_Frontend_Plugins\.md\)/);
  assert.match(point, /Portal_Frontend_Plugin_Surfaces\.md\)/);
  // its relative links resolve
  for (const [, link] of readme.matchAll(/\]\((\.[^)#]+)\)/g)) {
    assert.ok(existsSync(resolve(stageDir, link)), `${link} exists`);
  }
  // and the extension-point index lists it
  const index = read(join(enterpriseDir, 'README.md'));
  assert.match(index, /\| `assets\/portal\/js\/src\/coaster\/preview-stage\/` \| \[README\]\(assets\/portal\/js\/src\/coaster\/preview-stage\/README\.md\) \|/);
});

test('AC4: the plugin build gets the viewer types in strict mode and includes the stage', () => {
  const tsconfig = JSON.parse(read(join(enterpriseDir, 'assets/portal/tsconfig.json')));
  assert.equal(tsconfig.compilerOptions.strict, true);
  assert.ok(tsconfig.include.includes('js/src'), 'the stage folder is type-checked');
  const types = read(join(viewerDir, 'react.d.mts'));
  for (const factory of ['createCoasterViewer', 'createCoasterRide', 'createRidePair']) {
    assert.match(types, new RegExp(`export function ${factory}\\(React: ReactModule\\)`), `declares ${factory}`);
  }
  // every export of react.mjs is declared
  const runtime = read(join(viewerDir, 'react.mjs'));
  for (const [, name] of runtime.matchAll(/^export function (\w+)/gm)) {
    assert.match(types, new RegExp(`export function ${name}\\(`), `${name} has types`);
  }
});
