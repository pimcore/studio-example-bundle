// F54: the review tab's side-by-side preview, revision 2 (live) and the proposed revision 3 as two rides under one
// Play, the changed elements marked. Run (node 24 needs the glob; the viewer's three.js first: npm ci in
// enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The preview's logic (side-by-side-model.ts) runs in Node; the pair of rides (viewer/pair.mjs) in headless Chromium
// through viewer/pair.html (CHROMIUM, else chromium on the PATH), with real clicks. The screenshot of both rides is kept
// in COASTER_PAIR_SCREENSHOT (default: coaster-pair.png in the system's temp folder).
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const reviewDir = join(enterpriseDir, 'assets/studio/js/src/coaster-review');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const read = (path) => readFileSync(join(reviewDir, path), 'utf8');
const model = await import(join(reviewDir, 'side-by-side/side-by-side-model.ts'));
const review = await import(join(reviewDir, 'coaster-review-model.ts'));
const { pairMarks } = await import(join(viewerDir, 'pair.mjs'));
const { createRidePair } = await import(join(viewerDir, 'react.mjs'));
const { buildCoasterScene } = await import(join(viewerDir, 'scene.mjs'));

const rev2Text = readFileSync(join(enterpriseDir, 'demo-data/thunder-loop-rev2.coaster'), 'utf8');
const rev2 = JSON.parse(rev2Text);
const rev3 = JSON.parse(readFileSync(join(enterpriseDir, 'demo-data/thunder-loop-rev3.coaster'), 'utf8'));

// Revision 3 as the change set records it (F52, as in coaster-review.test.mjs): the two changed leaves plus the element
// list as a JSON entry, keyed by leaf address.
const entry = (name, type, data) => ({ name, language: '', type, data });
const leaf = (name) => `metadata.${name}.`;
const LOOP = 'coaster.track.loop.1.diameter';
const HEIGHT = 'coaster.track.liftHill.1.height';
const slot = () => ({
  shape: 'entry-set',
  current: {
    [leaf(LOOP)]: entry(LOOP, 'input', '24'),
    [leaf(HEIGHT)]: entry(HEIGHT, 'input', '45'),
    [leaf('coaster.track')]: entry('coaster.track', 'textarea', JSON.stringify(rev2.track)),
  },
  proposed: {
    [leaf(LOOP)]: entry(LOOP, 'input', '30'),
    [leaf(HEIGHT)]: entry(HEIGHT, 'input', '52'),
    [leaf('coaster.track')]: entry('coaster.track', 'textarea', JSON.stringify(rev3.track)),
  },
});
const LIFT_HILL = rev2.track.findIndex((element) => element.type === 'liftHill');
const FIRST_LOOP = rev2.track.findIndex((element) => element.type === 'loop');

test('AC1: the review shows two rides, revision 2 as it is live and revision 3 as the change set proposes it', () => {
  const pair = model.previewPair(rev2Text, slot());
  assert.equal(pair.left.title, 'Revision 2 (live)');
  assert.equal(pair.right.title, 'Revision 3 (proposed)');
  assert.deepEqual(pair.left.file, rev2);
  assert.deepEqual(pair.right.file, rev3, 'the proposal is revision 3 as a whole file');

  // the changed elements are marked on both sides: the lift hill and the first loop
  assert.deepEqual(pair.left.marks, [LIFT_HILL, FIRST_LOOP]);
  assert.deepEqual(pair.right.marks, [LIFT_HILL, FIRST_LOOP]);
  const { marks } = buildCoasterScene(pair.right.file, { marks: pair.right.marks });
  assert.deepEqual(marks.children.map((mesh) => mesh.name),
    [`mark-${LIFT_HILL}-left`, `mark-${LIFT_HILL}-right`, `mark-${FIRST_LOOP}-left`, `mark-${FIRST_LOOP}-right`]);
  assert.equal(buildCoasterScene(rev2).scene.getObjectByName('coaster-marks'), undefined, 'no marks, no mark group');

  // train and meta leaves of the change set reach the proposal too; an added or removed element is marked on its side
  const more = slot();
  more.proposed[leaf('coaster.train.cars')] = entry('coaster.train.cars', 'input', '7');
  const withCars = model.previewPair(rev2Text, more);
  assert.equal(withCars.right.file.train.cars, 7);
  assert.equal(withCars.left.file.train.cars, rev2.train.cars);
  assert.deepEqual(pairMarks(rev2.track, [...rev2.track, { type: 'loop', diameter: 18 }]), { left: [], right: [rev2.track.length] });
  assert.match(model.previewPair('{ nope', slot()).error, /not a \.coaster file/);
});

test('AC1: the review tab puts both rides above Change Control\'s diff table, read from the asset and the change set', () => {
  const tab = read('components/coaster-review-tab.tsx');
  assert.match(tab, /import \{ CoasterSideBySide \} from '..\/side-by-side\/coaster-side-by-side'/);
  assert.ok(tab.indexOf('<CoasterSideBySide') < tab.indexOf('<SlotDiffTable'), 'the rides come first');
  const component = read('side-by-side/coaster-side-by-side.tsx');
  // the live file comes by the download endpoint: the text endpoint answers 422 for a .coaster (Asset\\Unknown)
  assert.match(component, /`\/pimcore-studio\/api\/assets\/\$\{assetId\}\/download`/);
  assert.match(component, /fetch\(liveFileUrl\(assetId\), \{ credentials: 'include' \}\)/);
  assert.match(component, /if \(!response\.ok\) throw/);
  assert.doesNotMatch(component, /useAssetGetTextDataByIdQuery/);
  assert.match(component, /previewPair\(text, slot\)/);
  assert.match(component, /createRidePair\(React\)/);

  // the React wrapper mounts the pair into its element and takes it down again
  const effects = [];
  const fakeReact = {
    createElement: (type, props) => ({ type, props }),
    useRef: () => ({ current: null }),
    useEffect: (effect, deps) => effects.push({ effect, deps }),
  };
  const RidePair = createRidePair(fakeReact);
  const element = RidePair({ left: { file: '{ nope', title: 'Live' }, right: { file: '{ nope', title: 'Proposed' } });
  assert.equal(element.props.className, 'coaster-ride-pair-host');
  assert.equal(effects.length, 1);
});

test('AC3: unticking the height row leaves both rides as they are: the preview reads the change set, not the ticks', () => {
  const before = model.previewPair(rev2Text, slot());
  // what the reviewer's unticked height row does: the merge would keep the lift hill at 45 m ...
  const row = (name, current, proposed, type = 'input') => ({ key: leaf(name), name, type, current, proposed, changed: true });
  const rows = [row(LOOP, '24', '30'), row(HEIGHT, '45', '52'),
    row('coaster.track', JSON.stringify(rev2.track), JSON.stringify(rev3.track), 'textarea')];
  const merged = review.mergeRequest('cs-3', rows, [leaf(HEIGHT)]).changeSetReviewActionParameters;
  assert.equal(JSON.parse(merged.amendments[leaf('coaster.track')].data)[LIFT_HILL].height, 45);
  // ... the slot stays the same, so the preview does: the proposal keeps its 52 m lift hill
  const afterUntick = model.previewPair(rev2Text, slot());
  assert.deepEqual(afterUntick, before);
  assert.equal(afterUntick.right.file.track[LIFT_HILL].height, 52);

  // the preview takes no ticks at all: its props are the asset and the slot, and the tab hands it nothing else
  const component = read('side-by-side/coaster-side-by-side.tsx');
  assert.match(component, /interface CoasterSideBySideProps \{[^}]*readonly assetId: number[^}]*readonly slot: MetadataSlot \| undefined\n\}/);
  assert.equal(model.previewPair.length, 2, 'previewPair(liveText, slot)');
  const tab = read('components/coaster-review-tab.tsx');
  const element = tab.slice(tab.indexOf('<CoasterSideBySide'), tab.indexOf('/>', tab.indexOf('<CoasterSideBySide')));
  assert.doesNotMatch(element, /excluded/);
  assert.match(element, /slot=\{ slot \}/);
});

// --- headless Chromium -------------------------------------------------------------------------------------------

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
let server;
let port;
let browser; // { process, profile, session }

// Serves the enterprise folder, so the pair page reaches the viewer, the geometry, the diff and the demo data.
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

// A DevTools protocol session on a new headless Chromium's first page (as in coaster-ride.test.mjs).
async function launchChromium() {
  const profile = mkdtempSync(join(tmpdir(), 'coaster-pair-'));
  const binary = process.env.CHROMIUM ?? 'chromium';
  const child = spawn(binary, [
    '--headless=new', '--no-sandbox', '--no-first-run', '--disable-gpu-sandbox', '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader', '--window-size=1280,800', '--hide-scrollbars', '--remote-debugging-port=0',
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: 'ignore' });
  browser = { process: child, profile };
  const portFile = join(profile, 'DevToolsActivePort');
  // Up to 60 s, as in coaster-ride-browser.mjs (F84): Chromium starts slowly on a loaded machine.
  for (let i = 0; i < 600 && !existsSync(portFile) && child.exitCode === null; i++) await sleep(100);
  assert.ok(existsSync(portFile), `${binary} started with its DevTools port (exit code ${child.exitCode})`);
  // Chromium creates the file before it writes the port into it (an empty read went to port 80, F80): wait for it.
  const readPort = () => readFileSync(portFile, 'utf8').split('\n')[0].trim();
  for (let i = 0; i < 100 && !readPort() && child.exitCode === null; i++) await sleep(100);
  const devtools = readPort();
  assert.ok(devtools, `${binary} wrote its DevTools port into ${portFile}`);
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
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  const session = { send, evaluate, errors, close: () => socket.close() };
  session.open = async (query) => {
    await send('Page.navigate', { url: `http://127.0.0.1:${port}/assets/shared/coaster/viewer/pair.html?${query}` });
    await sleep(200);
    for (let i = 0; i < 300; i++) {
      if (await evaluate('document.body?.dataset.ready === "true"').catch(() => false)) return;
      await sleep(100);
    }
    assert.fail(`the pair page never got ready: ${JSON.stringify(errors.map((e) => e.exception?.description))}`);
  };
  // A real mouse click on a button of the shared bar, at its place on the screen.
  session.click = async (name) => {
    const { x, y } = await evaluate(`(() => {
      const b = document.querySelector('.coaster-ride-pair-controls button[name=${name}]');
      b.scrollIntoView({ block: 'center' });
      const r = b.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    for (const type of ['mousePressed', 'mouseReleased']) {
      await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
    }
  };
  browser.session = session;
  return session;
}

let page;
const states = () => page.evaluate('window.coasterPair.state().rides');
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
});

after(async () => {
  if (browser) {
    browser.session?.close();
    if (browser.process.exitCode === null) {
      const exited = new Promise((resolve) => browser.process.once('exit', resolve));
      browser.process.kill();
      await exited;
    }
    rmSync(browser.profile, { recursive: true, force: true, maxRetries: 5 });
  }
  server?.close();
});

test('AC1: in the browser two rides stand side by side, one per revision, with the changed elements marked', async () => {
  await page.open('');
  const view = await page.evaluate(`(() => [...document.querySelectorAll('.coaster-ride-pair-side')].map((side) => {
    const canvas = side.querySelector('canvas');
    const r = canvas.getBoundingClientRect();
    return { title: side.querySelector('.coaster-ride-pair-title').textContent, x: r.x, width: r.width, height: r.height };
  }))()`);
  assert.equal(view.length, 2);
  assert.deepEqual(view.map((side) => side.title),
    ['Revision 2 (live)2 changed elements marked', 'Revision 3 (proposed)2 changed elements marked']);
  assert.ok(view[0].width > 300 && view[0].height > 150, `the left ride is drawn (${view[0].width}x${view[0].height})`);
  assert.equal(view[1].width, view[0].width, 'both the same size');
  assert.ok(view[1].x >= view[0].x + view[0].width, 'side by side');
  assert.deepEqual(await page.evaluate('window.coasterPair.rides.map((r) => r.scene.getObjectByName("coaster-marks").children.length)'), [4, 4]);
  // each ride's own buttons give way to the shared bar
  assert.deepEqual(await page.evaluate('[...document.querySelectorAll(".coaster-ride-controls")].map((b) => b.style.display)'), ['none', 'none']);
  assert.deepEqual(page.errors, []);
});

test('AC2: in the browser Play starts both rides together, Pause stops both, Restart takes both back to the station', async () => {
  await page.open('speed=40');
  const standing = await states();
  assert.deepEqual(standing.map((s) => [s.playing, s.distance]), [[false, 0], [false, 0]]);

  await page.click('play');
  const started = await states();
  assert.deepEqual(started.map((s) => s.playing), [true, true], 'one click, both trains ride');
  assert.equal(await page.evaluate('document.querySelector(".coaster-ride-pair-controls button[name=play]").textContent'), 'Pause');
  await until(async () => (await states()).every((s) => s.distance > 20), 60, 'both trains rode 20 m');

  await page.click('play');
  const paused = await states();
  assert.deepEqual(paused.map((s) => s.playing), [false, false], 'Pause stops both');
  // the same speed from the same click: the trains are where the other is, give or take a frame (40 m/s, 0.1 s)
  assert.ok(Math.abs(paused[0].distance - paused[1].distance) <= 4, `together: ${paused[0].distance} m and ${paused[1].distance} m`);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  const file = process.env.COASTER_PAIR_SCREENSHOT ?? join(tmpdir(), 'coaster-pair.png');
  writeFileSync(file, Buffer.from(data, 'base64'));
  console.log(`coaster pair screenshot: ${file}`);
  await sleep(1000);
  assert.deepEqual((await states()).map((s) => s.distance), paused.map((s) => s.distance), 'paused: both stand');

  await page.click('restart');
  const restarted = await states();
  assert.deepEqual(restarted.map((s) => s.playing), [true, true], 'and both ride again');
  for (const s of restarted) assert.ok(s.distance <= 4, `Restart: back in the station, at ${s.distance} m`);
  assert.deepEqual(page.errors, []);
});
