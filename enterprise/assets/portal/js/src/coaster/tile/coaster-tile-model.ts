// The coaster tile picture's decisions and its drawing, without React, so the tests run them in Node
// (enterprise/tests/coaster-tile.test.mjs). The component is CoasterTileMedia.tsx; see README.md.
import { buildTrack } from '../../../../../shared/coaster/geometry/track.mjs'
import { validateCoaster } from '../../../../../shared/coaster/schema/validate.mjs'

/** The fields of the portal's TileRegionProps this picture reads. */
export interface CoasterTile {
  id: number
  name?: string
  fileExtension?: string
}

/** The file extension of a ride design (shared/coaster/FORMAT.md); the preview stage uses the same. */
export const COASTER_EXTENSION = 'coaster'

/** The tile as the preview stage's asset (coaster-stage-model.ts, isCoasterAsset): the same fields, other names. */
export function tileAsset (tile: CoasterTile): { id: number, filename?: string, extension?: string } {
  return { id: tile.id, filename: tile.name, extension: tile.fileExtension }
}

/**
 * Whether the tile gets the track picture: a `.coaster` file, by the extension the portal sends or, when it sends
 * none, by its name. The same rule as the preview stage's `isCoasterAsset`, so a tile and its detail page agree.
 */
export function isCoasterTile (tile: CoasterTile | null | undefined): boolean {
  if (tile === null || tile === undefined) return false
  if (typeof tile.fileExtension === 'string' && tile.fileExtension !== '') {
    return tile.fileExtension.toLowerCase() === COASTER_EXTENSION
  }
  return typeof tile.name === 'string' && tile.name.toLowerCase().endsWith(`.${COASTER_EXTENSION}`)
}

/**
 * What the tile needs of the page: the data pool and the public share. The tile region's props do not carry them,
 * so they are read from the portal's mount element (`#root`, its `data-data-pool-id` and `data-share-hash`).
 */
export interface PortalPage {
  dataPoolId: number
  shareHash?: string
}

export function readPortalPage (dataset: Record<string, string | undefined> | null | undefined): PortalPage {
  const dataPoolId = Number(dataset?.dataPoolId ?? '0')
  const shareHash = dataset?.shareHash
  return {
    dataPoolId: Number.isFinite(dataPoolId) ? dataPoolId : 0,
    shareHash: shareHash === undefined || shareHash === '' ? undefined : shareHash
  }
}

/** The bundle route of the preview stage (coaster-stage-model.ts, COASTER_FILE_PATH). */
export const COASTER_FILE_PATH = '/studio-example-enterprise/coaster-file'

/**
 * The URL of a tile's file, or undefined when the page has no data pool (a collection spans pools): then the
 * route could not check the permission, and the tile keeps its default picture.
 */
export function tileFileUrl (id: number, page: PortalPage): string | undefined {
  if (!(page.dataPoolId > 0)) return undefined
  const query = new URLSearchParams({ dataPoolId: String(page.dataPoolId) })
  if (page.shareHash !== undefined) query.set('publicShareHash', page.shareHash)
  return `${COASTER_FILE_PATH}/${id}?${query.toString()}`
}

export interface OutlineSize {
  width: number
  height: number
}

/** Space between the outline and the tile's edge, in the picture's units (CSS pixels at its own size). */
export const OUTLINE_PADDING = 10

/** The track outline: an SVG path in a viewBox of the tile's size. */
export interface TrackOutline {
  path: string
  viewBox: string
}

const round = (value: number): number => Math.round(value * 10) / 10

/**
 * The side view of a centre line: height (y) over the horizontal axis the track spans most (x or z), scaled to fit
 * the size with OUTLINE_PADDING around it, the aspect ratio kept and the picture centred; y up.
 */
export function trackOutline (points: ReadonlyArray<{ x: number, y: number, z: number }>, size: OutlineSize): TrackOutline {
  const along = (axis: 'x' | 'z'): number => Math.max(...points.map((p) => p[axis])) - Math.min(...points.map((p) => p[axis]))
  const axis = along('z') > along('x') ? 'z' : 'x'
  const hs = points.map((p) => p[axis])
  const ys = points.map((p) => p.y)
  const minH = Math.min(...hs)
  const maxY = Math.max(...ys)
  const spanH = Math.max(...hs) - minH
  const spanY = maxY - Math.min(...ys)
  const innerW = size.width - 2 * OUTLINE_PADDING
  const innerH = size.height - 2 * OUTLINE_PADDING
  const scale = Math.min(spanH > 0 ? innerW / spanH : Infinity, spanY > 0 ? innerH / spanY : Infinity, Infinity)
  const s = Number.isFinite(scale) ? scale : 1
  const offsetX = OUTLINE_PADDING + (innerW - spanH * s) / 2
  const offsetY = OUTLINE_PADDING + (innerH - spanY * s) / 2
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${round(offsetX + (p[axis] - minH) * s)} ${round(offsetY + (maxY - p.y) * s)}`)
    .join(' ')
  return { path, viewBox: `0 0 ${size.width} ${size.height}` }
}

/** Metres between the outline's samples: a tile is small, every 2 m is more than enough. */
const OUTLINE_STEP = 2

/** The outline of a .coaster file's text, or why there is none (not JSON, not a valid ride design). */
export function outlineFromFile (text: string, size: OutlineSize): TrackOutline | { error: string } {
  let design: unknown
  try {
    design = JSON.parse(text)
  } catch {
    return { error: 'Not a .coaster file.' }
  }
  const { valid } = validateCoaster(design)
  if (!valid) return { error: 'Not a valid .coaster file.' }
  try {
    return trackOutline(buildTrack(design as { track: Array<{ type: string }> }, { step: OUTLINE_STEP }).points, size)
  } catch {
    return { error: 'The track could not be built.' }
  }
}
