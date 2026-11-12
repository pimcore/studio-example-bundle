import React from 'react'

/** Whether the portal sent a thumbnail URL for the tile. */
export function hasThumbnail (thumbnail: string | null | undefined): thumbnail is string {
  return typeof thumbnail === 'string' && thumbnail !== ''
}

/**
 * A tile's thumbnail as the portal's kit draws it (AssetTile, `p-tile-img` of the kit's published class contract).
 * Plain markup without the kit, so CoasterTileMedia.tsx draws it at once, without loading the picture's chunk.
 */
export function TileThumbnail ({ name, thumbnail }: { name: string, thumbnail: string }): React.JSX.Element {
  return <span aria-label={ name } className="p-tile-img" role="img" style={ { backgroundImage: `url('${thumbnail}')` } } />
}
