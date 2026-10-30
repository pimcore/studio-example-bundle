// F83 (DR-F83-4, Marvin 2026-10-30): the ride's frame rate measurement (F45 AC3) runs apart from the regular suite, at
// a quiet moment, with its 30 fps bar unchanged. These checks keep it from slipping back into *.test.mjs or getting lost.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(testsDir, path), 'utf8');

test('AC1: the ride frame rate is measured in coaster-ride.perf.mjs, outside the regular suite, with the 30 fps bar', () => {
  const perf = read('coaster-ride.perf.mjs');
  assert.match(perf, /test\('AC3: the ride runs at 30 frames per second or more in headless Chromium on the sample file'/);
  assert.match(perf, /assert\.ok\(fps >= 30,/);
  assert.match(perf, /launchChromium\(\{ unlimited: true \}\)/);
  assert.ok(!'coaster-ride.perf.mjs'.endsWith('.test.mjs'), 'not picked up by enterprise/tests/*.test.mjs');
  for (const file of readdirSync(testsDir).filter((f) => f.endsWith('.test.mjs') && f !== 'coaster-perf-split.test.mjs')) {
    assert.doesNotMatch(read(file), /frames per second or more/, `${file} holds no frame rate measurement`);
  }
});

test('AC1: the viewer README says how and when to run the frame rate measurement', () => {
  const readme = readFileSync(join(testsDir, '../assets/shared/coaster/viewer/README.md'), 'utf8');
  assert.match(readme, /coaster-ride\.perf\.mjs/);
  assert.match(readme, /node --test 'enterprise\/tests\/\*\.perf\.mjs'/);
  assert.match(readme, /30 fps or more/);
});
