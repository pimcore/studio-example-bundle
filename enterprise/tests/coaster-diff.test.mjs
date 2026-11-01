// F43: element-level diff of two .coaster revisions. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const coasterDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets/shared/coaster');
const { diffCoaster } = await import(join(coasterDir, 'diff/diff.mjs'));
const { validateCoaster } = await import(join(coasterDir, 'schema/validate.mjs'));

// Thunder Loop revision 3 as in F40's demo data (enterprise/demo-data/thunder-loop-rev3.coaster).
const revision3 = () => ({
  format: 'coaster-design',
  version: '1.0',
  meta: { name: 'Thunder Loop', designer: 'Loopwerk Engineering', park: 'Pimcore Kingdom', revision: 3 },
  train: { cars: 6, seatsPerCar: 4 },
  track: [
    { type: 'station', length: 30 },
    { type: 'liftHill', height: 52, angle: 40 },
    { type: 'drop', height: 42, angle: 75 },
    { type: 'loop', diameter: 30 },
    { type: 'airtimeHill', height: 18 },
    { type: 'helix', turns: 1.5, radius: 15, bank: 60 },
    { type: 'loop', diameter: 18 },
    { type: 'brakeRun', length: 25 },
    { type: 'station', length: 0 },
  ],
});

// Revision 2, the approved baseline: lift hill 45 m, first loop 24 m.
const revision2 = () => {
  const file = revision3();
  file.meta.revision = 2;
  file.track[1].height = 45;
  file.track[3].diameter = 24;
  return file;
};

test('AC1: revision 2 to 3 gives exactly the two changes with their texts and metadata keys', () => {
  assert.equal(validateCoaster(revision2()).valid, true);
  assert.equal(validateCoaster(revision3()).valid, true);

  const entries = diffCoaster(revision2(), revision3());
  assert.equal(entries.length, 2);
  assert.deepEqual(
    entries.map((entry) => entry.text),
    ['liftHill #1: height 45 -> 52', 'loop #1: diameter 24 -> 30'],
  );
  assert.deepEqual(
    entries.map((entry) => entry.metadata),
    [
      { key: 'coaster.track.liftHill.1.height', old: 45, new: 52 },
      { key: 'coaster.track.loop.1.diameter', old: 24, new: 30 },
    ],
  );
  assert.deepEqual(
    entries.map(({ kind, elementType, field }) => ({ kind, elementType, field })),
    [
      { kind: 'changed', elementType: 'liftHill', field: 'height' },
      { kind: 'changed', elementType: 'loop', field: 'diameter' },
    ],
  );

  // Inputs are not changed by the diff.
  const before = revision2();
  diffCoaster(before, revision3());
  assert.deepEqual(before, revision2());
});

test('AC2: an added or removed element gives an added/removed entry with the element type', () => {
  const withExtraLoop = revision3();
  withExtraLoop.track.splice(5, 0, { type: 'loop', diameter: 20 });

  const added = diffCoaster(revision3(), withExtraLoop);
  assert.equal(added.length, 1);
  assert.equal(added[0].kind, 'added');
  assert.equal(added[0].elementType, 'loop');
  assert.equal(added[0].text, 'element added: loop');
  assert.deepEqual(added[0].metadata, { key: 'coaster.track.loop.2', old: null, new: { type: 'loop', diameter: 20 } });

  const removed = diffCoaster(withExtraLoop, revision3());
  assert.equal(removed.length, 1);
  assert.equal(removed[0].kind, 'removed');
  assert.equal(removed[0].elementType, 'loop');
  assert.equal(removed[0].text, 'element removed: loop');
  assert.deepEqual(removed[0].metadata, { key: 'coaster.track.loop.2', old: { type: 'loop', diameter: 20 }, new: null });

  // A removed element and a changed one in the same diff: the elements after it still pair up by type.
  const withoutAirtime = revision3();
  withoutAirtime.track.splice(4, 1);
  withoutAirtime.track[5].diameter = 20; // the second loop
  assert.deepEqual(
    diffCoaster(revision3(), withoutAirtime).map((entry) => entry.text),
    ['element removed: airtimeHill', 'loop #2: diameter 18 -> 20'],
  );
});

test('AC3: two equal files give no entries', () => {
  assert.deepEqual(diffCoaster(revision3(), revision3()), []);
  // Only the revision number differs: still no change to review.
  const resaved = revision3();
  resaved.meta.revision = 4;
  assert.deepEqual(diffCoaster(revision3(), resaved), []);
});
