// F91: the example bundle's container extension is registered under its config key (Configuration::ROOT_NODE,
// `pimcore_studio_example_bundle`), so Pimcore boots with Studio Dashboards installed: prepend() asks the container
// for the extension by that key. The boot tests run tests/DependencyInjection/extension-alias-check.php against a
// Pimcore install's vendor/ (PIMCORE_VENDOR_AUTOLOAD, else /var/www/html/vendor/autoload.php); they skip without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = join(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (path) => readFileSync(join(repo, path), 'utf8');
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const hasPhp = (() => {
  try {
    execFileSync('php', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();
const bootSkip = !hasPhp ? 'no php CLI' : !existsSync(autoload) ? `no Pimcore vendor at ${autoload}` : false;

let booted;
const boot = () => {
  if (!booted) {
    const dir = mkdtempSync(join(tmpdir(), 'f91-'));
    try {
      const out = execFileSync('php', [join(repo, 'tests/DependencyInjection/extension-alias-check.php'), autoload, dir], {
        encoding: 'utf8',
      });
      booted = JSON.parse(out.trim().split('\n').pop());
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  return booted;
};

test('AC2: the extension declares Configuration::ROOT_NODE as its alias and the bundle accepts it', () => {
  assert.match(read('src/DependencyInjection/Configuration.php'), /ROOT_NODE = 'pimcore_studio_example_bundle'/);
  const extension = read('src/DependencyInjection/PimcoreStudioExampleExtension.php');
  assert.match(extension, /function getAlias\(\): string\s*\{\s*return Configuration::ROOT_NODE;/);
  // Symfony's Bundle::getContainerExtension() throws for a non-default alias, so the bundle creates the extension.
  assert.match(
    read('src/PimcoreStudioExampleBundle.php'),
    /function getContainerExtension\(\)[^{]*\{[^}]*new PimcoreStudioExampleExtension\(\)/,
  );
});

test('AC2: the extension built by the bundle has the alias Configuration::ROOT_NODE', { skip: bootSkip }, () => {
  const result = boot();
  assert.equal(result.alias, result.rootNode, result.error);
  assert.equal(result.alias, 'pimcore_studio_example_bundle');
});

test('AC1, AC2: a ContainerBuilder with the dashboards extension present prepends and loads the bundle config', { skip: bootSkip }, () => {
  const result = boot();
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.prepended, true);
  assert.deepEqual(result.dashboardsWidgetTypes, ['top_assets']);
  assert.equal(result.loaded, true);
  // The config written under `pimcore_studio_example_bundle` reaches the bundle's parameters.
  assert.deepEqual(result.widgets, ['talk']);
});
