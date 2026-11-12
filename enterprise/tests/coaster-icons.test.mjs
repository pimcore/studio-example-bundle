// F103: the portal plugin's own icons (assets/portal/js/src/icons/): a small set of inline SVG React components, made
// for this example (no third-party art), used by the coaster tile and the preview stage. Each icon is rendered with React (react-dom/server from assets/node_modules, installed by TEST_CMD)
// and its markup checked; the tile and the stage are rendered with stand-ins for the portal's SDK and
// kit (not installable here: vendor access), as in f87-coaster-tile-followup.test.mjs.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = join(enterpriseDir, '..');
const portalDir = join(enterpriseDir, 'assets/portal');
const portalSrc = join(portalDir, 'js/src');
const iconDir = join(portalSrc, 'icons');
const tileDir = join(portalSrc, 'coaster/tile');
const stageDir = join(portalSrc, 'coaster/preview-stage');
const read = (path) => readFileSync(path, 'utf8');

const assetsRequire = createRequire(join(repoDir, 'assets/package.json'));
const ts = assetsRequire('typescript');
const React = assetsRequire('react');
const { renderToStaticMarkup } = assetsRequire('react-dom/server');
const render = (component, props = {}) => renderToStaticMarkup(React.createElement(component, props));

/** A .tsx file transpiled to CommonJS and run; relative imports of the icon folder load the real icon modules. */
function loadTsx (path, modules = {}) {
  const { outputText } = ts.transpileModule(read(path), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  });
  const require = (name) => {
    if (name in modules) return modules[name];
    if (name === 'react' || name.startsWith('react/')) return assetsRequire(name);
    if (name.startsWith('.')) {
      const target = resolve(dirname(path), name + '.tsx');
      if (target.startsWith(iconDir + '/') && existsSync(target)) return loadTsx(target);
    }
    throw new Error(`${relative(enterpriseDir, path)}: no module ${name} for the icon test`);
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', outputText)(require, module, module.exports);
  return module.exports;
}

// The icons: every file of the folder but the shared frame, one exported component each.
const iconFiles = readdirSync(iconDir).filter((f) => f.endsWith('.tsx') && f !== 'CoasterIcon.tsx').sort();
const icons = iconFiles.map((file) => {
  const exports = loadTsx(join(iconDir, file));
  const name = file.replace(/\.tsx$/, '');
  return { file, name, component: exports[name] };
});

/** What may never be in an icon's markup: a script, an event handler attribute, a link out. */
function assertSafeMarkup (html, where) {
  assert.doesNotMatch(html, /<script/i, `${where}: no <script>`);
  assert.doesNotMatch(html, /\son[a-z]+\s*=/i, `${where}: no on*= attribute`);
  assert.doesNotMatch(html, /\s(?:xlink:)?href\s*=\s*"(?!#)/i, `${where}: no external href`);
  assert.doesNotMatch(html, /url\((?!#)/i, `${where}: no external url()`);
  assert.doesNotMatch(html, /<(?:foreignObject|image|use|a)\b/i, `${where}: plain drawing elements only`);
}

/** The icons inside a piece of markup. */
const svgsIn = (html) => html.match(/<svg[\s\S]*?<\/svg>/g) ?? [];

// --- the stand-ins for the portal's SDK and kit ---

// antd's Button and Tag as the kit hands them over: the icon first, then the text, inside one element
const Button = ({ icon, children, type, ...rest }) => React.createElement('span', { 'data-kit': 'Button', 'data-type': type, 'aria-pressed': rest['aria-pressed'] }, icon, React.createElement('span', null, children));
const Tag = ({ icon, children }) => React.createElement('span', { 'data-kit': 'Tag' }, icon, React.createElement('span', null, children));
const Icon = (props) => React.createElement('i', { 'data-kit-icon': props.value });
const Content = () => React.createElement('span', { 'data-kit': 'Content' });
const Alert = ({ message }) => React.createElement('span', { 'data-kit': 'Alert' }, message);
const kit = { Alert, Button, Content, Icon, Tag };

const tileModel = await import(join(tileDir, 'coaster-tile-model.ts'));
const stageModel = await import(join(stageDir, 'coaster-stage-model.ts'));

// --- AC1 ---

test('AC1: the start-up code takes no icon but the shared frame; the tile and stage icons load with their lazy chunks', () => {
  // the static import graph from plugin.tsx, as plugin-size.test.mjs walks it
  const seen = new Set();
  const walk = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const [, spec] of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^'";]*?\sfrom\s+['"](\.[^'"]+)['"]/g)) {
      for (const ext of ['.tsx', '.ts', '.mjs', '']) {
        const file = resolve(dirname(path), spec + ext);
        if (existsSync(file) && !file.endsWith('/')) { if (/\.(tsx?|mjs)$/.test(file)) walk(file); break; }
      }
    }
  };
  walk(join(portalSrc, 'plugin.tsx'));
  const startupIcons = [...seen].filter((f) => f.startsWith(iconDir + '/')).map((f) => relative(iconDir, f)).sort();
  assert.deepEqual(startupIcons, ['CoasterIcon.tsx'], 'no other icon in the start-up chunk ');
  // the icon folder is in the plugin's type check (tsconfig include)
  const tsconfig = JSON.parse(read(join(portalDir, 'tsconfig.json')));
  assert.ok((tsconfig.include ?? []).some((p) => p.startsWith('js/src')), 'js/src (with icons/) is type-checked');
});

test('AC1: the built start-up chunk is at most 44 KB gzip', (t) => {
  const dirs = [process.env.PORTAL_PLUGIN_DIST, join(enterpriseDir, 'public/portal')].filter(Boolean);
  const dir = dirs.find((d) => existsSync(join(d, 'mf-manifest.json')));
  if (dir === undefined) {
    t.skip('no built plugin here (needs vendor access): set PORTAL_PLUGIN_DIST or run enterprise/bin/build-all.sh');
    return;
  }
  const mf = JSON.parse(read(join(dir, 'mf-manifest.json')));
  const exposed = (mf.exposes ?? []).find((e) => e.path === '.' || e.name === '.') ?? (mf.exposes ?? [])[0];
  let total = 0;
  for (const file of ['static/js/remoteEntry.js', ...(exposed.assets?.js?.sync ?? [])]) total += gzipSync(readFileSync(join(dir, file)), { level: 9 }).length;
  t.diagnostic(`start-up chunk: ${total} bytes gzip (limit ${44 * 1024})`);
  assert.ok(total <= 44 * 1024, `start-up chunk is ${total} bytes gzip, over 44 KB`);
});

// --- AC2 ---

test('AC2: the set has its own icons, each one exported component', () => {
  assert.deepEqual(icons.map((i) => i.name), ['ReviewIcon', 'RideIcon']);
  for (const icon of icons) assert.equal(typeof icon.component, 'function', `${icon.file} exports ${icon.name}`);
});

test('AC2: no icon holds a script, an on*= attribute or an external href, in its source or its markup', () => {
  for (const file of readdirSync(iconDir).filter((f) => f.endsWith('.tsx'))) {
    const source = read(join(iconDir, file));
    assert.doesNotMatch(source, /<script|dangerouslySetInnerHTML/i, `${file}: no script`);
    assert.doesNotMatch(source, /\son[A-Z]\w*\s*=|\son[a-z]+\s*=/, `${file}: no event attribute`);
    assert.doesNotMatch(source, /href|https?:\/\/|url\(/i, `${file}: no link`);
  }
  for (const { name, component } of icons) {
    for (const props of [{}, { label: name }]) {
      const html = render(component, props);
      assert.match(html, /^<svg[^>]* viewBox="0 0 24 24"/, `${name}: an inline SVG`);
      assertSafeMarkup(html, name);
    }
  }
});

test('AC2: an icon without a label is decorative (aria-hidden="true"); with one it is an image with that aria-label', () => {
  for (const { name, component } of icons) {
    const decorative = render(component);
    assert.match(decorative, /^<svg[^>]* aria-hidden="true"/, `${name}: decorative`);
    assert.doesNotMatch(decorative, /aria-label|role=/, `${name}: no name of its own`);
    const named = render(component, { label: `${name} label` });
    assert.match(named, /^<svg[^>]* role="img"/, `${name}: an image`);
    assert.match(named, new RegExp(`aria-label="${name} label"`), `${name}: its label`);
    assert.doesNotMatch(named, /aria-hidden/, `${name}: not hidden`);
  }
});

// --- AC3: the two places, rendered ---

const tilePicture = () => loadTsx(join(tileDir, 'CoasterTilePicture.tsx'), {
  '@pimcore/portal-ui-kit/components': kit,
  './coaster-tile-model': tileModel,
  './TileThumbnail': loadTsx(join(tileDir, 'TileThumbnail.tsx'))
});

const stageView = () => loadTsx(join(stageDir, 'CoasterStageView.tsx'), {
  '@pimcore/portal-ui-kit/components': kit,
  '../../../../../shared/coaster/viewer/react.mjs': { createCoasterViewer: () => () => null, createCoasterRide: () => () => null },
  './coaster-stage-model': stageModel
}).CoasterStageView;

/** Each icon of a piece of markup with the visible text right after it, or its own aria-label. */
function assertEveryIconReadable (html, where) {
  const svgs = svgsIn(html);
  assert.ok(svgs.length > 0, `${where}: shows an icon`);
  for (const svg of svgs) {
    assertSafeMarkup(svg, where);
    if (/aria-label="[^"]+"/.test(svg) && !/aria-hidden/.test(svg)) continue;
    assert.match(svg, /aria-hidden="true"/, `${where}: a decorative icon is aria-hidden`);
    const after = html.slice(html.indexOf(svg) + svg.length).replace(/<[^>]+>/g, '').trimStart();
    assert.match(after, /^\w/, `${where}: visible text next to the icon`);
  }
}

test('AC3: a coaster tile shows its track outline with the Ride icon and the label "Ride design"', () => {
  const { RideDesignPicture } = tilePicture();
  assert.equal(typeof RideDesignPicture, 'function', 'the outline with its label is its own component');
  const outline = tileModel.outlineFromFile(read(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster')), { width: 240, height: 150 });
  const html = render(RideDesignPicture, { name: 'thunder-loop-rev3.coaster', outline });
  assert.match(html, /data-testid="coaster-tile-outline"/, 'the outline stays');
  const ride = render(icons.find((i) => i.name === 'RideIcon').component, { size: 14 });
  assert.ok(html.includes(`<span data-kit="Tag">${ride}<span>Ride design</span></span>`), 'the kit Tag with the Ride icon and its text');
  assertEveryIconReadable(html.replace(/<svg[^>]*data-testid="coaster-tile-outline"[\s\S]*?<\/svg>/, ''), 'tile');
});

test('AC3: the preview stage\'s Orbit and Ride buttons show the Review and Ride icons next to their text', () => {
  const html = render(stageView(), { data: { id: 7 }, dataPoolId: 1, height: 480 });
  const review = render(icons.find((i) => i.name === 'ReviewIcon').component);
  const ride = render(icons.find((i) => i.name === 'RideIcon').component);
  assert.ok(html.includes(`${review}<span>Orbit</span>`), 'Orbit: the Review icon, then its text');
  assert.ok(html.includes(`${ride}<span>Ride</span>`), 'Ride: the Ride icon, then its text');
  assertEveryIconReadable(html, 'stage');
});
