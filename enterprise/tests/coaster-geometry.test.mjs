// F42: the coaster track geometry, a closed sampled centre line from the element list. Run (node 24 needs the glob):
// node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const geometryDir = join(enterpriseDir, 'assets/shared/coaster/geometry');
const demoDataDir = join(enterpriseDir, 'demo-data');

const { buildTrack } = await import(join(geometryDir, 'track.mjs'));

const design = (track) => ({
  format: 'coaster-design',
  version: '1.0',
  meta: { name: 'Test Ride', revision: 1 },
  train: { cars: 4, seatsPerCar: 4 },
  track,
});

// The handover 6.1 draft (also FORMAT.md's example).
const thunderLoop = () =>
  design([
    { type: 'station', length: 30 },
    { type: 'liftHill', height: 45, angle: 40 },
    { type: 'drop', height: 42, angle: 75 },
    { type: 'loop', diameter: 24 },
    { type: 'airtimeHill', height: 18 },
    { type: 'helix', turns: 1.5, radius: 15, bank: 60 },
    { type: 'loop', diameter: 18 },
    { type: 'brakeRun', length: 25 },
    { type: 'station', length: 0 },
  ]);

// Samples in the spirit of F40's revisions, plus edge cases: every element type, left and right, a vertical drop.
const fixtures = () => ({
  'thunder loop (handover 6.1)': thunderLoop(),
  'station only': design([{ type: 'station', length: 20 }]),
  'station of length 0': design([{ type: 'station', length: 0 }]),
  'every element type, turning left': design([
    { type: 'station', length: 25 },
    { type: 'liftHill', height: 60, angle: 90 },
    { type: 'drop', height: 58, angle: 90 },
    { type: 'turn', angle: 90, radius: 20, bank: 45, direction: 'left' },
    { type: 'loop', diameter: 30 },
    { type: 'airtimeHill', height: 12 },
    { type: 'helix', turns: 2, radius: 12, bank: 70, direction: 'left' },
    { type: 'turn', angle: 360, radius: 30 },
    { type: 'brakeRun', length: 0 },
    { type: 'station', length: 10 },
  ]),
  'no closing station, ends heading back': design([
    { type: 'station', length: 15 },
    { type: 'liftHill', height: 20, angle: 30 },
    { type: 'turn', angle: 180, radius: 25, direction: 'right' },
    { type: 'drop', height: 30, angle: 60 },
  ]),
});

const demoFiles = () =>
  existsSync(demoDataDir)
    ? Object.fromEntries(
        readdirSync(demoDataDir)
          .filter((name) => name.endsWith('.coaster'))
          .map((name) => [`demo-data/${name}`, JSON.parse(readFileSync(join(demoDataDir, name), 'utf8'))]),
      )
    : {};

const samples = () => ({ ...fixtures(), ...demoFiles() });

const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const length = (a) => Math.sqrt(dot(a, a));
const close = (a, b, eps = 1e-9) => length(sub(a, b)) <= eps;

test('AC1: on every sample file the line is closed: its first and last point are the station', () => {
  for (const [name, file] of Object.entries(samples())) {
    const track = buildTrack(file);
    const { points, station } = track;
    assert.ok(points.length > 1, `${name}: has samples`);
    assert.equal(track.closed, true, `${name}: closed`);
    assert.ok(close(points[0], station), `${name}: first point is the station`);
    assert.ok(close(points.at(-1), station), `${name}: last point is the station`);
    assert.ok(close(station, { x: 0, y: 0, z: 0 }), `${name}: the station is the origin`);
    // A line, not scattered points: no jumps between neighbouring samples, and a value per sample everywhere.
    for (let i = 1; i < points.length; i++) {
      const gap = length(sub(points[i], points[i - 1]));
      assert.ok(gap < 3, `${name}: gap ${gap} at sample ${i}`);
      for (const key of ['x', 'y', 'z', 'bank']) assert.ok(Number.isFinite(points[i][key]), `${name}: ${key} at ${i}`);
    }
    // Every element has its sample range, in ride order, the generated return curve last.
    assert.equal(track.elements.length, file.track.length + 1, `${name}: one range per element and the return`);
    file.track.forEach((element, index) => {
      assert.equal(track.elements[index].index, index);
      assert.equal(track.elements[index].type, element.type);
    });
    assert.equal(track.elements.at(-1).type, 'return');
    assert.equal(track.elements[0].start, 0);
    assert.equal(track.elements.at(-1).end, points.length - 1);
    for (let i = 1; i < track.elements.length; i++) {
      assert.equal(track.elements[i].start, track.elements[i - 1].end, `${name}: ranges meet at ${i}`);
    }
  }
});

test('AC1: the ride leaves and re-enters the station in the same direction', () => {
  const { points } = buildTrack(thunderLoop());
  const out = sub(points[1], points[0]);
  const back = sub(points.at(-1), points.at(-2));
  assert.ok(dot(out, back) / (length(out) * length(back)) > 0.99);
});

// Signed angle the tangent turns through in the vertical plane of the ride's heading at the element's start.
const pitchTurn = (points, start, end) => {
  const first = sub(points[start + 1], points[start]);
  const heading = { x: first.x, y: 0, z: first.z };
  const h = length(heading);
  const forward = { x: heading.x / h, y: 0, z: heading.z / h };
  const angleAt = (i) => {
    const t = sub(points[i + 1], points[i]);
    return Math.atan2(t.y, dot(t, forward));
  };
  let total = 0;
  let previous = angleAt(start);
  for (let i = start + 1; i < end; i++) {
    const angle = angleAt(i);
    let delta = angle - previous;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    total += delta;
    previous = angle;
  }
  return (total * 180) / Math.PI;
};

test('AC2: at a loop element the line turns through 360 degrees', () => {
  for (const [name, file] of Object.entries(samples())) {
    const track = buildTrack(file);
    const loops = track.elements.filter((element) => element.type === 'loop');
    assert.equal(loops.length, file.track.filter((element) => element.type === 'loop').length);
    for (const loop of loops) {
      const turned = pitchTurn(track.points, loop.start, loop.end);
      assert.ok(Math.abs(Math.abs(turned) - 360) < 15, `${name}: loop #${loop.index} turned ${turned} degrees`);
      // It goes up and over: the top of the loop is its diameter above where it starts.
      const ys = track.points.slice(loop.start, loop.end + 1).map((point) => point.y);
      const diameter = file.track[loop.index].diameter;
      assert.ok(Math.abs(Math.max(...ys) - track.points[loop.start].y - diameter) < 0.5, `${name}: loop height`);
    }
  }
});

test('AC2: straight elements other than loops do not turn over', () => {
  const straight = ['station', 'liftHill', 'drop', 'airtimeHill', 'brakeRun'];
  const track = buildTrack(fixtures()['every element type, turning left']);
  for (const element of track.elements.filter((e) => straight.includes(e.type) && e.end - e.start > 1)) {
    const turned = pitchTurn(track.points, element.start, element.end);
    assert.ok(Math.abs(turned) < 180, `${element.type} #${element.index} turned ${turned} degrees`);
  }
});

const changedAt = (index, change) => {
  const before = thunderLoop();
  const after = thunderLoop();
  after.track[index] = { ...after.track[index], ...change };
  return [buildTrack(before), buildTrack(after)];
};

test('AC3: two files that differ in one element have the same line up to that element', () => {
  const cases = [
    [3, { diameter: 30 }],
    [1, { height: 50 }],
    [5, { turns: 2, direction: 'left' }],
    [7, { length: 40 }],
    [8, { length: 12 }],
  ];
  for (const [index, change] of cases) {
    const [before, after] = changedAt(index, change);
    const start = before.elements[index].start;
    assert.equal(after.elements[index].start, start, `element ${index} starts at the same sample`);
    assert.deepEqual(after.points.slice(0, start + 1), before.points.slice(0, start + 1), `prefix before element ${index}`);
    assert.deepEqual(after.elements.slice(0, index), before.elements.slice(0, index), `ranges before element ${index}`);
    // ... and from that element on it does change.
    const rest = (track) => track.points.slice(start + 1, track.elements[index].end + 1);
    assert.notDeepEqual(rest(after), rest(before), `element ${index} itself changed`);
  }
});

test('AC3: a change in the first element changes the line from the start, and the same file gives the same line', () => {
  const [before, after] = changedAt(0, { length: 10 });
  assert.notDeepEqual(after.points.slice(1, 5), before.points.slice(1, 5));
  assert.deepEqual(buildTrack(thunderLoop()), buildTrack(thunderLoop()));
});

test('AC3: a label changes nothing in the line', () => {
  const [before, after] = changedAt(3, { label: 'Big Loop' });
  assert.deepEqual(after.points, before.points);
  assert.equal(after.elements[3].label, 'Big Loop');
});
