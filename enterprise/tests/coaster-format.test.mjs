// F39: the .coaster format, its JSON Schema and FORMAT.md. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const coasterDir = join(enterpriseDir, 'assets/shared/coaster');
const schemaDir = join(coasterDir, 'schema');
const read = (path) => readFileSync(path, 'utf8');

const { validateCoaster } = await import(join(schemaDir, 'validate.mjs'));
const schema = JSON.parse(read(join(schemaDir, 'coaster.schema.json')));

const elementTypes = ['station', 'liftHill', 'drop', 'loop', 'airtimeHill', 'helix', 'turn', 'brakeRun'];

// The draft from handover 6.1, verbatim.
const handoverExample = () => ({
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

const paths = (result) => result.errors.map((error) => error.path);

test('AC1: a file in the handover 6.1 shape is accepted by the JSON Schema', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  const result = validateCoaster(handoverExample());
  assert.deepEqual(result.errors, []);
  assert.equal(result.valid, true);

  // Every element type is accepted, the turn included (the handover draft has none).
  const all = handoverExample();
  all.track.splice(7, 0, { type: 'turn', angle: 90, radius: 20, direction: 'left', bank: 30 });
  assert.deepEqual(new Set(all.track.map((element) => element.type)), new Set(elementTypes));
  assert.deepEqual(validateCoaster(all).errors, []);

  // A .coaster file is read as text: the parsed JSON text validates the same way.
  assert.equal(validateCoaster(JSON.parse(JSON.stringify(all, null, 2))).valid, true);
});

test('AC2: an unknown element type is rejected with the path of the problem', () => {
  const file = handoverExample();
  file.track[4] = { type: 'corkscrew', height: 10 };
  const result = validateCoaster(file);
  assert.equal(result.valid, false);
  assert.deepEqual(paths(result), ['/track/4/type']);
  assert.match(result.errors[0].message, /corkscrew/);
});

test('AC2: a missing required field is rejected with the path of the problem', () => {
  const file = handoverExample();
  delete file.track[3].diameter;
  delete file.train.seatsPerCar;
  const result = validateCoaster(file);
  assert.equal(result.valid, false);
  assert.deepEqual(paths(result).sort(), ['/track/3/diameter', '/train/seatsPerCar']);
  for (const error of result.errors) assert.match(error.message, /required/);

  const noTrack = handoverExample();
  delete noTrack.track;
  assert.deepEqual(paths(validateCoaster(noTrack)), ['/track']);
});

test('AC2: a wrong version or format is rejected with the path of the problem', () => {
  for (const version of ['2.0', '1', 'v1.0', 1.0]) {
    const file = { ...handoverExample(), version };
    const result = validateCoaster(file);
    assert.equal(result.valid, false, `version ${JSON.stringify(version)} is rejected`);
    assert.deepEqual(paths(result), ['/version']);
  }
  // A later 1.x minor version stays readable.
  assert.equal(validateCoaster({ ...handoverExample(), version: '1.2' }).valid, true);

  const result = validateCoaster({ ...handoverExample(), format: 'coaster' });
  assert.deepEqual(paths(result), ['/format']);
});

test('AC2: wrong values and unknown fields are rejected with their path', () => {
  const file = handoverExample();
  file.track[1].angle = 120;
  file.track[5].direction = 'up';
  file.track[6].radius = 5;
  file.meta.revision = 0;
  const result = validateCoaster(file);
  assert.deepEqual(paths(result).sort(), ['/meta/revision', '/track/1/angle', '/track/5/direction', '/track/6/radius']);

  assert.deepEqual(paths(validateCoaster({ ...handoverExample(), track: [] })), ['/track']);
  assert.deepEqual(paths(validateCoaster('not a coaster')), ['']);
});

test('AC3: FORMAT.md describes every element type and its fields, and says the viewer is swappable behind the format', () => {
  const formatFile = join(coasterDir, 'FORMAT.md');
  assert.ok(existsSync(formatFile), 'FORMAT.md exists');
  const format = read(formatFile);

  for (const type of elementTypes) {
    const definition = schema.$defs[type];
    assert.ok(definition, `the schema defines ${type}`);
    const section = format.match(new RegExp(`^### \`${type}\`\\s*\\n([\\s\\S]*?)(?=^#{2,3} |(?![\\s\\S]))`, 'm'));
    assert.ok(section, `FORMAT.md has a section for ${type}`);
    for (const field of Object.keys(definition.properties).filter((name) => name !== 'type')) {
      assert.match(section[1], new RegExp(`\`${field}\``), `the ${type} section describes ${field}`);
    }
  }
  for (const field of ['format', 'version', 'meta', 'train', 'track', 'name', 'designer', 'park', 'revision', 'cars', 'seatsPerCar']) {
    assert.match(format, new RegExp(`\`${field}\``), `FORMAT.md describes ${field}`);
  }
  assert.match(format, /coaster\.schema\.json/);
  assert.match(format, /viewer/i);
  assert.match(format, /swappable|swap/i);
});
