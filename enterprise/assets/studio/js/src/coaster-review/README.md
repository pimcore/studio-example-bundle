# Coaster review tab

A Studio asset editor tab, **Review**, on `.coaster` assets. It shows the open Change Control change set of the ride
in Change Control's own diff table, with one readable line per change ("loop #1: diameter 24 -> 30") next to the
table's include checkbox. The reviewer unticks what they reject and merges the rest.

Extension point: **an asset editor tab** (`Asset/Editor/TextTabManager` and `Asset/Editor/UnknownTabManager`,
hidden on every asset that is not a `.coaster` file). Everything else is Change Control's public Studio SDK,
`@pimcore/change-control-bundle/sdk` (2026.3), used as it is.

## What it shows

For revision 3 of Thunder Loop the change set holds two changes, and the tab lists two rows:

| Include | Change | Current | Proposed |
|---|---|---|---|
| ☑ | loop #1: diameter 24 -> 30 | 24 | 30 |
| ☑ | liftHill #1: height 45 -> 52 | 45 | 52 |

Below the table, **Merge ticked changes** merges the change set. Afterwards the tab says what went in and what was
left out.

## The review slot

Change Control's review payload (`useBundleChangeControlGetChangeSetReviewQuery`) sends a subject's changes as
**slots**. Asset metadata comes in the slot `'metadata'`, an entry set keyed by **leaf address**: one entry per
metadata leaf (`metadata.<name>.<language>`), each with its `name`, `language`, `type` and `data`, once for the
`current` side and once for the `proposed` side.

The coaster leaves use the metadata names of the coaster diff (`enterprise/assets/shared/coaster/diff/diff.mjs`):

- `coaster.track.<type>.<n>.<field>`: a field of the n-th element of that type, e.g. `coaster.track.loop.1.diameter`
- `coaster.track.<type>.<n>`: a whole element that was added or removed
- `coaster.train.<field>`, `coaster.meta.<field>`, and the five key figures (`maxHeight`, `length`, ...)
- `coaster.track`: the whole element list as JSON

The tab uses the slot in three steps (`coaster-review-model.ts`, `components/coaster-review-tab.tsx`):

1. **Rows.** Change Control's `buildSlotRows(slot, coasterShaping, 'current')` turns the slot into diff rows, one per
   changed leaf, keyed by its leaf address. `coasterShaping` does what Change Control's own metadata renderer does:
   it compares the entries' `data` and keeps the entry name on the row.
2. **Readable lines.** `readableRows(rows)` labels every row with its line. If the slot carries the element list, the
   lines are the coaster diff's own texts for the same names. Otherwise they come from the name and the two values.
   The `coaster.track` row itself gets no line: it follows the others (see Merging).
3. **The table.** The rows go to Change Control's `SlotDiffTable`. It draws the include checkbox per row and reports
   the unticked leaf addresses through `onToggleInclude`, every time the reviewer clicks one.

The tab does not add a slot renderer: registering one for `'metadata'` would change the diff of every asset in
Change Control.

## Merging

`mergeRequest(changeSetId, rows, excluded)` builds the argument for `useBundleChangeControlMergeChangeSetMutation`:

- `excludePaths`: the unticked leaf addresses, exactly as the table reported them. Change Control keeps the asset's
  own value for each of them.
- `amendments`, for the element list only: `coaster.track` holds every change, so it would bring an unticked change
  back in. When some rows are unticked, it is amended to the current list plus the ticked changes. When all rows are
  unticked, it is excluded as well; when none are, it is merged as it is.

So for Thunder Loop, unticking the height row merges `coaster.track.loop.1.diameter` (24 -> 30) and the element list
with only the bigger loop, and keeps the lift hill at 45 m.

## Try it

1. Build and install the enterprise Studio frontend (see `enterprise/assets/studio`: `npm install`, `npm run build`,
   `npm run package-build`, then `bin/console cache:warmup`). Change Control 2026.3 must be installed, since its
   remote `pimcore_change_control_bundle` provides the SDK at runtime.
2. Open a change set on the Thunder Loop asset with revision 3 (the change set command of the coaster demo).
3. In Studio, open the `.coaster` asset and select the **Review** tab: two rows, both ticked.
4. Untick "liftHill #1: height 45 -> 52" and click **Merge ticked changes**. The tab reports "Merged: loop #1:
   diameter 24 -> 30" and "Left out: liftHill #1: height 45 -> 52". The asset's metadata now has the 30 m loop and
   the 45 m lift hill.

Tests: `node --test 'enterprise/tests/coaster-review.test.mjs'` (from the repository root).
