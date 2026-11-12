// F315: lint of the scream score rules. The feature is PHP only, so lint is `php -l` on every PHP file under
// enterprise/src/ScreamScore (the InMemory versions included). Needs the php CLI (8.1+).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(enterpriseDir, 'src/ScreamScore');

const phpFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return phpFiles(path);
    return entry.name.endsWith('.php') ? [path] : [];
  });

test('AC4: php -l finds no error in any PHP file under enterprise/src/ScreamScore', () => {
  const files = phpFiles(srcDir);
  assert.ok(files.length >= 8, `expected the service, its interfaces and the InMemory versions, found ${files.length}`);
  const errors = files
    .map((file) => ({ file, run: spawnSync('php', ['-l', file], { encoding: 'utf8' }) }))
    .filter(({ run }) => run.status !== 0)
    .map(({ file, run }) => `${relative(enterpriseDir, file)}: ${(run.stdout + run.stderr).trim()}`);
  assert.deepEqual(errors, []);
});
