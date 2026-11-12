// F88: the portal plugin's start-up code fits 150 KB gzip. The portal loads remoteEntry.js and the sync chunks of the
// exposed module ('.') before the plugin starts; three.js, the shared coaster viewer, the ride and the portal UI kit
// must not be among them, but load on demand (React.lazy) when a .coaster asset is opened or a tile is drawn.
//
// Two kinds of check:
// - the source's static import graph from plugin.tsx (always runs, no build needed);
// - the built plugin (runs when there is a build: PORTAL_PLUGIN_DIST, else enterprise/public/portal, else
//   enterprise/dist/portal-plugin.zip of enterprise/bin/build-all.sh; skipped with a note when there is none, as the
//   build needs vendor access).
// Run: node --test enterprise/assets/portal/tests/unit/plugin-size.test.mjs (enterprise/tests/plugin-size.test.mjs
// runs it with the enterprise tests)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const portalDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const enterpriseDir = resolve(portalDir, '../..');
const srcDir = join(portalDir, 'js/src');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const LIMIT = 150 * 1024;
const read = (path) => readFileSync(path, 'utf8');

// --- the source's import graph ---

const EXTENSIONS = ['', '.tsx', '.ts', '.mjs', '.js', '/index.tsx', '/index.ts'];
function resolveFile (from, spec) {
  for (const ext of EXTENSIONS) {
    const path = resolve(dirname(from), spec + ext);
    if (existsSync(path) && statSync(path).isFile()) return path;
  }
  throw new Error(`${relative(enterpriseDir, from)}: cannot resolve ${spec}`);
}

/** The value imports of a module (no `import type`), split into the static ones and the dynamic import()s. */
function importsOf (path) {
  const source = read(path).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const statics = [];
  for (const [, spec] of source.matchAll(/(?:^|\n)\s*(?:import|export)\s+(?!type\s)[^'";]*?\sfrom\s+['"]([^'"]+)['"]/g)) statics.push(spec);
  for (const [, spec] of source.matchAll(/(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g)) statics.push(spec);
  const dynamics = [...source.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)].map(([, spec]) => spec);
  return { statics, dynamics };
}

/** Everything a module pulls in statically: its files (absolute paths) and the packages it names. */
function staticGraph (entry) {
  const files = new Set();
  const packages = new Set();
  const lazy = [];
  const walk = (path) => {
    if (files.has(path) || path.endsWith('.json')) return;
    files.add(path);
    const { statics, dynamics } = importsOf(path);
    for (const spec of statics) {
      if (spec.startsWith('.')) walk(resolveFile(path, spec));
      else packages.add(spec);
    }
    for (const spec of dynamics) lazy.push({ from: path, file: resolveFile(path, spec) });
  };
  walk(entry);
  return { files, packages, lazy };
}

const isThree = (pkg) => pkg === 'three' || pkg.startsWith('three/');
const isKit = (pkg) => pkg.startsWith('@pimcore/portal-ui-kit');
const inViewer = (file) => file.startsWith(viewerDir + '/');

test('AC3: plugin.tsx pulls no three.js, coaster viewer or UI kit into its start-up code (source import graph)', () => {
  const { files, packages } = staticGraph(join(srcDir, 'plugin.tsx'));
  assert.deepEqual([...packages].filter(isThree), [], 'no three.js at start-up');
  assert.deepEqual([...packages].filter(isKit), [], 'no portal UI kit at start-up (its barrel is ~730 KB gzip)');
  assert.deepEqual([...files].filter(inViewer).map((f) => relative(enterpriseDir, f)), [], 'no coaster viewer at start-up');
  assert.ok(files.has(join(srcDir, 'coaster/preview-stage/CoasterPreviewStage.tsx')), 'the stage is registered at start-up');
  assert.ok(files.has(join(srcDir, 'coaster/tile/CoasterTileMedia.tsx')), 'the tile picture is registered at start-up');
});

test('AC1: three.js, the viewer and the ride load only behind the preview stage\'s lazy import', () => {
  const { lazy } = staticGraph(join(srcDir, 'plugin.tsx'));
  const stage = lazy.find((l) => l.file === join(srcDir, 'coaster/preview-stage/CoasterStageView.tsx'));
  assert.ok(stage, 'CoasterPreviewStage.tsx loads CoasterStageView.tsx with import()');
  assert.match(read(stage.from), /lazy\(async \(\) => await import\('\.\/CoasterStageView'\)\)/);
  const behind = staticGraph(stage.file);
  assert.ok([...behind.packages].some(isThree), 'three.js comes with the stage chunk');
  for (const part of ['react.mjs', 'orbit.mjs', 'ride.mjs']) {
    assert.ok(behind.files.has(join(viewerDir, part)), `the viewer's ${part} comes with the stage chunk`);
  }
});

test('AC2: the tile picture\'s lazy chunk never loads three.js or the coaster viewer', () => {
  const { lazy } = staticGraph(join(srcDir, 'plugin.tsx'));
  const tile = lazy.find((l) => l.file === join(srcDir, 'coaster/tile/CoasterTilePicture.tsx'));
  assert.ok(tile, 'CoasterTileMedia.tsx loads CoasterTilePicture.tsx with import()');
  const behind = staticGraph(tile.file);
  assert.deepEqual([...behind.packages].filter(isThree), []);
  assert.deepEqual([...behind.files].filter(inViewer), []);
  assert.deepEqual(behind.lazy, [], 'and loads nothing further');
  // a non-coaster asset never reaches the stage's body: accepts declines it before the portal renders the stage
  assert.match(read(join(srcDir, 'coaster/preview-stage/CoasterPreviewStage.tsx')), /CoasterPreviewStage\.accepts = isCoasterAsset/);
});

// --- the built plugin ---

/** The built plugin's folder, or undefined when there is no build here. */
function builtPlugin () {
  const dirs = [process.env.PORTAL_PLUGIN_DIST, join(enterpriseDir, 'public/portal')].filter(Boolean);
  for (const dir of dirs) if (existsSync(join(dir, 'mf-manifest.json'))) return dir;
  const zip = join(enterpriseDir, 'dist/portal-plugin.zip');
  if (existsSync(zip)) {
    const dir = mkdtempSync(join(tmpdir(), 'f88-plugin-'));
    execFileSync('unzip', ['-q', zip, '-d', dir]);
    if (existsSync(join(dir, 'mf-manifest.json'))) return dir;
  }
  return undefined;
}

/** The start-up chunk as build-all.sh measures it: remoteEntry.js and the sync chunks of the exposed module '.'. */
function startupFiles (dir) {
  const mf = JSON.parse(read(join(dir, 'mf-manifest.json')));
  const exposed = (mf.exposes ?? []).find((e) => e.path === '.' || e.name === '.') ?? (mf.exposes ?? [])[0];
  assert.ok(exposed, 'the manifest lists the exposed module');
  return ['static/js/remoteEntry.js', ...(exposed.assets?.js?.sync ?? [])];
}

// three.js's own names, which survive minification (class names and its version export)
const THREE_CODE = /WebGLRenderer|WebGLRenderTarget|BufferGeometry|"REVISION"|three\.module/;

test('AC3: the built start-up chunk is at most 150 KB gzip and holds no three.js code', (t) => {
  const dir = builtPlugin();
  if (dir === undefined) {
    t.skip('no built plugin here (needs vendor access): set PORTAL_PLUGIN_DIST or run enterprise/bin/build-all.sh');
    return;
  }
  let total = 0;
  for (const file of startupFiles(dir)) {
    const code = readFileSync(join(dir, file));
    total += gzipSync(code, { level: 9 }).length;
    assert.doesNotMatch(code.toString('utf8'), THREE_CODE, `${file} holds three.js code`);
  }
  t.diagnostic(`start-up chunk: ${total} bytes gzip (limit ${LIMIT})`);
  assert.ok(total <= LIMIT, `start-up chunk is ${total} bytes gzip, over ${LIMIT}`);
});
