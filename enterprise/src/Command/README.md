# Coaster demo: setup and reset commands

Two console commands put a developer laptop into the state Demo 1 starts from, and back there between runs. The
runbook relies on them.

## How to run

In your application, with the sub-bundle installed (see [the enterprise README](../../README.md)):

```bash
bin/console coaster-demo:setup               # create what is missing; a second run changes nothing
bin/console coaster-demo:reset               # back to revision 1 (between demo runs)
bin/console coaster-demo:reset --all         # back to the state before setup: removes everything setup made
```

Both take `--domain` (default `portal.localhost`), the portal's domain when the portal has to be created. Each prints
one line per change and ends with the demo login.

## What it shows

### What setup creates

| What | Where |
| --- | --- |
| The portal "Pimcore Kingdom" with the asset data pool "Ride designs", English only | a new site on `--domain`, made by the Portal Engine's own portal wizard |
| The example portal plugin `studio-example-enterprise` in the portal's **Enabled plugins** (the coaster tile and preview need it); other plugins there stay | the portal's configuration document; setup saves it and clears the cache |
| The park's brief ([`demo-data/brief.md`](../../demo-data/brief.md)) as a content page "Brief: Thunder Loop", and three pages for suppliers from [`demo-data/pages/`](../../demo-data/pages): "About the park", "Working with the Kingdom" and "Safety first". Each has a navigation icon from portal_engine's bundled icon set (`clipboard-list`, `landmark`, `handshake`, `shield-alt`; the data pool gets `drafting-compass`), so none shows the rail's generic icon; a missing icon or changed text is put back, an editor's own pages stay | next to the data pool in the portal's navigation, in this order |
| The park's own-made logo ([`demo-data/branding/`](../../demo-data/branding/LICENSE.md), SVG and PNG) in `/Pimcore Kingdom/Branding`, set as the portal's **Logo**, with **brand_primary** `#6428b4` (Pimcore Purple, the slides' colour) and **brand_accent** `#502090` (its darker shade) | the portal's configuration document (Style Settings); setup saves it and clears the cache. A changed colour or a missing logo file is put back |
| The supplier Loopwerk Engineering, a portal user with access to the portal and the data pool, and all rights in the asset folder `/Pimcore Kingdom/Thunder Loop` (not the Branding folder next to it) | data object `/Portal Users/Coaster demo/loopwerk-supplier` |
| The English text "All ride designs" for the asset tree's first line (`portal-engine.listing.root-folder`), added only where it is missing or empty, so an edited text stays. A 2026.3 ships "/ (root)" for it; an older 2026.x install shows the raw key | a Pimcore translation in the domain `portal_engine_frontend` (Settings > Translations); reset leaves it |
| Revision 1 of Thunder Loop, with the five metadata values the coaster listener (`src/Coaster/`) fills on upload | asset `/Pimcore Kingdom/Thunder Loop/thunder-loop.coaster` |

**Demo login** (public, shown on stage): `supplier@loopwerk.example`, password `thunder-loop`.

Setup never overwrites a design the demo uploaded; it only adds what is missing and repairs the supplier and the brief.
On a new portal the plugin is part of the "Created the portal" line; on an existing portal without it setup prints
"Enabled the plugin ...". So the demo portal needs no manual step in Studio; for other portals, enable the plugin by
hand as [the portal README](../../assets/portal/README.md) says. A save that fails stops setup with an error.

Setup finds the demo portal by its `coaster-demo` mark, not by its name. A demo set up under the park's earlier name (before
DR-P22) is renamed in place: setup prints "Renamed the portal ..." and "Renamed the folder
...", keeps the one portal (same site, pages and supplier) and moves the coaster with its folder; the next run changes
nothing. The earlier names are in `CoasterDemo::LEGACY_PARK_NAMES`.

### What reset does

- `coaster-demo:reset` deletes every other asset in `/Pimcore Kingdom/Thunder Loop`, replaces a changed
  `thunder-loop.coaster` with a fresh revision 1 (no version history), then runs setup. At revision 1 it changes
  nothing.
- `coaster-demo:reset --all` deletes the supplier, the folder `/Pimcore Kingdom` (or one under an earlier park name)
  and the portal with its site.
  It deletes only what the demo made: setup marks each element it creates with the property `coaster-demo`.

Before either, the reset command dispatches `CoasterDemo\CoasterDemoResetEvent`, so other demo state can be dropped
too (the Change Control seed discards its open change set there):

```php
#[AsEventListener(event: CoasterDemoResetEvent::class)]
public function onReset(CoasterDemoResetEvent $event): void { /* ... */ }
```

## Extension point

**Symfony console commands** (`#[AsCommand]`, registered as services in `config/commands.yaml`), which create
portals, users and assets through the Portal Engine and Pimcore. The reset command offers one extension point of its
own: **the event `CoasterDemoResetEvent`**, for other examples to drop their demo state on reset (the listener
above).

Test, from the repository root: `enterprise/tests/coaster-setup.test.mjs` runs setup and reset against an in-memory
environment; `enterprise/tests/coaster-setup-plugin.test.mjs` covers enabling the plugin;
`enterprise/tests/coaster-branding.test.mjs` the logo, its safety and the brand colours' contrast;
`enterprise/tests/coaster-translation.test.mjs` the tree's root-folder text.

## Code

- `CoasterDemoSetupCommand.php`, `CoasterDemoResetCommand.php`: the two commands (`config/commands.yaml`)
- `CoasterDemo/CoasterDemo.php`: what the demo state is and how setup and reset reach it, written against
  `CoasterDemo/DemoEnvironment.php`
- `CoasterDemo/ContentPages.php`: the demo's content pages with their navigation icons, beside that interface
- `CoasterDemo/PimcoreDemoEnvironment.php`: both interfaces on Pimcore and the Portal Engine
- `CoasterDemo/BriefHtml.php`: the brief's Markdown as the WYSIWYG brick's HTML
- Test: `tests/coaster-setup.test.mjs` runs setup and reset against an in-memory environment;
  `tests/coaster-setup-plugin.test.mjs` the plugin step; `tests/coaster-content-pages.test.mjs` the content pages and their icons
