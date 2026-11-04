// F32: the portal page "Talk", the slide viewer as a portal plugin page. Run: node --test enterprise/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const portalDir = join(enterpriseDir, 'assets/portal');
const talkDir = join(portalDir, 'talk');
const read = (path) => readFileSync(path, 'utf8');

// The YAML block of one top-level key (no YAML parser in a plain node --test run).
const yamlBlock = (yaml, key) => {
  const match = yaml.match(new RegExp(`^${key}:\\s*\\n((?:[ \\t]+.*\\n?|\\s*\\n)*)`, 'm'));
  return match ? match[1] : null;
};

test('AC1: the sub-bundle routing config has a talk route under the portal prefix with the portal-site condition', () => {
  // Pimcore's BundleRoutingLoader reads config/pimcore/routing.yaml of every bundle (getPath() is enterprise/).
  const routingFile = join(enterpriseDir, 'config/pimcore/routing.yaml');
  assert.ok(existsSync(routingFile), 'config/pimcore/routing.yaml exists');
  const yaml = read(routingFile);
  const name = yaml.match(/^(\w*talk\w*):\s*$/m);
  assert.ok(name, 'declares a route named after the talk page');
  const route = yamlBlock(yaml, name[1]);
  assert.match(route, /path:\s*['"]?\/\{_portal_engine_prefix\}talk['"]?\s*$/m);
  assert.match(route, /condition:\s*"request\.attributes\.get\('isPortalEngineSite'\)"/);
  assert.match(route, /requirements:\s*\n\s+_portal_engine_prefix:/);

  // The controller it names exists and is registered with controller.service_arguments.
  const controller = route.match(/controller:\s*['"]?Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\Talk\\(\w+)/);
  assert.ok(controller, 'the route points at a controller under Portal\\Talk');
  assert.ok(existsSync(join(enterpriseDir, 'src/Portal/Talk', `${controller[1]}.php`)), 'the controller class exists');
  const services = read(join(enterpriseDir, 'config/portal-talk.yaml'));
  assert.match(services, new RegExp(`Portal\\\\Talk\\\\${controller[1]}:[\\s\\S]*?controller\\.service_arguments`));
});

test('AC2: the page template extends the portal studio layout, overrides shellHeader and shellNav and frames the viewer', () => {
  const php = read(join(enterpriseDir, 'src/Portal/Talk/TalkController.php'));
  const template = php.match(/'@PimcoreStudioExampleEnterprise\/([^']+\.html\.twig)'/);
  assert.ok(template, 'the controller renders a template of the bundle');
  const twigFile = join(enterpriseDir, 'templates', template[1]);
  assert.ok(existsSync(twigFile), `${twigFile} exists`);
  const twig = read(twigFile);
  assert.match(twig, /^\{%\s*extends\s+['"]@PimcorePortalEngine\/layout\/studio\.html\.twig['"]\s*%\}/m);
  for (const block of ['shellHeader', 'shellNav']) {
    // overridden to nothing: the block opens and closes with no output between
    assert.match(twig, new RegExp(`\\{%\\s*block ${block}\\s*%\\}\\s*\\{%\\s*endblock\\s*%\\}`), `empties ${block}`);
  }
  assert.match(twig, /<iframe[^>]*src="\{\{\s*viewerUrl\s*\}\}"/, 'frames the viewer from the configured URL');

  // The URL is configurable: an env var with a default, handed to the controller.
  const services = read(join(enterpriseDir, 'config/portal-talk.yaml'));
  assert.match(services, /%env\(default:[\w.]+:PORTAL_TALK_VIEWER_URL\)%/);
  assert.match(php, /viewerUrl/);
});

test('AC3: the footer template links the Talk URL with the kit icon, and plugin.tsx registers no nav entry', () => {
  // F157 (DR-P48 part 5): the rail entry went; a small icon link in the portal footer took its place
  const plugin = read(join(portalDir, 'js/src/plugin.tsx'));
  assert.doesNotMatch(plugin, /slots\.navEntries/, 'no entry in the navigation rail');
  assert.doesNotMatch(plugin, /TalkNavEntry/);
  const footer = read(join(enterpriseDir, 'templates/portal/footer-talk.html.twig'));
  assert.match(footer, /<a\b[^>]*href="\{\{\s*talk\.url\s*\}\}"/, 'links the Talk URL');
  assert.match(footer, /aria-label="\{\{\s*talk\.label\s*\}\}"/);
  assert.match(footer, /portalEngine_inline_icon\('[\w-]+(?:\.svg)?'\)/, 'with an icon of portal_engine\'s set');
  // the URL comes from the server (TalkPage, through the bundle's Twig function), not from the browser's location
  const extension = read(join(enterpriseDir, 'src/Portal/Talk/TalkTwigExtension.php'));
  assert.match(extension, /TalkPage/);
  assert.match(extension, /->getNavEntry\(\)/);
  assert.doesNotMatch(footer, /window\.location|<script/);

  // and the server side still hands the URL over through the provider's frontend config (checks/live-demo uses it)
  const provider = read(join(enterpriseDir, 'src/Portal/StudioExampleEnterprisePortalPlugin.php'));
  assert.match(provider, /implements[^{]*PortalPluginConfigProviderInterface/);
  assert.match(provider, /public function getFrontendConfig\(\): array/);
  assert.match(provider, /\$config\['talk'\] = \$talk;/);
});

test('AC4: the talk README names the three extension points used', () => {
  const readme = read(join(talkDir, 'README.md'));
  assert.match(readme, /config\/pimcore\/routing\.yaml/, 'names the bundle route');
  assert.match(readme, /@PimcorePortalEngine\/layout\/studio\.html\.twig/);
  assert.match(readme, /shellHeader/);
  assert.match(readme, /shellNav/);
  assert.match(readme, /templates\/portal\/footer-talk\.html\.twig/, 'names the footer link');
  assert.match(readme, /footerSnippet|footer snippet/, 'and the portal\'s footer snippet it is shown through');
  assert.match(readme, /portalEngine_inline_icon/);
  assert.match(readme, /PORTAL_TALK_VIEWER_URL/, 'says how to point the frame at the viewer');
  // linked from the sub-bundle README like the other examples
  assert.match(read(join(enterpriseDir, 'README.md')), /assets\/portal\/talk\/README\.md/);
});
