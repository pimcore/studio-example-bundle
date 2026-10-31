# Coaster tile picture

## What it shows

Browse an asset data pool in the portal and every `.coaster` file's tile shows its track instead of "No preview": a
side view of the ride's centre line (the height over the run, no 3D), drawn as a line in the portal's brand colour.
The tiles of the results rail next to an asset's detail page show the same. Every other tile (images, videos,
documents, data objects) keeps the portal's own picture, untouched.

The outline comes from the shared [track geometry](../../../../../shared/coaster/geometry/track.mjs), the same centre
line the [coaster viewer](../../../../../shared/coaster/viewer/README.md) draws in 3D on the detail page
([preview stage](../preview-stage/README.md)).

## Extension point

**The picture of the portal's grid and rail tiles**, the registry name `tileRegions.media` of
`@pimcore/portal-plugin-sdk`. A plugin registers one component under it; the portal draws it in the media region of
every tile it renders, in the asset grid and in the detail page's results rail, and hands it the tile's
`TileRegionProps`: `id`, `name`, `thumbnail` (the portal's own thumbnail URL or `null`) and `fileExtension`. The tile
around it stays the portal's: the selection checkbox, the extension badge, the open affordance, the click and keyboard
handling and the action row.

```tsx
// plugin.tsx, in the module's onInit
componentRegistry.register({ name: tileRegions.media, component: CoasterTileMedia })

// CoasterTileMedia.tsx
export const CoasterTileMedia = (props: TileRegionProps) => {
  if (!isCoasterTile(props)) return <DefaultTileMedia { ...props } />
  return <CoasterTrackPicture { ...props } />
}
```

Three things to know:

- **It is every tile, not one file type.** Unlike the preview stage, a tile region has no `accepts`: once registered,
  the component draws the picture of every tile. So it branches on `fileExtension` itself and draws the default
  picture for all others, here as the kit's `AssetTile` draws it (the `p-tile-img` and `p-tile-fallback` classes of
  the kit's published class contract). A coaster tile shows that default too while its file loads, and when the file
  cannot be read.
- **The props carry no data pool.** The file route checks the permission per data pool, so the component reads the
  data pool and a public share hash from the portal's mount element (`#root`, `data-data-pool-id` and
  `data-share-hash`, as the portal itself does). A page without a data pool (a collection spans pools) keeps the
  default picture. Each file is fetched once per page, however often the grid and the rail draw its tile.
- **One component per portal.** The name holds one component; a second plugin registering it replaces the first. Its
  sibling `tileRegions.meta` adds a line under the tile's name (empty on the portal's own tiles), with the same props.

The file's text comes from the bundle route the preview stage uses, `/studio-example-enterprise/coaster-file/{id}`
(see [the preview stage's README](../preview-stage/README.md)): portal access, the data pool, VIEW on the asset and,
for a public share, that the asset is in the share.

Portal Engine documentation:
[Portal Frontend Plugins](https://github.com/pimcore/portal-engine/blob/2026.3/doc/15_Development_Documentation/15_Customize_and_Extend_Behavior/16_Portal_Frontend_Plugins.md)
(how a plugin reaches the browser, the component registry) and
[Portal Frontend Plugin Surfaces](https://github.com/pimcore/portal-engine/blob/2026.3/doc/15_Development_Documentation/15_Customize_and_Extend_Behavior/17_Portal_Frontend_Plugin_Surfaces.md)
(the replaceable parts of the portal's own screens). The names are in the SDK's `plugin-sdk/tile-regions.ts`.

## How to run

1. Install the sub-bundle as described in [the enterprise README](../../../../../../README.md), and build the portal
   plugin as described in [the portal plugin README](../../../../README.md) (needs vendor access).
2. Clear the cache (`bin/console cache:clear`) and enable "Studio Example Enterprise" in the **Enabled plugins** field
   of the portal's configuration document.
3. Put `.coaster` files into an asset data pool of the portal (`bin/console coaster-demo:setup` uploads the demo ride,
   see [`src/Command/README.md`](../../../../../../src/Command/README.md)) and open the data pool's grid: the
   `.coaster` tiles show the track outline (lift hill, drop, loops), the images beside them their thumbnails. Open a
   `.coaster` asset: the results rail's tiles show the same pictures.

Tests, from the repository root: `node --test 'enterprise/tests/*.test.mjs'`;
`enterprise/tests/coaster-tile.test.mjs` checks which tiles get the outline, the outline itself, the registration and
this README; `enterprise/tests/f87-coaster-tile-followup.test.mjs` renders the component `plugin.tsx` registers
(React on the server, a stand-in SDK and kit `Icon`) for a row of tiles.

## Files

- `CoasterTileMedia.tsx`: the region component (the outline for `.coaster` tiles, the kit's default for every other),
  with `TrackOutlinePicture` (the outline as SVG) and `DefaultTileMedia` (the kit's picture) as its parts
- `coaster-tile-model.ts`: which tiles get the outline, the page's data pool, the file's URL and the side view of the
  centre line, without React (tested in Node)
- `../../plugin.tsx`: the registration under `tileRegions.media`
