// F74: one README per example folder, and an extension-point index in enterprise/README.md. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(path, 'utf8');

// The rows of the table under "## Extension points" in enterprise/README.md:
// | Extension point | Example folder | README | Docs section |
const indexRows = () => {
  const readme = read(join(enterpriseDir, 'README.md'));
  const section = readme.match(/^## Extension points\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  assert.ok(section, 'enterprise/README.md has a section "## Extension points"');
  const lines = section[1].split('\n').filter((line) => line.startsWith('|'));
  assert.match(lines[0], /\|\s*Extension point\s*\|\s*Example folder\s*\|\s*README\s*\|\s*Docs section\s*\|/);
  return lines.slice(2).map((line) => {
    const [point, folder, readmeCell, docs] = line.split('|').slice(1, -1).map((cell) => cell.trim());
    return {
      point,
      folder: folder.match(/`([^`]+)`/)?.[1]?.replace(/\/$/, ''),
      readme: readmeCell.match(/\]\(([^)]+)\)/)?.[1],
      docs,
    };
  });
};

// Every README.md below enterprise/ (not the bundle's own, not in node_modules or build output).
const folderReadmes = (dir = enterpriseDir) => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  if (statSync(path).isDirectory()) {
    return ['node_modules', 'public', 'build-dist'].includes(name) ? [] : folderReadmes(path);
  }
  return name === 'README.md' && dir !== enterpriseDir ? [relative(enterpriseDir, path)] : [];
});

test('AC1: every example folder of the index exists and has a README.md, which the index links', () => {
  const rows = indexRows();
  assert.ok(rows.length > 0, 'the index has rows');
  for (const row of rows) {
    assert.ok(row.folder, `${row.point}: names its folder`);
    assert.ok(existsSync(join(enterpriseDir, row.folder)), `${row.folder} exists`);
    assert.ok(existsSync(join(enterpriseDir, row.folder, 'README.md')), `${row.folder}/README.md exists`);
    assert.equal(row.readme, `${row.folder}/README.md`, `${row.point}: links the folder's README`);
  }
});

test('AC2: enterprise/README.md lists every extension point with its folder, README and docs section', () => {
  const rows = indexRows();
  const expected = {
    'upload metadata listener': 'src/Coaster',
    'setup command': 'src/Command',
    'portal frontend plugin': 'assets/portal',
    'portal page': 'assets/portal/talk',
  };
  for (const [point, folder] of Object.entries(expected)) {
    const row = rows.find((candidate) => candidate.point.toLowerCase().includes(point));
    assert.ok(row, `the index lists the ${point}`);
    assert.equal(row.folder, folder, `${point} lives in ${folder}`);
  }
  for (const row of rows) assert.ok(row.docs, `${row.point}: has a docs section cell`);
  // and no example README is left out of the index
  const listed = rows.map((row) => row.readme);
  for (const readme of folderReadmes()) assert.ok(listed.includes(readme), `${readme} is in the index`);
});

test("AC3: every README of the index has the headings 'What it shows', 'How to run' and 'Extension point'", () => {
  for (const row of indexRows()) {
    const readme = read(join(enterpriseDir, row.folder, 'README.md'));
    for (const heading of ['What it shows', 'How to run', 'Extension point']) {
      assert.match(readme, new RegExp(`^## ${heading}$`, 'm'), `${row.folder}/README.md has "## ${heading}"`);
    }
  }
});
