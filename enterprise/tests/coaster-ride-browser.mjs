// The ride page (enterprise/assets/shared/coaster/viewer/ride.html) in headless Chromium, for coaster-ride.test.mjs and
// the frame rate measurement in coaster-ride.perf.mjs (CHROMIUM, else chromium on the PATH): serve() serves the
// enterprise folder, launchChromium() starts a browser with a DevTools protocol session, closeAll() ends them all.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
let server;
let port;
const browsers = []; // { process, profile, session }

// Serves the enterprise folder, so the ride page reaches the geometry, the schema and the demo data.
export const serve = () =>
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
    server.listen(0, '127.0.0.1', () => resolve((port = server.address().port)));
  });

// A DevTools protocol session on a new headless Chromium's first page, over Node's built-in WebSocket.
// Headless Chromium paces frames by a virtual display that, with software WebGL (SwiftShader), holds even a page that
// only clears a 1280x720 canvas near 20 frames per second and this ride near 2. `unlimited` turns that limiter off
// (--disable-gpu-vsync, --disable-frame-rate-limit), so the frame rate is what the ride itself draws, as on a real
// screen up to its refresh; such a browser answers slowly while a page draws flat out, so only the measurement uses it.
export async function launchChromium({ unlimited = false } = {}) {
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

// Closes every browser launchChromium started, removes their profiles and stops the server.
export async function closeAll() {
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
}
