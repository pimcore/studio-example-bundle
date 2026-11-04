// F45: the coaster viewer's ride view, the camera in the front seat from the station round the circuit and back,
// with Play/Pause and Restart. Run (node 24 needs the glob; the viewer's three.js first: npm ci in
// enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The browser tests drive headless Chromium over the DevTools protocol (coaster-ride-browser.mjs) and keep a screenshot
// of the paused ride in COASTER_RIDE_SCREENSHOT (default: coaster-ride.png in the system's temp folder). The frame rate
// (F45 AC3, 30 fps or more) is measured apart, at a quiet moment, by coaster-ride.perf.mjs (DR-F83-4).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { serve, launchChromium, closeAll } from './coaster-ride-browser.mjs';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const rev3 = readFileSync(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster'), 'utf8');

const { createRide, RIDE_DEFAULTS } = await import(join(viewerDir, 'ride.mjs'));
const { createCoasterRide } = await import(join(viewerDir, 'react.mjs'));
const { buildTrack } = await import(join(enterpriseDir, 'assets/shared/coaster/geometry/track.mjs'));

const line = buildTrack(JSON.parse(rev3));
const near = (a, b, tolerance) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < tolerance;

test('AC1: playing moves the front-seat camera along the line from the station round the circuit and back into it', () => {
  const ride = createRide(line);
  const station = line.points[0];
  const start = ride.pose();
  assert.ok(near(start.eye, { ...station, y: station.y + RIDE_DEFAULTS.eyeHeight }, 1e-6), 'starts in the station seat');
  assert.ok(start.target.x > start.eye.x, 'looking down the track (+x, the way the ride leaves)');
  assert.equal(ride.state().playing, false, 'waits for Play');
  assert.equal(ride.update(0.05), false, 'does not move before Play');

  ride.play();
  let previous = ride.state().distance;
  let highest = -Infinity;
  let upsideDown = false;
  let steps = 0;
  while (ride.state().playing && steps++ < 100_000) {
    ride.update(1 / 60);
    const { distance } = ride.state();
    assert.ok(distance > previous, 'the train only moves forward');
    previous = distance;
    const { eye, up } = ride.pose();
    // The eye stays in the front seat: right above the nearest sample of the line.
    const closest = Math.min(...line.points.map((p) => Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z)));
    assert.ok(closest < RIDE_DEFAULTS.eyeHeight + 0.6, `eye ${closest.toFixed(2)} m from the line`);
    highest = Math.max(highest, eye.y);
    if (up.y < -0.9) upsideDown = true;
  }
  assert.ok(highest > 52, `rides over the lift hill, highest eye ${highest.toFixed(1)} m`);
  assert.ok(upsideDown, 'rides through the loops upside down');
  const end = ride.state();
  assert.equal(end.ended, true);
  assert.equal(end.playing, false, 'stops at the end');
  assert.ok(Math.abs(end.distance - ride.length) < 1e-9 && ride.length > 800, `whole circuit ${ride.length} m`);
  assert.ok(near(ride.pose().eye, start.eye, 1e-6), 'back in the station seat');
  // At the default speed the sample circuit takes the better part of a minute.
  assert.ok(steps / 60 > 40 && steps / 60 < 55, `a ride of ${(steps / 60).toFixed(1)} s`);
});

test('AC2: pause stops the ride where it is, play goes on from there, restart puts it back in the station', () => {
  const ride = createRide(line, { speed: 20 });
  ride.play();
  for (let i = 0; i < 60; i++) ride.update(1 / 60);
  const before = ride.state().distance;
  assert.ok(Math.abs(before - 20) < 1e-6, `20 m after a second, got ${before}`);

  ride.pause();
  assert.equal(ride.update(1), false);
  assert.equal(ride.state().distance, before, 'paused: the train stands');
  assert.equal(ride.state().playing, false);

  ride.play();
  ride.update(0.05);
  assert.ok(Math.abs(ride.state().distance - before - 1) < 1e-6, 'play goes on from where it stood');

  ride.restart();
  assert.equal(ride.state().distance, 0, 'restart: back in the station');
  assert.equal(ride.state().playing, true, 'and riding again');
  assert.deepEqual(ride.pose().eye.toArray(), createRide(line).pose().eye.toArray());

  // Play after the end starts a new ride from the station.
  for (let i = 0; i < 10_000 && !ride.state().ended; i++) ride.update(0.1);
  assert.equal(ride.state().ended, true);
  ride.play();
  assert.equal(ride.state().distance, 0);
  assert.equal(ride.state().ended, false);
});

test('AC1: the React component mounts the ride into its element with the file, size and speed, and disposes it', () => {
  const effects = [];
  const fakeReact = {
    createElement: (type, props) => ({ type, props }),
    useRef: () => ({ current: null }),
    useEffect: (effect, deps) => effects.push({ effect, deps }),
  };
  const CoasterRide = createCoasterRide(fakeReact);
  const element = CoasterRide({ file: '{ nope', size: { width: 640, height: 360 }, speed: 12 });
  assert.equal(element.type, 'div');
  assert.equal(element.props.className, 'coaster-ride-host');
  assert.deepEqual(element.props.style, { width: 640, height: 360 });
  assert.deepEqual(effects[0].deps, ['{ nope', 640, 360, 12]);
  const appended = [];
  const host = {
    ownerDocument: { createElement: () => ({ setAttribute() {}, remove() { appended.pop(); } }) },
    append: (child) => appended.push(child),
  };
  element.props.ref.current = host;
  const cleanup = effects[0].effect();
  assert.equal(appended.length, 1);
  assert.match(appended[0].textContent, /^Not a \.coaster file/);
  cleanup();
  assert.equal(appended.length, 0);
});

// --- headless Chromium (coaster-ride-browser.mjs) ----------------------------------------------------------------

let page; // a browser with Chromium's usual frame pacing: for the buttons and the ride round the circuit

const state = () => page.evaluate('window.coasterRide.state()');
const eye = () => page.evaluate('window.coasterRide.camera.position.toArray()');
const buttonText = (name) =>
  page.evaluate(`document.querySelector('.coaster-ride-controls button[name=${name}]').textContent`);
// Polls `check` (an async predicate) until it holds, up to `seconds`; the frame rate in this browser is low and uneven.
const until = async (check, seconds, what) => {
  for (let i = 0; i < seconds * 10; i++) {
    if (await check()) return;
    await sleep(100);
  }
  assert.fail(`${what} within ${seconds} s`);
};

before(async () => {
  await serve();
  page = await launchChromium();
});

after(closeAll);

test('AC2: in the browser the Pause button stops the ride, Play goes on, Restart puts it back in the station', async () => {
  await page.open('width=1280&height=720&speed=60&autoplay=1');
  assert.equal((await state()).playing, true, 'autoplay rides');
  assert.equal(await buttonText('play'), 'Pause');
  await until(async () => (await state()).distance > 30, 60, 'the train rode 30 m');
  await page.click('play');
  const paused = await state();
  assert.equal(paused.playing, false);
  assert.equal(await buttonText('play'), 'Play');
  const standing = await eye();
  // The paused ride as a picture (in this browser: the one without the frame limiter takes minutes for a screenshot).
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = process.env.COASTER_RIDE_SCREENSHOT ?? join(tmpdir(), 'coaster-ride.png');
  writeFileSync(file, Buffer.from(data, 'base64'));
  assert.ok(statSync(file).size > 10_000, `screenshot kept in ${file}`);
  console.log(`coaster ride screenshot: ${file}`);
  await sleep(1500);
  assert.equal((await state()).distance, paused.distance, 'paused: the train stands');
  assert.deepEqual(await eye(), standing, 'and the camera with it');

  await page.click('play');
  await until(async () => (await state()).distance > paused.distance, 20, 'Play goes on from where it stood');

  // Click Restart and read the state in the same page evaluate (DR-F159-1): a read one DevTools round trip after the
  // click let more than one frame pass on a loaded machine (7 m, F159).
  const restarted = await page.evaluate(`(() => {
    document.querySelector('.coaster-ride-controls button[name=restart]').click();
    return window.coasterRide.state();
  })()`);
  // At most one frame (60 m/s for at most 0.1 s) can have passed since the click.
  assert.ok(restarted.distance <= 6 && restarted.distance < paused.distance, `Restart: back in the station, at ${restarted.distance} m`);
  assert.equal(restarted.playing, true, 'and riding again');
  assert.deepEqual(page.errors, []);
});

test('AC1: in the browser the camera rides from the station round the circuit and stops back in the station', async () => {
  await page.open('width=1280&height=720&speed=400');
  const start = await eye();
  assert.deepEqual(start.map((v) => Math.round(v * 1000) / 1000), [0, RIDE_DEFAULTS.eyeHeight, 0], 'in the station seat');
  assert.match(await page.evaluate('document.querySelector(".coaster-ride-progress").textContent'), /^0 m of \d+ m$/);
  await page.click('play');
  await until(async () => Math.hypot(...(await eye())) > 20, 30, 'the camera left the station');
  await until(async () => (await state()).ended, 120, 'the ride ended');
  const end = await state();
  assert.equal(end.playing, false);
  const back = await eye();
  assert.ok(Math.hypot(back[0] - start[0], back[1] - start[1], back[2] - start[2]) < 1e-6, 'back in the station seat');
  assert.equal(await page.evaluate('document.querySelector(".coaster-ride-progress").textContent'), 'Back in the station');
  assert.equal(await buttonText('play'), 'Play');
  assert.deepEqual(page.errors, []);
});
