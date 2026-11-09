// F307: the PR cleanup. The change approval bundle's demo (with the Studio Review tab and the then-empty enterprise Studio build), the
// live agent tools and preset, and four unused icons leave the bundle; the replay, the Confirm card and the demo stay.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = join(enterpriseDir, '..');
const CC = ['Change', 'Control'].join('');
const ccKebab = ['change', 'control'].join('-');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');

test('AC1: git grep finds no hit of the change approval bundle\'s names in the repository', () => {
  // built from parts, so this file is no hit itself
  const pattern = [['change', 'control'].join('.'), ['Change', 'Set'].join(''), ['change', 'set'].join('-')].join('\\|');
  const r = spawnSync('git', ['-C', repoDir, 'grep', '-n', '-i', pattern], { encoding: 'utf8' });
  assert.equal(r.status, 1, `git grep hits:\n${r.stdout}${r.stderr}`);
});

test('AC4: the removed code is gone: the change approval demo, the Studio build, the pair viewer, the MCP tools and preset, four icons', () => {
  for (const path of [
    `src/${CC}`, `config/${ccKebab}.yaml`, 'assets/studio', 'config/studio.yaml', 'src/Webpack',
    'assets/shared/coaster/diff', 'assets/shared/coaster/viewer/pair.mjs', 'assets/shared/coaster/viewer/pair.html',
    'src/Command/CoasterDemo/CoasterDemoResetEvent.php', 'src/Agent/Tools', 'config/pimcore/agents/kingdom-brief-check.yaml',
    ...['ApproveIcon', 'RejectIcon', 'SafetyLimitIcon', 'UploadIcon'].map((n) => `assets/portal/js/src/icons/${n}.tsx`),
  ]) assert.ok(!existsSync(join(enterpriseDir, path)), `${path} is removed`);
  assert.doesNotMatch(read('assets/shared/coaster/viewer/react.mjs'), /createRidePair|pair\.mjs/);
  assert.doesNotMatch(read('assets/shared/coaster/viewer/index.mjs'), /pair\.mjs/);
  assert.doesNotMatch(read('bin/build-all.sh'), /assets\/studio|STUDIO_CMD/);
  const extension = read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php');
  assert.doesNotMatch(extension, /AGENT_|prepend|Agent\\Tools/);
  assert.doesNotMatch(read('src/Command/CoasterDemoResetCommand.php'), /CoasterDemoResetEvent|dispatch\(/);
  const composer = JSON.parse(read('composer.json'));
  assert.equal(composer.require[`pimcore/${ccKebab}-bundle`], undefined);
  assert.equal(composer.suggest, undefined, 'no agent-bundle suggest');
});

test('AC4: the kept code stays: the agent services, the replay, the Confirm card, the night-fury fixture and three icons', () => {
  for (const path of [
    'src/Agent/KingdomBriefTools.php', 'src/Agent/KingdomSource.php', 'src/Agent/PimcoreKingdomSource.php',
    'src/Agent/PortalUserContext.php', 'src/Agent/ProposalStore.php', 'src/Agent/Note/ProposalConfirmer.php',
    'src/Agent/Note/ConfirmController.php', 'src/Portal/Agent/ReplayPlayer.php',
    'demo-data/agent/kingdom-brief-check.replay.json', 'demo-data/agent-fixtures/night-fury.coaster',
    'assets/shared/coaster/viewer/ride.mjs', 'assets/shared/coaster/viewer/orbit.mjs',
    ...['ReviewIcon', 'RideIcon', 'TalkIcon'].map((n) => `assets/portal/js/src/icons/${n}.tsx`),
  ]) assert.ok(existsSync(join(enterpriseDir, path)), `${path} is kept`);
  assert.match(read('assets/shared/coaster/viewer/react.mjs'), /export function createCoasterViewer[\s\S]*export function createCoasterRide/);
  assert.match(read('src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php'), /\$loader->import\(\$configDir \. '\/\*\.yaml'\)/);
  assert.match(read('bin/build-all.sh'), /step portal-plugin [\s\S]*step portal-engine-frontend/);
});
