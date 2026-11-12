// The scream-score panel's decisions, without React and without runtime imports, so the tests run them in Node
// (enterprise/tests/scream-score-panel.test.mjs): when the panel shows, the share hash from the page path, the
// endpoint's URL and body, and how each answer of the endpoint becomes what the panel shows. The components are
// ScreamScorePanel.tsx (registered, tiny) and ScreamScoreForm.tsx (its own chunk); see README.md.

/** The kind of element the detail page shows, as the detailPanels slot passes it. */
export type DetailKind = 'asset' | 'data-object'

/**
 * The share hash of a public share's asset detail page, or null for any other page.
 *
 * The recipient's detail page is `/<documentPath>/<hash>/public-share-a~<id>`; the documentPath may hold slashes,
 * so the hash is the segment right before `public-share-a~<id>`, never the first one. The id must be the detail's own.
 */
export function shareHashFromPath (pathname: string, id: number | string | undefined): string | null {
  if (id === undefined || String(id) === '') return null
  let path: string
  try {
    path = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const m = /\/([^/]+)\/([^/]+)\/public-share-a~(\d+)\/?$/.exec(path)
  if (m === null || m[3] !== String(id)) return null
  return m[2]
}

/** What the panel needs to know before it asks the endpoint anything. */
export interface PanelContext {
  /** isPublicShare() of the portal's SDK: a share's guest, never a signed-in portal user. */
  publicShare: boolean
  id?: number | string
  dataPoolId?: number | string
  kind?: DetailKind
  /** window.location.pathname of the page. */
  pathname: string
}

/**
 * The share hash to ask the endpoint with, or null when the panel renders nothing: a signed-in portal user, a data
 * object, or a page without a share hash. Whether the asset is a coaster the endpoint says (its GET answers 404 for
 * any other asset, see readRideAnswer).
 */
export function panelHash (ctx: PanelContext): string | null {
  if (!ctx.publicShare) return null
  if (ctx.kind !== undefined && ctx.kind !== 'asset') return null
  return shareHashFromPath(ctx.pathname, ctx.id)
}

/**
 * The whole show rule: a share's guest, on a coaster, on a page with the share hash. `coaster` is what the endpoint
 * answered (a ride: true; 404: false; not answered yet: undefined, nothing shown).
 */
export function showsPanel (ctx: PanelContext, coaster: boolean | undefined): boolean {
  return panelHash(ctx) !== null && coaster === true
}

/** F324's endpoint (src/Portal/ScreamScore/ShareRatingController.php). */
export const SCREAM_SCORE_PATH = '/studio-example-enterprise/scream-score'

export function screamScoreUrl (hash: string, assetId: number | string): string {
  return `${SCREAM_SCORE_PATH}/${encodeURIComponent(hash)}/${encodeURIComponent(String(assetId))}`
}

// --- the words (F317's, as the guest page: src/Portal/ScreamScore/GuestController.php) ---

export const MIN_SCORE = 1
export const MAX_SCORE = 10
export const MAX_COMMENT = 280

export const question = (coaster: string): string => `How loud did you scream on ${coaster}?`
export const SCORE_LABEL = 'Your scream score'
export const COMMENT_LABEL = 'Comment (optional)'
export const PASS_NUMBER_LABEL = 'Annual-pass number'
export const PASS_CODE_LABEL = 'Pass code'
export const PASS_HINT = 'Number and code are on the back of your pass.'
export const SEND_LABEL = 'Send my scream score'
export const CHANGE_LABEL = 'Change my scream score'
export const SEND_FAILED = 'Your score could not be sent. Try again.'
export const LOAD_FAILED = 'The scream score could not be loaded. Try again later.'

/** The ten choices; the two ends carry their words. */
export const SCORE_CHOICES: ReadonlyArray<{ value: number, label: string | null }> = Array.from(
  { length: MAX_SCORE - MIN_SCORE + 1 },
  (_, i) => {
    const value = MIN_SCORE + i
    return { value, label: value === MIN_SCORE ? 'barely a squeak' : value === MAX_SCORE ? 'lost my voice' : null }
  }
)

/** The comment's counter under the field. */
export function commentCounter (comment: string): string {
  return `${comment.length} of ${MAX_COMMENT} characters`
}

export const thanksText = (score: number, ride: string): string =>
  `Thanks! Your scream score ${score} for ${ride} is saved.`
export const replacedText = (earlier: number): string => `It replaces your earlier score ${earlier}.`

// --- the answers ---

/** What the guest typed: kept as it is after a refused send. */
export interface Typed {
  score: number | null
  comment: string
  passNumber: string
  passCode: string
}

export const EMPTY_TYPED: Typed = { score: null, comment: '', passNumber: '', passCode: '' }

/** The POST body of a send. */
export function sendBody (typed: Typed, token: string): string {
  return JSON.stringify({
    score: typed.score,
    comment: typed.comment,
    passNumber: typed.passNumber,
    passCode: typed.passCode,
    token
  })
}

/** The ride the GET names, with its CSRF token; `none` hides the panel (no coaster, unknown or expired share). */
export type RideAnswer =
  | { kind: 'ride', key: string, name: string, token: string }
  | { kind: 'none' }
  | { kind: 'error', message: string }

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function readRideAnswer (status: number, body: unknown): RideAnswer {
  if (status === 404) return { kind: 'none' }
  if (status === 200 && isRecord(body) && isRecord(body.ride) && typeof body.ride.name === 'string' &&
    typeof body.ride.key === 'string' && typeof body.token === 'string') {
    return { kind: 'ride', key: body.ride.key, name: body.ride.name, token: body.token }
  }
  return { kind: 'error', message: LOAD_FAILED }
}

/** The field a 422 message belongs to; `pass` stands under the pass code, for number and code together. */
export type ErrorField = 'score' | 'comment' | 'pass'

/** What the panel shows after a send. */
export type PanelState =
  | { kind: 'form', typed: Typed, errors: Partial<Record<ErrorField, string>>, notice: string | null }
  | { kind: 'thanks', typed: Typed, thanks: string, replaced: string | null }

export const formState = (typed: Typed = EMPTY_TYPED): PanelState => ({ kind: 'form', typed, errors: {}, notice: null })

/**
 * The endpoint's answer to a send, as the panel shows it. `status` 0 is a network error; `body` is the parsed JSON,
 * or undefined when there was none. Contract (F324): 200 `{saved, ride, score, replaced}`, 422 `{errors}`,
 * 429/400/404 `{error}`.
 */
export function readSendAnswer (status: number, body: unknown, typed: Typed): PanelState {
  const record = isRecord(body) ? body : {}
  if (status === 200 && record.saved === true && typeof record.ride === 'string') {
    const score = typeof record.score === 'number' ? record.score : Number(record.score ?? typed.score)
    const replaced = typeof record.replaced === 'number' ? replacedText(record.replaced) : null
    return { kind: 'thanks', typed, thanks: thanksText(score, record.ride), replaced }
  }
  if (status === 422 && isRecord(record.errors)) {
    const errors: Partial<Record<ErrorField, string>> = {}
    for (const field of ['score', 'comment', 'pass'] as const) {
      const message = record.errors[field]
      if (typeof message === 'string' && message !== '') errors[field] = message
    }
    if (Object.keys(errors).length > 0) return { kind: 'form', typed, errors, notice: null }
  }
  if ((status === 429 || status === 400 || status === 404) && typeof record.error === 'string' && record.error !== '') {
    return { kind: 'form', typed, errors: {}, notice: record.error }
  }
  return { kind: 'form', typed, errors: {}, notice: SEND_FAILED }
}

/** "Change my scream score": the form again, with what was sent. */
export function changeScore (state: PanelState): PanelState {
  return formState(state.typed)
}
