// F81: enterprise/bin/build-all.sh builds the Studio build, the portal plugin and the portal-engine frontend once and
// writes their zips and enterprise/dist/manifest.json. The real builds (npm) are replaced by small fake command lines,
// so these tests check the script's own work: staging, the queue, the zips, the manifest, the failures.
// Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(enterpriseDir, 'bin/build-all.sh');
const repoSha = execFileSync('git', ['-C', enterpriseDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

// The fake build commands run in the staged folders; each checks that the kit is where its package.json looks for it.
const STUDIO_OK = `test -d ../../../portal-ui-kit/frontend/portal-ui-kit/dist && mkdir -p ../../build-dist && python3 -c "import zipfile; z=zipfile.ZipFile('../../build-dist/build-abc123.zip','w'); z.writestr('abc123/static/js/main.js','console.log(1)'); z.close()"`;
const PLUGIN_OK = `test -d ../../../portal-ui-kit/frontend/portal-ui-kit/dist && mkdir -p ../../public/portal/static/js && echo 'window.plugin=1' > ../../public/portal/static/js/remoteEntry.js && echo '{}' > ../../public/portal/entrypoints.json`;
// 200 KB of random bytes do not compress: over 150 KB gzip
const PLUGIN_BIG = `mkdir -p ../../public/portal/static/js && head -c 204800 /dev/urandom > ../../public/portal/static/js/remoteEntry.js`;
const ENGINE_OK = `test -d ../../vendor/pimcore/portal-ui-kit/frontend/portal-ui-kit/dist && mkdir -p dist/static/js && echo 'window.host=1' > dist/static/js/remoteEntry.js`;

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'f81-build-all-'));
  // a portal_engine clone with an integration branch
  const pe = join(dir, 'portal_engine');
  mkdirSync(join(pe, 'assets/portal'), { recursive: true });
  writeFileSync(join(pe, 'assets/portal/package.json'), '{"name":"portal","scripts":{"build":"rsbuild build"}}\n');
  const git = (...args) => execFileSync('git', ['-C', pe, ...args], { encoding: 'utf8' });
  git('init', '-q', '-b', 'integration');
  git('add', '.');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-q', '-m', 'portal');
  const peSha = git('rev-parse', 'HEAD').trim();
  // a built kit
  const kit = join(dir, 'PortalUiKit');
  mkdirSync(join(kit, 'frontend/portal-ui-kit/dist'), { recursive: true });
  writeFileSync(join(kit, 'frontend/portal-ui-kit/dist/index.mjs'), 'export {}\n');
  // the queue runner: logs each step, then runs it
  const heavy = join(dir, 'heavy.sh');
  writeFileSync(heavy, `#!/usr/bin/env bash\necho "$PWD" >> "${join(dir, 'heavy.log')}"\n[ "$1" = -c ] && shift\nexec bash -c "$1"\n`);
  chmodSync(heavy, 0o755);
  return { dir, pe, peSha, kit, heavy, out: join(dir, 'dist') };
}

function run(fx, cmds = {}) {
  const env = {
    ...process.env,
    PORTAL_ENGINE_REPO: fx.pe,
    PORTAL_UI_KIT: fx.kit,
    BUILD_ALL_OUT: fx.out,
    BUILD_ALL_WORK: join(fx.dir, 'work'),
    HEAVY: fx.heavy,
    BUILD_ALL_STUDIO_CMD: cmds.studio ?? STUDIO_OK,
    BUILD_ALL_PLUGIN_CMD: cmds.plugin ?? PLUGIN_OK,
    BUILD_ALL_ENGINE_CMD: cmds.engine ?? ENGINE_OK
  };
  return spawnSync('bash', [script], { env, encoding: 'utf8' });
}

test('AC1: one run writes every zip of the manifest, each non-empty, with both repos\' SHAs, each step through the queue', (t) => {
  const fx = fixture();
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  const r = run(fx);
  assert.equal(r.status, 0, r.stderr);

  const manifest = JSON.parse(readFileSync(join(fx.out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.repos.studio_example_bundle, repoSha);
  assert.equal(manifest.repos.portal_engine, fx.peSha);
  assert.deepEqual(manifest.zips.map((z) => z.part), ['studio', 'portal-plugin', 'portal-engine-frontend']);
  for (const z of manifest.zips) {
    const path = join(fx.out, z.zip);
    assert.ok(existsSync(path), `${z.zip} written`);
    assert.ok(statSync(path).size > 0, `${z.zip} non-empty`);
    assert.equal(z.bytes, statSync(path).size);
    assert.ok(z.files > 0 && z.gzipBytes > 0, `${z.zip} has files and a gzip size`);
    assert.match(z.sha, /^[0-9a-f]{40}$/);
  }
  const byPart = Object.fromEntries(manifest.zips.map((z) => [z.part, z]));
  assert.equal(byPart.studio.zip, 'build-abc123.zip');
  assert.equal(byPart.studio.repo, 'studio_example_bundle');
  assert.equal(byPart.studio.sha, repoSha);
  assert.equal(byPart['portal-plugin'].sha, repoSha);
  assert.equal(byPart['portal-engine-frontend'].repo, 'portal_engine');
  assert.equal(byPart['portal-engine-frontend'].sha, fx.peSha);

  const listed = execFileSync('unzip', ['-Z1', join(fx.out, 'portal-plugin.zip')], { encoding: 'utf8' });
  assert.match(listed, /^static\/js\/remoteEntry\.js$/m, 'the plugin build at the zip root');
  const engine = execFileSync('unzip', ['-Z1', join(fx.out, 'portal-engine-frontend.zip')], { encoding: 'utf8' });
  assert.match(engine, /^static\/js\/remoteEntry\.js$/m, 'the portal frontend at the zip root');

  const steps = readFileSync(join(fx.dir, 'heavy.log'), 'utf8').trim().split('\n');
  assert.equal(steps.length, 3, 'three queued steps, one per part');
  assert.match(steps[0], /enterprise\/assets\/studio$/);
  assert.match(steps[1], /enterprise\/assets\/portal$/);
  assert.match(steps[2], /pe\/assets\/portal$/);
  // the portal_engine clone is read only: nothing written into it
  assert.equal(execFileSync('git', ['-C', fx.pe, 'status', '--porcelain'], { encoding: 'utf8' }), '');
});

for (const [part, cmds] of [
  ['studio', { studio: 'echo broken >&2; exit 4' }],
  ['portal-plugin', { plugin: 'exit 2' }],
  ['portal-engine-frontend', { engine: 'exit 3' }],
  ['portal-engine-frontend', { engine: 'true' }]
]) {
  test(`AC2: a failing ${part} build exits non-zero naming it (${Object.values(cmds)[0]})`, (t) => {
    const fx = fixture();
    t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
    const r = run(fx, cmds);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, new RegExp(`FAILED: ${part}:`));
    assert.ok(!existsSync(join(fx.out, 'manifest.json')), 'no manifest after a failure');
  });
}

test('AC2: a missing portal_engine clone exits non-zero naming the part', (t) => {
  const fx = fixture();
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  rmSync(fx.pe, { recursive: true, force: true });
  const r = run(fx);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /FAILED: portal-engine-frontend:/);
});

test('AC3: a plugin entry chunk over 150 KB gzip exits non-zero', (t) => {
  const fx = fixture();
  t.after(() => rmSync(fx.dir, { recursive: true, force: true }));
  const r = run(fx, { plugin: PLUGIN_BIG });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /FAILED: portal-plugin: entry chunk is \d+ bytes gzip, over the 153600 limit/);

  const ok = run(fx);
  assert.equal(ok.status, 0, ok.stderr);
  const plugin = JSON.parse(readFileSync(join(fx.out, 'manifest.json'), 'utf8')).zips.find((z) => z.part === 'portal-plugin');
  assert.ok(plugin.entryChunk.gzipBytes > 0 && plugin.entryChunk.gzipBytes <= 153600, 'a small entry chunk passes');
  assert.equal(plugin.entryChunkLimitGzipBytes, 153600);
});
