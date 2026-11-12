// F65 (DR-F65-11): the portal plugin's build leaves no webpack `module.hot` guard in its chunks. The portal UI kit's
// dist keeps studio-ui's `void 0 !== module.hot` as a bare free variable; in the browser's ESM chunks that throws
// `ReferenceError: module is not defined` and the plugin (the coaster tile) never renders.
//
// - the config defines `module.hot` (always runs);
// - the config's define folds a kit-style `module.hot` guard away in a real rsbuild build of a small fixture (always
//   runs, F96: the built-plugin check below skips in CI; it uses the rsbuild that TEST_CMD installs in assets/);
// - the built plugin has no `module.hot` (runs when there is a build: PORTAL_PLUGIN_DIST, else enterprise/public/portal,
//   else enterprise/dist/portal-plugin.zip; skipped with a note when there is none, as the build needs vendor access).
// Run: node --test enterprise/assets/portal/tests/unit/module-hot.test.mjs (enterprise/tests/portal-module-hot.test.mjs
// runs it with the enterprise tests)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const portalDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const enterpriseDir = resolve(portalDir, '../..');

test('the plugin build defines module.hot as undefined', () => {
  const config = readFileSync(join(portalDir, 'rsbuild.config.ts'), 'utf8');
  assert.match(config, /source:\s*\{[\s\S]*?define:\s*\{\s*'module\.hot':\s*'undefined'\s*\}/);
});

// F96: the portal UI kit's dist is ESM (.mjs), where `module` is no free webpack variable: a build that does not define
// `module.hot` leaves the guard in the chunk, which then throws in the browser.
async function buildFixture (define) {
  const repoDir = resolve(enterpriseDir, '..');
  const { createRsbuild } = createRequire(join(repoDir, 'assets/package.json'))('@rsbuild/core');
  const dir = mkdtempSync(join(tmpdir(), 'f96-module-hot-'));
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src/kit.mjs'), "export function kit () { if (void 0 !== module.hot) { module.hot.accept() } return 'kit' }\n");
  writeFileSync(join(dir, 'src/index.js'), "import { kit } from './kit.mjs'\nconsole.log(kit())\n");
  const rsbuild = await createRsbuild({ cwd: dir, rsbuildConfig: {
    source: { entry: { index: './src/index.js' }, define }, tools: { htmlPlugin: false },
    output: { distPath: { root: join(dir, 'dist') }, minify: false }, logLevel: 'error'
  } });
  await rsbuild.build();
  return jsFiles(join(dir, 'dist')).map((path) => readFileSync(path, 'utf8')).join('\n');
}

test('AC10: the config\'s define folds the kit\'s module.hot guard away in a real build, with no built plugin needed', async () => {
  const config = readFileSync(join(portalDir, 'rsbuild.config.ts'), 'utf8');
  const value = config.match(/define:\s*\{[^}]*'module\.hot':\s*'([^']*)'/)?.[1];
  const built = await buildFixture(value === undefined ? {} : { 'module.hot': value });
  assert.ok(built.includes('kit'), 'the fixture was built');
  assert.ok(!built.includes('module.hot'), 'the chunk still has the module.hot guard: rsbuild.config.ts must define it');
  assert.ok((await buildFixture({})).includes('module.hot'), 'without the define the guard stays (the fixture shows the bug)');
});

function builtPlugin () {
  const dirs = [process.env.PORTAL_PLUGIN_DIST, join(enterpriseDir, 'public/portal')].filter(Boolean);
  for (const dir of dirs) if (existsSync(join(dir, 'mf-manifest.json'))) return dir;
  const zip = join(enterpriseDir, 'dist/portal-plugin.zip');
  if (existsSync(zip)) {
    const dir = mkdtempSync(join(tmpdir(), 'f65-plugin-'));
    execFileSync('unzip', ['-q', zip, '-d', dir]);
    if (existsSync(join(dir, 'mf-manifest.json'))) return dir;
  }
  return undefined;
}

function jsFiles (dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsFiles(path);
    return name.endsWith('.js') ? [path] : [];
  });
}

test('the built plugin has no module.hot left in its chunks', (t) => {
  const dir = builtPlugin();
  if (!dir) {
    t.skip('no built plugin here (needs vendor access): set PORTAL_PLUGIN_DIST or run enterprise/bin/build-all.sh');
    return;
  }
  const hits = jsFiles(dir).filter((path) => readFileSync(path, 'utf8').includes('module.hot'));
  assert.deepEqual(hits.map((path) => relative(dir, path)), [], 'chunks still guarded by module.hot');
});
