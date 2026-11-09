// F24: the enterprise sub-bundle skeleton (DR-F5-1, answer D). Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = join(enterpriseDir, '..');
const read = (path) => readFileSync(path, 'utf8');
const bundleClass = 'Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\PimcoreStudioExampleEnterpriseBundle';

test('AC1: enterprise/composer.json declares the pimcore-bundle package, its two requirements and the bundle class', () => {
  const composer = JSON.parse(read(join(enterpriseDir, 'composer.json')));
  assert.equal(composer.type, 'pimcore-bundle');
  assert.equal(composer.name, 'pimcore/studio-example-enterprise-bundle');
  for (const pkg of ['pimcore/studio-example-bundle', 'pimcore/portal-engine']) {
    assert.ok(pkg in (composer.require ?? {}), `requires ${pkg}`);
  }
  assert.deepEqual(composer.extra?.pimcore?.bundles, [bundleClass]);

  // The class it names exists under the autoloaded namespace, and its extension loads config/*.yaml.
  const [prefix, srcDir] = Object.entries(composer.autoload['psr-4'])[0];
  assert.ok(bundleClass.startsWith(prefix));
  const classFile = join(enterpriseDir, srcDir, bundleClass.slice(prefix.length).replaceAll('\\', '/') + '.php');
  assert.match(read(classFile), /class PimcoreStudioExampleEnterpriseBundle extends AbstractPimcoreBundle/);
  const extension = read(join(enterpriseDir, srcDir, 'DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php'));
  assert.match(extension, /\/config/);
  assert.match(extension, /\*\.yaml/);
  assert.ok(existsSync(join(enterpriseDir, 'config/services.yaml')));
});

test('AC2: the root composer.json and assets/ are unchanged against BASE', () => {
  const composer = JSON.parse(read(join(rootDir, 'composer.json')));
  assert.equal(composer.name, 'pimcore/studio-example-bundle');
  assert.deepEqual(Object.keys(composer.require).sort(), [
    'pimcore/studio-backend-bundle',
    'pimcore/studio-dashboards-bundle',
    'pimcore/studio-ui-bundle',
  ]);

  const base = process.env.BASE || 'integration';
  const git = (...args) => execFileSync('git', ['-C', rootDir, ...args], { encoding: 'utf8' });
  git('rev-parse', '--verify', `${base}^{commit}`);
  assert.equal(git('show', `${base}:composer.json`), read(join(rootDir, 'composer.json')), 'composer.json byte-identical');
  assert.equal(git('diff', '--name-only', base, '--', 'assets/').trim(), '', 'assets/ unchanged');
});

test('AC3: enterprise/README.md lists the three install steps in order and the enterprise-access note', () => {
  const readme = read(join(enterpriseDir, 'README.md'));
  const steps = [
    readme.search(/"type":\s*"path"/),
    readme.search(/composer require pimcore\/studio-example-enterprise-bundle/),
    readme.search(/bin\/console cache:warmup/),
  ];
  for (const at of steps) assert.ok(at >= 0, 'step present');
  assert.ok(steps[0] < steps[1] && steps[1] < steps[2], 'steps in order');
  assert.match(readme, /enterprise access/i);
  assert.match(readme, /repo\.pimcore\.com/);
});

test('AC4: the root README.md links to enterprise/README.md', () => {
  assert.match(read(join(rootDir, 'README.md')), /\]\(enterprise\/README\.md\)/);
});
