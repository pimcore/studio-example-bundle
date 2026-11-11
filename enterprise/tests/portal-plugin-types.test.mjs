// F325: the portal plugin's TypeScript (enterprise/assets/portal) passes `npm run check-types`. The folder has no
// installed packages in the clone and its packages are not all on npm (the kit is a file: path), so the check runs in
// the staged plugin folder enterprise/bin/build-all.sh prepares: `build-all.sh --types` stages this repo's HEAD,
// installs (through $ORCH_ROOT/bin/deps.sh, node_modules kept in BUILD_ALL_WORK) and type-checks there.
// In the orchestrator's gate (ORCH_ROOT set) a check that cannot run fails; only outside it (no ORCH_ROOT and no
// PORTAL_UI_KIT) it skips, with a message.
// Run: node --test enterprise/tests/portal-plugin-types.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(enterpriseDir, 'bin/build-all.sh');
const inGate = Boolean(process.env.ORCH_ROOT);
const skip = !inGate && !process.env.PORTAL_UI_KIT
  ? 'not in the orchestrator (no ORCH_ROOT) and no PORTAL_UI_KIT: the portal plugin cannot be type-checked here'
  : false;

test('AC4: the portal plugin passes check-types in the staged plugin folder (fails, not skips, in the gate)', { skip, timeout: 600000 }, () => {
  const run = spawnSync('bash', [script, '--types'], { encoding: 'utf8', env: process.env, timeout: 590000 });
  const out = `${run.stdout}\n${run.stderr}`;
  assert.equal(run.status, 0, `build-all.sh --types exited ${run.status}:\n${out.slice(-4000)}`);
  assert.match(out, /build-all: portal-plugin-types: check-types passed/);
});

test('AC4: build-all.sh has a types-only mode that stages the plugin and runs its check-types', () => {
  const source = readFileSync(script, 'utf8');
  assert.match(source, /--types/);
  assert.match(source, /npm run check-types/);
  assert.match(source, /deps\.sh/);
  const pkg = JSON.parse(readFileSync(join(enterpriseDir, 'assets/portal/package.json'), 'utf8'));
  assert.equal(pkg.scripts['check-types'], 'tsc --noEmit --pretty false');
});
