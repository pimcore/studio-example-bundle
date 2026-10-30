# Coaster review: both rides side by side

Above the diff table of the coaster **Review** tab ([`../README.md`](../README.md)): the ride as it is live and the
ride as the change set proposes it, next to each other, so the reviewer sees what a change does to the ride before
ticking it.

## What it shows

For revision 3 of Thunder Loop: revision 2 (the asset's live file) on the left, the proposed revision 3 on the right.
The changed elements, the lift hill and the first loop, are drawn in magenta on both. One **Play** starts both trains
together, Pause stops both, Restart takes both back to the station.

The preview reads the change set, never the reviewer's ticks: unticking a row changes what a merge would do, not the
proposal, so both rides stay as they are.

## How to run

1. Build and install the enterprise Studio frontend and open a change set on Thunder Loop, as in "How to run" of
   [the Review tab's README](../README.md).
2. In Studio, open the `.coaster` asset and select **Review**: the two rides are above the table. Click **Play**.

Without Studio, the same pair runs on its own page: serve the `enterprise` folder over HTTP as in
[the viewer README](../../../../../shared/coaster/viewer/README.md) and open
`assets/shared/coaster/viewer/pair.html` (`?live=<url>&proposed=<url>&speed=<m/s>`, default Thunder Loop revision 2
and 3).

Test, from the repository root: `enterprise/tests/coaster-side-by-side.test.mjs` builds the pair from a review slot in
Node and clicks Play in `pair.html` in headless Chromium.

## Extension point

**Content inside an asset editor tab**: the component is part of the Review tab, whose extension point is the asset
editor tab (see [`../README.md`](../README.md)). What it adds is a way to show a Change Control proposal the diff table
cannot: the review payload's `'metadata'` slot turned back into a file and drawn. Change Control's SDK also offers
`extraTabs` next to its own diff view for such a preview; the example keeps it in its own tab.

## Code

- `side-by-side-model.ts`: `previewPair(liveText, slot)`, free of React and Studio. The left ride is the live file,
  the right one that file with the slot's **proposed** side applied: the element list from `coaster.track`, the
  `coaster.train.<field>` and `coaster.meta.<field>` leaves, and the revision one up. The marks come from the viewer's
  `pairMarks`, so a ride marks exactly the elements the coaster diff pairs as changed, removed or added.
- `coaster-side-by-side.tsx`: loads the live file (`AssetApiSlice.useAssetGetTextDataByIdQuery`) and draws the pair
  with the viewer's `createRidePair` (`enterprise/assets/shared/coaster/viewer/pair.mjs`), passing Studio's own React.
