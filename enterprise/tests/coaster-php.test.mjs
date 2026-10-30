// F50: the PHP port of the coaster metadata extraction and the listener that writes it as asset metadata on upload.
// Needs the php CLI (8.1+). Pimcore's Asset, AssetEvent and the PSR logger are stubbed below, so no Pimcore install
// is needed. Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoData = join(enterpriseDir, 'demo-data');
const coasterSrc = join(enterpriseDir, 'src/Coaster');
const read = (path) => readFileSync(path, 'utf8');

// Stubs of what the listener uses from Pimcore and psr/log, then the classes under test.
const bootstrap = `
namespace Psr\\Log {
    interface LoggerInterface { public function warning(string|\\Stringable $message, array $context = []): void; }
}
namespace Pimcore\\Model {
    class Asset {
        public array $metadata = [];
        public function __construct(private ?string $filename, private string $data) {}
        public function getFilename(): ?string { return $this->filename; }
        public function getRealFullPath(): string { return '/coasters/' . $this->filename; }
        public function getData(): string { return $this->data; }
        public function addMetadata(string $name, string $type, mixed $data = null, ?string $language = null): static {
            $this->metadata[$name] = ['type' => $type, 'data' => $data, 'language' => $language];
            return $this;
        }
    }
}
namespace Pimcore\\Event\\Model {
    class AssetEvent { public function __construct(private \\Pimcore\\Model\\Asset $asset) {} public function getAsset(): \\Pimcore\\Model\\Asset { return $this->asset; } }
}
namespace {
    require ${JSON.stringify(join(coasterSrc, 'CoasterValidator.php'))};
    require ${JSON.stringify(join(coasterSrc, 'CoasterMetadataExtractor.php'))};
    require ${JSON.stringify(join(coasterSrc, 'CoasterMetadataListener.php'))};
    class TestLogger implements \\Psr\\Log\\LoggerInterface {
        public array $warnings = [];
        public function warning(string|\\Stringable $message, array $context = []): void { $this->warnings[] = ['message' => (string) $message, 'context' => $context]; }
    }
}
`;

// Runs the PHP snippet after the bootstrap and returns what it echoes, parsed as JSON.
const php = (body) => {
  const script = `${bootstrap}\nnamespace {\n${body}\n}\n`;
  return JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', script], { encoding: 'utf8' }));
};

// The listener on an asset with this filename and content: { metadata, warnings }.
const runListener = (filename, content) =>
  php(`
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataListener;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterValidator;
    $logger = new TestLogger();
    $asset = new \\Pimcore\\Model\\Asset(${JSON.stringify(filename)}, base64_decode(${JSON.stringify(Buffer.from(content).toString('base64'))}));
    $listener = new CoasterMetadataListener(new CoasterValidator(), new CoasterMetadataExtractor(), $logger);
    $listener->onAssetSave(new \\Pimcore\\Event\\Model\\AssetEvent($asset));
    echo json_encode(['metadata' => (object) $asset->metadata, 'warnings' => $logger->warnings]);
  `);

const golden = JSON.parse(read(join(demoData, 'expected-metadata.json')));
const revisionFiles = [1, 2, 3].map((revision) => `thunder-loop-rev${revision}.coaster`);
const FIVE = ['duration', 'inversions', 'length', 'maxHeight', 'topSpeed'];

test('AC1: the listener sets the five metadata entries on a valid .coaster asset', () => {
  const file = 'thunder-loop-rev2.coaster';
  const { metadata, warnings } = runListener(file, read(join(demoData, file)));
  assert.deepEqual(Object.keys(metadata).sort(), FIVE);
  for (const [name, entry] of Object.entries(metadata)) {
    assert.equal(entry.type, 'input', name);
    assert.equal(entry.language, null, `${name} is not localized`);
    assert.equal(Number(entry.data), golden.revisions[file][name], name);
  }
  assert.deepEqual(warnings, []);
});

test('AC1: config/coaster.yaml registers the listener on asset add and update; other asset types get nothing', () => {
  const yaml = read(join(enterpriseDir, 'config/coaster.yaml'));
  assert.match(yaml, /Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataListener:/);
  for (const event of ['pimcore.asset.preAdd', 'pimcore.asset.preUpdate']) {
    assert.match(yaml, new RegExp(`event: ${event.replaceAll('.', '\\.')}, method: onAssetSave`), event);
  }
  for (const name of ['CoasterValidator', 'CoasterMetadataExtractor']) {
    assert.match(yaml, new RegExp(`Coaster\\\\${name}: ~`), name);
  }

  const image = runListener('photo.jpg', read(join(demoData, 'thunder-loop-rev2.coaster')));
  assert.deepEqual(image, { metadata: {}, warnings: [] });
});

test('AC2: the PHP extractor gives the golden values for revisions 1 to 3', () => {
  const result = php(`
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterMetadataExtractor;
    $extractor = new CoasterMetadataExtractor();
    $out = [];
    foreach (${JSON.stringify(revisionFiles)} as $file) {
        $out[$file] = $extractor->extract(json_decode(file_get_contents(${JSON.stringify(demoData)} . '/' . $file)));
    }
    echo json_encode(['units' => CoasterMetadataExtractor::UNITS, 'revisions' => $out]);
  `);
  assert.deepEqual(result, golden);
});

test('AC2: the listener writes the golden values for revisions 1 to 3', () => {
  for (const file of revisionFiles) {
    const { metadata } = runListener(file, read(join(demoData, file)));
    const values = Object.fromEntries(Object.entries(metadata).map(([name, entry]) => [name, Number(entry.data)]));
    assert.deepEqual(values, golden.revisions[file], file);
  }
});

test('AC3: an invalid .coaster file sets nothing and logs why', () => {
  const broken = JSON.parse(read(join(demoData, 'thunder-loop-rev3.coaster')));
  delete broken.track[3].diameter;
  broken.version = '2.0';
  const cases = [
    ['schema errors', JSON.stringify(broken, null, 2), ['/track/3/diameter: required field is missing', '/version']],
    ['not JSON', '{ "format": "coaster-design", ', ['not valid JSON']],
    ['empty', '', ['not valid JSON']],
  ];
  for (const [label, content, reasons] of cases) {
    const { metadata, warnings } = runListener('thunder-loop.coaster', content);
    assert.deepEqual(metadata, {}, `${label}: no metadata`);
    assert.equal(warnings.length, 1, `${label}: one warning`);
    const logged = `${warnings[0].message} ${JSON.stringify(warnings[0].context)}`;
    assert.match(logged, /\/coasters\/thunder-loop\.coaster/, `${label}: names the asset`);
    for (const reason of reasons) assert.ok(logged.includes(reason), `${label}: logs ${reason} in ${logged}`);
  }
});
