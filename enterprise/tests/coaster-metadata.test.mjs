// F41: coaster metadata extraction (max height, length, inversions, top speed, duration) and its golden file.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoData = join(enterpriseDir, 'demo-data');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const { extractCoasterMetadata } = await import(join(enterpriseDir, 'assets/shared/coaster/metadata/metadata.ts'));
const { validateCoaster } = await import(join(enterpriseDir, 'assets/shared/coaster/schema/validate.mjs'));

// The handover's Thunder Loop example (FORMAT.md).
const thunderLoop = () => ({
  format: 'coaster-design',
  version: '1.0',
  meta: { name: 'Thunder Loop', designer: 'Loopwerk Engineering', park: 'Theme Park of Tomorrow', revision: 3 },
  train: { cars: 6, seatsPerCar: 4 },
  track: [
    { type: 'station', length: 30 },
    { type: 'liftHill', height: 45, angle: 40 },
    { type: 'drop', height: 42, angle: 75 },
    { type: 'loop', diameter: 24 },
    { type: 'airtimeHill', height: 18 },
    { type: 'helix', turns: 1.5, radius: 15, bank: 60 },
    { type: 'loop', diameter: 18 },
    { type: 'brakeRun', length: 25 },
    { type: 'station', length: 0 },
  ],
});

test('AC1: a valid file gives its max height, length, inversions, top speed and duration', () => {
  const design = thunderLoop();
  assert.equal(validateCoaster(design).valid, true);
  const metadata = extractCoasterMetadata(design);
  assert.deepEqual(Object.keys(metadata).sort(), ['duration', 'inversions', 'length', 'maxHeight', 'topSpeed']);
  // By hand: the lift hill is the highest point; two loops; v = √(2 · 9.81 · 42) m/s; lengths and times per element.
  assert.deepEqual(metadata, { maxHeight: 45, length: 522.3, inversions: 2, topSpeed: 103.3, duration: 71 });
});

test('AC1: a loop or airtime hill above the lift hill sets the max height; a level track still has a speed', () => {
  const design = thunderLoop();
  design.track = [
    { type: 'station', length: 10 },
    { type: 'liftHill', height: 20, angle: 30 },
    { type: 'loop', diameter: 30 },
    { type: 'turn', angle: 90, radius: 10 },
    { type: 'station', length: 0 },
  ];
  const metadata = extractCoasterMetadata(design);
  assert.equal(metadata.maxHeight, 50);
  assert.equal(metadata.inversions, 1);
  assert.ok(metadata.topSpeed > 0 && metadata.duration > 0 && metadata.length > 0);
});

test('AC2: running twice on the same file gives the same values and leaves the file unchanged', () => {
  const design = thunderLoop();
  const before = structuredClone(design);
  const first = extractCoasterMetadata(design);
  const second = extractCoasterMetadata(design);
  assert.deepEqual(second, first);
  assert.deepEqual(extractCoasterMetadata(structuredClone(before)), first);
  assert.deepEqual(design, before);
});

test('AC3: revisions 1 to 3 give the values of the committed golden file', () => {
  const golden = readJson(join(demoData, 'expected-metadata.json'));
  const files = [1, 2, 3].map((revision) => `thunder-loop-rev${revision}.coaster`);
  assert.deepEqual(Object.keys(golden.revisions), files);
  for (const file of files) {
    assert.deepEqual(extractCoasterMetadata(readJson(join(demoData, file))), golden.revisions[file], file);
  }
  // Revision 3 raises the lift hill from 45 to 52 m: the max height follows.
  assert.equal(golden.revisions['thunder-loop-rev2.coaster'].maxHeight, 45);
  assert.equal(golden.revisions['thunder-loop-rev3.coaster'].maxHeight, 52);
});
