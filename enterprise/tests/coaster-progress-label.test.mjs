// F136: the ride's progress label ("0 m of 652 m") stays readable: on one line (white-space: nowrap) on a dark
// translucent pill like the buttons' shape, also at phone width (390 px) next to Restart. Run (the viewer's three.js
// first: npm ci in enterprise/assets/shared/coaster/viewer):
// node --test enterprise/tests/coaster-progress-label.test.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, launchChromium, closeAll } from './coaster-ride-browser.mjs';

let page;

before(async () => {
  await serve();
  page = await launchChromium();
});

after(closeAll);

// "rgba(r, g, b, a)" → { r, g, b, a }; "rgb(...)" has a = 1.
const parseColor = (css) => {
  const [r, g, b, a = 1] = css.match(/[\d.]+/g).map(Number);
  return { r, g, b, a };
};

test('AC1: the ride bar shows the progress label with white-space: nowrap and a dark translucent background', async () => {
  await page.open('width=1280&height=720');
  const layout = await page.progressLayout();
  assert.match(layout.text, /^0 m of \d+ m$/);
  assert.equal(layout.whiteSpace, 'nowrap');
  const { r, g, b, a } = parseColor(layout.background);
  assert.ok(a > 0 && a < 1, `translucent background: ${layout.background}`);
  assert.ok(Math.max(r, g, b) < 80, `dark background: ${layout.background}`);
  assert.deepEqual(page.errors, []);
});

test('AC2: at 390 px wide the label stays on one line next to Restart, also at the end of the ride', async () => {
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: false });
  try {
    await page.open('speed=60');
    const start = await page.assertProgressOneLine();
    assert.equal(start.viewport, 390);
    assert.match(start.text, /^0 m of \d+ m$/);
    assert.ok(start.label.right <= 390, `"${start.text}" fits in the 390 px view: right edge ${start.label.right}`);
    // The longest text the label shows, at the end of the ride (the ride stands, so nothing rewrites it).
    await page.evaluate(`document.querySelector('.coaster-ride-progress').textContent = 'Back in the station'`);
    await page.assertProgressOneLine();
    // Narrower still (a phone in a portal's padding), where a wrapping label breaks into two lines: it stays on one.
    await page.send('Emulation.setDeviceMetricsOverride', { width: 320, height: 700, deviceScaleFactor: 1, mobile: false });
    await page.open('speed=60');
    await page.assertProgressOneLine();
    assert.deepEqual(page.errors, []);
  } finally {
    await page.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  }
});
