// F315: the scream score rules (enterprise/src/ScreamScore), plain PHP with no Pimcore calls. Runs them through the
// php CLI (8.1+) with the InMemory store, passes and failure counter. A spy logs every store and pass call and every
// password_verify() (a function of the ScreamScore namespace that wraps the real one), so the order "pass first,
// store second" and the dummy hash can be checked. Run: node --test 'enterprise/tests/scream-score*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(enterpriseDir, 'src/ScreamScore');
const passes = JSON.parse(readFileSync(join(enterpriseDir, 'tests/fixtures/scream-score/passes.json'), 'utf8'));
const files = ['GuestFeedback', 'FeedbackStore', 'AnnualPasses', 'FailureCounter', 'RatingResult', 'ScreamScore',
  'InMemory/InMemoryFeedbackStore', 'InMemory/InMemoryAnnualPasses', 'InMemory/InMemoryFailureCounter'];

const uses = `
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\{ScreamScore, FeedbackStore, AnnualPasses, GuestFeedback};
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore\\InMemory\\{InMemoryFeedbackStore, InMemoryAnnualPasses, InMemoryFailureCounter};`;

const bootstrap = `
namespace Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ScreamScore {
    // Unqualified calls in ScreamScore resolve to this first: it logs the hash, then asks the real one.
    function password_verify(string $password, string $hash): bool {
        $GLOBALS['calls'][] = 'verify:' . $hash;
        return \\password_verify($password, $hash);
    }
}
namespace {
${files.map((f) => `    require ${JSON.stringify(join(src, `${f}.php`))};`).join('\n')}
${uses}
    $GLOBALS['calls'] = [];
    $GLOBALS['now'] = new \\DateTimeImmutable('2026-11-11T10:00:00+00:00');
    class SpyStore implements FeedbackStore {
        public function __construct(public InMemoryFeedbackStore $inner) {}
        public function findByPassAndRide(string $p, string $r): ?GuestFeedback { $GLOBALS['calls'][] = 'store.findByPassAndRide'; return $this->inner->findByPassAndRide($p, $r); }
        public function find(int $id): ?GuestFeedback { $GLOBALS['calls'][] = 'store.find'; return $this->inner->find($id); }
        public function forRide(string $r): array { $GLOBALS['calls'][] = 'store.forRide'; return $this->inner->forRide($r); }
        public function save(GuestFeedback $f): GuestFeedback { $GLOBALS['calls'][] = 'store.save'; return $this->inner->save($f); }
    }
    class SpyPasses implements AnnualPasses {
        public function __construct(private AnnualPasses $inner) {}
        public function codeHash(string $p): ?string { $GLOBALS['calls'][] = 'passes.codeHash'; return $this->inner->codeHash($p); }
    }
    $passes = new SpyPasses(InMemoryAnnualPasses::fromCodes(json_decode(${JSON.stringify(JSON.stringify(passes))}, true)));
    $store = new SpyStore(new InMemoryFeedbackStore());
    $service = new ScreamScore($store, $passes, new InMemoryFailureCounter(fn () => $GLOBALS['now']->getTimestamp()), fn () => $GLOBALS['now']);
    function later(string $by): void { $GLOBALS['now'] = $GLOBALS['now']->modify($by); }
    function records(): array { global $store; return array_map(fn ($r) => ['createdAt' => $r->createdAt->format(DATE_ATOM)] + (array) $r, $store->inner->all()); }
    function calls(): array { $c = $GLOBALS['calls']; $GLOBALS['calls'] = []; return $c; }
}
`;

// Runs the PHP body after the bootstrap ($service, $store, later(), records(), calls()) and parses what it echoes.
const php = (body) => {
  const out = execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${uses}\n${body}\n}\n`], { encoding: 'utf8' });
  return JSON.parse(out);
};

const REFUSED_PASS = 'Pass number or code is not right.';
const REFUSED_LOCKED = 'Too many tries. Try again in 15 minutes.';

test('AC1: a valid pass, score and comment store one rating; the same pass again replaces it and keeps an earlier hide', () => {
  const r = php(`
    $first = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 9, 'Screamed the whole way <3', 'client-a');
    $afterFirst = records();
    $service->hide($first->id);
    later('+1 hour');
    $second = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 4, 'Less scary the second time', 'client-a');
    $other = $service->rate('thunder-loop', 'PK-2026-0002', '0815', 7, null, 'client-a');
    $otherRide = $service->rate('wild-mouse', 'PK-2026-0001', '4711', 6, str_repeat('x', 280), 'client-a');
    echo json_encode(['first' => $first->toArray(), 'afterFirst' => $afterFirst, 'second' => $second->toArray(),
      'other' => $other->toArray(), 'otherRide' => $otherRide->toArray(), 'records' => records()]);
  `);
  assert.deepEqual(r.first, { stored: true, replaced: false, errors: [], id: 1 }, 'no errors (an empty PHP array)');
  assert.deepEqual(r.afterFirst, [{ id: 1, ride: 'thunder-loop', screamScore: 9, comment: 'Screamed the whole way <3',
    passNumber: 'PK-2026-0001', visible: true, createdAt: '2026-11-11T10:00:00+00:00' }], 'stored as typed, visible');
  assert.deepEqual(r.second, { stored: true, replaced: true, errors: [], id: 1 });
  assert.equal(r.other.replaced, false, 'another pass is another rating');
  assert.equal(r.otherRide.replaced, false, 'another ride is another rating');
  const thunder = r.records.filter((rec) => rec.ride === 'thunder-loop' && rec.passNumber === 'PK-2026-0001');
  assert.equal(thunder.length, 1, 'one record per pass and ride');
  assert.equal(thunder[0].screamScore, 4);
  assert.equal(thunder[0].comment, 'Less scary the second time');
  assert.equal(thunder[0].visible, false, 'the earlier hide is kept, the guest cannot bring the comment back');
  assert.equal(r.records.length, 3);
});

test('AC1: rate() has no visible parameter, so visible never comes from the guest', () => {
  const r = php(`
    $params = array_map(fn ($p) => $p->getName(), (new \\ReflectionMethod(ScreamScore::class, 'rate'))->getParameters());
    echo json_encode($params);
  `);
  assert.ok(!r.includes('visible'), r.join(','));
});

test('AC2: a wrong score, a too long comment or a wrong pass store nothing and give one refusal per field', () => {
  const r = php(`
    $cases = [];
    foreach ([0, 11, -3, 7.5, '7', null, true] as $score) {
      $cases[] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', $score, null, 'client-a')->toArray();
    }
    $cases[] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, str_repeat('ä', 281), 'client-a')->toArray();
    $cases[] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, ['not', 'text'], 'client-a')->toArray();
    $all = $service->rate('Thunder Loop/../x', 'PK-2026-0001', 'nope', 99, str_repeat('x', 300), 'client-b')->toArray();
    echo json_encode(['cases' => $cases, 'all' => $all, 'records' => records()]);
  `);
  for (const c of r.cases.slice(0, 7)) assert.deepEqual(c, { stored: false, replaced: false, errors: { score: 'Give a whole number from 1 to 10.' }, id: null });
  for (const c of r.cases.slice(7)) assert.deepEqual(c.errors, { comment: 'Keep the comment to 280 characters.' });
  assert.deepEqual(Object.keys(r.all.errors).sort(), ['comment', 'pass', 'ride', 'score']);
  assert.equal(r.all.errors.pass, REFUSED_PASS);
  assert.deepEqual(r.records, [], 'nothing stored');
});

test('AC2: an unknown pass and a wrong code get the same refusal, and the unknown pass is checked against the dummy hash', () => {
  const r = php(`
    calls();
    $wrong = $service->rate('thunder-loop', 'PK-2026-0001', '0000', 5, null, 'client-a')->toArray();
    $wrongCalls = calls();
    $unknown = $service->rate('thunder-loop', 'PK-9999-9999', '4711', 5, null, 'client-b')->toArray();
    $unknownCalls = calls();
    echo json_encode(['wrong' => $wrong, 'unknown' => $unknown, 'wrongCalls' => $wrongCalls, 'unknownCalls' => $unknownCalls,
      'dummy' => ScreamScore::DUMMY_HASH, 'dummyIsHash' => password_get_info(ScreamScore::DUMMY_HASH)['algo'] !== null, 'records' => records()]);
  `);
  assert.deepEqual(r.wrong, r.unknown, 'same refusal');
  assert.deepEqual(r.wrong.errors, { pass: REFUSED_PASS });
  assert.equal(r.wrongCalls.length, 2);
  assert.equal(r.wrongCalls[0], 'passes.codeHash');
  assert.match(r.wrongCalls[1], /^verify:\$2y\$/);
  assert.notEqual(r.wrongCalls[1], `verify:${r.dummy}`);
  assert.deepEqual(r.unknownCalls, ['passes.codeHash', `verify:${r.dummy}`], 'password_verify runs on the dummy hash');
  assert.ok(r.dummyIsHash);
  assert.deepEqual(r.records, []);
});

test('AC2: a pass number not matching ^PK-\\d{4}-\\d{4}$ is refused before any store or pass call; a valid pass is checked before the store', () => {
  const r = php(`
    calls();
    $results = [];
    foreach (['pk-2026-0001', 'PK-2026-001', 'PK-2026-0001 ', '../PK-2026-0001', "PK-2026-0001\\n", ''] as $p) {
      $results[] = $service->rate('thunder-loop', $p, '4711', 5, 'ok', 'client-' . count($results))->toArray();
    }
    $badCalls = calls();
    $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, 'ok', 'client-z');
    echo json_encode(['results' => $results, 'badCalls' => $badCalls, 'goodCalls' => calls(), 'records' => count(records())]);
  `);
  for (const res of r.results) assert.deepEqual(res.errors, { pass: REFUSED_PASS });
  assert.deepEqual(r.badCalls, [], 'no store call, no pass lookup');
  assert.deepEqual(r.goodCalls.slice(0, 2).map((c) => c.split(':')[0]), ['passes.codeHash', 'verify']);
  assert.deepEqual(r.goodCalls.slice(2), ['store.findByPassAndRide', 'store.save']);
  assert.equal(r.records, 1);
});

test('AC2: after 5 failures a pass is refused for 15 minutes, even with the right code', () => {
  const r = php(`
    $out = [];
    for ($i = 0; $i < 5; $i++) { $service->rate('thunder-loop', 'PK-2026-0001', 'bad', 5, null, 'client-' . $i); }
    calls();
    $out['locked'] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, null, 'client-new')->toArray();
    $out['lockedCalls'] = calls();
    $out['otherPass'] = $service->rate('thunder-loop', 'PK-2026-0002', '0815', 5, null, 'client-new')->stored;
    later('+14 minutes');
    $out['at14'] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, null, 'client-new')->toArray();
    later('+61 seconds');
    $out['at15'] = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 5, null, 'client-new')->toArray();
    echo json_encode($out);
  `);
  assert.deepEqual(r.locked.errors, { pass: REFUSED_LOCKED });
  assert.deepEqual(r.lockedCalls, [], 'a locked pass is not even checked');
  assert.equal(r.otherPass, true, 'only that pass is locked');
  assert.deepEqual(r.at14.errors, { pass: REFUSED_LOCKED });
  assert.equal(r.at15.stored, true, 'free again after 15 minutes');
});

test('AC2: after 5 failures from one client key that client is refused for 15 minutes, other clients are not', () => {
  const r = php(`
    $out = [];
    $guesses = ['PK-2026-0003', 'PK-1111-1111', 'nonsense', 'PK-2026-0004', 'PK-2026-0005'];
    foreach ($guesses as $p) { $service->rate('thunder-loop', $p, 'bad', 5, null, '203.0.113.7'); }
    $out['locked'] = $service->rate('thunder-loop', 'PK-2026-0006', '1357', 5, null, '203.0.113.7')->toArray();
    $out['otherClient'] = $service->rate('thunder-loop', 'PK-2026-0006', '1357', 5, null, '198.51.100.1')->stored;
    later('+16 minutes');
    $out['later'] = $service->rate('thunder-loop', 'PK-2026-0007', '8642', 5, null, '203.0.113.7')->stored;
    echo json_encode($out);
  `);
  assert.deepEqual(r.locked.errors, { pass: REFUSED_LOCKED });
  assert.equal(r.otherClient, true);
  assert.equal(r.later, true);
});

test('AC3: the summary has the average to one decimal over all ratings (hidden too), the count and the 5 newest visible comments without pass numbers', () => {
  const r = php(`
    $ids = [];
    $ratings = [['PK-2026-0001', '4711', 10, 'Best ride ever'], ['PK-2026-0002', '0815', 7, null], ['PK-2026-0003', '1234', 8, 'Loops!'],
      ['PK-2026-0004', '9999', 3, 'Rude comment'], ['PK-2026-0005', '2468', 9, 'Again'], ['PK-2026-0006', '1357', 6, 'Fine'],
      ['PK-2026-0007', '8642', 9, 'Wet seat <b>']];
    foreach ($ratings as [$p, $c, $s, $t]) { $ids[$p] = $service->rate('thunder-loop', $p, $c, $s, $t, 'c')->id; later('+1 minute'); }
    $service->rate('wild-mouse', 'PK-2026-0001', '4711', 1, 'Other ride', 'c');
    $service->hide($ids['PK-2026-0004']);
    echo json_encode(['summary' => $service->summary('thunder-loop'), 'hidden' => $service->hidden('thunder-loop'), 'id4' => $ids['PK-2026-0004']]);
  `);
  const s = r.summary;
  assert.equal(s.count, 7);
  assert.equal(s.average, 7.4, '(10+7+8+3+9+6+9)/7 = 7.43, hidden 3 included');
  assert.deepEqual(s.comments.map((c) => c.comment), ['Wet seat <b>', 'Fine', 'Again', 'Loops!', 'Best ride ever'],
    'newest first, five, visible ones with a comment only, as typed');
  assert.deepEqual(s.comments[0], { id: 7, score: 9, comment: 'Wet seat <b>', date: '2026-11-11T10:06:00+00:00' });
  assert.ok(!JSON.stringify(s).includes('PK-'), 'no pass numbers');
  assert.equal(s.hiddenCount, 1);
  assert.deepEqual(r.hidden, [{ id: r.id4, score: 3, comment: 'Rude comment', date: '2026-11-11T10:03:00+00:00' }]);
  assert.ok(!JSON.stringify(r.hidden).includes('PK-'));
});

test('AC3: a coaster with no ratings has count 0, no average, no comments and nothing hidden', () => {
  const r = php(`echo json_encode(['summary' => $service->summary('thunder-loop'), 'hidden' => $service->hidden('thunder-loop')]);`);
  assert.deepEqual(r.summary, { ride: 'thunder-loop', count: 0, average: null, comments: [], hiddenCount: 0 });
  assert.deepEqual(r.hidden, []);
});

test('AC4: hiding a comment and showing it again changes only visible, average and count stay', () => {
  const r = php(`
    $a = $service->rate('thunder-loop', 'PK-2026-0001', '4711', 10, 'Top', 'c')->id;
    $service->rate('thunder-loop', 'PK-2026-0002', '0815', 5, 'Meh', 'c');
    $before = $service->summary('thunder-loop'); $recordsBefore = records();
    later('+1 day');
    $hid = $service->hide($a);
    $hidden = $service->summary('thunder-loop'); $recordsHidden = records();
    $shown = $service->show($a);
    $again = $service->summary('thunder-loop'); $recordsAgain = records();
    echo json_encode(compact('before', 'hidden', 'again', 'recordsBefore', 'recordsHidden', 'recordsAgain', 'hid', 'shown')
      + ['missing' => [$service->hide(999), $service->show(999)]]);
  `);
  assert.equal(r.hid, true);
  assert.equal(r.shown, true);
  assert.deepEqual(r.missing, [false, false]);
  for (const s of [r.hidden, r.again]) {
    assert.equal(s.count, r.before.count);
    assert.equal(s.average, r.before.average);
  }
  assert.deepEqual(r.hidden.comments.map((c) => c.comment), ['Meh']);
  assert.equal(r.hidden.hiddenCount, 1);
  assert.deepEqual(r.again, r.before);
  const expectedHidden = r.recordsBefore.map((rec) => (rec.id === 1 ? { ...rec, visible: false } : rec));
  assert.deepEqual(r.recordsHidden, expectedHidden, 'only visible changed');
  assert.deepEqual(r.recordsAgain, r.recordsBefore);
});

test('AC4: the staff group is one constant, Park staff', () => {
  const r = php(`echo json_encode(ScreamScore::STAFF_GROUP);`);
  assert.equal(r, 'Park staff');
});
