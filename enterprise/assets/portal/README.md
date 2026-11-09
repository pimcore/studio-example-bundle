# Portal plugin

The Portal Engine frontend plugin of the enterprise examples: its own Module Federation remote, loaded by the portal
(the `portal_engine_host` container) on every portal that enables it. The examples register their extension points in
`js/src/plugin.tsx`. How such a plugin works is described in the Portal Engine documentation, "Portal Frontend
Plugins".

## What it shows

"Studio Example Enterprise" in the **Enabled plugins** field of a portal's configuration document, and, once enabled,
what the examples register: today the **Talk** entry under the portal's navigation rail
([the portal page "Talk"](talk/README.md)).

## Extension point

**A Portal Engine plugin**, in two halves:

- the server side, `src/Portal/StudioExampleEnterprisePortalPlugin.php`, a service tagged
  `portal_engine.plugin_provider` (`config/portal.yaml`): it names the plugin, points Portal Engine at the build's
  `entrypoints.json` and hands the frontend its configuration (`getFrontendConfig()`);
- the frontend, `js/src/plugin.tsx`: `pluginSystem.definePlugin()` from `@pimcore/portal-plugin-sdk`, whose module
  registers components to the portal's slots in `onInit`.

### Own icons

`js/src/icons/` holds the plugin's own icons, made for these examples (no third-party art, so no license review):
Ride, Review and Talk. Each is a React component drawing an inline SVG on a
24 x 24 grid in the surrounding text colour (`currentColor`), through the shared frame `CoasterIcon.tsx`. Without a
`label` an icon is decorative (`aria-hidden="true"`) and needs visible text beside it; with one it is an image with
that `aria-label`. Import each icon from its own file, never through a collection: the Talk entry's icon is in the
start-up chunk, the tile's and the stage's load with their lazy chunks. Used by the Talk entry, the coaster tile's
"Ride design" tag and the preview stage's Orbit and Ride buttons (`enterprise/tests/coaster-icons.test.mjs`).

## Only with vendor access

**Only developers with vendor access can build this plugin.** Its dependency `@pimcore/portal-ui-kit` is on no npm
registry: it ships inside the `pimcore/portal-ui-kit` Composer package, which comes with `pimcore/portal-engine` from
the enterprise Composer repository. `package.json` reaches it through a `file:` path into
`vendor/pimcore/portal-ui-kit/frontend/portal-ui-kit`. Without that folder `npm install` stops with a bare `E404`.
Do not work around it with `--legacy-peer-deps`: the build would then compile against untyped `any`.

The path `file:../../../portal-ui-kit/frontend/portal-ui-kit` is right when this bundle is installed as described in
[the enterprise README](../../README.md), i.e. in `vendor/pimcore/studio-example-enterprise-bundle`. In a checkout
elsewhere, point it at your application's `vendor/pimcore/portal-ui-kit/frontend/portal-ui-kit` first.

## How to run

In this folder (`enterprise/assets/portal`):

```bash
npm install
npm run build
```

The build writes `../../public/portal/` with its `entrypoints.json`, which
`src/Portal/StudioExampleEnterprisePortalPlugin.php` points Portal Engine at. Publish it and clear the cache in your
application:

```bash
bin/console assets:install
bin/console cache:clear
```

Then enable "Studio Example Enterprise" in the **Enabled plugins** field of a portal's configuration document.

`npm run check-types` type-checks the sources.
