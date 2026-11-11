// F87 (follow-up of F49): the coaster tile picture, rendered. F49's tests read CoasterTileMedia.tsx as text; these
// load plugin.tsx with a stand-in plugin SDK, take the component it registers under tileRegions.media and render it
// with React (react-dom/server from assets/node_modules, installed by TEST_CMD), like the portal draws a grid row.
// The kit's Icon is a stand-in that records its props: the portal's own Icon is not installable here (vendor access).
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = join(enterpriseDir, '..');
const portalSrc = join(enterpriseDir, 'assets/portal/js/src');
const tileDir = join(portalSrc, 'coaster/tile');
const read = (path) => readFileSync(path, 'utf8');

const assetsRequire = createRequire(join(repoDir, 'assets/package.json'));
const ts = assetsRequire('typescript');
const React = assetsRequire('react');
const { renderToStaticMarkup } = assetsRequire('react-dom/server');
const model = await import(join(tileDir, 'coaster-tile-model.ts'));

// The stand-ins: the kit's Icon, and the SDK names plugin.tsx registers under.
const Icon = (props) => React.createElement('i', { 'data-kit-icon': props.value, 'data-width': props.options?.width });
const sdkNames = { tileRegions: { media: 'tileRegions.media', meta: 'tileRegions.meta' }, previewStage: 'previewStage', slots: { navEntries: 'navEntries', headerActions: 'headerActions' } };

/** A .tsx file transpiled to CommonJS and run with the given modules for its imports. */
function loadTsx (path, modules) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  });
  const require = (name) => {
    if (name in modules) return modules[name];
    if (name === 'react' || name.startsWith('react/')) return assetsRequire(name);
    throw new Error(`${path}: no module ${name} for the render test`);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(require, module, module.exports);
  return module.exports;
}

const thumbnailModule = () => loadTsx(join(tileDir, 'TileThumbnail.tsx'), {});
// F103: the coaster tile's "Ride design" label, the kit's Tag (a stand-in) with the plugin's own Ride icon
const Tag = ({ icon, children }) => React.createElement('span', { 'data-kit': 'Tag' }, icon, children);
const iconDir = join(portalSrc, 'icons');
const rideIconModule = () => loadTsx(join(iconDir, 'RideIcon.tsx'), { './CoasterIcon': loadTsx(join(iconDir, 'CoasterIcon.tsx'), {}) });
// F88: the picture's body is its own module, loaded on demand by the registered CoasterTileMedia.tsx
const tileModule = () => loadTsx(join(tileDir, 'CoasterTilePicture.tsx'), {
  '@pimcore/portal-plugin-sdk': sdkNames,
  '@pimcore/portal-ui-kit/components': { Icon, Tag },
  '../../icons/RideIcon': rideIconModule(),
  './coaster-tile-model': model,
  './TileThumbnail': thumbnailModule()
});
const mediaModule = () => loadTsx(join(tileDir, 'CoasterTileMedia.tsx'), {
  '@pimcore/portal-plugin-sdk': sdkNames,
  './coaster-tile-model': model,
  './TileThumbnail': thumbnailModule(),
  './CoasterTilePicture': tileModule()
});

/** What plugin.tsx registers, run through the SDK's startup and module init as the portal does. */
function registrations () {
  const registered = [];
  const sdk = {
    ...sdkNames,
    componentRegistry: {
      register: (entry) => registered.push({ kind: 'register', ...entry }),
      registerToSlot: (slot, entry) => registered.push({ kind: 'slot', slot, ...entry })
    },
    pluginSystem: { definePlugin: (plugin) => plugin }
  };
  const { studioExampleEnterprisePlugin } = loadTsx(join(portalSrc, 'plugin.tsx'), {
    '@pimcore/portal-plugin-sdk': sdk,
    // F128: the header's "Ask the brief" button (agent/README.md)
    './agent/AskBriefButton': { AskBriefButton: () => null },
    './coaster/preview-stage/CoasterPreviewStage': { CoasterPreviewStage: () => null },
    './coaster/tile/CoasterTileMedia': mediaModule()
  });
  studioExampleEnterprisePlugin.onStartup({ moduleSystem: { registerModule: (module) => module.onInit() } });
  return registered;
}

const registeredComponent = () => registrations().find((entry) => entry.name === sdkNames.tileRegions.media)?.component;
const tile = (name, fileExtension, thumbnail = null) => ({ id: 7, name, thumbnail, fileExtension });
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
/** The registered component once its lazy chunk is there, as the portal draws it after the first tile loaded it. */
async function loadedTileMedia () {
  const TileMedia = registeredComponent();
  render(TileMedia, tile('manual.pdf', 'pdf')); // the first draw starts the import()
  await new Promise((done) => setImmediate(done));
  return TileMedia;
}
const registeredTileMedia = await loadedTileMedia();
const SIZE = { width: 240, height: 150 };
const rev1 = model.outlineFromFile(read(join(enterpriseDir, 'demo-data/thunder-loop-rev1.coaster')), SIZE);
const rev3 = model.outlineFromFile(read(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster')), SIZE);

test('AC1: the track outline renders as an SVG path in the portal brand colour', () => {
  const { TrackOutlinePicture } = tileModule();
  assert.equal(typeof TrackOutlinePicture, 'function', 'the outline picture is its own component');
  const html = render(TrackOutlinePicture, { name: 'thunder-loop-rev1.coaster', outline: rev1 });
  assert.match(html, /^<svg[^>]*role="img"/);
  assert.match(html, /aria-label="thunder-loop-rev1.coaster: track outline"/);
  assert.ok(html.includes(`viewBox="${rev1.viewBox}"`));
  assert.ok(html.includes(`d="${rev1.path}"`));
  assert.match(html, /stroke="var\(--p-primary\)"/);
  assert.notEqual(rev1.path, rev3.path, 'two revisions draw two outlines');
});

test('AC2: rendered, every other tile keeps the kit default picture', () => {
  const TileMedia = registeredTileMedia;
  const photo = render(TileMedia, tile('photo.jpg', 'jpg', '/thumb/photo.jpg'));
  assert.match(photo, /class="p-tile-img"/);
  assert.match(photo, /background-image:url\(&#x27;\/thumb\/photo.jpg&#x27;\)/);
  assert.doesNotMatch(photo, /<svg/);
  for (const other of [tile('manual.pdf', 'pdf'), tile('clip.mp4', 'mp4'), tile('Car', undefined)]) {
    const html = render(TileMedia, other);
    assert.match(html, /class="p-tile-fallback">No preview</, `${other.name}: the fallback`);
    assert.doesNotMatch(html, /<svg/, `${other.name}: no outline`);
  }
});

test('AC3: the tile README is still in the enterprise index', () => {
  assert.ok(existsSync(join(tileDir, 'README.md')));
  assert.match(read(join(enterpriseDir, 'README.md')), /assets\/portal\/js\/src\/coaster\/tile\/README\.md/);
});

test('AC4: the README how-to-run steps name the plugin build, the enable step and the demo setup', () => {
  const readme = read(join(tileDir, 'README.md'));
  const howTo = readme.slice(readme.indexOf('## How to run'));
  assert.match(howTo, /build the portal\s+plugin/);
  assert.match(howTo, /enable "Studio Example Enterprise"/);
  assert.match(howTo, /bin\/console coaster-demo:setup/);
});

test('AC5: the demo setup command the README names exists', () => {
  assert.match(read(join(enterpriseDir, 'src/Command/CoasterDemoSetupCommand.php')), /coaster-demo:setup/);
});

test('AC6: F49 tests still name each of its criteria', () => {
  const names = [...read(join(enterpriseDir, 'tests/coaster-tile.test.mjs')).matchAll(/^test\('(AC\d+):/gm)].map(([, ac]) => ac);
  for (const ac of ['AC1', 'AC2', 'AC3']) assert.ok(names.includes(ac), `${ac} has a test`);
});

test('AC7: the extension-point index count stays exact and matches the index', () => {
  const f86 = read(join(enterpriseDir, 'tests/f86-readme-followup.test.mjs'));
  assert.match(f86, /assert\.equal\(all\.length, 12\)/, 'still an exact count');
});

test('AC8: a grid row renders in order, then the next tiles: each keeps its own picture', () => {
  const TileMedia = registeredTileMedia;
  const row = [tile('thunder-loop-rev1.coaster', 'coaster'), tile('photo.jpg', 'jpg', '/thumb/photo.jpg'), tile('manual.pdf', 'pdf')];
  const html = row.map((props) => render(TileMedia, props));
  // server side the coaster file is not fetched yet: it shows the default until its outline is there
  assert.match(html[0], /No preview/);
  assert.match(html[1], /p-tile-img/);
  assert.match(html[2], /No preview/);
});

test('AC9: the type declarations outside owns declare what the tile model imports', () => {
  assert.match(read(join(enterpriseDir, 'assets/shared/coaster/geometry/track.d.mts')), /export (declare )?function buildTrack/);
  assert.match(read(join(enterpriseDir, 'assets/shared/coaster/schema/validate.d.mts')), /export (declare )?function validateCoaster/);
});

test('AC10: the default picture is its own exported component, rendered for a coaster tile while it loads', () => {
  const { DefaultTileMedia, CoasterTilePicture } = tileModule();
  assert.equal(typeof DefaultTileMedia, 'function');
  const coaster = tile('thunder-loop-rev1.coaster', 'coaster');
  assert.equal(render(CoasterTilePicture, coaster), render(DefaultTileMedia, coaster));
  assert.equal(render(registeredTileMedia, coaster), render(DefaultTileMedia, coaster), 'the registered component draws the same');
});

test('AC11: the fallback icon is the kit Icon, not a text glyph', () => {
  const html = render(registeredTileMedia, tile('manual.pdf', 'pdf'));
  assert.match(html, /<i data-kit-icon="asset" data-width="26"><\/i>/);
  const text = html.replace(/<[^>]+>/g, '');
  assert.equal(text, 'No preview', 'no glyph character besides the label');
});

test('AC12: plugin.tsx run through startup registers the tile media component under tileRegions.media, once', () => {
  const registered = registrations();
  const media = registered.filter((entry) => entry.name === sdkNames.tileRegions.media);
  assert.equal(media.length, 1);
  assert.equal(media[0].kind, 'register');
  assert.equal(media[0].component.name, 'CoasterTileMedia');
  assert.ok(registered.some((entry) => entry.name === sdkNames.previewStage), 'the preview stage stays registered');
  assert.ok(readdirSync(tileDir).includes('CoasterTileMedia.tsx'));
});

test('F88 AC2: before the picture chunk is there, a photo tile draws its thumbnail at once and the others wait empty', () => {
  const TileMedia = registeredComponent(); // fresh modules: the lazy chunk is not loaded yet
  const photo = render(TileMedia, tile('photo.jpg', 'jpg', '/thumb/photo.jpg'));
  assert.match(photo, /class="p-tile-img"/);
  assert.match(photo, /background-image:url\(&#x27;\/thumb\/photo.jpg&#x27;\)/);
  assert.equal(render(TileMedia, tile('manual.pdf', 'pdf')), '<span aria-busy="true"></span>');
  assert.equal(render(TileMedia, tile('thunder-loop-rev1.coaster', 'coaster')), '<span aria-busy="true"></span>');
});
