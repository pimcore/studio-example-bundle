import { pairMarks } from '../../../../../shared/coaster/viewer/pair.mjs'

// The side-by-side preview's logic, free of React and of the Studio runtime (enterprise/tests/coaster-side-by-side.test.mjs
// runs it in Node). The left ride is the asset's file as it is live; the right one is that file with the change set's
// proposed side applied: its element list (the JSON entry coaster.track) and its train and meta leaves. It reads the
// change set only, never the reviewer's ticks: the preview shows the proposal, not what a merge would make of it.

/** the metadata entry holding the whole element list as JSON (as TRACK_ENTRY in coaster-review-model.ts) */
const TRACK_ENTRY = 'coaster.track'

interface MetadataEntry {
  readonly name?: string
  readonly data?: unknown
}

/** the review payload's 'metadata' slot, as far as the preview reads it */
export interface MetadataSlot {
  readonly proposed?: Record<string, unknown> | null
}

interface CoasterFile {
  readonly meta: { readonly revision: number, readonly [field: string]: unknown }
  readonly train: Record<string, unknown>
  readonly track: unknown[]
  readonly [field: string]: unknown
}

/** one side of the pair, as mountRidePair takes it */
export interface PairSide {
  readonly file: CoasterFile
  readonly title: string
  readonly marks: number[]
}

export type PreviewPair = { readonly left: PairSide, readonly right: PairSide } | { readonly error: string }

// Metadata 'input' values arrive as strings: "6" is the number 6, as the .coaster format has it.
const NUMBER = /^-?\d+(\.\d+)?$/
const plain = (value: unknown): unknown => (typeof value === 'string' && NUMBER.test(value) ? Number(value) : value)

const parse = (value: unknown): unknown => {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/**
 * The two rides of the review: revision n as it is live, and revision n + 1 as the change set proposes it, each with
 * the elements that differ marked.
 */
export function previewPair (liveText: string, slot: MetadataSlot | undefined): PreviewPair {
  const live = parse(liveText) as CoasterFile | undefined
  if (typeof live !== 'object' || live === null || !Array.isArray(live.track)) {
    return { error: 'The live file is not a .coaster file.' }
  }

  const meta: Record<string, unknown> = { ...live.meta }
  const train: Record<string, unknown> = { ...live.train }
  let track: unknown[] = live.track
  for (const value of Object.values(slot?.proposed ?? {})) {
    const { name, data } = (typeof value === 'object' && value !== null ? value : {}) as MetadataEntry
    if (name === TRACK_ENTRY) {
      const proposed = parse(data)
      if (Array.isArray(proposed)) track = proposed
      continue
    }
    const part = /^coaster\.(train|meta)\.(\w+)$/.exec(name ?? '')
    if (part !== null) (part[1] === 'train' ? train : meta)[part[2]] = plain(data)
  }
  // Every save raises the revision (F43 does not count it as a change): the proposal is the next one.
  const revision = Number(live.meta.revision)
  const proposed: CoasterFile = { ...live, meta: { ...meta, revision: revision + 1 }, train, track }
  const marks = pairMarks(live.track, track)

  return {
    left: { file: live, title: `Revision ${revision} (live)`, marks: marks.left },
    right: { file: proposed, title: `Revision ${revision + 1} (proposed)`, marks: marks.right }
  }
}
