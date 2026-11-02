# Demo data: Thunder Loop

## What it shows

Sample `.coaster` files (format: [`../assets/shared/coaster/FORMAT.md`](../assets/shared/coaster/FORMAT.md)) and the
park's brief for the change-control demo. All names are fictional.

| File | What it is |
| --- | --- |
| `brief.md` | The park's brief: requirements, target audience, a maximum height of 45 m. |
| `thunder-loop-rev1.coaster` | Revision 1: the first draft (lower lift hill, a turn instead of the helix). |
| `thunder-loop-rev2.coaster` | Revision 2: the approved baseline. |
| `thunder-loop-rev3.coaster` | Revision 3: two changes to revision 2: the first loop's diameter 24 to 30 m (within the brief) and the lift hill's height 45 to 52 m (above the brief's 45 m limit). |
| `expected-metadata.json` | The golden key figures of revisions 1 to 3, which the TypeScript and the PHP metadata extraction must both give. |
| `branding/` | The park's own-made logo (SVG and PNG) that `coaster-demo:setup` sets on the portal with its brand colours; what it is and its license (CC0): [branding/LICENSE.md](branding/LICENSE.md). |

## How to run

Nothing to run: `bin/console coaster-demo:setup` ([`src/Command/README.md`](../src/Command/README.md)) uploads revision 1
and the brief, `bin/console coaster-demo:change-set` ([`src/ChangeControl/README.md`](../src/ChangeControl/README.md))
proposes revision 3. To look at a file, open it in the viewer
([`assets/shared/coaster/viewer/README.md`](../assets/shared/coaster/viewer/README.md)), or upload it to any asset
folder to get its metadata ([`src/Coaster/README.md`](../src/Coaster/README.md)).

## Extension point

None: data that the examples' extension points work on.
