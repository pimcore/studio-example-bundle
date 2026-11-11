// F316: coaster-demo:setup and coaster-demo:reset set up and remove the scream score (ScreamScoreDemo). Needs the php
// CLI (8.1+). The demo runs against an in-memory ScreamScoreEnvironment that stands for Pimcore and the Portal Engine,
// with the real ScreamScore rules (F315) for the guests' ratings and lockouts, so no Pimcore install is needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src');
const demoData = join(enterpriseDir, 'demo-data');
const read = (path) => readFileSync(path, 'utf8');

const files = ['ScreamScore/GuestFeedback', 'ScreamScore/FeedbackStore', 'ScreamScore/AnnualPasses', 'ScreamScore/FailureCounter',
  'ScreamScore/RatingResult', 'ScreamScore/ScreamScore', 'ScreamScore/InMemory/InMemoryFailureCounter',
  'ScreamScore/CacheFailureCounter', 'ScreamScore/Pimcore/PimcoreFeedbackStore', 'Command/CoasterDemo/ScreamScoreEnvironment',
  'Command/CoasterDemo/CoasterDemo', 'Command/CoasterDemo/ScreamScoreDemo'];

// The in-memory environment: the whole state is one array, so a test can compare states before and after. What the
// demo created carries 'demo' => true. 'classFiles' stands for the generated files under var/classes.
const bootstrap = `
namespace Psr\\Cache {
    interface CacheItemInterface { public function getKey(): string; public function get(): mixed; public function isHit(): bool;
        public function set(mixed $value): static; public function expiresAt(?\\DateTimeInterface $expiration): static;
        public function expiresAfter(int|\\DateInterval|null $time): static; }
    interface CacheItemPoolInterface { public function getItem(string $key): CacheItemInterface; public function save(CacheItemInterface $item): bool; }
}
namespace {
    foreach (${JSON.stringify(files)} as $file) { require ${JSON.stringify(src)} . '/' . $file . '.php'; }

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ScreamScoreDemo;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ScreamScoreEnvironment;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\FeedbackStore;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\AnnualPasses;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\GuestFeedback;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\ScreamScore;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\InMemoryFailureCounter;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\Pimcore\\PimcoreFeedbackStore;

    class MemoryEnvironment implements ScreamScoreEnvironment, FeedbackStore, AnnualPasses {
        public int $writes = 0;
        private int $nextId = 500;
        private int $nextAsset = 900;
        public array $state = [
            'portalId' => 101,
            'coasters' => ['/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster' => 401],
            'classes' => ['RideBrief' => ['demo' => true]],
            'classFiles' => ['DataObject/RideBrief.php'],
            'folder' => false,
            'ratings' => [],
            'passes' => null,
            'groups' => ['Editors' => ['permissions' => [], 'demo' => false]],
            'users' => ['buyer@park.example' => ['firstname' => 'Park', 'lastname' => 'Buyer', 'password' => 'secret', 'permissions' => [], 'groups' => ['Editors'], 'demo' => false]],
        ];

        public function portalId(): ?int { return $this->state['portalId']; }
        public function feedbackClassFields(string $className): ?array { return $this->state['classes'][$className]['fields'] ?? null; }
        public function saveFeedbackClass(string $className, string $title, string $group, array $fields): void {
            $this->writes++;
            $this->state['classes'][$className] = ['title' => $title, 'group' => $group, 'fields' => $fields, 'demo' => true];
            $this->state['classFiles'] = array_values(array_unique([...$this->state['classFiles'], "definition_$className.php", "DataObject/$className.php", "DataObject/$className/Listing.php"]));
        }
        public function deleteFeedbackClass(string $className): void {
            if ($this->state['ratings'] !== []) { return; }
            $this->writes++;
            unset($this->state['classes'][$className]);
            $this->state['classFiles'] = array_values(array_filter($this->state['classFiles'], fn ($f) => !str_contains($f, $className)));
        }
        public function rides(string $folder): array {
            $rides = [];
            foreach (array_keys($this->state['coasters']) as $path) {
                if (str_starts_with($path, $folder . '/')) { $rides[] = basename($path, '.coaster'); }
            }
            sort($rides);
            return $rides;
        }
        public function coasterAssetId(string $folder, string $ride): ?int {
            foreach ($this->state['coasters'] as $path => $id) {
                if (str_starts_with($path, $folder . '/') && basename($path) === $ride . '.coaster') { return $id; }
            }
            return null;
        }
        // The reset of the coaster demo: the coaster is uploaded again and gets a new asset id.
        public function uploadCoasterAgain(): void {
            foreach ($this->state['coasters'] as $path => $id) { $this->state['coasters'][$path] = $this->nextAsset++; }
        }
        private static function feedback(array $r): GuestFeedback {
            return new GuestFeedback($r['id'], $r['ride'], $r['screamScore'], $r['comment'], $r['passNumber'], $r['visible'], new \\DateTimeImmutable($r['createdAt']));
        }
        public function ratings(): array {
            return array_map(fn (array $r) => ['feedback' => self::feedback($r), 'rideAsset' => $r['rideAsset']], $this->state['ratings']);
        }
        public function saveRating(GuestFeedback $feedback): void { $this->save($feedback); }
        public function deleteRating(string $key): void { $this->writes++; unset($this->state['ratings'][$key]); }
        public function feedbackFolderExists(): bool { return $this->state['folder']; }
        public function deleteFeedbackFolder(): void { $this->writes++; $this->state['folder'] = false; $this->state['ratings'] = []; }
        public function passHashes(): ?array { return $this->state['passes']; }
        public function savePassHashes(array $hashes): void { $this->writes++; $this->state['passes'] = $hashes; }
        public function deletePassHashes(): void { $this->writes++; $this->state['passes'] = null; }
        public function staffGroup(string $name): ?array {
            $group = $this->state['groups'][$name] ?? null;
            return $group === null ? null : ['permissions' => $group['permissions']];
        }
        public function saveStaffGroup(string $name, array $permissions): void {
            $this->writes++;
            $old = $this->state['groups'][$name] ?? ['permissions' => [], 'demo' => true];
            $this->state['groups'][$name] = ['permissions' => [...$old['permissions'], ...$permissions], 'demo' => $old['demo']];
        }
        public function deleteStaffGroup(string $name): void {
            if ($this->state['groups'][$name]['demo'] ?? false) { $this->writes++; unset($this->state['groups'][$name]); }
        }
        public function staffUser(string $email, string $password): ?array {
            $u = $this->state['users'][$email] ?? null;
            return $u === null ? null : ['email' => $email, 'firstname' => $u['firstname'], 'lastname' => $u['lastname'],
                'passwordValid' => $u['password'] === $password, 'permissions' => $u['permissions'], 'groups' => $u['groups']];
        }
        public function saveStaffUser(array $user): void {
            $this->writes++;
            foreach ($user['groups'] as $group) { if (!isset($this->state['groups'][$group])) { throw new \\RuntimeException("no group $group"); } }
            $old = $this->state['users'][$user['email']] ?? ['permissions' => [], 'demo' => true];
            $this->state['users'][$user['email']] = ['firstname' => $user['firstname'], 'lastname' => $user['lastname'], 'password' => $user['password'],
                'permissions' => [...$old['permissions'], ...$user['permissions']], 'groups' => $user['groups'], 'demo' => $old['demo']];
        }
        public function deleteStaffUser(string $email): void {
            if ($this->state['users'][$email]['demo'] ?? false) { $this->writes++; unset($this->state['users'][$email]); }
        }

        // FeedbackStore and AnnualPasses on the same state, so guests rate through the real ScreamScore rules.
        public function findByPassAndRide(string $passNumber, string $ride): ?GuestFeedback {
            $r = $this->state['ratings'][PimcoreFeedbackStore::key($ride, $passNumber)] ?? null;
            return $r === null ? null : self::feedback($r);
        }
        public function find(int $id): ?GuestFeedback {
            foreach ($this->state['ratings'] as $r) { if ($r['id'] === $id) { return self::feedback($r); } }
            return null;
        }
        public function forRide(string $ride): array {
            return array_values(array_map(fn ($r) => self::feedback($r), array_filter($this->state['ratings'], fn ($r) => $r['ride'] === $ride)));
        }
        // The fixed path: saving a pass's rating of a ride again replaces it; the ride relation is the current coaster.
        public function save(GuestFeedback $feedback): GuestFeedback {
            $this->writes++;
            $key = PimcoreFeedbackStore::key($feedback->ride, $feedback->passNumber);
            $id = $this->state['ratings'][$key]['id'] ?? $feedback->id ?? $this->nextId++;
            $this->state['folder'] = true;
            $this->state['ratings'][$key] = ['id' => $id, 'ride' => $feedback->ride, 'screamScore' => $feedback->screamScore,
                'comment' => $feedback->comment, 'passNumber' => $feedback->passNumber, 'visible' => $feedback->visible,
                'createdAt' => $feedback->createdAt->format(\\DateTimeInterface::ATOM),
                'rideAsset' => $this->coasterAssetId(PimcoreFeedbackStore::RIDES_FOLDER, $feedback->ride)];
            return $feedback->withId($id);
        }
        public function codeHash(string $passNumber): ?string { return $this->state['passes'][$passNumber] ?? null; }
    }

    $GLOBALS['failures'] = new InMemoryFailureCounter();
    function demo(MemoryEnvironment $env): ScreamScoreDemo { return new ScreamScoreDemo($env, $GLOBALS['failures']); }
    function screamScore(MemoryEnvironment $env): ScreamScore { return new ScreamScore($env, $env, $GLOBALS['failures']); }
}
`;

// Runs the PHP snippet after the bootstrap and returns what it echoes, parsed as JSON.
const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const passesFile = JSON.parse(read(join(demoData, 'annual-passes.json')));
const KEYS = ['thunder-loop-PK-2026-0001', 'thunder-loop-PK-2026-0002', 'thunder-loop-PK-2026-0003'];

test('AC1: setup creates the GuestFeedback class, the 5 hashed passes, the 3 samples (one hidden), the Park staff group and its user', () => {
  const { changes, state, links, passes, codesValid } = php(`
    $env = new MemoryEnvironment();
    $changes = demo($env)->setup();
    $codesValid = [];
    foreach (\\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\Command\\CoasterDemo\\ScreamScoreDemo::DEMO_PASS_CODES as $number => $code) { $codesValid[$number] = password_verify($code, $env->state['passes'][$number]); }
    echo json_encode(['changes' => $changes, 'state' => $env->state, 'links' => demo($env)->guestLinks('portal.localhost'),
      'passes' => demo($env)->demoPasses(), 'codesValid' => $codesValid]);
  `);

  const cls = state.classes.GuestFeedback;
  assert.ok(cls, 'the class exists');
  assert.equal(cls.group, 'Coaster demo');
  assert.deepEqual(Object.keys(cls.fields), ['ride', 'screamScore', 'comment', 'passNumber', 'visible', 'createdAt']);
  assert.deepEqual(Object.values(cls.fields).map(([type]) => type), ['relation', 'numeric', 'textarea', 'input', 'checkbox', 'datetime']);
  assert.ok(state.classFiles.includes('DataObject/GuestFeedback.php'), 'its class files are generated');

  // the passes: five numbers, each code only as a hash that the demo code verifies
  assert.deepEqual(Object.keys(state.passes), ['PK-2026-0001', 'PK-2026-0002', 'PK-2026-0003', 'PK-2026-0004', 'PK-2026-0005']);
  assert.deepEqual(Object.values(codesValid), [true, true, true, true, true]);
  for (const hash of Object.values(state.passes)) assert.match(hash, /^\$2y\$/, 'a bcrypt hash');
  const passesJson = read(join(demoData, 'annual-passes.json'));
  for (const code of Object.values(passes)) assert.ok(!passesJson.includes(code), `the plain code ${code} is not in annual-passes.json`);
  assert.equal(passesFile.passes.length, 5);

  // the samples: one per pass 0001-0003 on Thunder Loop, linked to its coaster, one hidden
  assert.deepEqual(Object.keys(state.ratings), KEYS);
  const ratings = Object.values(state.ratings);
  assert.deepEqual(ratings.map((r) => r.passNumber), ['PK-2026-0001', 'PK-2026-0002', 'PK-2026-0003']);
  assert.ok(ratings.every((r) => r.ride === 'thunder-loop' && r.rideAsset === 401));
  assert.equal(ratings.filter((r) => !r.visible).length, 1, 'one sample is hidden');
  assert.ok(ratings.every((r) => Number.isInteger(r.screamScore) && r.screamScore >= 1 && r.screamScore <= 10));
  assert.deepEqual(Object.keys(passes).slice(0, 2), ['PK-2026-0004', 'PK-2026-0005'], 'the free passes come first');

  // the staff group with portal access, and the staff user in it
  assert.deepEqual(state.groups['Park staff'], { permissions: { 'portal-access___101': 'allow' }, demo: true });
  const staff = Object.entries(state.users).find(([, u]) => u.groups.includes('Park staff'));
  assert.ok(staff, 'a user is in the Park staff group');
  assert.equal(staff[0], 'staff@pimcore-kingdom.example');
  assert.deepEqual(staff[1].groups, ['Park staff']);
  assert.equal(state.users['buyer@park.example'].groups[0], 'Editors', 'other users are untouched');

  // one plain line each, and the guest link per coaster
  assert.deepEqual(changes, [
    'Created the data object class "GuestFeedback" (Guest feedback) in the group "Coaster demo"',
    'Stored the 5 demo annual passes PK-2026-0001, PK-2026-0002, PK-2026-0003, PK-2026-0004, PK-2026-0005 (their codes as hashes only)',
    `Wrote the sample ratings ${KEYS.join(', ')} to /Pimcore Kingdom/Guest feedback`,
    'Set up the portal user group "Park staff" with access to the portal "Pimcore Kingdom"',
    'Set up the park-staff user Park Staff (staff@pimcore-kingdom.example) in the group "Park staff"',
  ]);
  assert.deepEqual(links, { 'thunder-loop': 'http://portal.localhost/_scream-score/thunder-loop' });
});

test('AC1: a second setup changes nothing, and it keeps a guest rating', () => {
  const { second, writes, before, after } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $r = screamScore($env)->rate('thunder-loop', 'PK-2026-0004', 'scream-0004', 8, 'Loved it', 'guest');
    if (!$r->stored) { throw new \\RuntimeException(json_encode($r->toArray())); }
    $before = $env->state;
    $env->writes = 0;
    $second = demo($env)->setup();
    echo json_encode(['second' => $second, 'writes' => $env->writes, 'before' => $before, 'after' => $env->state]);
  `);
  assert.deepEqual(second, []);
  assert.equal(writes, 0, 'nothing is written');
  assert.deepEqual(after, before);
});

test('AC1: the setup command prints the guest link per coaster, the demo passes and the staff login after the changes', () => {
  const command = read(join(src, 'Command/CoasterDemoSetupCommand.php'));
  assert.match(command, /\[\.\.\.\$this->demo->setup\(\$domain\), \.\.\.\$this->screamScore->setup\(\)\]/, 'the scream score after the coaster demo');
  assert.match(command, /self::reportScreamScore\(\$io, \$this->screamScore, \$domain\);/);
  assert.match(command, /guestLinks\(\$domain\)/);
  assert.match(command, /demoPasses\(\)/);
  assert.match(command, /ScreamScoreDemo::STAFF_EMAIL, ScreamScoreDemo::STAFF_PASSWORD/);
});

test('AC2: plain reset after guests rated leaves exactly the samples on the new coaster asset, keeps the links and clears the lockouts', () => {
  const { samples, state, changes, linksBefore, linksAfter, lockedBefore, rateAfter } = php(`
    $env = new MemoryEnvironment();
    demo($env)->setup();
    $samples = $env->state['ratings'];
    $linksBefore = demo($env)->guestLinks('portal.localhost');
    $score = screamScore($env);
    // guests: a new rating, a sample pass rating again, the park showing the hidden one, and a locked-out pass
    $score->rate('thunder-loop', 'PK-2026-0004', 'scream-0004', 10, 'Again!', 'guest-a');
    $score->rate('thunder-loop', 'PK-2026-0001', 'scream-0001', 2, 'Changed my mind', 'guest-b');
    $score->show($env->state['ratings']['thunder-loop-PK-2026-0003']['id']);
    for ($i = 0; $i < 5; $i++) { $score->rate('thunder-loop', 'PK-2026-0005', 'wrong', 5, null, 'guest-c'); }
    $lockedBefore = $score->rate('thunder-loop', 'PK-2026-0005', 'scream-0005', 5, null, 'guest-d')->errors;
    // the coaster demo's reset uploads revision 1 again: a new asset id
    $env->uploadCoasterAgain();
    $changes = demo($env)->reset();
    $linksAfter = demo($env)->guestLinks('portal.localhost');
    $rateAfter = screamScore($env)->rate('thunder-loop', 'PK-2026-0005', 'scream-0005', 6, null, 'guest-c')->toArray();
    $state = $env->state;
    // the live try above is not part of what reset left
    unset($state['ratings']['thunder-loop-PK-2026-0005']);
    echo json_encode(['samples' => $samples, 'state' => $state, 'changes' => $changes, 'linksBefore' => $linksBefore,
      'linksAfter' => $linksAfter, 'lockedBefore' => $lockedBefore, 'rateAfter' => $rateAfter]);
  `);
  assert.deepEqual(lockedBefore, { pass: 'Too many tries. Try again in 15 minutes.' }, 'the pass was locked before the reset');

  assert.deepEqual(Object.keys(state.ratings), KEYS, 'exactly the samples are left');
  for (const key of KEYS) {
    const { rideAsset, ...rest } = state.ratings[key];
    const { rideAsset: oldAsset, ...sample } = samples[key];
    assert.deepEqual(rest, sample, `${key} is the sample again`);
    assert.equal(oldAsset, 401);
    assert.equal(rideAsset, 900, `${key} points at the newly uploaded coaster`);
  }
  assert.deepEqual(linksAfter, linksBefore, 'the guest links stay the same');
  assert.equal(rateAfter.stored, true, 'the locked pass may rate again: the lockouts are cleared');

  assert.deepEqual(changes, [
    'Deleted the guest ratings thunder-loop-PK-2026-0004',
    'Put back the sample ratings thunder-loop-PK-2026-0001, thunder-loop-PK-2026-0003',
    'Cleared the failed pass checks: no pass or guest is locked out',
    `Wrote the sample ratings ${KEYS[1]} to /Pimcore Kingdom/Guest feedback`,
  ]);
});

test('AC2: the cache-backed lockout counter forgets every count on clear(), the rest of the cache stays', () => {
  const { before, after, other } = php(`
    $pool = new class implements \\Psr\\Cache\\CacheItemPoolInterface {
        public array $items = [];
        public function getItem(string $key): \\Psr\\Cache\\CacheItemInterface {
            $value = $this->items[$key] ?? null;
            return new class($key, $value) implements \\Psr\\Cache\\CacheItemInterface {
                public function __construct(private string $key, private mixed $value) {}
                public function getKey(): string { return $this->key; }
                public function get(): mixed { return $this->value; }
                public function isHit(): bool { return $this->value !== null; }
                public function set(mixed $value): static { $this->value = $value; return $this; }
                public function expiresAt(?\\DateTimeInterface $expiration): static { return $this; }
                public function expiresAfter(int|\\DateInterval|null $time): static { return $this; }
            };
        }
        public function save(\\Psr\\Cache\\CacheItemInterface $item): bool { $this->items[$item->getKey()] = $item->get(); return true; }
    };
    $pool->items['someone_else'] = 'kept';
    $counter = new \\Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\CacheFailureCounter($pool);
    for ($i = 0; $i < 5; $i++) { $counter->recordFailure('pass:PK-2026-0004', 900); }
    $before = $counter->failures('pass:PK-2026-0004');
    $counter->clear();
    echo json_encode(['before' => $before, 'after' => $counter->failures('pass:PK-2026-0004'), 'other' => $pool->items['someone_else']]);
  `);
  assert.equal(before, 5);
  assert.equal(after, 0);
  assert.equal(other, 'kept');
});

test('AC2: the reset command resets the coaster demo first, then the scream score, and prints the guest links again', () => {
  const command = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  assert.match(command, /\[\.\.\.\$this->demo->reset\(false, \$domain\), \.\.\.\$this->screamScore->reset\(\)\]/);
  assert.match(command, /CoasterDemoSetupCommand::reportScreamScore\(\$io, \$this->screamScore, \$domain\);/);
});

test('AC3: reset --all removes the ratings, the passes, the staff user and its group, and the class with its generated files', () => {
  const { changes, state, start, again } = php(`
    $env = new MemoryEnvironment();
    $start = $env->state;
    demo($env)->setup();
    screamScore($env)->rate('thunder-loop', 'PK-2026-0004', 'scream-0004', 8, null, 'guest');
    $changes = demo($env)->reset(true);
    $again = demo($env)->reset(true);
    echo json_encode(['changes' => $changes, 'state' => $env->state, 'start' => $start, 'again' => $again]);
  `);
  assert.deepEqual(state, start, 'back to the state before setup');
  assert.equal(state.classes.GuestFeedback, undefined);
  assert.ok(!state.classFiles.some((f) => f.includes('GuestFeedback')), 'no generated GuestFeedback file is left');
  assert.equal(state.passes, null);
  assert.equal(state.groups['Park staff'], undefined);
  assert.equal(state.users['staff@pimcore-kingdom.example'], undefined);
  assert.deepEqual(state.ratings, []);
  assert.deepEqual(changes, [
    'Deleted the 4 ratings in /Pimcore Kingdom/Guest feedback',
    'Deleted the data object folder /Pimcore Kingdom/Guest feedback',
    'Deleted the demo annual passes',
    'Deleted the park-staff user staff@pimcore-kingdom.example',
    'Deleted the portal user group "Park staff"',
    'Deleted the data object class "GuestFeedback" with its generated class files',
  ]);
  assert.deepEqual(again, [], 'a second reset --all has nothing to do');
});

test('AC3: reset --all runs the scream score first; the Pimcore class delete also removes the files under var/classes', () => {
  const command = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  assert.match(command, /\[\.\.\.\$this->screamScore->reset\(true\), \.\.\.\$this->demo->reset\(true, \$domain\)\]/);
  const pimcore = read(join(src, 'ScreamScore/Pimcore/PimcoreScreamScoreEnvironment.php'));
  assert.match(pimcore, /\$class->delete\(\);/);
  assert.match(pimcore, /PIMCORE_CLASS_DIRECTORY \. '\/DataObject\/' \. \$className \. '\.php'/);
  assert.match(pimcore, /PIMCORE_CLASS_DEFINITION_DIRECTORY \. '\/definition_' \. \$className \. '\.php'/);
});

test('AC4: the Pimcore-backed scream score lives under src/ScreamScore/Pimcore, where the F315 lint test reaches, and php -l passes', () => {
  const pimcoreDir = join(src, 'ScreamScore/Pimcore');
  const pimcoreFiles = readdirSync(pimcoreDir).filter((f) => f.endsWith('.php')).sort();
  assert.deepEqual(pimcoreFiles, ['PimcoreAnnualPasses.php', 'PimcoreFeedbackStore.php', 'PimcoreScreamScoreEnvironment.php']);
  const lint = read(join(enterpriseDir, 'tests/scream-score-lint.test.mjs'));
  assert.match(lint, /join\(enterpriseDir, 'src\/ScreamScore'\)/, 'the lint test walks src/ScreamScore');
  assert.match(lint, /if \(entry\.isDirectory\(\)\) return phpFiles\(path\);/, 'and its subfolders');
  const toLint = [...pimcoreFiles.map((f) => join(pimcoreDir, f)), join(src, 'Command/CoasterDemo/ScreamScoreDemo.php'),
    join(src, 'Command/CoasterDemo/ScreamScoreEnvironment.php'), join(src, 'Command/CoasterDemoSetupCommand.php'), join(src, 'Command/CoasterDemoResetCommand.php')];
  for (const file of toLint) {
    const run = spawnSync('php', ['-l', file], { encoding: 'utf8' });
    assert.equal(run.status, 0, `${file}: ${run.stdout}${run.stderr}`);
  }
  const yaml = read(join(enterpriseDir, 'config/scream-score-demo.yaml'));
  for (const service of ['ScreamScore\\\\Pimcore\\\\PimcoreFeedbackStore', 'ScreamScore\\\\ScreamScore', 'Command\\\\CoasterDemo\\\\ScreamScoreDemo']) {
    assert.match(yaml, new RegExp(`^ {4}Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\${service}:`, 'm'), service);
  }
});
