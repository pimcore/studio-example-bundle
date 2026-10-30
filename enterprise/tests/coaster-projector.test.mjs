// F80: the coaster viewer tuned for the projector: it draws on demand, stops when hidden, caps the drawing buffer at
// 1.5x the CSS size and gives everything back when the side-by-side review closes. Run (node 24 needs the glob; the
// viewer's three.js first: npm ci in enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The browser tests drive headless Chromium over the DevTools protocol (coaster-ride-browser.mjs) on demo.html,
// ride.html and pair.html. The frame time on the laptop itself is measured apart (F77, F79), not here.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import { serve, launchChromium, closeAll } from './coaster-ride-browser.mjs';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const viewerDir = join(enterpriseDir, 'assets/shared/coaster/viewer');
const { capPixelRatio, MAX_PIXEL_RATIO } = await import(join(viewerDir, 'display.mjs'));

test('AC3: the pixel ratio is the window\'s or the one asked for, never more than 1.5', () => {
  assert.equal(MAX_PIXEL_RATIO, 1.5);
  assert.equal(capPixelRatio(undefined, { devicePixelRatio: 1 }), 1);
  assert.equal(capPixelRatio(undefined, { devicePixelRatio: 1.25 }), 1.25);
  assert.equal(capPixelRatio(undefined, { devicePixelRatio: 2 }), 1.5, 'a retina laptop');
  assert.equal(capPixelRatio(undefined, { devicePixelRatio: 3 }), 1.5);
  assert.equal(capPixelRatio(3, { devicePixelRatio: 1 }), 1.5, 'an explicit ratio is capped too');
  assert.equal(capPixelRatio(1, { devicePixelRatio: 2 }), 1, 'a lower one is kept');
  assert.equal(capPixelRatio(undefined, undefined), 1, 'no window: 1');
  assert.equal(capPixelRatio(0, undefined), 1, 'nonsense: 1');
});

// --- headless Chromium -------------------------------------------------------------------------------------------

let port;
let page;

before(async () => {
  port = await serve();
  page = await launchChromium();
});

after(closeAll);

// Opens one of the viewer's pages and waits until it has mounted.
const open = async (file, query = '') => {
  await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/assets/shared/coaster/viewer/${file}?${query}` });
  await sleep(200);
  for (let i = 0; i < 300; i++) {
    if (await page.evaluate('document.body?.dataset.ready === "true"').catch(() => false)) return;
    await sleep(100);
  }
  assert.fail(`${file} never got ready: ${JSON.stringify(page.errors.map((e) => e.exception?.description))}`);
};
const until = async (check, seconds, what) => {
  for (let i = 0; i < seconds * 10; i++) {
    if (await check()) return;
    await sleep(100);
  }
  assert.fail(`${what} within ${seconds} s`);
};
const mouse = (type, x, y, extra = {}) =>
  page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', pointerType: 'mouse', ...extra });

test('AC1: in the browser the orbit view stops drawing once the camera is still, and draws again when it moves', async () => {
  await open('demo.html', 'width=1000&height=600');
  const viewer = 'window.coasterViewer';
  await until(() => page.evaluate(`!${viewer}.looping()`), 10, 'the loop stopped after the first frame');
  const idle = await page.evaluate(`${viewer}.renders()`);
  assert.ok(idle >= 1, 'the track was drawn');
  await sleep(2200);
  assert.equal(await page.evaluate(`${viewer}.renders()`), idle, 'no redraw while the camera is idle for 2 s');

  // the next ordinary step: the user drags, the view follows, then settles and stops drawing again
  await mouse('mouseMoved', 500, 300, { button: 'none' });
  await mouse('mousePressed', 500, 300, { buttons: 1, clickCount: 1 });
  for (let x = 520; x <= 700; x += 20) await mouse('mouseMoved', x, 300, { buttons: 1 });
  await mouse('mouseReleased', 700, 300, { buttons: 0, clickCount: 1 });
  const dragged = await page.evaluate(`${viewer}.renders()`);
  assert.ok(dragged > idle, `dragging draws (${idle} → ${dragged} frames)`);
  await until(() => page.evaluate(`!${viewer}.looping()`), 15, 'the damping settled and the loop stopped');
  const settled = await page.evaluate(`${viewer}.renders()`);
  await sleep(2200);
  assert.equal(await page.evaluate(`${viewer}.renders()`), settled, 'idle again: no redraw for 2 s');
  assert.deepEqual(page.errors, []);
});

test('AC1: in the browser a standing ride draws nothing while it waits for Play', async () => {
  await open('ride.html', 'width=800&height=500');
  const before = await page.evaluate('window.coasterRide.renders()');
  assert.equal(await page.evaluate('window.coasterRide.looping()'), false);
  await sleep(2200);
  assert.equal(await page.evaluate('window.coasterRide.renders()'), before, 'no redraw in 2 s');
});

test('AC2: in the browser a hidden ride stops its animation loop, and rides on from where it was when shown again', async () => {
  await open('ride.html', 'width=800&height=500&speed=10&autoplay=1');
  const ride = 'window.coasterRide';
  await until(() => page.evaluate(`${ride}.looping() && ${ride}.state().distance > 2`), 30, 'the ride runs');

  // the host hides it (a collapsed panel, another tab of the review)
  await page.evaluate(`document.getElementById('viewer').style.display = 'none'`);
  await until(() => page.evaluate(`!${ride}.looping()`), 5, 'the hidden ride stopped its loop');
  const hidden = await page.evaluate(`({ renders: ${ride}.renders(), distance: ${ride}.state().distance })`);
  await sleep(1000);
  assert.deepEqual(await page.evaluate(`({ renders: ${ride}.renders(), distance: ${ride}.state().distance })`), hidden,
    'hidden: no frame drawn, the train waits');
  assert.equal(await page.evaluate(`${ride}.state().playing`), true, 'still playing, only not drawn');

  // the next ordinary step: shown again, the ride goes on from there
  await page.evaluate(`document.getElementById('viewer').style.display = ''`);
  await until(() => page.evaluate(`${ride}.looping() && ${ride}.state().distance > ${hidden.distance + 2}`), 30,
    'the ride goes on once shown');
  const resumed = await page.evaluate(`${ride}.state().distance`);
  assert.ok(resumed < hidden.distance + 10, `no jump: ${hidden.distance.toFixed(1)} → ${resumed.toFixed(1)} m`);

  // a hidden page (the presenter switches tabs) stops it too
  await page.evaluate(`(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);
  await until(() => page.evaluate(`!${ride}.looping()`), 5, 'a hidden page stopped the loop');
  await page.evaluate(`(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);
  await until(() => page.evaluate(`${ride}.looping()`), 5, 'the page shown again, the loop runs');
  assert.deepEqual(page.errors, []);
});

test('AC2: in the browser the hidden side-by-side review stops both rides and its bar', async () => {
  await open('pair.html', 'speed=10');
  const pair = 'window.coasterPair';
  await page.evaluate(`${pair}.play()`);
  await until(() => page.evaluate(`${pair}.looping() && ${pair}.rides.every((r) => r.looping())`), 10, 'both ride');
  await page.evaluate(`document.getElementById('pair').style.display = 'none'`);
  await until(() => page.evaluate(`!${pair}.looping() && ${pair}.rides.every((r) => !r.looping())`), 5,
    'hidden: both rides and the bar stopped');
  await page.evaluate(`document.getElementById('pair').style.display = ''`);
  await until(() => page.evaluate(`${pair}.looping() && ${pair}.rides.every((r) => r.looping())`), 10,
    'shown again: both ride on');
  await page.evaluate(`${pair}.pause()`);
  assert.deepEqual(page.errors, []);
});

// The drawing buffer against the canvas's CSS size, for every canvas on the page.
const buffers = () =>
  page.evaluate(`[...document.querySelectorAll('canvas')].map((c) => ({
    x: c.width / parseFloat(c.style.width), y: c.height / parseFloat(c.style.height),
  }))`);

test('AC3: in the browser on a 2x screen every viewer draws at 1.5x its CSS size, not more', async () => {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  try {
    for (const [file, query] of [['demo.html', 'width=800&height=500'], ['demo.html', ''], ['ride.html', ''], ['pair.html', '']]) {
      await open(file, query);
      assert.equal(await page.evaluate('window.devicePixelRatio'), 2);
      const ratios = await buffers();
      assert.ok(ratios.length >= 1, `${file} has a canvas`);
      for (const r of ratios) {
        assert.ok(r.x <= 1.5 && r.y <= 1.5, `${file}?${query}: buffer at ${r.x}x${r.y} the CSS size`);
        assert.ok(r.x > 1.45, `${file}?${query}: still sharper than 1x (${r.x})`);
      }
    }
    // after a resize (the window follows the projector) the cap holds
    await open('demo.html');
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1000, height: 600, deviceScaleFactor: 2, mobile: false });
    await until(async () => (await page.evaluate('window.coasterViewer.canvas.style.width')) === '1000px', 10, 'resized');
    for (const r of await buffers()) assert.ok(r.x <= 1.5 && r.y <= 1.5, `resized: ${r.x}x${r.y}`);

    // a host asking for 3x gets 1.5x too
    await open('pair.html');
    const asked = await page.evaluate(`(async () => {
      const { mountRidePair } = await import('./index.mjs');
      const host = document.createElement('div');
      document.body.append(host);
      const file = await (await fetch('../../../../demo-data/thunder-loop-rev2.coaster')).json();
      const pair = mountRidePair(host, { left: { file, title: 'A' }, right: { file, title: 'B' }, pixelRatio: 3 });
      const result = pair.rides.map((r) => r.canvas.width / parseFloat(r.canvas.style.width));
      pair.dispose();
      return result;
    })()`);
    assert.deepEqual(asked, [1.5, 1.5]);
  } finally {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
  assert.deepEqual(page.errors, []);
});

test('AC4: in the browser the side-by-side review opened and closed 10 times disposes both viewers every time', async () => {
  await open('pair.html');
  const result = await page.evaluate(`(async () => {
    const { createRidePair, pairMarks } = await import('./index.mjs');
    const load = async (url) => (await fetch(url)).json();
    const live = await load('../../../../demo-data/thunder-loop-rev2.coaster');
    const proposed = await load('../../../../demo-data/thunder-loop-rev3.coaster');
    const marks = pairMarks(live.track, proposed.track);
    window.coasterPair.dispose(); // the page's own pair goes first, so only the review's count below
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

    // The review tab's component (react.mjs) with just enough React: an effect on open, its cleanup on close.
    let cleanup;
    const React = {
      createElement: (type, props) => ({ type, props }),
      useRef: () => (React.ref ??= { current: null }),
      useEffect: (effect) => { React.effect = effect; },
    };
    const RidePair = createRidePair(React);
    const opened = [];
    for (let i = 0; i < 10; i++) {
      const host = document.createElement('div');
      host.style.width = '1000px';
      document.body.append(host);
      React.ref = { current: host };
      RidePair({ left: { file: live, title: 'Live', marks: marks.left }, right: { file: proposed, title: 'Proposed', marks: marks.right }, speed: 20 });
      cleanup = React.effect();
      const canvases = [...host.querySelectorAll('canvas')];
      const contexts = canvases.map((c) => c.getContext('webgl2') ?? c.getContext('webgl'));
      host.querySelector('.coaster-ride-pair-controls button[name=play]').click();
      await frame();
      await frame();
      opened.push({ canvases, contexts, drawn: contexts.every((gl) => gl && !gl.isContextLost()) });
      cleanup(); // the reviewer closes the review
      host.remove();
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      opens: opened.length,
      canvasesPerOpen: opened.map((o) => o.canvases.length),
      drawnWhileOpen: opened.every((o) => o.drawn),
      leftInPage: document.querySelectorAll('canvas, .coaster-ride-pair').length,
      contextsLost: opened.flatMap((o) => o.contexts.map((gl) => gl.isContextLost())),
    };
  })()`);
  assert.equal(result.opens, 10);
  assert.deepEqual(result.canvasesPerOpen, Array(10).fill(2), 'two viewers per open');
  assert.equal(result.drawnWhileOpen, true, 'each time both viewers had a live WebGL context while open');
  assert.equal(result.leftInPage, 0, 'no canvas and no pair left in the page');
  assert.deepEqual(result.contextsLost, Array(20).fill(true), 'all 20 WebGL contexts given back');
  assert.deepEqual(page.errors, []);
});
