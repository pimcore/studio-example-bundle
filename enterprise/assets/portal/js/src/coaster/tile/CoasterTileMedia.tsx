import React, { Suspense, lazy } from 'react'
import type { TileRegionProps } from '@pimcore/portal-plugin-sdk'
import { isCoasterTile } from './coaster-tile-model'
import { TileThumbnail, hasThumbnail } from './TileThumbnail'

// The picture's body (the kit's Icon for the "No preview" fallback, the outline of .coaster files) is a chunk of its
// own: plugin.tsx imports this file at the portal's start-up, so it holds no more than the decision and the lazy
// import. The chunk is fetched once per page, the first time a tile needs it. See README.md, "Loaded on demand".
const CoasterTilePicture = lazy(async () => await import('./CoasterTilePicture'))

/**
 * The picture of every grid and rail tile the portal draws. Registered under the portal's `tileRegions.media` name
 * in plugin.tsx: a .coaster tile gets its track outline, every other tile the kit's default picture. An ordinary
 * tile with a thumbnail is drawn here at once; the others wait for CoasterTilePicture.tsx.
 */
export const CoasterTileMedia = (props: TileRegionProps): React.JSX.Element => {
  const thumbnail = hasThumbnail(props.thumbnail) ? <TileThumbnail name={ props.name } thumbnail={ props.thumbnail } /> : null
  if (!isCoasterTile(props) && thumbnail !== null) return thumbnail
  return (
    <Suspense fallback={ thumbnail ?? <span aria-busy="true" /> }>
      <CoasterTilePicture { ...props } />
    </Suspense>
  )
}
