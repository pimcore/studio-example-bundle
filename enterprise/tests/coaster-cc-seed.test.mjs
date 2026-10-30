// F52: Demo 2's data, revision 3 as a Change Control change set (src/ChangeControl/). Needs the php CLI (8.1+). The
// seed runs against an in-memory ChangeSetEnvironment that stands for the coaster asset and Change Control's draft
// store (a change set keeps the metadata it was opened against as its base, and its proposed metadata); the merge is
// done here the way Change Control 2026.3 does it (an excluded leaf keeps its base, an amended one takes the amendment).
// Run (node 24 needs the glob): node --test 'enterprise/tests/*.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const demoData = join(enterpriseDir, 'demo-data');
const src = join(enterpriseDir, 'src');
const read = (path) => readFileSync(path, 'utf8');
const model = await import(join(enterpriseDir, 'assets/studio/js/src/coaster-review/coaster-review-model.ts'));
const { diffCoaster } = await import(join(enterpriseDir, 'assets/shared/coaster/diff/diff.mjs'));

const bootstrap = `
namespace {
    require ${JSON.stringify(src)} . '/ChangeControl/ChangeSetEnvironment.php';
    require ${JSON.stringify(src)} . '/ChangeControl/CoasterChangeSet.php';

    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ChangeControl\\ChangeSetEnvironment;
    use Pimcore\\Bundle\\StudioExampleEnterpriseBundle\\ChangeControl\\CoasterChangeSet;

    function revision(int $n): string { return file_get_contents(${JSON.stringify(demoData)} . "/thunder-loop-rev{$n}.coaster"); }

    class MemoryEnvironment implements ChangeSetEnvironment {
        public int $writes = 0;
        private int $nextId = 1;
        public array $state;

        public function __construct(int $revision = 2) {
            // the asset as the upload leaves it: the file and the five key figures the coaster listener sets
            $five = ['maxHeight' => '45', 'length' => '820', 'inversions' => '2', 'topSpeed' => '88', 'duration' => '95'];
            $this->state = [
                'asset' => ['content' => revision($revision), 'metadata' => array_map(fn ($data) => ['type' => 'input', 'data' => $data], $five)],
                // someone else's change set on the same asset: the demo must leave it alone
                'changeSets' => ['foreign' => ['state' => 'draft', 'name' => 'Poster text', 'context' => null,
                    'base' => [], 'proposed' => ['caption' => ['type' => 'input', 'data' => 'New']]]],
            ];
        }
        public function coasterFile(): ?string { return $this->state['asset']['content'] ?? null; }
        public function replaceCoaster(string $content): void { $this->writes++; $this->state['asset']['content'] = $content; }
        public function metadata(): array { return $this->state['asset']['metadata']; }
        public function saveMetadata(array $entries): void {
            $this->writes++;
            $this->state['asset']['metadata'] = [...$this->state['asset']['metadata'], ...$entries];
        }
        public function openChangeSets(): array {
            $coaster = fn (array $entries) => array_filter($entries, fn ($name) => str_starts_with($name, 'coaster.track'), ARRAY_FILTER_USE_KEY);
            $open = [];
            foreach (array_reverse($this->state['changeSets'], true) as $id => $set) {
                if ($set['state'] === 'draft' && $set['context'] === CoasterChangeSet::CONTEXT) {
                    $open[$id] = ['base' => $coaster($set['base']), 'proposed' => $coaster($set['proposed'])];
                }
            }
            return $open;
        }
        // Change Control's open(): the base is the asset's metadata now; recordPatch() folds the entries over it.
        public function openChangeSet(string $name, array $entries, ?int $userId): string {
            $this->writes++;
            $id = 'cs-' . $this->nextId++;
            $base = $this->state['asset']['metadata'];
            $this->state['changeSets'][$id] = ['state' => 'draft', 'name' => $name, 'context' => CoasterChangeSet::CONTEXT,
                'createdBy' => $userId, 'base' => $base, 'proposed' => [...$base, ...$entries]];
            return $id;
        }
        public function discardChangeSet(string $id, ?int $userId): void { $this->writes++; $this->state['changeSets'][$id]['state'] = 'discarded'; }
    }

    function seed(MemoryEnvironment $env): CoasterChangeSet { return new CoasterChangeSet($env); }
}
`;

// Runs the PHP snippet after the bootstrap and returns what it echoes, parsed as JSON.
const php = (body) =>
  JSON.parse(execFileSync('php', ['-d', 'display_errors=stderr', '-r', `${bootstrap}\nnamespace {\n${body}\n}\n`], { encoding: 'utf8' }));

const demo = (name) => JSON.parse(read(join(demoData, name)));
const rev2 = demo('thunder-loop-rev2.coaster');
const rev3 = demo('thunder-loop-rev3.coaster');
const LOOP = 'coaster.track.loop.1.diameter';
const HEIGHT = 'coaster.track.liftHill.1.height';
const TRACK = 'coaster.track';

const openSets = (state) => Object.entries(state.changeSets).filter(([, set]) => set.state === 'draft' && set.context);
// What a change set changes: the proposed entries that differ from its base.
const changed = (set) => Object.fromEntries(Object.entries(set.proposed).filter(([name, entry]) =>
  JSON.stringify(set.base[name]) !== JSON.stringify(entry)));

test('AC1: the command opens one change set with exactly the loop and height leaves plus the element list entry', () => {
  const { changes, state } = php(`
    $env = new MemoryEnvironment();
    $changes = seed($env)->open(2);
    echo json_encode(['changes' => $changes, 'state' => $env->state]);
  `);
  const sets = openSets(state);
  assert.equal(sets.length, 1, 'one change set of the demo');
  const [id, set] = sets[0];
  assert.equal(set.name, 'Thunder Loop revision 3');
  assert.equal(set.createdBy, 2);

  assert.deepEqual(changed(set), {
    [HEIGHT]: { type: 'input', data: '52' },
    [LOOP]: { type: 'input', data: '30' },
    [TRACK]: { type: 'textarea', data: JSON.stringify(rev3.track) },
  });
  assert.deepEqual(set.base[HEIGHT], { type: 'input', data: '45' });
  assert.deepEqual(set.base[LOOP], { type: 'input', data: '24' });
  assert.deepEqual(JSON.parse(set.base[TRACK].data), rev2.track, 'the element list is opened against revision 2');

  // the leaves are the ones F43's diff names for revision 2 -> 3
  assert.deepEqual(diffCoaster(rev2, rev3).map((change) => change.metadata.key).sort(), [HEIGHT, LOOP].sort());

  // the live asset is not changed by the proposal: it is described as revision 2, its file stays revision 2
  assert.deepEqual(JSON.parse(state.asset.content), rev2);
  assert.equal(state.asset.metadata[LOOP].data, '24');
  assert.equal(state.asset.metadata.maxHeight.data, '45', 'the key figures stay');
  assert.equal(state.changeSets.foreign.state, 'draft', 'another change set on the asset is left alone');
  assert.ok(changes.some((line) => line.includes(id) && line.includes(`${LOOP}: 24 -> 30`) && line.includes(`${HEIGHT}: 45 -> 52`)), changes.join('\n'));
});

test('AC1: a second run changes nothing; an outdated change set of the demo is replaced', () => {
  const { again, writes, before, after, replaced, state } = php(`
    $env = new MemoryEnvironment();
    seed($env)->open();
    $before = $env->state; $writes = $env->writes;
    $again = seed($env)->open();
    $result = ['again' => $again, 'writes' => $env->writes - $writes, 'before' => $before, 'after' => $env->state];
    // someone recorded the height back into the demo's change set: the next run opens a fresh one
    $env->state['changeSets']['cs-1']['proposed']['coaster.track.liftHill.1.height']['data'] = '45';
    $result['replaced'] = seed($env)->open();
    $result['state'] = $env->state;
    echo json_encode($result);
  `);
  assert.deepEqual(again, []);
  assert.equal(writes, 0, 'no write at all');
  assert.deepEqual(after, before);

  assert.equal(replaced.length, 2, replaced.join('\n'));
  assert.match(replaced[0], /Discarded the outdated change set cs-1/);
  assert.equal(state.changeSets['cs-1'].state, 'discarded');
  const sets = openSets(state);
  assert.deepEqual(sets.map(([id]) => id), ['cs-2']);
  assert.deepEqual(Object.keys(changed(sets[0][1])).sort(), [HEIGHT, LOOP, TRACK].sort());
});

test('AC1: at another revision the command stops, or uploads revision 2 first when asked', () => {
  const { error, changes, state } = php(`
    $env = new MemoryEnvironment(1);
    try { seed($env)->open(); $error = null; } catch (\\RuntimeException $e) { $error = $e->getMessage(); }
    $untouched = $env->writes === 0;
    $changes = seed($env)->open(null, true);
    echo json_encode(['error' => $untouched ? $error : 'wrote before failing', 'changes' => $changes, 'state' => $env->state]);
  `);
  assert.match(error ?? '', /not at revision 2.*--upload-revision-2/);
  assert.match(changes[0], /Uploaded revision 2/);
  assert.deepEqual(JSON.parse(state.asset.content), rev2);
  assert.equal(openSets(state).length, 1);
});

test('AC1: on Pimcore the change set is opened and recorded through Change Control\'s authoring interface', () => {
  const env = read(join(src, 'ChangeControl/PimcoreChangeSetEnvironment.php'));
  assert.match(env, /implements ChangeSetEnvironment/);
  assert.match(env, /\$this->authoring->open\(\$subject, \$name, Schema::CREATED_VIA_USER, \$userId, null, CoasterChangeSet::CONTEXT\)/,
    'user-authored, no context ref: the Review tab lists it');
  assert.match(env, /\$this->authoring->recordPatch\(\$branch->uuid, \$patch/);
  assert.match(env, /LeafPath::join\(\[self::METADATA_SLOT, \$entryName, self::NEUTRAL_LANGUAGE\]\)/);
  assert.match(env, /\$this->authoring->discard\(/);
  assert.match(env, /new SubjectRef\(self::SUBJECT_TYPE, \$this->identities->resolve/);

  const yaml = read(join(enterpriseDir, 'config/change-control.yaml'));
  const ns = 'Pimcore\\\\Bundle\\\\StudioExampleEnterpriseBundle\\\\ChangeControl\\\\';
  for (const service of ['CoasterChangeSetCommand', 'CoasterChangeSetResetListener', 'CoasterChangeSet', 'PimcoreChangeSetEnvironment']) {
    assert.match(yaml, new RegExp(`^ {4}${ns}${service}:`, 'm'), service);
  }
  assert.match(yaml, new RegExp(`${ns}ChangeSetEnvironment:\\s*\\n\\s+alias: ${ns}PimcoreChangeSetEnvironment`));
  assert.match(read(join(src, 'ChangeControl/CoasterChangeSetCommand.php')), /NAME = 'coaster-demo:change-set'/);
});

// The change set's metadata slot as Change Control's review payload carries it: entries keyed by leaf address
// (LeafPath::join: dots in a name escaped), language-neutral '*'.
const address = (name) => `metadata.${name.replaceAll('\\', '\\\\').replaceAll('.', '\\.')}.*`;
const slotOf = (set) => {
  const side = (entries) => Object.fromEntries(Object.entries(entries).map(([name, entry]) =>
    [address(name), { name, language: '', ...entry }]));
  return { shape: 'entry-set', current: side(set.base), proposed: side(set.proposed) };
};

// Change Control's buildSlotRows (review/slots/build-slot-rows.ts on 2026.3), as in coaster-review.test.mjs.
const buildSlotRows = (slot, shaping) => {
  const { proposed, current } = slot;
  return [...new Set([...Object.keys(proposed), ...Object.keys(current)])].map((key) => {
    const sample = key in proposed ? proposed[key] : current[key];
    const c = key in current ? shaping.value(current[key]) : null;
    const p = key in proposed ? shaping.value(proposed[key]) : null;
    return { ...shaping.extras(key, sample), key, label: shaping.label(key, sample), type: shaping.type(key, sample),
      current: c, proposed: p, changed: JSON.stringify(c) !== JSON.stringify(p) };
  }).filter((row) => row.changed);
};

// Change Control's merge: base for an excluded leaf, the amendment for an amended one, else the proposed value.
const merge = (set, slot, { excludePaths, amendments = {} }) => {
  const result = {};
  for (const key of new Set([...Object.keys(slot.current), ...Object.keys(slot.proposed)])) {
    const entry = key in amendments ? amendments[key] : excludePaths.includes(key) ? slot.current[key] : slot.proposed[key];
    if (entry) result[entry.name] = { type: entry.type, data: entry.data };
  }
  return result;
};

test('AC2: merged with the height leaf excluded, the change set applies the loop change only', () => {
  const { state } = php(`
    $env = new MemoryEnvironment();
    seed($env)->open();
    echo json_encode(['state' => $env->state]);
  `);
  const [id, set] = openSets(state)[0];
  const slot = slotOf(set);
  const rows = buildSlotRows(slot, model.coasterShaping);

  // the Review tab (F53) shows the two changes, the element list rides along
  assert.deepEqual(model.readableRows(rows).map((row) => row.label), ['liftHill #1: height 45 -> 52', 'loop #1: diameter 24 -> 30']);

  // the reviewer unticks the height row and merges; the tab sends this request
  const { changeSetReviewActionParameters: params } = model.mergeRequest(id, rows, [address(HEIGHT)]);
  const merged = merge(set, slot, params);

  assert.equal(merged[LOOP].data, '30', 'the loop change is applied');
  assert.equal(merged[HEIGHT].data, '45', 'the height keeps its value');
  const track = JSON.parse(merged[TRACK].data);
  assert.deepEqual(diffCoaster(rev2, { ...rev2, track }).map((change) => change.text), ['loop #1: diameter 24 -> 30'],
    'the element list carries the loop change only');
  assert.equal(merged.maxHeight.data, '45', 'the other entries stay');
});

test('AC3: the reset command discards the open change set and nothing else', () => {
  const { discarded, again, state, writes } = php(`
    $env = new MemoryEnvironment();
    seed($env)->open();
    $discarded = seed($env)->discard();
    $writes = $env->writes;
    $again = seed($env)->discard();
    echo json_encode(['discarded' => $discarded, 'again' => $again, 'state' => $env->state, 'writes' => $env->writes - $writes]);
  `);
  assert.deepEqual(discarded, ['Discarded the change set cs-1']);
  assert.equal(state.changeSets['cs-1'].state, 'discarded');
  assert.deepEqual(openSets(state), []);
  assert.equal(state.changeSets.foreign.state, 'draft', 'another change set stays open');
  assert.deepEqual(again, [], 'nothing left to discard');
  assert.equal(writes, 0);

  // coaster-demo:reset dispatches CoasterDemoResetEvent before it resets (F51); the listener discards there
  const listener = read(join(src, 'ChangeControl/CoasterChangeSetResetListener.php'));
  assert.match(listener, /#\[AsEventListener\(event: CoasterDemoResetEvent::class\)\]/);
  assert.match(listener, /public function __invoke\(CoasterDemoResetEvent \$event\): void\s*\{\s*\$this->changeSet->discard\(\);/);
  const reset = read(join(src, 'Command/CoasterDemoResetCommand.php'));
  assert.ok(reset.indexOf('dispatch(new CoasterDemoResetEvent(') < reset.indexOf('$this->demo->reset('));
});
