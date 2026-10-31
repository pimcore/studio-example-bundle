// The coaster preview stage's decisions, without React and without runtime imports, so the tests run them in Node
// (enterprise/tests/coaster-preview-stage.test.mjs). The component is CoasterPreviewStage.tsx; see README.md.

/** The fields of the portal's PreviewStageAsset this stage reads. */
export interface CoasterStageAsset {
  id?: number
  filename?: string
  extension?: string
}

/** The file extension of a ride design (shared/coaster/FORMAT.md). */
export const COASTER_EXTENSION = 'coaster'

/**
 * Whether the stage previews this asset: a `.coaster` file, by its extension or, when the portal sends none, by its
 * file name. Everything else is declined, so the portal draws its own stage (images, videos, documents, ...).
 */
export function isCoasterAsset (asset: CoasterStageAsset | null | undefined): boolean {
  if (asset === null || asset === undefined) return false
  if (typeof asset.extension === 'string' && asset.extension !== '') {
    return asset.extension.toLowerCase() === COASTER_EXTENSION
  }
  return typeof asset.filename === 'string' && asset.filename.toLowerCase().endsWith(`.${COASTER_EXTENSION}`)
}

/**
 * The path of the bundle route that hands over a .coaster file's text (config/pimcore/routing.yaml,
 * src/Portal/Coaster/CoasterFileController.php). The portal's own media stream serves video and audio only.
 */
export const COASTER_FILE_PATH = '/studio-example-enterprise/coaster-file'

/** The URL of one asset's file: the data pool sets the permission scope; a public share adds its hash. */
export function coasterFileUrl (id: number, dataPoolId: number, shareHash?: string): string {
  const query = new URLSearchParams({ dataPoolId: String(dataPoolId) })
  if (shareHash !== undefined && shareHash !== '') query.set('publicShareHash', shareHash)
  return `${COASTER_FILE_PATH}/${id}?${query.toString()}`
}

/** What the stage shows once the request is answered: the file's text, or why there is none. */
export type CoasterFileResult = { file: string } | { error: string }

export function readCoasterResponse (status: number, text: string): CoasterFileResult {
  if (status === 403) return { error: 'You may not view this ride design.' }
  if (status === 404) return { error: 'The ride design was not found.' }
  if (status < 200 || status >= 300) return { error: `The ride design could not be loaded (HTTP ${status}).` }
  if (text.trim() === '') return { error: 'The ride design is empty.' }
  return { file: text }
}

/** The stage's two views of the track: orbit around it, or ride it from the front seat. */
export type StageView = 'orbit' | 'ride'

export const STAGE_VIEWS: ReadonlyArray<{ key: StageView, label: string }> = [
  { key: 'orbit', label: 'Orbit' },
  { key: 'ride', label: 'Ride' }
]

/** The view the stage opens with. */
export const DEFAULT_VIEW: StageView = 'orbit'
