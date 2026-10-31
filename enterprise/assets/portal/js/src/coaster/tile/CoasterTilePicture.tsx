import React, { useEffect, useState } from 'react'
import type { TileRegionProps } from '@pimcore/portal-plugin-sdk'
import { Icon } from '@pimcore/portal-ui-kit/components'
import {
  isCoasterTile,
  outlineFromFile,
  readPortalPage,
  tileFileUrl,
  type OutlineSize,
  type TrackOutline
} from './coaster-tile-model'
import { TileThumbnail, hasThumbnail } from './TileThumbnail'

/** The picture's own coordinate size; the SVG scales it into the tile's media region, letterboxed. */
const OUTLINE_SIZE: OutlineSize = { width: 240, height: 150 }

/**
 * The tile's picture as the portal's kit draws it when no plugin has the region (AssetTile, `p-tile-img` and
 * `p-tile-fallback` of the kit's published class contract): the thumbnail, or the asset icon with "No preview".
 * The region replaces the picture of every tile, so every other tile is drawn with this.
 */
export function DefaultTileMedia ({ name, thumbnail }: TileRegionProps): React.JSX.Element {
  if (hasThumbnail(thumbnail)) return <TileThumbnail name={ name } thumbnail={ thumbnail } />
  return (
    <span style={ { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--p-space-xs)', maxWidth: '100%' } }>
      <span style={ { color: 'var(--p-text-quaternary)', display: 'inline-flex' } }>
        <Icon options={ { width: 26, height: 26 } } value="asset" />
      </span>
      <span className="p-tile-fallback">No preview</span>
    </span>
  )
}

/** Outlines already drawn, by file URL: the grid and the results rail draw the same tile again and again. */
const outlines = new Map<string, Promise<TrackOutline | undefined>>()

function loadOutline (url: string): Promise<TrackOutline | undefined> {
  let pending = outlines.get(url)
  if (pending === undefined) {
    pending = fetch(url, { credentials: 'include' })
      .then(async (response) => (response.ok ? await response.text() : ''))
      .then((text) => {
        const outline = outlineFromFile(text, OUTLINE_SIZE)
        return 'path' in outline ? outline : undefined
      })
      .catch(() => undefined)
    outlines.set(url, pending)
  }
  return pending
}

/** The track outline of one .coaster tile; undefined while it loads, and when the file cannot be read. */
function useTrackOutline (id: number): TrackOutline | undefined {
  const [outline, setOutline] = useState<TrackOutline | undefined>(undefined)
  useEffect(() => {
    let current = true
    setOutline(undefined)
    const root = typeof document === 'undefined' ? null : document.getElementById('root')
    const url = tileFileUrl(id, readPortalPage(root?.dataset))
    if (url !== undefined) {
      void loadOutline(url).then((loaded) => { if (current) setOutline(loaded) })
    }
    return () => { current = false }
  }, [id])
  return outline
}

/** The side view of a track, drawn as a line in the portal's brand colour into the tile's media region. */
export function TrackOutlinePicture ({ name, outline }: { name: string, outline: TrackOutline }): React.JSX.Element {
  return (
    <svg
      aria-label={ `${name}: track outline` }
      data-testid="coaster-tile-outline"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={ { width: '100%', height: '100%', display: 'block' } }
      viewBox={ outline.viewBox }
    >
      <path
        d={ outline.path }
        fill="none"
        stroke="var(--p-primary)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={ 2 }
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

/** A .coaster tile: its track outline once the file is read, the default picture until then and when it cannot be. */
function CoasterTrackPicture (props: TileRegionProps): React.JSX.Element {
  const outline = useTrackOutline(props.id)
  if (outline === undefined) return <DefaultTileMedia { ...props } />
  return <TrackOutlinePicture name={ props.name } outline={ outline } />
}

/**
 * The picture of a tile once its chunk is loaded (CoasterTileMedia.tsx, the component plugin.tsx registers, loads
 * this module on demand): a .coaster tile gets its track outline, every other tile the kit's default picture.
 */
export const CoasterTilePicture = (props: TileRegionProps): React.JSX.Element => {
  if (!isCoasterTile(props)) return <DefaultTileMedia { ...props } />
  return <CoasterTrackPicture { ...props } />
}

// the module React.lazy loads
export default CoasterTilePicture
