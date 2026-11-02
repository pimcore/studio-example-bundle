// F86: follow-up of F74's review. The extension-point index and the folder READMEs hold what F74's verifier
// checked: nine rows, every link to an existing README, three exact headings each. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(enterpriseDir, path), 'utf8');

const rows = () => {
  const section = read('README.md').match(/^## Extension points\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  assert.ok(section, 'enterprise/README.md has "## Extension points"');
  return section[1].split('\n').filter((l) => l.startsWith('|')).slice(2).map((line) => {
    const [point, folder, readme, docs] = line.split('|').slice(1, -1).map((c) => c.trim());
    return { point, folder: folder.match(/`([^`]+)`/)?.[1]?.replace(/\/$/, ''), readme: readme.match(/\]\(([^)]+)\)/)?.[1], docs };
  });
};

test('AC1: the two READMEs that were missing exist and the index links them', () => {
  const links = rows().map((r) => r.readme);
  for (const path of ['src/Coaster/README.md', 'assets/studio/js/src/coaster-review/side-by-side/README.md']) {
    assert.ok(existsSync(join(enterpriseDir, path)), `${path} exists`);
    assert.ok(links.includes(path), `the index links ${path}`);
  }
});

test('AC2: the index has thirteen rows, eleven extension points and two None rows, each with a docs cell', () => {
  const all = rows();
  assert.equal(all.length, 13); // F48 added the portal preview stage, F49 the portal tile picture, F126 the agent tools, F127 the agent chat route
  assert.equal(all.filter((r) => r.point.startsWith('None:')).length, 2);
  for (const r of all) assert.ok(r.docs, `row "${r.point}" has a docs cell`);
  assert.doesNotMatch(read('README.md'), /^## Examples$/m, 'the old "Examples" list is gone');
});

test('AC3: each of the thirteen READMEs has the exact lines What it shows, How to run and Extension point', () => {
  for (const r of rows()) {
    const lines = read(r.readme).split('\n');
    for (const h of ['## What it shows', '## How to run', '## Extension point']) {
      assert.ok(lines.includes(h), `${r.readme} has the line "${h}"`);
    }
  }
});

test('AC4: every row links an existing README inside its own example folder', () => {
  for (const r of rows()) {
    assert.ok(r.folder && existsSync(join(enterpriseDir, r.folder)), `folder ${r.folder} exists`);
    assert.equal(r.readme, `${r.folder}/README.md`);
    assert.ok(existsSync(join(enterpriseDir, r.readme)), `${r.readme} exists`);
  }
});

test('AC5: readme-index.test.mjs names a test for each of the F74 criteria AC1, AC2 and AC3', () => {
  const source = read('tests/readme-index.test.mjs');
  for (const ac of ['AC1', 'AC2', 'AC3']) assert.match(source, new RegExp(`test\\(['"\`]${ac}: `));
});

test('AC6: the side-by-side README is a row of the index with its three sections, next to the viewer F85 changed', () => {
  const row = rows().find((r) => r.folder === 'assets/studio/js/src/coaster-review/side-by-side');
  assert.ok(row, 'the side-by-side folder is a row');
  const lines = read(row.readme).split('\n');
  for (const h of ['## What it shows', '## How to run', '## Extension point']) assert.ok(lines.includes(h));
  assert.ok(rows().some((r) => r.folder === 'assets/shared/coaster/viewer'), 'the viewer F85 changed is a row too');
});
