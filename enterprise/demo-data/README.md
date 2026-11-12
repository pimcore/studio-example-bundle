# Demo data: Thunder Loop

## What it shows

Sample `.coaster` files (format: [`../assets/shared/coaster/FORMAT.md`](../assets/shared/coaster/FORMAT.md)) and the
park's brief for the portal demo. All names are fictional.

| File | What it is |
| --- | --- |
| `brief.md` | The park's brief: requirements, target audience, a maximum height of 45 m. Since F293 the portal shows it as the Thunder Loop ride brief of `open-briefs.json`; `coaster-demo:setup` writes the page only on an environment without the open briefs. |
| `open-briefs.json` | The park's open ride briefs (F293), which `coaster-demo:setup` writes as "Ride brief" data objects for the portal's "Open briefs" data pool: Thunder Loop (family thrill coaster, max height 45 m, two inversions, the facts of `brief.md`), Splash Canyon (a water ride) and Little Thunder (a kids' coaster), all open. |
| `thunder-loop-rev1.coaster` | Revision 1: the first draft (lower lift hill, a turn instead of the helix). |
| `thunder-loop-rev2.coaster` | Revision 2: the approved baseline. |
| `thunder-loop-rev3.coaster` | Revision 3: two changes to revision 2: the first loop's diameter 24 to 30 m (within the brief) and the lift hill's height 45 to 52 m (above the brief's 45 m limit). |
| `thunder-loop-twister.coaster` | Thunder Loop Twister: Loopwerk's alternative design for the same ride (its own track: three inversions, a banked helix, 38 m), for the supplier to upload live into `/Pimcore Kingdom/Ride designs/Thunder Loop` in demo 1. `coaster-demo:setup` never uploads it, `coaster-demo:reset` removes it again; the agent's brief check answers for `thunder-loop.coaster` only. |
| `expected-metadata.json` | The golden key figures of revisions 1 to 3 (`revisions`) and of the Twister (`variants`), which the TypeScript and the PHP metadata extraction must both give. |
| `agent-fixtures/night-fury.coaster` | A ride design by another supplier, for the agent tools ([`src/Agent/README.md`](../src/Agent/README.md)): the Loopwerk supplier may not see it, so its revisions must never be listed for it. |
| `agent/kingdom-brief-check.replay.json` | The recorded turn the portal's agent chat replays ([`src/Portal/Agent/README.md`](../src/Portal/Agent/README.md)): its text only, with placeholders the live tool results fill in. |
| `annual-passes.json` | The five fictional annual passes of the scream score, `PK-2026-0001` to `PK-2026-0005`, which `coaster-demo:setup` stores and a guest types on a coaster's public share to rate it; only their codes' hashes are here, the plain demo codes are listed in [`src/ScreamScore/README.md`](../src/ScreamScore/README.md). |
| `scream-score-samples.json` | The sample scream scores that `coaster-demo:setup` writes and `coaster-demo:reset` puts back: three ratings of Thunder Loop from passes 0001 to 0003, one of them hidden by the park; passes 0004 and 0005 stay free for a live try, on Thunder Loop's public share. |
| `pages/*.md` | The park's content pages for suppliers that `coaster-demo:setup` makes in the portal, each with its navigation icon (F155): "About the park", "Working with the Kingdom" and "Safety first". Same Markdown as the brief. |
| `branding/` | The park's own-made logo (SVG and PNG) that `coaster-demo:setup` sets on the portal with its brand colours; what it is and its license (CC0): [branding/LICENSE.md](branding/LICENSE.md). |

## How to run

Nothing to run: `bin/console coaster-demo:setup` ([`src/Command/README.md`](../src/Command/README.md)) uploads revision 1
and writes the open briefs. To look at a file, open it in the viewer
([`assets/shared/coaster/viewer/README.md`](../assets/shared/coaster/viewer/README.md)), or upload it to any asset
folder to get its metadata ([`src/Coaster/README.md`](../src/Coaster/README.md)).

## Extension point

None: data that the examples' extension points work on.
