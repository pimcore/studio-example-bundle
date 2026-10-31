// F82 (follow-up of F72): guards what F72 fixed. The full suite needs the coaster viewer's own package (three.js)
// installed before the enterprise tests, and F72's spec states it has no user interface.
// AC2..AC4 read the orchestrator's project files under ORCH_ROOT (the test command itself needs ORCH_ROOT); without
// it they are skipped. Run: node --test enterprise/tests/f82-follow-up.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const projectDir = process.env.ORCH_ROOT ? join(process.env.ORCH_ROOT, 'projects/portal-talk') : null;
const noOrch = projectDir ? false : 'ORCH_ROOT is not set';

const testCmd = () => {
  const env = readFileSync(join(projectDir, 'project.env'), 'utf8');
  const line = env.split('\n').find((l) => l.startsWith('TEST_CMD_studio_example_bundle='));
  assert.ok(line, 'project.env sets TEST_CMD_studio_example_bundle');
  return line;
};
const f72Spec = () => readFileSync(join(projectDir, 'features/F72/spec.md'), 'utf8');
const frontMatter = (spec) => spec.split(/^---$/m)[1] ?? '';

test('AC1: the coaster viewer pins three 0.187.0 and it is installed, so the enterprise tests can load it', async () => {
  const pkg = JSON.parse(readFileSync(join(viewerDir, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.three, '0.187.0');
  const threePkg = join(viewerDir, 'node_modules/three/package.json');
  assert.ok(existsSync(threePkg), 'npm ci ran in the viewer folder');
  assert.equal(JSON.parse(readFileSync(threePkg, 'utf8')).version, '0.187.0');
  const { buildCoasterScene } = await import(join(viewerDir, 'scene.mjs'));
  assert.equal(typeof buildCoasterScene, 'function');
});

test('AC2: the full suite command installs the viewer folder before it runs the enterprise tests', { skip: noOrch }, () => {
  const line = testCmd();
  const install = line.indexOf('cd ../enterprise/assets/shared/coaster/viewer');
  const ci = line.indexOf('npm ci', install);
  const run = line.indexOf('node --test');
  assert.ok(install > 0, 'it changes into the viewer folder');
  assert.ok(ci > install, 'it runs npm ci there');
  assert.ok(run > ci, 'the enterprise tests run after that install');
  assert.match(line, /enterprise\/tests\/\*\.test\.mjs/);
});

test("AC3: F72's spec front matter says ui: no", { skip: noOrch }, () => {
  assert.match(frontMatter(f72Spec()), /^ui: no\s*$/m);
});

test('AC4: no crawl is asked for F72', { skip: noOrch }, () => {
  assert.doesNotMatch(frontMatter(f72Spec()), /^crawl:/m);
});
