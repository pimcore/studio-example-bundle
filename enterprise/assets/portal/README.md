# Portal plugin

The Portal Engine frontend plugin of the enterprise examples: its own Module Federation remote, loaded by the portal
(the `portal_engine_host` container) on every portal that enables it. It contributes nothing yet; the portal demo adds
its extension points in `js/src/plugin.tsx`. How such a plugin works is described in the Portal Engine documentation,
"Portal Frontend Plugins".

## Only with vendor access

**Only developers with vendor access can build this plugin.** Its dependency `@pimcore/portal-ui-kit` is on no npm
registry: it ships inside the `pimcore/portal-ui-kit` Composer package, which comes with `pimcore/portal-engine` from
the enterprise Composer repository. `package.json` reaches it through a `file:` path into
`vendor/pimcore/portal-ui-kit/frontend/portal-ui-kit`. Without that folder `npm install` stops with a bare `E404`.
Do not work around it with `--legacy-peer-deps`: the build would then compile against untyped `any`.

The path `file:../../../portal-ui-kit/frontend/portal-ui-kit` is right when this bundle is installed as described in
[the enterprise README](../../README.md), i.e. in `vendor/pimcore/studio-example-enterprise-bundle`. In a checkout
elsewhere, point it at your application's `vendor/pimcore/portal-ui-kit/frontend/portal-ui-kit` first.

## Build

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
