// F322: coaster-demo:setup gives every coaster a portal public share for its guests (ScreamScore/Pimcore/GuestShares),
// coaster-demo:reset removes the demo's shares. Needs the php CLI (8.1+). GuestShares runs against in-memory stand-ins
// for the Portal Engine's share service and Pimcore (tests/fixtures/scream-score/public-share-stubs.php): there is no
// logged-in portal user and no current Site, as in a console command, and PublicShareService::create() fails there.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const stubs = join(enterpriseDir, 'tests/fixtures/scream-score/public-share-stubs.php');
const read = (path) => readFileSync(path, 'utf8');

const files = ['ScreamScore/GuestFeedback', 'ScreamScore/FeedbackStore', 'ScreamScore/Rides', 'ScreamScore/InMemory/InMemoryRides',
  'ScreamScore/Pimcore/PimcoreFeedbackStore', 'Command/CoasterDemo/ScreamScoreEnvironment', 'Command/CoasterDemo/CoasterDemo',
  'Command/CoasterDemo/ScreamScoreDemo', 'ScreamScore/Pimcore/GuestShares'];

// The demo portal (site 3 on the root document 101) with its object pool first and the coasters' asset pool second; two
// coasters in the ride designs folder and one elsewhere; the Park staff user (61) and another portal user (62).
const bootstrap = `
namespace {
    require ${JSON.stringify(stubs)};
    foreach (${JSON.stringify(files)} as $file) { require ${JSON.stringify(src)} . '/' . $file . '.php'; }

    use Pimcore\\Bundle\\PortalEngineBundle\\Entity\\PublicShare;
    use Pimcore\\Bundle\\PortalEngineBundle\\Model\\Configuration\\DataPool\\StubDataPoolConfig;
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\DataPool\\DataPoolConfigService;
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\Entity\\EntityManagerService;
    use Pimcore\\Bundle\\PortalEngineBundle\\Service\\PublicShare\\PublicShareService;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ScreamScoreEnvironment;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\GuestFeedback;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\InMemoryRides;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares;
    use Pimcore\\Model\\Asset;
    use Pimcore\\Model\\DataObject\\PortalUser;
    use Pimcore\\Model\\Document\\Page;
    use Pimcore\\Model\\Site;
    use Symfony\\Component\\Routing\\Generator\\StubUrlGenerator;

    // Only what GuestShares reads: the portal, the coasters and their asset ids.
    class CoastersEnvironment implements ScreamScoreEnvironment {
        private int $nextAsset = 900;
        public array $coasters = [
            '/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster' => 401,
            '/Pimcore Kingdom/Ride designs/Sky Dragon/sky-dragon.coaster' => 402,
            '/Pimcore Kingdom/Archive/old-loop.coaster' => 403,
        ];
        public function __construct() { foreach ($this->coasters as $id) { new Asset($id); } }
        public function portalId(): ?int { return 101; }
        public function rides(string $folder): array {
            $rides = [];
            foreach (array_keys($this->coasters) as $path) { if (str_starts_with($path, $folder . '/')) { $rides[] = basename($path, '.coaster'); } }
            sort($rides);
            return $rides;
        }
        public function coasterAssetId(string $folder, string $ride): ?int {
            foreach ($this->coasters as $path => $id) { if (str_starts_with($path, $folder . '/') && basename($path) === $ride . '.coaster') { return $id; } }
            return null;
        }
        // coaster-demo:reset uploads each coaster again: a new asset, the old one is gone
        public function uploadCoastersAgain(): void {
            foreach ($this->coasters as $path => $id) { unset(Asset::$byId[$id]); $this->coasters[$path] = $this->nextAsset++; new Asset($this->coasters[$path]); }
        }
        private function no(): never { throw new \\LogicException('GuestShares does not use this'); }
        public function feedbackClassFields(string $className): ?array { $this->no(); }
        public function saveFeedbackClass(string $className, string $title, string $group, array $fields): void { $this->no(); }
        public function deleteFeedbackClass(string $className): void { $this->no(); }
        public function ratings(): array { $this->no(); }
        public function saveRating(GuestFeedback $feedback): void { $this->no(); }
        public function deleteRating(string $key): void { $this->no(); }
        public function feedbackFolderExists(): bool { $this->no(); }
        public function deleteFeedbackFolder(): void { $this->no(); }
        public function passHashes(): ?array { $this->no(); }
        public function savePassHashes(array $hashes): void { $this->no(); }
        public function deletePassHashes(): void { $this->no(); }
        public function staffGroup(string $name): ?array { $this->no(); }
        public function saveStaffGroup(string $name, array $permissions): void { $this->no(); }
        public function deleteStaffGroup(string $name): void { $this->no(); }
        public function staffUser(string $email, string $password): ?array { $this->no(); }
        public function saveStaffUser(array $user): void { $this->no(); }
        public function deleteStaffUser(string $email): void { $this->no(); }
    }

    Site::$byRootId[101] = new Site(3, 101, '/pimcore-kingdom', 'portal.localhost');
    new PortalUser(61, 'staff@pimcore-kingdom.example');
    new PortalUser(62, 'buyer@park.example');
    $GLOBALS['env'] = new CoastersEnvironment();
    $GLOBALS['entities'] = new EntityManagerService();
    $GLOBALS['service'] = new PublicShareService($GLOBALS['entities']);
    $GLOBALS['urls'] = new StubUrlGenerator();
    $GLOBALS['pools'] = new DataPoolConfigService([3 => [
        new StubDataPoolConfig(new Page(120, '/pimcore-kingdom/open-briefs'), 'object', 'open-briefs'),
        new StubDataPoolConfig(new Page(110, '/pimcore-kingdom/ride-designs'), 'asset', 'ride-designs'),
    ]]);
    function shares(): GuestShares {
        return new GuestShares($GLOBALS['service'], $GLOBALS['entities'], $GLOBALS['pools'], $GLOBALS['urls'], $GLOBALS['env'],
            new InMemoryRides(['thunder-loop' => 'Thunder Loop', 'sky-dragon' => 'Sky Dragon', 'old-loop' => 'Old Loop']));
    }
    function state(): array { return $GLOBALS['entities']->shares(); }
    // a share someone made in the portal, not the demo
    function seed(string $name, int $owner): void {
        $GLOBALS['entities']->persist((new PublicShare())->setHash(str_repeat('a', 31) . $owner)->setName($name)->setUserId($owner)->setCurrentSiteId(3));
    }
}
`;

const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const byName = (shares) => Object.fromEntries(shares.map((s) => [s.name, s]));

test('AC1: setup makes one public share per coaster, holding only it, owned by Park staff on the demo site, no expiry, download or terms', () => {
  const { changes, shares, indexed, siteRequest, createFails } = php(`
    $createFails = false;
    try { $GLOBALS['service']->create('x', []); } catch (\\Error $e) { $createFails = true; }
    $changes = shares()->setup();
    echo json_encode(['changes' => $changes, 'shares' => state(), 'indexed' => $GLOBALS['service']->indexed,
      'siteRequest' => Site::isSiteRequest(), 'createFails' => $createFails]);
  `);
  assert.equal(createFails, true, 'the stub service cannot create() without a portal user, like the real one in a command');
  assert.equal(siteRequest, false, 'setup ran with no current Site and leaves none');

  assert.deepEqual(shares.map((s) => s.name).sort(), ['Sky Dragon: your scream score', 'Thunder Loop: your scream score'],
    'one share per coaster in the ride designs folder, none for the archived one');
  const named = byName(shares);
  for (const [name, asset] of [['Thunder Loop: your scream score', 401], ['Sky Dragon: your scream score', 402]]) {
    const share = named[name];
    assert.equal(share.userId, 61, `${name}: owned by the Park staff user`);
    assert.equal(share.currentSiteId, 3, `${name}: on the demo portal's site`);
    assert.equal(share.collectionId, null, `${name}: made from the single asset, no collection`);
    assert.equal(share.expiryDate, null, `${name}: no expiry`);
    assert.deepEqual(share.configs, [], `${name}: no download types`);
    assert.equal(share.showTermsText, false, `${name}: no terms text shown`);
    assert.equal(share.termsText, null, `${name}: no terms text`);
    assert.match(share.hash, /^[0-9a-f]{32}$/, `${name}: a share hash`);
    assert.deepEqual(share.items, [{ elementId: asset, elementType: 'asset', elementSubType: 'unknown', dataPoolId: 110 }],
      `${name}: holds only its coaster, in the asset data pool`);
  }
  assert.notEqual(named['Thunder Loop: your scream score'].hash, named['Sky Dragon: your scream score'].hash);
  assert.deepEqual(indexed.sort(), [401, 402], 'the coasters go to the search index queue (addItemsToPublicShare)');
  assert.deepEqual(changes, [
    'Made the public share "Sky Dragon: your scream score" for the guests',
    'Put the coaster asset 402 into the public share "Sky Dragon: your scream score"',
    'Made the public share "Thunder Loop: your scream score" for the guests',
    'Put the coaster asset 401 into the public share "Thunder Loop: your scream score"',
  ]);
});

test('AC1: setup stops with a plain message when there is no Park staff user to own the shares', () => {
  const { error, shares } = php(`
    PortalUser::$byEmail = [];
    $error = null;
    try { shares()->setup(); } catch (\\RuntimeException $e) { $error = $e->getMessage(); }
    echo json_encode(['error' => $error, 'shares' => state()]);
  `);
  assert.match(error, /no park-staff portal user staff@pimcore-kingdom\.example/);
  assert.deepEqual(shares, []);
});

test('AC2: a second setup keeps each share and its hash and changes nothing; after a new upload the share holds exactly the new coaster', () => {
  const { first, second, writes, again, afterUpload, upload } = php(`
    shares()->setup();
    $first = state();
    $GLOBALS['entities']->writes = 0;
    $second = shares()->setup();
    $writes = $GLOBALS['entities']->writes;
    $again = state();
    $GLOBALS['env']->uploadCoastersAgain();
    $upload = shares()->setup();
    echo json_encode(['first' => $first, 'second' => $second, 'writes' => $writes, 'again' => $again, 'afterUpload' => state(), 'upload' => $upload]);
  `);
  assert.deepEqual(second, [], 'nothing to do');
  assert.equal(writes, 0, 'nothing is written');
  assert.deepEqual(again, first, 'the same shares, hashes and items');

  assert.equal(afterUpload.length, 2, 'no second share');
  const before = byName(first);
  for (const [name, asset] of [['Thunder Loop: your scream score', 900], ['Sky Dragon: your scream score', 901]]) {
    const share = byName(afterUpload)[name];
    assert.equal(share.id, before[name].id, `${name}: the same share`);
    assert.equal(share.hash, before[name].hash, `${name}: the same hash`);
    assert.deepEqual(share.items.map((i) => i.elementId), [asset], `${name}: exactly the current coaster, the deleted one's item removed`);
  }
  assert.deepEqual(upload, [
    'Took asset 402 out of the public share "Sky Dragon: your scream score"',
    'Put the coaster asset 901 into the public share "Sky Dragon: your scream score"',
    'Took asset 401 out of the public share "Thunder Loop: your scream score"',
    'Put the coaster asset 900 into the public share "Thunder Loop: your scream score"',
  ]);
});

test('AC2: setup puts back a demo share whose settings were changed in the portal, and keeps its hash', () => {
  const { changes, share, hashBefore } = php(`
    shares()->setup();
    $share = $GLOBALS['entities']->getManager()->getRepository(PublicShare::class)->findOneBy(['name' => 'Thunder Loop: your scream score']);
    $hashBefore = $share->getHash();
    $share->setExpiryDate(time() + 3600)->setShowTermsText(true)->setTermsText('Be nice')->setConfigs([['format' => 'original']]);
    $changes = shares()->setup();
    echo json_encode(['changes' => $changes, 'share' => array_column(state(), null, 'name')['Thunder Loop: your scream score'], 'hashBefore' => $hashBefore]);
  `);
  assert.deepEqual(changes, ['Put back the settings of the public share "Thunder Loop: your scream score": no expiry, no download, no terms text']);
  assert.equal(share.hash, hashBefore);
  assert.deepEqual([share.expiryDate, share.showTermsText, share.termsText, share.configs], [null, false, null, []]);
});

test('AC3: GuestShares::guestLink is the share\'s coaster page on the portal site: http://portal.localhost/ride-designs/<hash>/public-share-a~<id>', () => {
  const { link, links, hash, unknown, context } = php(`
    shares()->setup();
    $hash = array_column(state(), 'hash', 'name')['Thunder Loop: your scream score'];
    echo json_encode(['link' => shares()->guestLink('thunder-loop'), 'links' => shares()->guestLinks(), 'hash' => $hash,
      'unknown' => shares()->guestLink('no-such-ride'), 'context' => [$GLOBALS['urls']->getContext()->getHost(), $GLOBALS['urls']->getContext()->getScheme()]]);
  `);
  assert.equal(link, `http://portal.localhost/ride-designs/${hash}/public-share-a~401`,
    'the site domain, the asset pool\'s path in the site, the hash, the coaster asset');
  assert.equal(links['thunder-loop'], link);
  assert.deepEqual(Object.keys(links), ['sky-dragon', 'thunder-loop']);
  assert.match(links['sky-dragon'], /^http:\/\/portal\.localhost\/ride-designs\/[0-9a-f]{32}\/public-share-a~402$/);
  assert.equal(unknown, null, 'a ride without a share has no link');
  assert.deepEqual(context, ['localhost', 'http'], 'the router\'s own context is left as it was');
});

test('AC3: setup and reset print the guest links from GuestShares::guestLinks', () => {
  const setup = read(join(src, 'Command/CoasterDemoSetupCommand.php'));
  assert.match(setup, /\[\.\.\.\$this->demo->setup\(\$domain\), \.\.\.\$this->screamScore->setup\(\), \.\.\.\$this->guestShares->setup\(\)\]/,
    'the shares after the scream score, which makes their owner');
  assert.match(setup, /self::reportScreamScore\(\$io, \$this->screamScore, \$this->guestShares\);/);
  assert.match(setup, /\$guestShares->guestLinks\(\) as \$ride => \$link/);
  const reset = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  assert.match(reset, /CoasterDemoSetupCommand::reportScreamScore\(\$io, \$this->screamScore, \$this->guestShares\);/);
  const yaml = read(join(enterpriseDir, 'config/scream-score-demo.yaml'));
  assert.match(yaml, /^ {4}Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\GuestShares: ~$/m);
});

test('AC4: reset removes the demo\'s shares only (by name and owner), makes new ones with new hashes, and a remove with nothing left succeeds', () => {
  const { removed, left, again, reset, before, after, noOwner } = php(`
    seed('Thunder Loop: your scream score', 62);
    seed('Staff picks', 61);
    shares()->setup();
    $before = array_column(state(), 'hash', 'name');
    $reset = shares()->reset();
    $after = state();
    $removed = shares()->remove();
    $left = state();
    $again = shares()->remove();
    PortalUser::$byEmail = [];
    $noOwner = shares()->remove();
    echo json_encode(['removed' => $removed, 'left' => $left, 'again' => $again, 'reset' => $reset, 'before' => $before,
      'after' => $after, 'noOwner' => $noOwner]);
  `);
  assert.deepEqual(left.map((s) => [s.name, s.userId]), [['Thunder Loop: your scream score', 62], ['Staff picks', 61]],
    'the same name with another owner and the same owner with another name both stay');
  assert.deepEqual(removed, ['Deleted the public share "Sky Dragon: your scream score"', 'Deleted the public share "Thunder Loop: your scream score"']);
  assert.deepEqual(again, [], 'nothing left to remove is fine');
  assert.deepEqual(noOwner, [], 'no Park staff user is fine too');

  const demo = after.filter((s) => s.userId === 61 && s.name.endsWith(': your scream score'));
  assert.equal(demo.length, 2, 'reset makes the shares again');
  for (const share of demo) assert.notEqual(share.hash, before[share.name], `${share.name}: a new hash`);
  assert.deepEqual(reset.slice(0, 2), ['Deleted the public share "Sky Dragon: your scream score"', 'Deleted the public share "Thunder Loop: your scream score"']);
});

test('AC4: the reset command removes the shares before reset --all deletes their owner, and renews them on a plain reset', () => {
  const reset = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  assert.match(reset, /\[\.\.\.\$this->guestShares->remove\(\), \.\.\.\$this->screamScore->reset\(true\), \.\.\.\$this->demo->reset\(true, \$domain\)\]/);
  assert.match(reset, /\[\.\.\.\$this->demo->reset\(false, \$domain\), \.\.\.\$this->screamScore->reset\(\), \.\.\.\$this->guestShares->reset\(\)\]/);
});
