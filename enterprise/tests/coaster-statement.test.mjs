// F100: the brief the supplier gets opens with Pimcore Kingdom's company statement (DR-P22 item 4). Needs the php CLI.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const brief = readFileSync(join(enterpriseDir, 'demo-data', 'brief.md'), 'utf8');

// The statement section: from its heading to the next "## " heading.
const statement = () => {
  const start = brief.indexOf('## Company statement');
  assert.ok(start >= 0, 'brief.md has a "## Company statement" section');
  const next = brief.indexOf('\n## ', start + 1);
  return brief.slice(start, next < 0 ? undefined : next).trim();
};
const expectations = () => statement().split('\n').filter((line) => /^- /.test(line)).map((line) => line.slice(2).trim());

const php = (body) =>
  execFileSync('php', ['-d', 'display_errors=stderr', '-r', `
    namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Plugin { interface PortalPluginProviderInterface {} interface PortalPluginConfigProviderInterface {} interface PublicSharePluginProviderInterface { public function isAvailableForPublicShare(): bool; } }
    namespace {
      foreach (['Command/CoasterDemo/DemoEnvironment', 'Command/CoasterDemo/BriefHtml', 'Command/CoasterDemo/CoasterDemo',
                'Portal/StudioExampleEnterprisePortalPlugin'] as $file) { require ${JSON.stringify(src)} . '/' . $file . '.php'; }
      ${body}
    }`], { encoding: 'utf8' });

// The inline escaping BriefHtml applies (htmlspecialchars, ENT_QUOTES | ENT_HTML5), then **bold**.
const escaped = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

test('AC1: brief.md starts with a "Company statement" section (values, then expectations) before the requirements, at most 10 lines, naming Pimcore Kingdom', () => {
  const firstSection = brief.split('\n').find((line) => /^## /.test(line));
  assert.equal(firstSection, '## Company statement', 'the statement is the first section');
  assert.ok(brief.indexOf('## Company statement') < brief.indexOf('## Requirements'), 'it comes before the requirements');
  const text = statement();
  assert.ok(text.split('\n').length <= 10, `at most 10 lines, has ${text.split('\n').length}`);
  assert.match(text, /Pimcore Kingdom/);
  const values = text.search(/stand for/i);
  const expect = text.search(/expect of a supplier/i);
  assert.ok(values > 0 && expect > values, 'values first, then the expectations of a supplier');
  const items = expectations();
  assert.equal(items.length, 4, 'four expectations');
  assert.match(items.join(' '), /45 m/, 'one ties to the safety limit');
  assert.match(items.join(' '), /review/i, 'one ties to change reviews');
  assert.match(items.join(' '), /revision/i, 'one ties to openness about revisions');
});

test('AC2: BriefHtml puts the statement heading and every expectation, escaped, into the brick HTML, the 45 limit still there', () => {
  const html = php(`echo \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::fromMarkdown(${JSON.stringify(brief)});`);
  assert.match(html, /<h2>Company statement<\/h2>/);
  for (const item of expectations()) assert.ok(html.includes(`<li>${escaped(item)}</li>`), `the HTML has the expectation: ${item}`);
  assert.ok(expectations().some((item) => item.includes("'")), 'an expectation has a quote, so the escaping is checked');
  assert.match(html, /<strong>Maximum height: 45 m\.<\/strong>/);
  assert.ok(html.indexOf('Company statement') < html.indexOf('Requirements'));
});

test('AC3: a second setup reports no brief change, with Pimcore storing the brief its own way', () => {
  // A minimal environment: it stores the brief as Pimcore's wysiwyg does (other entities, no trailing newline).
  const out = php(`
    class StatementEnvironment implements \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\DemoEnvironment {
      private ?string $brief = null; private ?array $supplier = null; private array $assets = []; private array $branding = ['logo' => null, 'brand_primary' => null, 'brand_accent' => null];
      public function portalId(): ?int { return $this->brief === null && $this->supplier === null ? null : 1; }
      public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int { return 1; }
      public function dataPoolId(int $portalId, string $dataPoolName): ?int { return 2; }
      public function portalName(int $portalId): ?string { return \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo::PORTAL_NAME; }
      public function renamePortal(int $portalId, string $name): void {}
      public function deletePortal(int $portalId): void {}
      public function enabledPlugins(int $portalId): array { return [\\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Portal\\StudioExampleEnterprisePortalPlugin::ID]; }
      public function enablePlugin(int $portalId, string $pluginId): void {}
      public function briefHtml(int $portalId): ?string { return $this->brief; }
      public function saveBrief(int $portalId, string $title, string $html): void { $this->brief = rtrim(str_replace(['&apos;', '&quot;'], ['&#039;', '&#34;'], $html)); }
      public function portalBranding(int $portalId): array { return $this->branding; }
      public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void {
        $this->branding = ['logo' => $logo, 'brand_primary' => $brandPrimary, 'brand_accent' => $brandAccent];
      }
      public function supplier(string $email, string $password): ?array { return $this->supplier === null ? null : [...$this->supplier, 'passwordValid' => true]; }
      public function saveSupplier(array $supplier): void { $this->supplier = $supplier; }
      public function deleteSupplier(string $email): void {}
      public function assets(string $folder): array { return $this->assets[$folder] ?? []; }
      public function createAsset(string $folder, string $filename, string $content): void { $this->assets[$folder][$filename] = $content; }
      public function deleteAsset(string $folder, string $filename): void { unset($this->assets[$folder][$filename]); }
      public function assetMetadata(string $folder, string $filename): array { return array_fill_keys(\\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo::METADATA, '1'); }
      public function folderExists(string $folder): bool { return true; }
      public function renameFolder(string $folder, string $name): void {}
      public function deleteFolder(string $folder): void {}
      private array $translations = [];
      public function translation(string $domain, string $key, string $language): ?string { return $this->translations[$domain][$key][$language] ?? null; }
      public function saveTranslation(string $domain, string $key, string $language, string $text): void { $this->translations[$domain][$key][$language] = $text; }
    }
    $env = new StatementEnvironment();
    $demo = new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\CoasterDemo($env);
    echo json_encode(['first' => $demo->setup(), 'second' => $demo->setup()]);
  `);
  const { first, second } = JSON.parse(out);
  assert.ok(first.some((line) => line.includes('brief')), first.join('\n'));
  assert.deepEqual(second.filter((line) => line.includes('brief')), [], 'the second run writes no brief');
  assert.deepEqual(second, [], 'the second run changes nothing');
});

test('AC4: as How to try says, the statement sits under the client lines, before Target audience, its four expectations led in bold', () => {
  const client = brief.indexOf('**Client:**');
  const start = brief.indexOf('## Company statement');
  assert.ok(client >= 0 && client < start, 'the client lines come first');
  assert.ok(start < brief.indexOf('## Target audience'), 'the statement comes before Target audience');
  const items = expectations();
  assert.equal(items.length, 4);
  for (const item of items) assert.match(item, /^\*\*[^*]+\*\* /, `led in bold: ${item}`);
  const html = php(`echo \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\BriefHtml::fromMarkdown(${JSON.stringify(brief)});`);
  assert.equal((html.slice(html.indexOf('Company statement'), html.indexOf('Target audience')).match(/<li><strong>/g) ?? []).length, 4,
    'the page shows the four expectations bold');
});
