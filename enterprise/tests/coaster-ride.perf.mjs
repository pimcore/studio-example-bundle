// F45 AC3: the ride's frame rate in headless Chromium, 30 fps or more on the sample file. A performance measurement,
// apart from the regular suite (DR-F83-4, Marvin 2026-10-30): software WebGL tracks the machine's load, so run it at a
// quiet moment (no other heavy work, e.g. nightly or before the dry run), after npm ci in
// enterprise/assets/shared/coaster/viewer:
// node --test 'enterprise/tests/*.perf.mjs'
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setTimeout as sleep } from 'node:timers/promises';
import { serve, launchChromium, closeAll } from './coaster-ride-browser.mjs';

let fast; // a browser without the frame limiter: the frame rate is what the ride itself draws (see launchChromium)

before(async () => {
  await serve();
  fast = await launchChromium({ unlimited: true });
});

after(closeAll);

test('AC3: the ride runs at 30 frames per second or more in headless Chromium on the sample file', async () => {
  await fast.open('width=1280&height=720');
  assert.equal(await fast.evaluate('window.coasterRide.error ?? null'), null);
  await fast.click('play');
  await sleep(5000);
  const { frames, seconds, fps } = await fast.evaluate('(() => { const r = window.coasterRide; r.pause(); return r.stats(); })()');
  console.log(`coaster ride frame rate: ${fps.toFixed(1)} fps (${frames} frames in ${seconds.toFixed(2)} s, 1280x720)`);
  assert.ok(seconds > 4, `measured over ${seconds} s`);
  assert.ok(fps >= 30, `at least 30 fps, got ${fps.toFixed(1)}`);
  assert.deepEqual(fast.errors, []);
});
