// F84: the coaster browser tests give headless Chromium time to start on a loaded machine (under heavy.sh's nice and
// ionice it took over 10 s, and every browser test of the file went red with it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = dirname(fileURLToPath(import.meta.url));

for (const file of ['coaster-ride-browser.mjs', 'coaster-viewer.test.mjs']) {
  test(`AC1: ${file} waits up to 60 s for the DevTools port and stops early with the exit code if Chromium exits`, () => {
    const source = readFileSync(join(testsDir, file), 'utf8');
    const wait = source.match(/for \(let i = 0; i < (\d+) && !existsSync\(portFile\) && (\w+)\.exitCode === null; i\+\+\) await sleep\((\d+)\);/);
    assert.ok(wait, 'the start loop also stops when Chromium has exited');
    assert.ok(Number(wait[1]) * Number(wait[3]) >= 60_000, `waits ${Number(wait[1]) * Number(wait[3])} ms`);
    assert.match(source, /started with its DevTools port \(exit code \$\{\w+\.exitCode\}\)/);
  });
}
