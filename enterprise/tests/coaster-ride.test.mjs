// F45: the coaster viewer's ride view, the camera in the front seat from the station round the circuit and back,
// with Play/Pause and Restart. Run (node 24 needs the glob; the viewer's three.js first: npm ci in
// enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The browser tests drive headless Chromium over the DevTools protocol (CHROMIUM, else chromium on the PATH), print
// the measured frame rate and keep a screenshot of the paused ride in COASTER_RIDE_SCREENSHOT (default:
// coaster-ride.png in the system's temp folder).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

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

// --- headless Chromium -------------------------------------------------------------------------------------------

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
let server;
let port;
const browsers = []; // { process, profile, session }
let page; // a browser with Chromium's usual frame pacing: for the buttons and the ride round the circuit
let fast; // one without the frame limiter: for the frame rate (see launchChromium)

// Serves the enterprise folder, so the ride page reaches the geometry, the schema and the demo data.
const serve = () =>
  new Promise((resolve) => {
    server = createServer((req, res) => {
      const path = normalize(join(enterpriseDir, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
      if (!path.startsWith(enterpriseDir) || !existsSync(path) || !statSync(path).isFile()) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
      res.end(readFileSync(path));
    });
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });

// A DevTools protocol session on a new headless Chromium's first page, over Node's built-in WebSocket.
// Headless Chromium paces frames by a virtual display that, with software WebGL (SwiftShader), holds even a page that
// only clears a 1280x720 canvas near 20 frames per second and this ride near 2. `unlimited` turns that limiter off
// (--disable-gpu-vsync, --disable-frame-rate-limit), so the frame rate is what the ride itself draws, as on a real
// screen up to its refresh; such a browser answers slowly while a page draws flat out, so only the measurement uses it.
async function launchChromium({ unlimited = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'coaster-ride-'));
  const binary = process.env.CHROMIUM ?? 'chromium';
  const child = spawn(binary, [
    '--headless=new', '--no-sandbox', '--no-first-run', '--disable-gpu-sandbox', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', ...(unlimited ? ['--disable-gpu-vsync', '--disable-frame-rate-limit'] : []),
    '--window-size=1280,800', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });
  const entry = { process: child, profile };
  browsers.push(entry);
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  assert.ok(existsSync(portFile), `${binary} started with its DevTools port`);
  const devtools = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${devtools}/json/list`)).json();
  const socket = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id);
    message.error ? call.reject(new Error(message.error.message)) : call.resolve(message.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression, awaitPromise: true, returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  await send('Runtime.enable');
  await send('Page.enable');
  // The page itself 1280x800 (the window's frame takes some of --window-size), so the 720 high ride and its buttons fit.
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  const session = { send, evaluate, errors, close: () => socket.close() };
  session.open = async (query) => {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/assets/shared/coaster/viewer/ride.html?${query}` });
    await sleep(200);
    for (let i = 0; i < 300; i++) {
      if (await evaluate('document.body?.dataset.ready === "true"').catch(() => false)) return;
      await sleep(100);
    }
    assert.fail(`the ride page never got ready: ${JSON.stringify(errors.map((e) => e.exception?.description))}`);
  };
  // A real mouse click on a ride button, at its place on the screen.
  session.click = async (name) => {
    const { x, y } = await evaluate(`(() => {
      const r = document.querySelector('.coaster-ride-controls button[name=${name}]').getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  };
  entry.session = session;
  return session;
}

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
  port = await serve();
  page = await launchChromium();
  fast = await launchChromium({ unlimited: true });
});

after(async () => {
  for (const { process: child, profile, session } of browsers) {
    session?.close();
    if (child.exitCode === null) {
      const exited = new Promise((resolve) => child.once('exit', resolve));
      child.kill();
      await exited;
    }
    rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
  }
  server?.close();
});

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

  await page.click('restart');
  const restarted = await state();
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
