# Coaster preview stage

## What it shows

Open a `.coaster` asset in the portal and its detail page shows the ride design in 3D where the picture would be:
**Orbit** turns, zooms and pans around the track; **Ride** puts the camera in the front seat, with Play, Pause and
Restart, from the station round the circuit and back. Every other asset (images, videos, documents, ...) keeps the
portal's own preview, untouched.

The 3D view is the shared [coaster viewer](../../../../../shared/coaster/viewer/README.md); this folder only puts it on
the portal's stage.

## Extension point

**The asset detail's preview stage**, the registry name `previewStage` of `@pimcore/portal-plugin-sdk`. A plugin
registers one component under it; the portal hands that component the asset (`data`: id, file name, extension,
thumbnail, ...), the data pool, the public share hash if any and the stage height (`PreviewStageProps`). A static
`accepts(asset)` on the component tells the portal which assets it takes: when it answers false (or throws), the
portal renders its own stage as if nothing were registered.

```tsx
// plugin.tsx, in the module's onInit
componentRegistry.register({ name: previewStage, component: CoasterPreviewStage })

// CoasterPreviewStage.tsx
CoasterPreviewStage.accepts = isCoasterAsset // .coaster only, see coaster-stage-model.ts
```

Two things to know:

- **Decline, don't return `null`.** A stage that returns `null` renders an empty stage for that asset (that is how a
  portal hides the preview); only `accepts` gives the asset back to the portal's own stage.
- **One stage per portal.** The name holds one component; a second plugin registering it replaces the first. A
  plugin with previews for several kinds of file registers one stage that picks among them.

The stage reads the file's text from a route of this bundle, `/studio-example-enterprise/coaster-file/{id}`
(`config/pimcore/routing.yaml`, `src/Portal/Coaster/CoasterFileController.php`): the portal's own media stream serves
only video and audio, and a portal host does not serve raw asset paths. The route answers on portal sites only and
makes the checks the portal's own preview stream makes: portal access, the data pool, VIEW on the asset, and for a
public share that the asset is in the share. It serves `.coaster` files only, so it is no way round the download
permission.

Portal Engine documentation:
[Portal Frontend Plugins](https://github.com/pimcore/portal-engine/blob/2026.3/doc/15_Development_Documentation/15_Customize_and_Extend_Behavior/16_Portal_Frontend_Plugins.md)
(how a plugin reaches the browser, the component registry) and
[Portal Frontend Plugin Surfaces](https://github.com/pimcore/portal-engine/blob/2026.3/doc/15_Development_Documentation/15_Customize_and_Extend_Behavior/17_Portal_Frontend_Plugin_Surfaces.md)
(the detail page's replaceable parts, "Detail cards: replace or suppress one"). The preview stage name itself is the
portal change on our integration branch of portal-engine (`plugin-sdk/preview-stage.ts`); 2026.3 does not ship it yet.

## How to run

1. Install the sub-bundle as described in [the enterprise README](../../../../../../README.md), and build the portal
   plugin as described in [the portal plugin README](../../../../README.md) (needs vendor access). The build takes the
   viewer's three.js from `assets/shared/coaster/viewer`: run `npm ci` there first.
2. Use a Portal Engine with the replaceable preview stage (our integration branch of portal-engine).
3. Clear the cache (`bin/console cache:clear`) and enable "Studio Example Enterprise" in the **Enabled plugins** field
   of the portal's configuration document.
4. Put a `.coaster` file into an asset data pool of the portal (`bin/console coaster-demo:setup` uploads
   `demo-data/thunder-loop-rev1.coaster`, see [`src/Command/README.md`](../../../../../../src/Command/README.md)) and
   open it in the portal: the stage shows the track in Orbit; **Ride**, then **Play** rides it. Open an image next to
   it: the portal's own image preview, as before.

Tests, from the repository root: `node --test 'enterprise/tests/*.test.mjs'`;
`enterprise/tests/coaster-preview-stage.test.mjs` checks which assets the stage takes, the registration, the file
route and this README.

## Files

- `CoasterPreviewStage.tsx`: the stage (Orbit/Ride buttons over the viewer), with its `accepts`
- `coaster-stage-model.ts`: which assets it takes, the file's URL and the answer's reading, without React (tested in
  Node)
- `../../plugin.tsx`: the registration under `previewStage`
