// F319: the scream score example's README and its rows in the example tables; since F327 the share story (the guest
// rates on the coaster's public share). Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');
const section = (text, heading) => text.match(new RegExp(`^## ${heading}\\n([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'))?.[1];

// The plain demo codes and the staff login, as setup creates them (src/Command/CoasterDemo/ScreamScoreDemo.php).
const demo = read('src/Command/CoasterDemo/ScreamScoreDemo.php');
const passCodes = [...demo.matchAll(/'(PK-\d{4}-\d{4})' => '([^']+)'/g)].map(([, pass, code]) => [pass, code]);
const constant = (name) => demo.match(new RegExp(`const ${name} = '([^']+)'`))?.[1];

test('AC1: the scream score README explains what it shows, how to run it, how it works and reset', () => {
  const readme = read('src/ScreamScore/README.md');
  for (const heading of ['What it shows', 'How to run', 'How it works', 'Reset', 'Extension point']) {
    assert.ok(section(readme, heading), `src/ScreamScore/README.md has "## ${heading}"`);
  }
  const shows = section(readme, 'What it shows');
  assert.match(shows, /one public share per coaster/);
  for (const part of ['preview', '3D ride', 'key figures', 'panel']) assert.ok(shows.includes(part), `the guest's share page shows the ${part}`);
  assert.match(shows, /\/_scream-scores\b/, 'names the park\'s page');

  const run = section(readme, 'How to run');
  assert.match(run, /coaster-demo:setup/);
  assert.match(run, /http:\/\/portal\.localhost\/[^\s`]*\/public-share-a~/, 'gives the guest link: the share\'s coaster page');
  assert.equal(passCodes.length, 5, 'ScreamScoreDemo has the five demo passes');
  for (const [pass, code] of passCodes) assert.match(run, new RegExp(`\`${pass}\` \\| \`${code}\``), `lists ${pass} with its code`);
  assert.ok(run.includes(constant('STAFF_EMAIL')) && run.includes(constant('STAFF_PASSWORD')), 'gives the staff demo login');
  assert.match(run, /demo defaults/);
  assert.match(run, /coaster-demo:reset --all/, 'says a real install runs reset --all');

  const how = section(readme, 'How it works');
  for (const name of ['AnnualPasses', 'FeedbackStore', 'custom_public_routes', 'ticket system', 'prepend()', 'Park staff', 'GuestShares', 'PublicSharePluginProviderInterface']) {
    assert.ok(how.includes(name), `How it works names ${name}`);
  }
  assert.match(how, /### Nothing that needs an account/);
  assert.match(how, /no expiry[\s\S]*no download[\s\S]*end of the season/, 'the shares setup makes and how a real park sets an expiry');
  assert.match(how, /`\/_scream-score\/<ride>`[\s\S]*302/, 'the old link redirects to the share');
  assert.match(how, /5 failed tries[\s\S]*15 minutes[\s\S]*real park would rate-limit differently/, 'the lockout and its limits');

  const reset = section(readme, 'Reset');
  assert.match(reset, /coaster-demo:reset`/);
  assert.match(reset, /clears the lockouts/);
  assert.match(reset, /new public shares/, 'reset makes new shares');
  assert.match(reset, /--all`[\s\S]*the shares/, 'reset --all removes the shares');
});

test("AC1: enterprise/README.md's extension-point table has the scream score's row", () => {
  const rows = section(read('README.md'), 'Extension points').split('\n').filter((line) => line.startsWith('|'));
  const row = rows.find((line) => line.includes('`src/ScreamScore/`'));
  assert.ok(row, 'a row names the folder src/ScreamScore/');
  assert.ok(row.includes('[README](src/ScreamScore/README.md)'), 'it links the README');
  assert.match(row, /custom_public_routes/);
  assert.match(row, /public share/);
});

test('AC1: the setup command README and the demo-data README name the scream score', () => {
  const command = read('src/Command/README.md');
  const line = command.split('\n').find((l) => l.startsWith('| The scream score'));
  assert.ok(line, 'src/Command/README.md has the scream score row in "What setup creates"');
  for (const part of ['GuestFeedback', 'annual-passes.json', 'scream-score-samples.json', 'Park staff', 'guest link', 'public share', 'no expiry']) {
    assert.ok(line.includes(part), `its row names ${part}`);
  }
  const data = read('demo-data/README.md');
  assert.match(data, /^\| `annual-passes\.json` \|/m);
  assert.match(data, /^\| `scream-score-samples\.json` \|/m);
  assert.match(data, /public share/, 'the demo-data README says where the guests rate');
});
