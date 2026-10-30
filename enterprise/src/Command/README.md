# Coaster demo: setup and reset commands

Two console commands put a developer laptop into the state Demo 1 starts from, and back there between runs. The
runbook relies on them.

```bash
bin/console coaster-demo:setup               # create what is missing; a second run changes nothing
bin/console coaster-demo:reset               # back to revision 1 (between demo runs)
bin/console coaster-demo:reset --all         # back to the state before setup: removes everything setup made
```

Both take `--domain` (default `portal.localhost`), the portal's domain when the portal has to be created. Each prints
one line per change and ends with the demo login.

## What setup creates

| What | Where |
| --- | --- |
| The portal "Theme Park of Tomorrow" with the asset data pool "Ride designs", English only | a new site on `--domain`, made by the Portal Engine's own portal wizard |
| The park's brief ([`demo-data/brief.md`](../../demo-data/brief.md)) as a content page "Brief: Thunder Loop" | next to the data pool in the portal's navigation |
| The supplier Loopwerk Engineering, a portal user with access to the portal and the data pool, and all rights in the asset folder `/Theme Park of Tomorrow` | data object `/Portal Users/Coaster demo/loopwerk-supplier` |
| Revision 1 of Thunder Loop, with the five metadata values the coaster listener (`src/Coaster/`) fills on upload | asset `/Theme Park of Tomorrow/Thunder Loop/thunder-loop.coaster` |

**Demo login** (public, shown on stage): `supplier@loopwerk.example`, password `thunder-loop`.

Setup never overwrites a design the demo uploaded; it only adds what is missing and repairs the supplier and the brief.

## What reset does

- `coaster-demo:reset` deletes every other asset in `/Theme Park of Tomorrow/Thunder Loop`, replaces a changed
  `thunder-loop.coaster` with a fresh revision 1 (no version history), then runs setup. At revision 1 it changes
  nothing.
- `coaster-demo:reset --all` deletes the supplier, the folder `/Theme Park of Tomorrow` and the portal with its site.
  It deletes only what the demo made: setup marks each element it creates with the property `coaster-demo`.

Before either, the reset command dispatches `CoasterDemo\CoasterDemoResetEvent`, so other demo state can be dropped
too (the Change Control seed discards its open change set there):

```php
#[AsEventListener(event: CoasterDemoResetEvent::class)]
public function onReset(CoasterDemoResetEvent $event): void { /* ... */ }
```

## Code

- `CoasterDemoSetupCommand.php`, `CoasterDemoResetCommand.php`: the two commands (`config/commands.yaml`)
- `CoasterDemo/CoasterDemo.php`: what the demo state is and how setup and reset reach it, written against
  `CoasterDemo/DemoEnvironment.php`
- `CoasterDemo/PimcoreDemoEnvironment.php`: that interface on Pimcore and the Portal Engine
- `CoasterDemo/BriefHtml.php`: the brief's Markdown as the WYSIWYG brick's HTML
- Test: `tests/coaster-setup.test.mjs` runs setup and reset against an in-memory environment
