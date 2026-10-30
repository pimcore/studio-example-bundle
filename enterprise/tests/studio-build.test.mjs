// F25: the enterprise sub-bundle's own Studio frontend build and entry point. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = join(enterpriseDir, '..');
const studioDir = join(enterpriseDir, 'assets/studio');
const read = (path) => readFileSync(path, 'utf8');

test('AC1: rsbuild.config.ts names the remote pimcore_studio_example_enterprise_bundle and exposes ./js/src/plugins.ts', () => {
  const config = read(join(studioDir, 'rsbuild.config.ts'));
  assert.match(config, /pluginModuleFederation\(\{[\s\S]*name:\s*'pimcore_studio_example_enterprise_bundle'/);
  assert.match(config, /exposes:\s*\{\s*'\.':\s*'\.\/js\/src\/plugins\.ts'/);
  assert.match(config, /'@pimcore\/studio-ui-bundle':\s*createDynamicRemote\('pimcore_studio_ui_bundle'\)/);
  assert.ok(existsSync(join(studioDir, 'js/src/plugins.ts')), 'the exposed module exists');
});

test('AC2: package.json pins exact versions, lists @pimcore/change-control-bundle and defines build and package-build', () => {
  const pkg = JSON.parse(read(join(studioDir, 'package.json')));
  const all = { ...pkg.dependencies, ...pkg.devDependencies };
  assert.ok('@pimcore/change-control-bundle' in all, 'lists @pimcore/change-control-bundle');
  assert.ok('@pimcore/studio-ui-bundle' in all, 'lists @pimcore/studio-ui-bundle');
  for (const [name, version] of Object.entries(all)) {
    assert.match(version, /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, `${name} pinned exactly (${version})`);
  }
  assert.match(pkg.scripts?.build ?? '', /rsbuild build/);
  assert.match(pkg.scripts?.['package-build'] ?? '', /studio-package-build .*--out-dir \.\.\/\.\.\/build-dist/);
});

test('AC3: studio.yaml tags the provider with pimcore_studio_ui.webpack_entry_point_provider and the class exists under src/Webpack', () => {
  const yaml = read(join(enterpriseDir, 'config/studio.yaml'));
  const fqcn = 'Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Webpack\\WebpackEntryPointProvider';
  const at = yaml.indexOf(`${fqcn}:`);
  assert.ok(at >= 0, 'provider service defined');
  assert.match(yaml.slice(at), /tags:\s*\n\s*- \{ name: pimcore_studio_ui\.webpack_entry_point_provider \}/);

  const php = read(join(enterpriseDir, 'src/Webpack/WebpackEntryPointProvider.php'));
  assert.match(php, /namespace Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Webpack;/);
  assert.match(php, /class WebpackEntryPointProvider implements BuildArchiveProviderInterface/);
  assert.match(php, /build-dist\/build\*\.zip/);
});

test('AC4: root assets/ and root composer.json are unchanged against BASE', () => {
  const base = process.env.BASE || 'integration';
  const git = (...args) => execFileSync('git', ['-C', rootDir, ...args], { encoding: 'utf8' });
  git('rev-parse', '--verify', `${base}^{commit}`);
  assert.equal(git('diff', '--name-only', base, '--', 'assets/', 'composer.json').trim(), '', 'no change');
  assert.equal(git('show', `${base}:composer.json`), read(join(rootDir, 'composer.json')), 'composer.json byte-identical');
});
