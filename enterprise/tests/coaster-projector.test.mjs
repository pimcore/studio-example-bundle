// F80: the coaster viewer tuned for the projector: it draws on demand, stops when hidden, caps the drawing buffer at
// 1.5x the CSS size. Run (node 24 needs the glob; the
// viewer's three.js first: npm ci in enterprise/assets/shared/coaster/viewer):
// node --test 'enterprise/tests/*.test.mjs'
// The browser tests drive headless Chromium over the DevTools protocol (coaster-ride-browser.mjs) on demo.html,
// and ride.html. The frame time on the laptop itself is measured apart (F77, F79), not here.
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
  // small, so headless Chromium's software WebGL draws the damping's frames quickly
  await open('demo.html', 'width=480&height=300');
  const viewer = 'window.coasterViewer';
  await until(() => page.evaluate(`!${viewer}.looping()`), 10, 'the loop stopped after the first frame');
  const idle = await page.evaluate(`${viewer}.renders()`);
  assert.ok(idle >= 1, 'the track was drawn');
  await sleep(2200);
  assert.equal(await page.evaluate(`${viewer}.renders()`), idle, 'no redraw while the camera is idle for 2 s');

  // the next ordinary step: the user drags, the view follows, then settles and stops drawing again
  await mouse('mouseMoved', 200, 150, { button: 'none' });
  await mouse('mousePressed', 200, 150, { buttons: 1, clickCount: 1 });
  for (let x = 210; x <= 280; x += 10) await mouse('mouseMoved', x, 150, { buttons: 1 });
  await mouse('mouseReleased', 280, 150, { buttons: 0, clickCount: 1 });
  const dragged = await page.evaluate(`${viewer}.renders()`);
  assert.ok(dragged > idle, `dragging draws (${idle} → ${dragged} frames)`);
  // the damping eases out over its frames; a software renderer draws them slowly
  await until(() => page.evaluate(`!${viewer}.looping()`), 180, 'the damping settled and the loop stopped');
  const settled = await page.evaluate(`${viewer}.renders()`);
  console.log(`orbit view: ${settled - idle} frames from the drag until the camera stood still`);
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

// The drawing buffer against the canvas's CSS size, for every canvas on the page.
const buffers = () =>
  page.evaluate(`[...document.querySelectorAll('canvas')].map((c) => ({
    x: c.width / parseFloat(c.style.width), y: c.height / parseFloat(c.style.height),
  }))`);

test('AC3: in the browser on a 2x screen every viewer draws at 1.5x its CSS size, not more', async () => {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 2, mobile: false });
  try {
    for (const [file, query] of [['demo.html', 'width=800&height=500'], ['demo.html', ''], ['ride.html', '']]) {
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
    await open('ride.html');
    const asked = await page.evaluate(`(async () => {
      const { mountCoasterRide } = await import('./index.mjs');
      const host = document.createElement('div');
      host.style.width = '480px';
      host.style.height = '300px';
      document.body.append(host);
      const file = await (await fetch('../../../../demo-data/thunder-loop-rev2.coaster')).json();
      const ride = mountCoasterRide(host, { file, pixelRatio: 3 });
      const result = ride.canvas.width / parseFloat(ride.canvas.style.width);
      ride.dispose();
      return result;
    })()`);
    assert.equal(asked, 1.5);
  } finally {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
  assert.deepEqual(page.errors, []);
});
