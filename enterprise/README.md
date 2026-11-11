# Pimcore Studio Example Enterprise Bundle

Examples for Pimcore enterprise bundles (Portal Engine), kept apart from the public
[Pimcore Studio Example Bundle](../README.md). This folder is its own Composer package,
`pimcore/studio-example-enterprise-bundle`, so the public bundle keeps requiring only public packages: its
`composer.json`, `assets/` build and CI do not change.

The package is not published to a Composer repository. You install it from this folder through a Composer path
repository.

## Enterprise access

The package requires `pimcore/portal-engine`, an enterprise bundle: your
project needs enterprise access, i.e. a Pimcore enterprise subscription and the credentials for the enterprise Composer
repository (`https://repo.pimcore.com/...`, configured in your project's `composer.json` and `auth.json`). Without them
step 2 fails because Composer cannot find this package.

## Installation

Run these three steps in the root of your Pimcore application, in this order. The application already has
`pimcore/studio-example-bundle` installed (in `vendor/pimcore/studio-example-bundle`), which contains this folder.

1. **Add the path repository** to the `repositories` of your application's `composer.json`:

   ```json
   {
     "repositories": [
       {
         "type": "path",
         "url": "vendor/pimcore/studio-example-bundle/enterprise",
         "options": { "symlink": false }
       }
     ]
   }
   ```

   To work on the examples, point `url` at the `enterprise` folder of a checkout of this repository instead, and drop
   `"symlink": false` so your changes take effect at once.

2. **Require the package with Composer:**

   ```bash
   composer require pimcore/studio-example-enterprise-bundle:@dev
   ```

   Then register the bundle like any other Pimcore bundle, in `config/bundles.php`:

   ```php
   Pimcore\Bundle\StudioExampleEnterpriseBundle\PimcoreStudioExampleEnterpriseBundle::class => ['all' => true],
   ```

3. **Warm the cache:**

   ```bash
   bin/console cache:warmup
   ```

## Layout

- `src/PimcoreStudioExampleEnterpriseBundle.php`: the bundle class
- `src/DependencyInjection/PimcoreStudioExampleEnterpriseExtension.php`: loads every `config/*.yaml` of this folder
- `config/services.yaml`: the services of the examples; an example may add its own `config/<name>.yaml`
- `config/pimcore/routing.yaml`: the bundle's routes, read by Pimcore from every registered bundle
- `templates/`: the bundle's Twig templates (`@PimcoreStudioExampleEnterprise/...`)

## Prebuilt frontends

`bin/build-all.sh` builds the portal plugin and the Portal Engine frontend once, on a machine with
vendor access and clones of `portal_engine` and `enterprise_monorepo` (see the comment at its top for the paths). It
builds from commits only (this repository's `HEAD`, `portal_engine`'s `integration`) and writes to `dist/`:
`portal-plugin.zip`, `portal-engine-frontend.zip` and `manifest.json` (per zip: part, source repo,
commit SHA, size, gzip size; how to install each). A machine that only runs the demo installs these zips and builds
nothing. The script exits non-zero naming the part that failed, and when the plugin's entry chunk is over 150 KB gzip.

## Extension points

Each example shows one extension point and has its own README with the same three sections: **What it shows**,
**How to run** and **Extension point**. The docs section names the part of the portal developer documentation (in
draft, not published yet) that the example backs; "none yet" means that part is still to be written.

| Extension point | Example folder | README | Docs section |
| --- | --- | --- | --- |
| Upload metadata listener (asset event listener on `pimcore.asset.preAdd` and `preUpdate`) | `src/Coaster/` | [README](src/Coaster/README.md) | none yet |
| Demo setup command (Symfony console commands) | `src/Command/` | [README](src/Command/README.md) | none yet |
| Portal frontend plugin (plugin provider and Module Federation remote) | `assets/portal/` | [README](assets/portal/README.md) | none yet (Portal Engine documentation: "Portal Frontend Plugins") |
| Portal asset preview stage (the `previewStage` registry name, with `accepts`: the coaster viewer for `.coaster` assets) | `assets/portal/js/src/coaster/preview-stage/` | [README](assets/portal/js/src/coaster/preview-stage/README.md) | none yet (Portal Engine documentation: "Portal Frontend Plugin Surfaces"; the preview stage is on our portal-engine integration branch only) |
| Portal grid tile picture (the `tileRegions.media` registry name: the track outline for `.coaster` tiles) | `assets/portal/js/src/coaster/tile/` | [README](assets/portal/js/src/coaster/tile/README.md) | none yet (Portal Engine documentation: "Portal Frontend Plugin Surfaces") |
| None: the shared coaster viewer the portal preview stage hosts | `assets/shared/coaster/viewer/` | [README](assets/shared/coaster/viewer/README.md) | none |
| Agent tool services for the portal user (Symfony services the portal's replay route and the confirm route share; no PimcoreAgentBundle needed) | `src/Agent/` | [README](src/Agent/README.md) | none yet |
| Portal route streaming an agent turn in PimcoreAgentBundle's event format (a recorded turn, `text/event-stream`, JSON 401/403 instead of the login redirect) | `src/Portal/Agent/` | [README](src/Portal/Agent/README.md) | none yet |
| Portal route writing a confirmed Pimcore note (`Element\Note` of type "Supplier note", `edit` re-checked through the data-pool voter) and its reset console command | `src/Agent/Note/` | [README](src/Agent/Note/README.md) | none yet |
| Portal header action (the `slots.headerActions` slot: the "Ask the brief" button and its agent panel, loaded on click, reading the chat stream as plain text) | `assets/portal/js/src/agent/` | [README](assets/portal/js/src/agent/README.md) | none yet (Portal Engine documentation: "Portal Frontend Plugins") |
| Portal plugin on a public share, with public routes (the scream score: guests rate on the coaster's public share, the plugin opted in with `PublicSharePluginProviderInterface` and nothing that needs an account, the share's rating route and the old guest link's redirect in `custom_public_routes`, the park's staff-only page, the rules behind the swappable `AnnualPasses` and `FeedbackStore`) | `src/ScreamScore/` | [README](src/ScreamScore/README.md) | none yet |
| Portal detail panel for a public share's guest (the `slots.detailPanels` slot with `isPublicShare()`: the scream-score panel under a share's coaster detail, the share hash read from the path, the form in its own chunk) | `assets/portal/js/src/scream-score/` | [README](assets/portal/js/src/scream-score/README.md) | none yet (Portal Engine documentation: "Portal Frontend Plugin Surfaces") |
| None: the demo data the examples work on | `demo-data/` | [README](demo-data/README.md) | none |
