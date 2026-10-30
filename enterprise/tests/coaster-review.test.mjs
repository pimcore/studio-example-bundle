// F53: Studio review tab for the coaster change set, in Change Control's own diff table. Run (node 24 needs the glob):
// node --test 'enterprise/tests/*.test.mjs'
// The tab's logic lives in coaster-review-model.ts (Node strips its types); the React parts are checked statically,
// since enterprise/assets/studio has no node_modules here (Studio and Change Control load at runtime).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const enterpriseDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const reviewDir = join(enterpriseDir, 'assets/studio/js/src/coaster-review');
const read = (path) => readFileSync(join(reviewDir, path), 'utf8');
const model = await import(join(reviewDir, 'coaster-review-model.ts'));
const { diffCoaster } = await import(join(enterpriseDir, 'assets/shared/coaster/diff/diff.mjs'));

const demo = (name) => JSON.parse(readFileSync(join(enterpriseDir, 'demo-data', name), 'utf8'));
const rev2 = demo('thunder-loop-rev2.coaster');
const rev3 = demo('thunder-loop-rev3.coaster');

// One metadata entry as Change Control's review payload carries it (slot 'metadata', keyed by leaf address).
const entry = (name, type, data) => ({ name, language: '', type, data });
const leaf = (name) => `metadata.${name}.`;
const LOOP = 'coaster.track.loop.1.diameter';
const HEIGHT = 'coaster.track.liftHill.1.height';

// Revision 3 as the change set records it (F52): the two changed leaves plus the element list as a JSON entry.
const slot = () => ({
  shape: 'entry-set',
  current: {
    [leaf(LOOP)]: entry(LOOP, 'input', '24'),
    [leaf(HEIGHT)]: entry(HEIGHT, 'input', '45'),
    [leaf('coaster.track')]: entry('coaster.track', 'textarea', JSON.stringify(rev2.track)),
    [leaf('inversions')]: entry('inversions', 'input', '2'),
  },
  proposed: {
    [leaf(LOOP)]: entry(LOOP, 'input', '30'),
    [leaf(HEIGHT)]: entry(HEIGHT, 'input', '52'),
    [leaf('coaster.track')]: entry('coaster.track', 'textarea', JSON.stringify(rev3.track)),
    [leaf('inversions')]: entry('inversions', 'input', '2'),
  },
});

// What Change Control's buildSlotRows (review/slots/build-slot-rows.ts on 2026.3) makes of a slot with a shaping:
// the union of addresses, values unwrapped, extras spread in, only the changed rows kept.
const buildSlotRows = (s, shaping) => {
  const proposed = s.proposed ?? {};
  const current = s.current ?? {};
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  return [...new Set([...Object.keys(proposed), ...Object.keys(current)])].map((key) => {
    const sample = key in proposed ? proposed[key] : current[key];
    const c = key in current ? shaping.value(current[key]) : null;
    const p = key in proposed ? shaping.value(proposed[key]) : null;
    return {
      ...shaping.extras(key, sample),
      key,
      label: shaping.label(key, sample),
      type: shaping.type(key, sample),
      current: c,
      proposed: p,
      changed: !(key in current) || !(key in proposed) || !same(c, p),
      presence: key in proposed && key in current ? 'both' : key in proposed ? 'added' : 'removed',
    };
  }).filter((row) => row.changed);
};

const rowsOf = (s = slot()) => buildSlotRows(s, model.coasterShaping);

test('AC1: the change set lists one readable line per change, each on its own leaf with its include checkbox', () => {
  const rows = model.readableRows(rowsOf());
  assert.deepEqual(rows.map((row) => row.label), ['loop #1: diameter 24 -> 30', 'liftHill #1: height 45 -> 52']);
  // each line stays on its leaf address: the address the table's include checkbox toggles and the merge excludes
  assert.deepEqual(rows.map((row) => row.key), [leaf(LOOP), leaf(HEIGHT)]);

  // the lines are F43's texts for the same change, read from the element list in the change set
  const f43 = new Map(diffCoaster(rev2, rev3).map((change) => [change.metadata.key, change.text]));
  for (const row of rows) assert.equal(row.label, f43.get(row.name));

  // the tab hands these rows to Change Control's own diff table, which draws the checkbox per row
  const tab = read('components/coaster-review-tab.tsx');
  assert.match(tab, /from '@pimcore\/change-control-bundle\/sdk'/);
  assert.match(tab, /<SlotDiffTable[\s\S]*rows=\{ rows \}/);
  assert.match(tab, /onToggleInclude=\{ setExcluded \}/);
  assert.match(tab, /buildSlotRows\(slot, coasterShaping/);
  assert.match(tab, /readableRows\(/);
});

test('AC1: lines without the element list come from the leaf itself, key figures and other entries too', () => {
  assert.equal(model.coasterLine(LOOP, '24', '30'), 'loop #1: diameter 24 -> 30');
  assert.equal(model.coasterLine('coaster.track.loop.2', null, { type: 'loop', diameter: 18 }), 'element added: loop');
  assert.equal(model.coasterLine('coaster.train.cars', 6, 7), 'train: cars 6 -> 7');
  assert.equal(model.coasterLine('maxHeight', '45', '52'), 'max height 45 -> 52 m');
  assert.equal(model.coasterLine('title', 'Old', 'New'), 'title: "Old" -> "New"');

  const noTrack = slot();
  delete noTrack.current[leaf('coaster.track')];
  delete noTrack.proposed[leaf('coaster.track')];
  assert.deepEqual(model.readableRows(rowsOf(noTrack)).map((row) => row.label),
    ['loop #1: diameter 24 -> 30', 'liftHill #1: height 45 -> 52']);
});

test('AC1: the tab sits on .coaster assets only, in the asset editor of text and unknown assets', () => {
  assert.equal(model.isCoasterAsset({ fullPath: '/Rides/thunder-loop.coaster' }), true);
  assert.equal(model.isCoasterAsset({ fullPath: '/Rides/brief.txt' }), false);
  assert.equal(model.isCoasterAsset({}), false);

  const ext = read('modules/coaster-review-tab-extension.tsx');
  assert.match(ext, /'Asset\/Editor\/TextTabManager'/);
  assert.match(ext, /'Asset\/Editor\/UnknownTabManager'/);
  assert.match(ext, /hidden: \(element\) => !isCoasterAsset\(element\)/);
  assert.match(read('index.tsx'), /registerModule\(CoasterReviewTabExtension\)/);
  assert.match(readFileSync(join(enterpriseDir, 'assets/studio/js/src/plugins.ts'), 'utf8'), /CoasterReviewPlugin/);
  // the remote the sdk import loads from at runtime
  assert.match(readFileSync(join(enterpriseDir, 'assets/studio/rsbuild.config.ts'), 'utf8'),
    /'@pimcore\/change-control-bundle': createDynamicRemote\('pimcore_change_control_bundle'\)/);
});

test('AC2: unticking the height row and merging sends a merge of the loop change only', () => {
  const all = rowsOf();
  const request = model.mergeRequest('cs-3', all, [leaf(HEIGHT)]);
  assert.equal(request.changeSetId, 'cs-3');
  const params = request.changeSetReviewActionParameters;
  assert.deepEqual(params.excludePaths, [leaf(HEIGHT)]);

  // the element list would carry the height along: it is amended to revision 2 plus the loop change
  const amended = params.amendments[leaf('coaster.track')];
  assert.equal(amended.name, 'coaster.track');
  assert.equal(amended.type, 'textarea');
  const track = JSON.parse(amended.data);
  const expected = structuredClone(rev2.track);
  expected.find((element) => element.type === 'loop').diameter = 30;
  assert.deepEqual(track, expected);
  assert.deepEqual(diffCoaster({ ...rev2 }, { ...rev2, track }).map((change) => change.text), ['loop #1: diameter 24 -> 30']);

  // what the tab reports after the merge
  assert.deepEqual(model.mergeSummary(model.readableRows(all), [leaf(HEIGHT)]), {
    merged: ['loop #1: diameter 24 -> 30'],
    leftOut: ['liftHill #1: height 45 -> 52'],
  });

  // the tab sends exactly that request through Change Control's merge mutation
  const tab = read('components/coaster-review-tab.tsx');
  assert.match(tab, /useBundleChangeControlMergeChangeSetMutation\(\)/);
  assert.match(tab, /merge\(mergeRequest\(changeSetId, allRows, excluded\)\)/);
});

test('AC2: all rows ticked merges everything; all unticked leaves the element list out too', () => {
  const all = rowsOf();
  assert.deepEqual(model.mergeRequest('cs-3', all, []).changeSetReviewActionParameters, { excludePaths: [] });
  const none = model.mergeRequest('cs-3', all, [leaf(LOOP), leaf(HEIGHT)]).changeSetReviewActionParameters;
  assert.deepEqual(none, { excludePaths: [leaf(LOOP), leaf(HEIGHT), leaf('coaster.track')] });
});

test('AC3: the README explains how the review slot is used', () => {
  const readme = read('README.md');
  for (const heading of ['## What it shows', '## The review slot', '## Merging', '## Try it']) {
    assert.ok(readme.includes(heading), `README has ${heading}`);
  }
  for (const term of ["'metadata'", 'leaf address', 'SlotDiffTable', 'buildSlotRows', 'onToggleInclude', 'excludePaths',
    'amendments', 'coaster.track.loop.1.diameter', '@pimcore/change-control-bundle/sdk']) {
    assert.ok(readme.includes(term), `README names ${term}`);
  }
});
