// F44: the coaster viewer's orbit view in three.js 0.187.0. Run (node 24 needs the glob; the viewer's three.js
// first: npm ci in enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The browser tests drive a headless Chromium over the DevTools protocol (CHROMIUM, else chromium on the PATH) and
// keep its screenshot in COASTER_VIEWER_SCREENSHOT (default: coaster-viewer.png in the system's temp folder).
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
const demoDataDir = join(enterpriseDir, 'demo-data');
const rev3 = readFileSync(join(demoDataDir, 'thunder-loop-rev3.coaster'), 'utf8');

const { buildCoasterScene } = await import(join(viewerDir, 'scene.mjs'));
const { readCoasterFile } = await import(join(viewerDir, 'orbit.mjs'));
const { createCoasterViewer } = await import(join(viewerDir, 'react.mjs'));
const { buildTrack } = await import(join(enterpriseDir, 'assets/shared/coaster/geometry/track.mjs'));
const THREE = await import(join(viewerDir, 'node_modules/three/build/three.module.js'));

test('AC1: a valid file builds the track: rails, spine, ties and supports following the centre line', () => {
  const design = JSON.parse(rev3);
  const { scene, track, center, radius } = buildCoasterScene(design);
  assert.equal(scene.getObjectByName('coaster-track'), track);
  for (const name of ['rail-left', 'rail-right', 'spine', 'ties', 'supports', 'station']) {
    assert.ok(track.getObjectByName(name), `the track has its ${name}`);
  }
  // Ties and supports are instanced (one draw call each, F45): count their instances.
  assert.ok(track.getObjectByName('ties').count > 50, 'ties along the whole circuit');
  assert.ok(track.getObjectByName('supports').count > 5, 'supports under the raised track');

  // The rails follow the centre line: the track's box holds every point, and reaches the lift's 52 m.
  const box = new THREE.Box3().setFromObject(track);
  for (const p of buildTrack(design).points) {
    assert.ok(box.containsPoint(new THREE.Vector3(p.x, p.y, p.z)), `point ${p.x},${p.y},${p.z} inside the track`);
  }
  assert.ok(box.max.y >= 52 && box.max.y < 54, `top of the track at the lift's height, got ${box.max.y}`);
  assert.ok(radius > 20 && Number.isFinite(center.x), 'a bounding sphere to aim the camera at');

  // The rails stay a gauge apart all the way round (no twist collapsing them in the loops or the return).
  const left = track.getObjectByName('rail-left').geometry.parameters.path.points;
  const right = track.getObjectByName('rail-right').geometry.parameters.path.points;
  for (let i = 0; i < left.length; i++) {
    assert.ok(Math.abs(left[i].distanceTo(right[i]) - 1.2) < 1e-6, `gauge at sample ${i}`);
  }
});

test('AC1: an invalid file is refused with a readable message, not drawn', () => {
  assert.match(readCoasterFile('{ nope').error, /^Not a \.coaster file/);
  assert.match(readCoasterFile({ format: 'coaster-design' }).error, /^Not a valid \.coaster file: .*required/);
  assert.deepEqual(readCoasterFile(rev3).design, JSON.parse(rev3));
});

test('AC1: the React component mounts the viewer into its element with the file and size, and disposes it', () => {
  const effects = [];
  const fakeReact = {
    createElement: (type, props) => ({ type, props }),
    useRef: () => ({ current: null }),
    useEffect: (effect, deps) => effects.push({ effect, deps }),
  };
  const CoasterViewer = createCoasterViewer(fakeReact);
  const element = CoasterViewer({ file: '{ nope', size: { width: 640, height: 360 } });
  assert.equal(element.type, 'div');
  assert.deepEqual(element.props.style, { width: 640, height: 360 });
  assert.deepEqual(effects[0].deps, ['{ nope', 640, 360]);
  // Mount into a minimal element: the invalid file shows its message there, and the cleanup removes it.
  const appended = [];
  const host = {
    ownerDocument: {
      createElement: () => ({ setAttribute() {}, remove() { appended.pop(); } }),
    },
    append: (child) => appended.push(child),
  };
  element.props.ref.current = host;
  const cleanup = effects[0].effect();
  assert.equal(appended.length, 1);
  assert.match(appended[0].textContent, /^Not a \.coaster file/);
  cleanup();
  assert.equal(appended.length, 0);
});

test('AC2: package.json pins three to exactly 0.187.0, and the lock file and install agree', () => {
  const pkg = JSON.parse(readFileSync(join(viewerDir, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies.three, '0.187.0');
  const lock = JSON.parse(readFileSync(join(viewerDir, 'package-lock.json'), 'utf8'));
  assert.equal(lock.packages[''].dependencies.three, '0.187.0');
  assert.equal(lock.packages['node_modules/three'].version, '0.187.0');
  assert.equal(THREE.REVISION, '187');
});

// F71: F44's review findings, each one held by a test.
test('AC4: How to try: demo.html\'s import map, default file and query parameters point to files that exist', () => {
  const html = readFileSync(join(viewerDir, 'demo.html'), 'utf8');
  const { imports } = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]);
  assert.ok(existsSync(join(viewerDir, imports.three)), `${imports.three} is installed by npm ci in viewer/`);
  assert.ok(existsSync(join(viewerDir, imports['three/addons/'], 'controls/OrbitControls.js')), 'the addons too');
  const fallback = html.match(/query\.get\('file'\) \?\? '([^']+)'/)[1];
  assert.ok(existsSync(join(viewerDir, fallback)), `the default file ${fallback} exists`);
  for (const rev of [1, 2, 3]) assert.ok(existsSync(join(demoDataDir, `thunder-loop-rev${rev}.coaster`)));
  for (const param of ['file', 'width', 'height']) assert.ok(html.includes(`query.get('${param}')`), `reads ?${param}`);
  const readme = readFileSync(join(viewerDir, 'README.md'), 'utf8');
  assert.match(readme, /python3 -m http\.server/);
  assert.match(readme, /\/assets\/shared\/coaster\/viewer\/demo\.html/);
});

test('AC8: every file the viewer folder ships is described in its README', () => {
  const readme = readFileSync(join(viewerDir, 'README.md'), 'utf8');
  for (const file of ['orbit.mjs', 'ride.mjs', 'react.mjs', 'scene.mjs', 'demo.html', 'ride.html', 'package.json']) {
    assert.ok(existsSync(join(viewerDir, file)), `${file} exists`);
    assert.ok(readme.includes(`\`${file}\``), `README describes ${file}`);
  }
});

test('AC9: these tests sit where TEST_CMD\'s node --test enterprise/tests/*.test.mjs finds them, with the lock file its npm ci needs', () => {
  const self = fileURLToPath(import.meta.url);
  assert.equal(dirname(self), join(enterpriseDir, 'tests'));
  assert.match(self, /\.test\.mjs$/);
  assert.ok(existsSync(join(viewerDir, 'package-lock.json')), 'viewer/package-lock.json for npm ci');
});

test('AC10: the README tells hosts to run npm ci in viewer/ before building a plugin that imports the viewer', () => {
  const readme = readFileSync(join(viewerDir, 'README.md'), 'utf8');
  assert.match(readme, /cd enterprise\/assets\/shared\/coaster\/viewer && npm ci/);
  assert.match(readme, /`npm ci` here before building a plugin/);
});

// --- headless Chromium -------------------------------------------------------------------------------------------

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
let server;
let browser;
let page;
let profile;
let port;

// Serves the enterprise folder, so the demo page reaches the geometry, the schema and the demo data.
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

// A DevTools protocol session on the browser's first page, over Node's built-in WebSocket.
async function launchChromium() {
  profile = mkdtempSync(join(tmpdir(), 'coaster-viewer-'));
  const binary = process.env.CHROMIUM ?? 'chromium';
  browser = spawn(binary, [
    '--headless=new', '--no-sandbox', '--no-first-run', '--disable-gpu-sandbox', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=1280,800', '--hide-scrollbars', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  const portFile = join(profile, 'DevToolsActivePort');
  for (let i = 0; i < 100 && !existsSync(portFile); i++) await sleep(100);
  assert.ok(existsSync(portFile), `${binary} started with its DevTools port`);
  const port = readFileSync(portFile, 'utf8').split('\n')[0];
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
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
  return { send, evaluate, errors, close: () => socket.close() };
}

const cameraPosition = () => page.evaluate('window.coasterViewer.camera.position.toArray()');

// Counts the canvas's yellow track pixels and its drawn (not dark) pixels.
const canvasPixels = () =>
  page.evaluate(`(() => {
    const { canvas, render } = window.coasterViewer;
    render(); // draw now, so the buffer is still there for the copy below
    const copy = document.createElement('canvas');
    copy.width = canvas.width;
    copy.height = canvas.height;
    const context = copy.getContext('2d');
    context.drawImage(canvas, 0, 0);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    let track = 0, lit = 0;
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
      if (r > 150 && g > 120 && b < 90) track++;
      if (r + g + b > 60) lit++;
    }
    return { width: copy.width, height: copy.height, track, lit, total: data.length / 4 };
  })()`);

// Opens demo.html with the given query and waits until it has mounted the viewer.
async function openDemo(query) {
  await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/assets/shared/coaster/viewer/demo.html?${query}` });
  for (let i = 0; i < 150; i++) {
    if (await page.evaluate('document.body?.dataset.ready === "true"').catch(() => false)) return;
    await sleep(100);
  }
  assert.fail(`the demo page never got ready: ${JSON.stringify(page.errors.map((e) => e.exception?.description))}`);
}

const keepScreenshot = async (name) => {
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = join(tmpdir(), name);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
};

before(async () => {
  port = await serve();
  page = await launchChromium();
  await page.send('Page.enable');
  await openDemo('width=1200&height=700');
});

after(async () => {
  page?.close();
  if (browser && browser.exitCode === null) {
    const exited = new Promise((resolve) => browser.once('exit', resolve));
    browser.kill();
    await exited;
  }
  server?.close();
  if (profile) rmSync(profile, { recursive: true, force: true, maxRetries: 5 });
});

test('AC3: in headless Chromium the canvas is not empty: the yellow track is drawn on the dark ground', async () => {
  const pixels = await canvasPixels();
  assert.ok(pixels.width >= 1200 && pixels.height >= 700, `canvas at the asked size, got ${pixels.width}x${pixels.height}`);
  assert.ok(pixels.track > pixels.total * 0.002, `yellow track pixels: ${pixels.track} of ${pixels.total}`);
  assert.ok(pixels.lit > pixels.total * 0.01, `drawn pixels: ${pixels.lit} of ${pixels.total}`);

  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = process.env.COASTER_VIEWER_SCREENSHOT ?? join(tmpdir(), 'coaster-viewer.png');
  writeFileSync(file, Buffer.from(data, 'base64'));
  assert.ok(statSync(file).size > 10_000, `screenshot kept in ${file}`);
  console.log(`coaster viewer screenshot: ${file}`);
});

test('AC1: in the browser the user orbits the track by dragging, and the camera keeps aiming at it', async () => {
  assert.deepEqual(page.errors, []);
  assert.equal(await page.evaluate('window.coasterViewer.error ?? null'), null);
  const start = await cameraPosition();
  const target = await page.evaluate('window.coasterViewer.controls.target.toArray()');
  const distance = (p) => Math.hypot(p[0] - target[0], p[1] - target[1], p[2] - target[2]);
  const mouse = (type, x, y, extra = {}) =>
    page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', pointerType: 'mouse', ...extra });
  await mouse('mouseMoved', 600, 350, { button: 'none' });
  await mouse('mousePressed', 600, 350, { buttons: 1, clickCount: 1 });
  for (let x = 620; x <= 900; x += 20) await mouse('mouseMoved', x, 350, { buttons: 1 });
  await mouse('mouseReleased', 900, 350, { buttons: 0, clickCount: 1 });
  await sleep(1000); // let the damping settle
  const end = await cameraPosition();
  const moved = Math.hypot(end[0] - start[0], end[1] - start[1], end[2] - start[2]);
  assert.ok(moved > distance(start) * 0.3, `the camera swung round the track (moved ${moved.toFixed(1)} m)`);
  assert.ok(Math.abs(distance(end) - distance(start)) < distance(start) * 0.05, 'orbiting keeps the distance');
  assert.ok(Math.abs(end[1] - start[1]) < distance(start) * 0.1, 'a sideways drag keeps the height');
});

test('AC5: after orbiting, the next ordinary step: the mouse wheel zooms towards the track, still aimed at it', async () => {
  const target = await page.evaluate('window.coasterViewer.controls.target.toArray()');
  const distance = (p) => Math.hypot(p[0] - target[0], p[1] - target[1], p[2] - target[2]);
  const start = await cameraPosition();
  for (let i = 0; i < 5; i++) {
    await page.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 600, y: 350, deltaX: 0, deltaY: -200 });
  }
  await sleep(1000); // let the damping settle
  const end = await cameraPosition();
  assert.ok(distance(end) < distance(start) * 0.8,
    `zoomed in from ${distance(start).toFixed(1)} to ${distance(end).toFixed(1)} m`);
  assert.deepEqual(await page.evaluate('window.coasterViewer.controls.target.toArray()'), target);
  const pixels = await canvasPixels();
  assert.ok(pixels.track > pixels.total * 0.002, `the track is still drawn: ${pixels.track} yellow pixels`);
  console.log(`coaster viewer zoomed: ${await keepScreenshot('coaster-viewer-zoom.png')}`);
});

test('AC7: what a crawl of the demo page would see: no script error and no error message on the page', async () => {
  assert.deepEqual(page.errors, []);
  assert.equal(await page.evaluate('document.querySelector(".coaster-viewer-error")'), null);
  assert.equal(await page.evaluate('document.querySelectorAll("canvas.coaster-viewer").length'), 1);
});

test('AC6: after the canvas shows, the next ordinary step: the page opens another file at another size and draws it', async () => {
  await openDemo('file=../../../../demo-data/thunder-loop-rev1.coaster&width=800&height=500');
  assert.deepEqual(page.errors, []);
  assert.equal(await page.evaluate('window.coasterViewer.error ?? null'), null);
  const pixels = await canvasPixels();
  assert.ok(pixels.width >= 800 && pixels.width < 1200 && pixels.height >= 500 && pixels.height < 700,
    `canvas at the new size, got ${pixels.width}x${pixels.height}`);
  assert.ok(pixels.track > pixels.total * 0.002, `rev1's yellow track is drawn: ${pixels.track} of ${pixels.total}`);
  console.log(`coaster viewer rev1: ${await keepScreenshot('coaster-viewer-rev1.png')}`);
});
