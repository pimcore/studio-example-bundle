# Coaster demo: revision 3 as a Change Control change set

Demo 2 needs an open change set on the Thunder Loop asset: the designer's revision 3, proposed against revision 2
(the file Demo 1 ends with), for the safety team to review in Studio's coaster **Review** tab
(`assets/studio/js/src/coaster-review/`).

## How to run

With Change Control 2026.3 installed and the demo set up (`bin/console coaster-demo:setup`, see
[`src/Command/README.md`](../Command/README.md)):

```bash
bin/console coaster-demo:change-set                      # open it; a second run changes nothing
bin/console coaster-demo:change-set --upload-revision-2  # rehearse Demo 2 alone: upload revision 2 first
bin/console coaster-demo:reset                           # discards it (and goes back to revision 1)
```

`--user` (default `admin`) names the Studio user the change set is authored by. Then open the asset in Studio and
review it in the **Review** tab.

## What it shows

Change Control on 2026.3 reviews an asset's metadata, not its file (its binary is out of draft scope). So revision 3
is recorded as metadata leaves, named as the coaster diff names them (`assets/shared/coaster/diff/diff.mjs`):

| Metadata entry | Revision 2 (base) | Revision 3 (proposed) |
| --- | --- | --- |
| `coaster.track.liftHill.1.height` | 45 | 52 |
| `coaster.track.loop.1.diameter` | 24 | 30 |
| `coaster.track` (textarea) | the element list of revision 2 as JSON | the element list of revision 3 |

Before it opens the change set, the command writes the base entries onto the asset (they describe the file it holds),
so the review shows old against new. Nothing else reaches the live asset before a merge: its file stays revision 2.

A reviewer who leaves the height out and merges gets the 30 m loop and keeps the 45 m lift hill: each change is its
own leaf, and the Review tab amends the element list to the ticked changes.

## Extension point

**Change Control's authoring facade**, called from a console command (and a listener of the demo's reset event). The
only way to author a change set on 2026.3 is the PHP facade `ChangeControlAuthoringInterface` (no REST for it):

```php
$branch = $authoring->open($subject, 'Thunder Loop revision 3', Schema::CREATED_VIA_USER, $userId, null, ['coasterDemo' => 'revision-3']);
$authoring->recordPatch($branch->uuid, [
    LeafPath::join(['metadata', 'coaster.track.loop.1.diameter', '*']) => ['type' => 'input', 'data' => '30'],
    // ...
], [], $userId);
```

The facade is marked `@internal` in ChangeControlBundle: fine for a demo, and the talk says so. A user-authored change
set (`created_via` `user`, no context ref) is visible to every Studio user who may view the asset. The author
parameters `coasterDemo: revision-3` mark the demo's change sets, so the command and the reset never touch anyone
else's.

## Code

- `CoasterChangeSetCommand.php`: `coaster-demo:change-set` (`config/change-control.yaml`)
- `CoasterChangeSet.php`: what revision 3 is as metadata and how the change set gets there, written against
  `ChangeSetEnvironment.php`
- `PimcoreChangeSetEnvironment.php`: that interface on Pimcore and Change Control's authoring facade
- `CoasterChangeSetResetListener.php`: discards the change set on `coaster-demo:reset` (`CoasterDemoResetEvent`)
- Test: `tests/coaster-cc-seed.test.mjs` runs the seed against an in-memory environment and merges the change set
  with the Review tab's own merge request
