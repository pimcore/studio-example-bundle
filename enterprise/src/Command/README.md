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
| The park's open ride briefs (F293, browse only): a data object class "Ride brief" (`RideBrief`: title, ride type, max height (m), max length (m), inversions allowed, target opening, status open/closed, description; with a custom layout "Portal detail" of the same fields, which the portal's detail page shows), the three briefs of [`demo-data/open-briefs.json`](../../demo-data/open-briefs.json) (Thunder Loop at max height 45 m, Splash Canyon, Little Thunder, all open) as its objects, and the data-object data pool "Open briefs" listing them, icon `clipboard-list`, right after "Ride designs". The supplier gets access to the pool and a view-only data object workspace on the briefs' folder: browse, no edit, no apply. It replaces the content page "Brief: Thunder Loop": setup removes the demo's brief page on a demo from before, and the start page's brief tile opens the pool. A changed brief or field is put back; an editor's own briefs stay | the class in Settings > Data Objects > Classes (group "Coaster demo"); the briefs in the data object folder `/Pimcore Kingdom/Open briefs`; the data pool in the portal's navigation |
| Three pages for suppliers from [`demo-data/pages/`](../../demo-data/pages): "About the park", "Working with the Kingdom" and "Safety first" (on an environment without the open briefs also the park's brief, [`demo-data/brief.md`](../../demo-data/brief.md), as the content page "Brief: Thunder Loop"). Each has a navigation icon from portal_engine's bundled icon set (`clipboard-list`, `landmark`, `handshake`, `shield-alt`; the data pool gets `drafting-compass`), so none shows the rail's generic icon; a missing icon or changed text is put back, an editor's own pages stay | next to the data pool in the portal's navigation, in this order |
| The coasters' own area: the data pool "Ride designs" lists from `/Pimcore Kingdom/Ride designs` (each ride's folder below it, Thunder Loop first), so the page pictures (`/Pimcore Kingdom/Pages`) and the branding (`/Pimcore Kingdom/Branding`) are in no pool the supplier browses. A Thunder Loop folder from before (at `/Pimcore Kingdom/Thunder Loop`) is moved there in place, with its files and the supplier's workspace | the data pool's first **Workspace** row (the Portal Engine lists from the workspaces' common folder; its wizard puts it on `/`); setup saves it and clears the cache |
| The supplier's Upload button: Thunder Loop is the data pool's upload folder, so the listing offers **Upload Folder** to anyone with create there, and that screen has **Upload new assets**, which opens the portal's upload dialog (the 2026.x frontend shows the button nowhere else, DR-F292-1). The supplier may review the upload folder, so the screen lists revision 1 next to the upload | the data pool's **Upload Folder** setting; the permission `asset-upload-folder-reviewing___<data pool id>` on the supplier |
| The park's own-made logo ([`demo-data/branding/`](../../demo-data/branding/LICENSE.md), SVG and PNG) in `/Pimcore Kingdom/Branding`, set as the portal's **Logo**, with **brand_primary** `#6428b4` (Pimcore Purple, the slides' colour) and **brand_accent** `#502090` (its darker shade) | the portal's configuration document (Style Settings); setup saves it and clears the cache. A changed colour or a missing logo file is put back |
| The supplier Loopwerk Engineering, a portal user with access to the portal and the data pool, review rights on its upload folder, and all rights in the asset folder `/Pimcore Kingdom/Ride designs/Thunder Loop` (not the Branding folder next to it) | data object `/Portal Users/Coaster demo/loopwerk-supplier` |
| The English text "All ride designs" for the asset tree's first line (`portal-engine.listing.root-folder`), added only where it is missing or empty, so an edited text stays. A 2026.3 ships "/ (root)" for it; an older 2026.x install shows the raw key | a Pimcore translation in the domain `portal_engine_frontend` (Settings > Translations); reset leaves it |
| Revision 1 of Thunder Loop, with the five metadata values the coaster listener (`src/Coaster/`) fills on upload | asset `/Pimcore Kingdom/Ride designs/Thunder Loop/thunder-loop.coaster` |

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

- `coaster-demo:reset` deletes every other asset in `/Pimcore Kingdom/Ride designs/Thunder Loop`, replaces a changed
  `thunder-loop.coaster` with a fresh revision 1 (no version history), then runs setup. At revision 1 it changes
  nothing.
- `coaster-demo:reset --all` deletes the supplier, the folder `/Pimcore Kingdom` (or one under an earlier park name),
  the data object folder `/Pimcore Kingdom` with the open briefs, the class "Ride brief" (once no object of it is
  left) and the portal with its site (the "Open briefs" data pool with it).
  It deletes only what the demo made: setup marks each element it creates with the property `coaster-demo`.

## Extension point

**Symfony console commands** (`#[AsCommand]`, registered as services in `config/commands.yaml`), which create
portals, users and assets through the Portal Engine and Pimcore.

Test, from the repository root: `enterprise/tests/coaster-setup.test.mjs` runs setup and reset against an in-memory
environment; `enterprise/tests/coaster-setup-plugin.test.mjs` covers enabling the plugin;
`enterprise/tests/coaster-branding.test.mjs` the logo, its safety and the brand colours' contrast;
`enterprise/tests/coaster-translation.test.mjs` the tree's root-folder text; `enterprise/tests/coaster-briefs.test.mjs` the open briefs (F293).

## Code

- `CoasterDemoSetupCommand.php`, `CoasterDemoResetCommand.php`: the two commands (`config/commands.yaml`)
- `CoasterDemo/CoasterDemo.php`: what the demo state is and how setup and reset reach it, written against
  `CoasterDemo/DemoEnvironment.php`
- `CoasterDemo/ContentPages.php`: the demo's content pages with their navigation icons, beside that interface
- `CoasterDemo/PimcoreDemoEnvironment.php`: both interfaces on Pimcore and the Portal Engine
- `CoasterDemo/BriefHtml.php`: the brief's Markdown as the WYSIWYG brick's HTML
- `CoasterDemo/RideBriefs.php`: the open briefs' part of the environment (F293): the class, the briefs, the data-object
  data pool, the old brief page's removal; `PimcoreDemoEnvironment` implements it
- Test: `tests/coaster-setup.test.mjs` runs setup and reset against an in-memory environment;
  `tests/coaster-setup-plugin.test.mjs` the plugin step; `tests/coaster-content-pages.test.mjs` the content pages and their icons
