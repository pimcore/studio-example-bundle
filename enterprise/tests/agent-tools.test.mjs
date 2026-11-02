// F126: the agent demo's tools (src/Agent): KingdomBriefTools reads only what the portal user may see, the
// PortalUserContext fails closed, proposals are stored server-side with random ids and a TTL, and PimcoreAgentBundle's
// group `kingdom-portal` and preset `kingdom-brief-check` exist only when that bundle is installed.
// The logic tests need the php CLI only (Pimcore, the Portal Engine, Symfony security and PSR-6 are stubbed below).
// The container tests run against a Pimcore install's vendor/ (PIMCORE_VENDOR_AUTOLOAD, else
// /var/www/html/vendor/autoload.php) with PimcoreAgentBundle's own McpToolRegistryPass; they skip without one.
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const agentSrc = join(enterpriseDir, 'src/Agent');
const demoData = join(enterpriseDir, 'demo-data');
const fixture = join(demoData, 'agent-fixtures/night-fury.coaster');
const read = (path) => readFileSync(path, 'utf8');
const autoload = process.env.PIMCORE_VENDOR_AUTOLOAD || '/var/www/html/vendor/autoload.php';
const agentBundle = join(dirname(autoload), 'pimcore/pimcore-agent-bundle/src/PimcoreAgentBundle.php');
const vendorSkip = !existsSync(autoload)
  ? `no Pimcore vendor at ${autoload}`
  : !existsSync(agentBundle) ? 'PimcoreAgentBundle is not in that vendor/' : false;

const golden = JSON.parse(read(join(demoData, 'expected-metadata.json')));
const thunderLoop = [1, 2, 3].map((n) => golden.revisions[`thunder-loop-rev${n}.coaster`]);
const nightFury = JSON.parse(read(fixture));

// Stubs of what src/Agent uses from the Portal Engine, Pimcore, Symfony security and PSR-6, then the classes under
// test, and an in-memory KingdomSource: Thunder Loop (asset 10, revisions 1-3, in Loopwerk's workspace) and the
// fixture Night Fury (asset 20, outside it). mayView() is the workspace check: the asset path below a workspace path.
const bootstrap = `
namespace Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject {
    interface PortalUserInterface {
        public function getId(): ?int;
        public function isGuestUser(): bool;
        public function isPortalShareUser(): bool;
    }
}
namespace Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security {
    class SecurityService {
        public function __construct(public ?\\Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface $user = null) {}
        public function getPortalUser(): ?\\Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface { return $this->user; }
    }
}
namespace Pimcore\\Model {
    class User { public function __construct(private ?int $id, private string $name) {} public function getId(): ?int { return $this->id; } public function getName(): ?string { return $this->name; } }
}
namespace Pimcore\\Security\\User {
    class User { public function __construct(private \\Pimcore\\Model\\User $user) {} public function getUser(): \\Pimcore\\Model\\User { return $this->user; } }
}
namespace Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage {
    interface TokenStorageInterface { public function getToken(): ?object; }
}
namespace Psr\\Cache {
    interface CacheItemInterface { public function get(): mixed; public function isHit(): bool; public function set(mixed $value): static; public function expiresAfter(int|\\DateInterval|null $time): static; }
    interface CacheItemPoolInterface { public function getItem(string $key): CacheItemInterface; public function save(CacheItemInterface $item): bool; public function deleteItem(string $key): bool; }
}
namespace {
    foreach (['NoPortalUserException', 'KingdomSource', 'PortalUserContext', 'ProposalStore', 'KingdomBriefTools'] as $class) {
        require ${JSON.stringify(agentSrc)} . '/' . $class . '.php';
    }
    use Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent as A;

    class TestPortalUser implements PortalUserInterface {
        public function __construct(public ?int $id, public array $workspaces, public bool $guest = false, public bool $share = false, public string $email = 'supplier@loopwerk.example') {}
        public function getId(): ?int { return $this->id; }
        public function isGuestUser(): bool { return $this->guest; }
        public function isPortalShareUser(): bool { return $this->share; }
    }
    class TestToken { public function __construct(private object $user) {} public function getUser(): object { return $this->user; } }
    class TestTokenStorage implements \\Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage\\TokenStorageInterface {
        public function __construct(private ?object $token = null) {}
        public function getToken(): ?object { return $this->token; }
    }
    // The context with the portal users linked to each Pimcore user id (the PortalUser listing, without a database).
    class TestPortalUserContext extends A\\PortalUserContext {
        public function __construct($security, $tokens, private array $links = []) { parent::__construct($security, $tokens); }
        protected function linkedPortalUsers(int $pimcoreUserId): array { return $this->links[$pimcoreUserId] ?? []; }
    }
    class TestItem implements \\Psr\\Cache\\CacheItemInterface {
        public mixed $value = null; public bool $hit = false; public ?int $ttl = null;
        public function __construct(public string $key) {}
        public function get(): mixed { return $this->value; }
        public function isHit(): bool { return $this->hit; }
        public function set(mixed $value): static { $this->value = $value; return $this; }
        public function expiresAfter(int|\\DateInterval|null $time): static { $this->ttl = $time; return $this; }
    }
    class TestPool implements \\Psr\\Cache\\CacheItemPoolInterface {
        public array $items = [];
        public function getItem(string $key): \\Psr\\Cache\\CacheItemInterface { return isset($this->items[$key]) ? clone $this->items[$key] : new TestItem($key); }
        public function save(\\Psr\\Cache\\CacheItemInterface $item): bool { $item->hit = true; $this->items[$item->key] = clone $item; return true; }
        public function deleteItem(string $key): bool { unset($this->items[$key]); return true; }
    }
    class TestSource implements A\\KingdomSource {
        public array $viewChecks = [];
        public function briefText(): ?string { return ${JSON.stringify(read(join(demoData, 'brief.md')))}; }
        public function coasterRevisions(): array {
            $revisions = [];
            foreach (json_decode(${JSON.stringify(JSON.stringify(thunderLoop))}, true) as $i => $m) {
                $revisions[] = ['assetId' => 10, 'path' => '/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster', 'revision' => $i + 1, 'maxHeightM' => (float) $m['maxHeight'], 'lengthM' => (float) $m['length']];
            }
            $revisions[] = ['assetId' => 20, 'path' => '/Pimcore Kingdom/Night Fury/night-fury.coaster', 'revision' => ${nightFury.meta.revision}, 'maxHeightM' => 40.0, 'lengthM' => 500.0];
            return $revisions;
        }
        public function mayView(PortalUserInterface $user, int $assetId): bool {
            $this->viewChecks[] = [$user->getId(), $assetId];
            $path = $assetId === 10 ? '/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster' : '/Pimcore Kingdom/Night Fury/night-fury.coaster';
            foreach ($user->workspaces as $workspace) { if (str_starts_with($path, $workspace . '/')) return true; }
            return false;
        }
    }

    // The Loopwerk supplier (portal user 7, its workspace the Thunder Loop folder), and the tools for a context.
    function supplier(): TestPortalUser { return new TestPortalUser(7, ['/Pimcore Kingdom/Thunder Loop']); }
    function tools(A\\PortalUserContext $context, ?TestPool $pool = null, ?\\Closure $now = null): A\\KingdomBriefTools {
        return new A\\KingdomBriefTools($context, new TestSource(), new A\\ProposalStore($pool ?? new TestPool(), 900, $now));
    }
    function portalLogin(?PortalUserInterface $user): A\\PortalUserContext {
        return new TestPortalUserContext(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService($user), new TestTokenStorage());
    }
    function mcpCaller(?int $id, string $name, array $links): A\\PortalUserContext {
        $token = new TestToken(new \\Pimcore\\Security\\User\\User(new \\Pimcore\\Model\\User($id, $name)));
        return new TestPortalUserContext(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService(null), new TestTokenStorage($token), $links);
    }
    // What a read with this context gives: the brief and the revisions.
    function reads(A\\PortalUserContext $context): array {
        $tools = tools($context);
        return ['brief' => $tools->readBrief(), 'revisions' => $tools->listRevisions()];
    }
}
`;

// Runs a PHP script and returns what it echoes, parsed as JSON; a PHP error fails with PHP's own message.
const runPhp = (script) => {
  try {
    return JSON.parse(execFileSync('php', ['-d', 'display_errors=1', '-d', 'html_errors=0', '-r', script], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
  } catch (e) {
    throw new Error(`php failed: ${e.stderr || ""} ${e.stdout || ""}`.slice(-1500));
  }
};
// The test body runs in its own namespace block, so it repeats the bootstrap's aliases.
const php = (body) => runPhp(`${bootstrap}\nnamespace {\nuse Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent as A;\n${body}\n}\n`);

test('AC1: the Loopwerk supplier lists only the .coaster revisions it may view and reads the brief; the fixture asset it may not see is absent', () => {
  const result = php(`echo json_encode(reads(portalLogin(supplier())));`);
  assert.deepEqual(
    result.revisions,
    thunderLoop.map((m, i) => ({ assetId: 10, revision: i + 1, maxHeightM: m.maxHeight, lengthM: m.length })),
  );
  assert.ok(!result.revisions.some((r) => r.assetId === 20), 'Night Fury (demo-data/agent-fixtures) is not listed');
  assert.equal(result.brief, read(join(demoData, 'brief.md')));
  // nothing that identifies a person or a folder outside the supplier's pools
  const out = JSON.stringify(result.revisions);
  for (const leak of ['@', 'Night Fury', '/Pimcore Kingdom', '"path"']) assert.ok(!out.includes(leak), `no ${leak} in the revisions`);
});

test('AC1: the same supplier with a workspace on both folders sees both coasters (the filter is the permission check, not a fixed list)', () => {
  const result = php(`
    $user = new TestPortalUser(7, ['/Pimcore Kingdom']);
    echo json_encode(reads(portalLogin($user)));
  `);
  assert.deepEqual([...new Set(result.revisions.map((r) => r.assetId))], [10, 20]);
});

test('AC1: no portal user, a Studio-only caller, the shared fallback user, a guest or the stand-in admin get no brief and no revisions', () => {
  const result = php(`
    $supplier = supplier();
    $other = new TestPortalUser(8, ['/Pimcore Kingdom']);
    echo json_encode([
      'nobody' => reads(new TestPortalUserContext(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService(null), new TestTokenStorage())),
      'studioOnly' => reads(mcpCaller(2, 'admin', [])),
      'fallback' => reads(mcpCaller(3, A\\PortalUserContext::FALLBACK_PIMCORE_USER, [3 => [$supplier]])),
      'twoLinked' => reads(mcpCaller(4, 'shared-studio-user', [4 => [$supplier, $other]])),
      'standInAdmin' => reads(portalLogin(new TestPortalUser(null, ['/Pimcore Kingdom']))),
      'guest' => reads(portalLogin(new TestPortalUser(9, ['/Pimcore Kingdom'], guest: true))),
      'publicShare' => reads(portalLogin(new TestPortalUser(9, ['/Pimcore Kingdom'], share: true))),
    ]);
  `);
  for (const [caller, got] of Object.entries(result)) {
    assert.deepEqual(got, { brief: null, revisions: [] }, `${caller} gets nothing`);
  }
});

test('AC1: an MCP caller linked to exactly one portal user reads as that portal user', () => {
  const result = php(`echo json_encode(reads(mcpCaller(5, 'loopwerk-studio', [5 => [supplier()]])));`);
  assert.deepEqual(result.revisions.map((r) => [r.assetId, r.revision]), [[10, 1], [10, 2], [10, 3]]);
  assert.equal(typeof result.brief, 'string');
});

test('AC3: proposing a Supplier note stores a pending proposal (portal user, asset, revision, text, TTL) and writes no note', () => {
  const result = php(`
    $pool = new TestPool();
    $tools = tools(portalLogin(supplier()), $pool, static fn () => 1000);
    $proposed = $tools->proposeSupplierNote(10, 3, '  Lift hill 52 m is above the brief\\'s 45 m.  ');
    $store = new A\\ProposalStore($pool, 900, static fn () => 1000);
    $item = array_values($pool->items)[0];
    echo json_encode(['proposed' => $proposed, 'stored' => $store->get($proposed['proposalId']), 'items' => count($pool->items), 'cacheTtl' => $item->ttl]);
  `);
  assert.match(result.proposed.proposalId, /^[0-9a-f]{32}$/);
  assert.equal(result.proposed.expiresInSeconds, 900);
  assert.deepEqual(result.stored, {
    id: result.proposed.proposalId,
    portalUserId: 7,
    assetId: 10,
    revision: 3,
    text: "Lift hill 52 m is above the brief's 45 m.",
    createdAt: 1000,
    expiresAt: 1900,
  });
  assert.equal(result.items, 1);
  assert.equal(result.cacheTtl, 900);
  // no write path: the agent classes save nothing and make no Pimcore note
  for (const file of ['KingdomBriefTools.php', 'ProposalStore.php', 'PortalUserContext.php', 'KingdomSource.php', 'PimcoreKingdomSource.php']) {
    const source = read(join(agentSrc, file));
    assert.doesNotMatch(source, /Element\\Note|new Note\b|->save\(\)|->delete\(\)/, `${file} writes nothing`);
  }
});

test('AC3: without a portal user (nobody, Studio-only caller, shared fallback user) no proposal is stored and an error is returned', () => {
  const result = php(`
    $out = [];
    foreach ([
      'nobody' => new TestPortalUserContext(new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService(null), new TestTokenStorage()),
      'studioOnly' => mcpCaller(2, 'admin', []),
      'fallback' => mcpCaller(3, A\\PortalUserContext::FALLBACK_PIMCORE_USER, [3 => [supplier()]]),
      'notVisible' => portalLogin(supplier()),
    ] as $name => $context) {
      $pool = new TestPool();
      try {
        $assetId = $name === 'notVisible' ? 20 : 10;
        $out[$name] = ['result' => tools($context, $pool)->proposeSupplierNote($assetId, 1, 'A note')];
      } catch (A\\NoPortalUserException $e) {
        $out[$name] = ['error' => $e->getMessage()];
      }
      $out[$name]['stored'] = count($pool->items);
    }
    echo json_encode($out);
  `);
  for (const [caller, got] of Object.entries(result)) {
    assert.ok(got.error, `${caller}: an error`);
    assert.equal(got.result, undefined, `${caller}: no proposal id`);
    assert.equal(got.stored, 0, `${caller}: nothing stored`);
  }
});

test('AC3: proposal ids are random, and a proposal expires after its TTL', () => {
  const result = php(`
    $pool = new TestPool();
    $clock = 1000;
    $now = static function () use (&$clock) { return $clock; };
    $store = new A\\ProposalStore($pool, 900, $now);
    $ids = [];
    for ($i = 0; $i < 20; $i++) { $ids[] = $store->add(7, 10, 3, 'note'); }
    $first = $ids[0];
    $before = $store->get($first) !== null;
    $clock = 1899; $justBefore = $store->get($first) !== null;
    $clock = 1900; $atTtl = $store->get($first);
    echo json_encode(['ids' => $ids, 'before' => $before, 'justBefore' => $justBefore, 'atTtl' => $atTtl, 'unknown' => $store->get(str_repeat('0', 32)), 'notAnId' => $store->get('../x')]);
  `);
  assert.equal(new Set(result.ids).size, 20, 'no id repeats');
  for (const id of result.ids) assert.match(id, /^[0-9a-f]{32}$/);
  assert.notEqual(result.ids[1], (BigInt(`0x${result.ids[0]}`) + 1n).toString(16).padStart(32, '0'), 'not a counter');
  assert.equal(result.before, true);
  assert.equal(result.justBefore, true);
  assert.equal(result.atTtl, null, 'gone at its TTL');
  assert.equal(result.unknown, null);
  assert.equal(result.notAnId, null);
});

// The container as a kernel builds it: our extension's prepend() and load(), with or without PimcoreAgentBundle in
// kernel.bundles, a stand-in `pimcore_agent` extension that records its config, then PimcoreAgentBundle's own
// McpToolRegistryPass. With the bundle, also its tool results for a context without a portal user, and the preset
// processed by its Configuration tree.
const container = (withAgentBundle) => {
  const script = `
    define('PIMCORE_PROJECT_ROOT', sys_get_temp_dir());
    $loader = require ${JSON.stringify(autoload)};
    $src = ${JSON.stringify(join(enterpriseDir, 'src'))} . '/';
    spl_autoload_register(static function (string $class) use ($src): void {
        $prefix = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\';
        if (str_starts_with($class, $prefix)) {
            $file = $src . str_replace('\\\\', '/', substr($class, strlen($prefix))) . '.php';
            if (is_file($file)) { require $file; }
        }
    }, true, true);
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\DependencyInjection\\PimcoreStudioExampleEnterpriseExtension as Ext;
    use Symfony\\Component\\DependencyInjection\\ContainerBuilder;
    $result = [];
    try {
        $c = new ContainerBuilder();
        $bundles = ['PimcoreStudioExampleEnterpriseBundle' => 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\PimcoreStudioExampleEnterpriseBundle'];
        if (${withAgentBundle ? 'true' : 'false'}) { $bundles['PimcoreAgentBundle'] = Ext::AGENT_BUNDLE; }
        $c->setParameter('kernel.bundles', $bundles);
        $c->setParameter('kernel.project_dir', sys_get_temp_dir());
        if (${withAgentBundle ? 'true' : 'false'}) {
            $c->registerExtension(new class extends \\Symfony\\Component\\DependencyInjection\\Extension\\Extension {
                public function load(array $configs, ContainerBuilder $container): void {}
                public function getAlias(): string { return 'pimcore_agent'; }
            });
        }
        $ext = new Ext();
        $ext->prepend($c);
        $result['agentConfig'] = $c->hasExtension('pimcore_agent') ? $c->getExtensionConfig('pimcore_agent') : null;
        $ext->load([], $c);
        $result['briefToolsDefined'] = $c->hasDefinition('Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\Agent\\\\KingdomBriefTools');
        $result['tagged'] = array_keys($c->findTaggedServiceIds('pimcore.mcp_tool'));
        if (class_exists('Pimcore\\\\Bundle\\\\PimcoreAgentBundle\\\\Mcp\\\\McpToolRegistry')) {
            $c->register('Pimcore\\\\Bundle\\\\PimcoreAgentBundle\\\\Mcp\\\\McpToolRegistry', 'Pimcore\\\\Bundle\\\\PimcoreAgentBundle\\\\Mcp\\\\McpToolRegistry');
            (new \\Pimcore\\Bundle\\PimcoreAgentBundle\\DependencyInjection\\Compiler\\McpToolRegistryPass())->process($c);
            $args = $c->getDefinition('Pimcore\\\\Bundle\\\\PimcoreAgentBundle\\\\Mcp\\\\McpToolRegistry')->getArguments();
            $result['groups'] = array_map(static fn (array $g) => array_map(static fn (array $t) => ['readOnly' => $t['annotations']['readOnlyHint'] ?? null, 'class' => $t['class']], $g['tools']), $args['$groupMetadata'] ?? []);
        }
        if (${withAgentBundle ? 'true' : 'false'}) {
            $preset = \\Symfony\\Component\\Yaml\\Yaml::parseFile(${JSON.stringify(join(enterpriseDir, 'config/pimcore/agents/kingdom-brief-check.yaml'))});
            $result['preset'] = $preset;
            $processed = (new \\Symfony\\Component\\Config\\Definition\\Processor())->processConfiguration(
                new \\Pimcore\\Bundle\\PimcoreAgentBundle\\DependencyInjection\\Configuration(),
                [...$result['agentConfig'], ['agents' => ['definitions' => [$preset['name'] => $preset]]]],
            );
            $result['processedToolBundles'] = $processed['tool_bundles'];
            // The tools for a caller without a portal user: the Portal Engine's real SecurityService, no token, no request.
            $context = new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\PortalUserContext(
                new \\Pimcore\\Bundle\\PortalEngineBundle\\Service\\Security\\SecurityService(
                    new \\Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage\\TokenStorage(),
                    new \\Symfony\\Component\\HttpFoundation\\RequestStack(),
                ),
                new \\Symfony\\Component\\Security\\Core\\Authentication\\Token\\Storage\\TokenStorage(),
            );
            $pool = new \\Symfony\\Component\\Cache\\Adapter\\ArrayAdapter();
            $source = new class implements \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\KingdomSource {
                public function briefText(): ?string { return 'brief'; }
                public function coasterRevisions(): array { return [['assetId' => 10, 'path' => '/x.coaster', 'revision' => 1, 'maxHeightM' => 1.0, 'lengthM' => 1.0]]; }
                public function mayView(\\Pimcore\\Bundle\\PortalEngineBundle\\Model\\DataObject\\PortalUserInterface $user, int $assetId): bool { return true; }
            };
            $tools = new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\KingdomBriefTools($context, $source, new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\ProposalStore($pool));
            $call = static fn ($r) => ['isError' => $r->isError, 'text' => json_decode($r->content[0]->text, true)];
            $result['calls'] = [
                'propose' => $call((new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\Tools\\ProposeSupplierNoteTool($tools))->execute(10, 1, 'A note')),
                'brief' => $call((new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\Tools\\ReadBriefTool($tools))->execute()),
                'revisions' => $call((new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Agent\\Tools\\ListRevisionsTool($tools))->execute()),
            ];
            $result['cachedAfterRefusal'] = count($pool->getValues());
        }
    } catch (\\Throwable $e) {
        $result['error'] = get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine();
    }
    echo json_encode($result);
  `;
  return runPhp(script);
};

const TOOLS = {
  kingdom_read_brief: 'ReadBriefTool',
  kingdom_list_revisions: 'ListRevisionsTool',
  kingdom_propose_supplier_note: 'ProposeSupplierNoteTool',
};

test('AC2: with PimcoreAgentBundle the group kingdom-portal holds exactly kingdom_read_brief and kingdom_list_revisions (readOnly) and kingdom_propose_supplier_note', { skip: vendorSkip }, () => {
  const result = container(true);
  assert.equal(result.error, undefined, result.error);
  assert.deepEqual(Object.keys(result.groups), ['kingdom-portal'], 'our only group');
  const group = result.groups['kingdom-portal'];
  assert.deepEqual(Object.keys(group).sort(), Object.keys(TOOLS).sort());
  for (const [name, cls] of Object.entries(TOOLS)) assert.ok(group[name].class.endsWith(`\\Tools\\${cls}`), name);
  assert.equal(group.kingdom_read_brief.readOnly, true);
  assert.equal(group.kingdom_list_revisions.readOnly, true);
  assert.equal(group.kingdom_propose_supplier_note.readOnly, false);
});

test('AC2: the agent preset kingdom-brief-check lists no group but kingdom-portal, and PimcoreAgentBundle accepts it', { skip: vendorSkip }, () => {
  const result = container(true);
  assert.equal(result.error, undefined, result.error);
  const { preset } = result;
  assert.equal(preset.name, 'kingdom-brief-check');
  assert.deepEqual(preset.toolBundles, ['kingdom-portal']);
  for (const key of ['pimcoreMcpServers', 'pimcoreMetaGroups', 'mcpServers', 'includeSdkTools', 'skills', 'executionUser']) {
    assert.ok(!(key in preset) || (Array.isArray(preset[key]) && preset[key].length === 0), `the preset adds no ${key}`);
  }
  assert.ok(preset.permissions, 'the preset has a permissions node');
  const bundle = result.processedToolBundles['kingdom-portal'];
  assert.deepEqual(bundle.pimcoreMcpServers, ['kingdom-portal']);
  for (const key of ['pimcoreMetaGroups', 'skills', 'includeSdkTools', 'richChatWidgets']) assert.deepEqual(bundle[key] ?? [], [], `the tool bundle adds no ${key}`);
  // the preset is found where prepend() points PimcoreAgentBundle
  const paths = result.agentConfig.flatMap((c) => c.agents?.paths ?? []);
  assert.ok(paths.some((p) => existsSync(join(p, 'kingdom-brief-check.yaml'))), 'agents.paths holds the preset');
});

test('AC3: the MCP tools for a caller without a portal user: propose returns an error and stores nothing, the reads return no data', { skip: vendorSkip }, () => {
  const { calls, cachedAfterRefusal, error } = container(true);
  assert.equal(error, undefined, error);
  assert.equal(calls.propose.isError, true);
  assert.ok(calls.propose.text.error);
  assert.equal(calls.propose.text.proposalId, undefined);
  assert.equal(cachedAfterRefusal, 0);
  assert.equal(calls.brief.isError, true);
  assert.equal(calls.brief.text.brief, undefined);
  assert.deepEqual(calls.revisions.text, { revisions: [], count: 0 });
});

test('AC4: without PimcoreAgentBundle the bundle boots with the group absent, and KingdomBriefTools is still a service', { skip: vendorSkip }, () => {
  const result = container(false);
  assert.equal(result.error, undefined, result.error);
  assert.equal(result.agentConfig, null, 'no pimcore_agent config is prepended');
  assert.deepEqual(result.tagged, [], 'no pimcore.mcp_tool service');
  assert.equal(Object.keys(result.groups ?? {}).length, 0, 'no group');
  assert.equal(result.briefToolsDefined, true);
});

test('AC4: config/agent.yaml has no pimcore_agent key, composer.json only suggests the bundle, and KingdomBriefTools needs no class of it', () => {
  assert.doesNotMatch(read(join(enterpriseDir, 'config/agent.yaml')), /^\s*pimcore_agent\s*:/m);
  const composer = JSON.parse(read(join(enterpriseDir, 'composer.json')));
  assert.ok(composer.suggest?.['pimcore/pimcore-agent-bundle'], 'suggested');
  assert.equal(composer.require['pimcore/pimcore-agent-bundle'], undefined, 'not required');
  for (const file of ['KingdomBriefTools.php', 'PortalUserContext.php', 'ProposalStore.php', 'KingdomSource.php', 'PimcoreKingdomSource.php']) {
    assert.doesNotMatch(read(join(agentSrc, file)), /^use [^;]*(PimcoreAgentBundle|\bMcp\\)|\\Mcp\\|PimcoreAgentBundle\\/m, `${file} uses no PimcoreAgentBundle or MCP class`);
  }
  // the tools are registered only behind the guard, never by config/*.yaml
  const extension = read(join(enterpriseDir, 'src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php'));
  assert.match(extension, /class_exists\(self::AGENT_BUNDLE\)/);
  assert.match(extension, /hasExtension\('pimcore_agent'\)/);
});

test('AC4: the fixture coaster the supplier may not see is a valid .coaster file in demo-data/agent-fixtures', () => {
  const result = JSON.parse(execFileSync('php', ['-r', `
    require ${JSON.stringify(join(enterpriseDir, 'src/Coaster/CoasterValidator.php'))};
    echo json_encode((new Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Coaster\\CoasterValidator())->validate(json_decode(file_get_contents(${JSON.stringify(fixture)}))));
  `], { encoding: 'utf8' }));
  assert.deepEqual(result, []);
  assert.equal(nightFury.meta.name, 'Night Fury');
  assert.notEqual(nightFury.meta.designer, 'Loopwerk Engineering');
});
