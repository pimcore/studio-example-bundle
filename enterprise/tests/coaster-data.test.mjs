// F40: the Thunder Loop demo data, revisions 1 to 3 and the park's brief. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(enterpriseDir, 'demo-data');
const read = (path) => readFileSync(path, 'utf8');

const { validateCoaster } = await import(join(enterpriseDir, 'assets/shared/coaster/schema/validate.mjs'));

const revision = (n) => JSON.parse(read(join(dataDir, `thunder-loop-rev${n}.coaster`)));

// Every field of every track element that differs between two revisions, as "<index>.<field>: <old> -> <new>".
const trackChanges = (before, after) => {
  const changes = [];
  const count = Math.max(before.track.length, after.track.length);
  for (let i = 0; i < count; i++) {
    const a = before.track[i] ?? {};
    const b = after.track[i] ?? {};
    for (const field of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (a[field] !== b[field]) changes.push(`${i}.${field}: ${a[field]} -> ${b[field]}`);
    }
  }
  return changes;
};

test('AC1: revisions 1, 2 and 3 of Thunder Loop are accepted by the schema', () => {
  for (const n of [1, 2, 3]) {
    const file = revision(n);
    assert.deepEqual(validateCoaster(file).errors, [], `revision ${n}`);
    assert.equal(file.meta.revision, n);
    assert.equal(file.meta.name, 'Thunder Loop');
    assert.equal(file.meta.designer, 'Loopwerk Engineering');
    assert.equal(file.meta.park, 'Pimcore Kingdom');
  }
});

test('AC2: revision 2 to 3 changes exactly the loop diameter 24 to 30 and the lift hill height 45 to 52', () => {
  const rev2 = revision(2);
  const rev3 = revision(3);
  const loop = rev2.track.findIndex((element) => element.type === 'loop' && element.diameter === 24);
  const lift = rev2.track.findIndex((element) => element.type === 'liftHill');
  assert.notEqual(loop, -1);
  assert.notEqual(lift, -1);
  assert.deepEqual(
    trackChanges(rev2, rev3).sort(),
    [`${lift}.height: 45 -> 52`, `${loop}.diameter: 24 -> 30`].sort(),
  );
  // Nothing else differs: same train, same meta apart from the revision number.
  assert.deepEqual(rev3.train, rev2.train);
  assert.deepEqual({ ...rev3.meta, revision: 2 }, rev2.meta);
  // Revision 1 is an earlier, different design: revision 2 is not a copy of it.
  assert.notDeepEqual(trackChanges(revision(1), rev2), []);
});

test('AC3: the brief states the 45 m height limit and names no real brand, character or customer', () => {
  const brief = read(join(dataDir, 'brief.md'));
  assert.match(brief, /Thunder Loop/);
  assert.match(brief, /Pimcore Kingdom/);
  assert.match(brief, /Loopwerk Engineering/);
  assert.match(brief, /45\s?m\b/);
  assert.match(brief, /target audience/i);
  // The talk is public: no real parks, ride makers, characters or customers.
  const realNames = [
    'Disney', 'Universal', 'Six Flags', 'Cedar Fair', 'Europa-Park', 'Europa Park', 'Phantasialand', 'Merlin',
    'Legoland', 'Heide Park', 'Efteling', 'Bolliger', 'Mabillard', 'B&M', 'Intamin', 'Vekoma', 'Mack Rides',
    'Gerstlauer', 'Schwarzkopf', 'Rocky Mountain', 'Mickey', 'Marvel', 'Pokémon', 'Pokemon', 'Harry Potter',
    'Star Wars', 'Batman', 'Superman', 'Coca-Cola', 'Pimcore',
  ];
  // "Pimcore Kingdom" is the park's name (Marvin, DR-P22): that exact string may stand, "Pimcore" anywhere else not.
  const checked = brief.replaceAll('Pimcore Kingdom', '').toLowerCase();
  for (const name of realNames) assert.ok(!checked.includes(name.toLowerCase()), `brief names ${name}`);
});

test('AC5: brief and docs name the park "Pimcore Kingdom", never the old name (the brand check is AC3 above)', () => {
  const docs = {
    'demo-data/brief.md': read(join(dataDir, 'brief.md')),
    'assets/shared/coaster/FORMAT.md': read(join(enterpriseDir, 'assets/shared/coaster/FORMAT.md')),
    'src/Command/README.md': read(join(enterpriseDir, 'src/Command/README.md')),
  };
  for (const [path, text] of Object.entries(docs)) {
    assert.match(text, /Pimcore Kingdom/, path);
    assert.doesNotMatch(text, /Theme Park of Tomorrow/, path);
  }
  for (const n of [1, 2, 3]) assert.equal(revision(n).meta.park, 'Pimcore Kingdom', `revision ${n}`);
  assert.match(docs['demo-data/brief.md'], /\*\*Maximum height: 45 m\.\*\*/);
});
