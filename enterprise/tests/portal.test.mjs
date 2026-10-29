// F26: the portal plugin home of the enterprise sub-bundle. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = join(enterpriseDir, '..');
const portalDir = join(enterpriseDir, 'assets/portal');
const read = (path) => readFileSync(path, 'utf8');

test('AC1: the portal build declares the file: dependency on portal-ui-kit and the portal_engine_host remote under the SDK key', () => {
  const pkg = JSON.parse(read(join(portalDir, 'package.json')));
  const uiKit = pkg.dependencies?.['@pimcore/portal-ui-kit'];
  assert.ok(uiKit, 'depends on @pimcore/portal-ui-kit');
  assert.match(uiKit, /^file:.*portal-ui-kit\/frontend\/portal-ui-kit$/);
  assert.ok(pkg.dependencies?.['@pimcore/portal-plugin-sdk'], 'depends on @pimcore/portal-plugin-sdk for its types');
  assert.ok(pkg.scripts?.build, 'has a build script');

  const config = read(join(portalDir, 'rsbuild.config.ts'));
  assert.match(config, /pluginModuleFederation\(/);
  assert.match(config, /pluginPortalEntrypoints\(/);
  assert.match(config, /remotes:\s*\{\s*'@pimcore\/portal-plugin-sdk':\s*\n?\s*'portal_engine_host@/);
  for (const shared of ['react', 'react-dom', 'antd', 'inversify']) {
    assert.match(config, new RegExp(`'?${shared}'?:\\s*\\{[^}]*requiredVersion: false`), `shares ${shared}`);
  }

  // The one empty plugin the build exposes.
  const exposed = config.match(/exposes:\s*\{\s*'\.':\s*'([^']+)'/);
  assert.ok(exposed, 'exposes one module');
  const plugin = read(join(portalDir, exposed[1]));
  assert.match(plugin, /IAbstractPlugin/);
  assert.match(plugin, /name: '/);
});

test('AC2: config/portal.yaml tags the provider class under src/Portal/ that implements PortalPluginProviderInterface', () => {
  const yaml = read(join(enterpriseDir, 'config/portal.yaml'));
  const service = yaml.match(/^ {4}(Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\(\w+)):\s*$/m);
  assert.ok(service, 'declares a service under the Portal namespace');
  assert.match(yaml, /portal_engine\.plugin_provider/);

  const classFile = join(enterpriseDir, 'src/Portal', `${service[2]}.php`);
  assert.ok(existsSync(classFile), `${classFile} exists`);
  const php = read(classFile);
  assert.match(php, /use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin\\PortalPluginProviderInterface;/);
  assert.match(php, new RegExp(`class ${service[2]} implements PortalPluginProviderInterface`));
  assert.match(php, /entrypoints\.json/);
  for (const method of ['getId', 'getLabel', 'getEntryPointsJsonLocations', 'isAlways']) {
    assert.match(php, new RegExp(`public function ${method}\\(\\)`), `has ${method}()`);
  }
});

test('AC3: the portal README says the build needs vendor access and gives the build command', () => {
  const readme = read(join(portalDir, 'README.md'));
  assert.match(readme, /vendor access/i);
  assert.match(readme, /npm install/);
  assert.match(readme, /npm run build/);
});

test('AC4: root assets/ and root composer.json are unchanged against BASE', () => {
  const base = process.env.BASE || 'integration';
  const git = (...args) => execFileSync('git', ['-C', rootDir, ...args], { encoding: 'utf8' });
  git('rev-parse', '--verify', `${base}^{commit}`);
  assert.equal(git('show', `${base}:composer.json`), read(join(rootDir, 'composer.json')), 'composer.json byte-identical');
  assert.equal(git('diff', '--name-only', base, '--', 'assets/').trim(), '', 'assets/ unchanged');
});
