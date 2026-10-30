import type { ChangeSetReviewActionParameters, RowShaping, SlotRow } from '@pimcore/change-control-bundle/sdk'
import { align, diffCoaster, ordinals } from '../../../../shared/coaster/diff/diff.mjs'

// The review tab's logic, free of React and of the Studio runtime (enterprise/tests/coaster-review.test.mjs runs it in
// Node). Change Control reviews a .coaster asset through its 'metadata' slot: one entry per metadata leaf, keyed by
// leaf address. The coaster leaves follow F43's key scheme (enterprise/assets/shared/coaster/diff/diff.mjs), e.g.
// coaster.track.loop.1.diameter; the element list itself rides along as the JSON entry coaster.track.

/** the review payload slot asset metadata arrives in */
export const METADATA_SLOT = 'metadata'

/** the metadata entry holding the whole element list as JSON */
export const TRACK_ENTRY = 'coaster.track'

interface MetadataEntry {
  readonly name?: string
  readonly language?: string
  readonly type?: string
  readonly data?: unknown
}

interface CoasterChange {
  readonly kind: 'changed' | 'added' | 'removed'
  readonly text: string
  readonly metadata: { readonly key: string, readonly old: unknown, readonly new: unknown }
}

interface TrackElement {
  readonly type: string
  readonly [field: string]: unknown
}

/** the argument of Change Control's merge mutation (useBundleChangeControlMergeChangeSetMutation) */
export interface MergeArgs {
  readonly changeSetId: string
  readonly changeSetReviewActionParameters: ChangeSetReviewActionParameters
}

/** a diff table row with the metadata entry name the shaping below adds */
export type CoasterRow = SlotRow & { readonly name: string }

const entryOf = (value: unknown): MetadataEntry => (typeof value === 'object' && value !== null ? value as MetadataEntry : {})

/**
 * The row shaping for Change Control's buildSlotRows, as its own metadata renderer does it: rows compare the entry's
 * data, and carry the entry name (the coaster key) for the readable line.
 */
export const coasterShaping: RowShaping = {
  label: (key, value) => entryOf(value).name ?? key,
  type: (key, value) => entryOf(value).type,
  value: (entry) => entryOf(entry).data ?? null,
  extras: (key, value) => ({ name: entryOf(value).name ?? key, language: entryOf(value).language ?? '' })
}

/** whether an asset is a coaster design; the tab is hidden on every other asset */
export const isCoasterAsset = (element: { readonly fullPath?: string } | undefined): boolean =>
  element?.fullPath?.toLowerCase().endsWith('.coaster') ?? false

// Metadata 'input' values arrive as strings: "24" reads as the number 24, as in F43's texts.
const NUMBER = /^-?\d+(\.\d+)?$/
const plain = (value: unknown): unknown => (typeof value === 'string' && NUMBER.test(value) ? Number(value) : value)
const show = (value: unknown): string => {
  const v = plain(value)
  if (v === undefined || v === null || v === '') return '(none)'
  return typeof v === 'string' ? JSON.stringify(v) : typeof v === 'object' ? JSON.stringify(v) : String(v)
}

/** the five key figures F50 writes, named as the portal's General card shows them */
const KEY_FIGURES: Record<string, { readonly label: string, readonly unit: string }> = {
  maxHeight: { label: 'max height', unit: ' m' },
  length: { label: 'length', unit: ' m' },
  inversions: { label: 'inversions', unit: '' },
  topSpeed: { label: 'top speed', unit: ' km/h' },
  duration: { label: 'duration', unit: ' s' }
}

/**
 * One readable line for one changed metadata leaf, in F43's wording ("loop #1: diameter 24 -> 30").
 * Keys outside the coaster scheme read as "<name>: <old> -> <new>".
 */
export function coasterLine (name: string, oldValue: unknown, newValue: unknown): string {
  const element = /^coaster\.track\.([A-Za-z]+)\.(\d+)(?:\.(\w+))?$/.exec(name)
  if (element !== null) {
    const [, type, n, field] = element
    if (field !== undefined) return `${type} #${n}: ${field} ${show(oldValue)} -> ${show(newValue)}`
    if (oldValue === null || oldValue === undefined) return `element added: ${type}`
    if (newValue === null || newValue === undefined) return `element removed: ${type}`
    return `${type} #${n} changed`
  }
  const part = /^coaster\.(train|meta)\.(\w+)$/.exec(name)
  if (part !== null) return `${part[1]}: ${part[2]} ${show(oldValue)} -> ${show(newValue)}`
  const figure = KEY_FIGURES[name]
  if (figure !== undefined) return `${figure.label} ${show(oldValue)} -> ${show(newValue)}${figure.unit}`
  return `${name}: ${show(oldValue)} -> ${show(newValue)}`
}

/** the element list out of a metadata value: a JSON string (textarea entry) or the array itself */
function trackOf (value: unknown): TrackElement[] | null {
  let parsed = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }
  return Array.isArray(parsed) && parsed.every(e => typeof e === 'object' && e !== null && typeof e.type === 'string')
    ? parsed
    : null
}

const isTrackRow = (row: CoasterRow): boolean => row.name === TRACK_ENTRY

// F43's diff over two element lists: meta and train are equal on both sides, so only track changes come out.
const trackChanges = (before: TrackElement[], after: TrackElement[]): CoasterChange[] =>
  diffCoaster({ meta: {}, train: {}, track: before }, { meta: {}, train: {}, track: after })

/**
 * The rows the review table shows: one per changed coaster leaf, labelled with its readable line. Where the change set
 * carries the element list, the lines are F43's own texts for the same keys; the element list row itself is no line
 * of its own (it follows the leaves, see mergeRequest).
 */
export function readableRows (rows: SlotRow[]): CoasterRow[] {
  const coasterRows = rows as CoasterRow[]
  const track = coasterRows.find(isTrackRow)
  const before = trackOf(track?.current)
  const after = trackOf(track?.proposed)
  const texts = new Map(before !== null && after !== null
    ? trackChanges(before, after).map(change => [change.metadata.key, change.text])
    : [])

  return coasterRows
    .filter(row => !isTrackRow(row))
    .map(row => ({ ...row, label: texts.get(row.name) ?? coasterLine(row.name, row.current, row.proposed) }))
}

/**
 * The proposed element list with the changes of the excluded coaster keys taken back. It walks F43's own pairing of
 * the two lists, so each change lands on the element it was found on, even when elements were added or removed
 * before it: a left-out field keeps its old value, a left-out added element stays out, a left-out removal stays in.
 */
function trackWithout (before: TrackElement[], after: TrackElement[], excludedNames: Set<string>): TrackElement[] {
  const oldNumber: number[] = ordinals(before)
  const newNumber: number[] = ordinals(after)
  const track: TrackElement[] = []
  for (const [i, j] of align(before, after) as Array<[number | undefined, number | undefined]>) {
    if (i !== undefined && j !== undefined) {
      const element: Record<string, unknown> = { ...after[j] }
      const keyBase = `coaster.track.${before[i].type}.${oldNumber[i]}`
      for (const field of new Set([...Object.keys(before[i]), ...Object.keys(after[j])])) {
        if (!excludedNames.has(`${keyBase}.${field}`)) continue
        if (before[i][field] === undefined) delete element[field] // eslint-disable-line @typescript-eslint/no-dynamic-delete
        else element[field] = before[i][field]
      }
      track.push(element as TrackElement)
    } else if (i !== undefined) {
      if (excludedNames.has(`coaster.track.${before[i].type}.${oldNumber[i]}`)) track.push({ ...before[i] })
    } else if (j !== undefined && !excludedNames.has(`coaster.track.${after[j].type}.${newNumber[j]}`)) {
      track.push({ ...after[j] })
    }
  }
  return track
}

/**
 * The merge request for the change set: the unticked rows' leaf addresses as excludePaths, exactly what the table's
 * include checkboxes reported. The element list entry carries every change, so it follows the rows: merged as it is
 * when all are ticked, left out when none are, and otherwise amended to the current list plus the ticked changes.
 */
export function mergeRequest (changeSetId: string, rows: SlotRow[], excludedKeys: string[]): MergeArgs {
  const coasterRows = rows as CoasterRow[]
  const track = coasterRows.find(isTrackRow)
  const leaves = coasterRows.filter(row => !isTrackRow(row))
  const excluded = new Set(excludedKeys)
  const excludePaths = [...excludedKeys]
  let amendments: Record<string, unknown> | undefined

  if (track !== undefined && excluded.size > 0 && !excluded.has(track.key)) {
    if (leaves.every(row => excluded.has(row.key))) {
      excludePaths.push(track.key)
    } else {
      const before = trackOf(track.current)
      const after = trackOf(track.proposed)
      if (before !== null && after !== null) {
        const names = new Set(leaves.filter(row => excluded.has(row.key)).map(row => row.name))
        const merged = trackWithout(before, after, names)
        // amendments travel as whole entries (as Change Control's metadata renderer sends them), in the entry's own form
        amendments = {
          [track.key]: {
            name: track.name,
            language: typeof track.language === 'string' ? track.language : '',
            type: track.type ?? 'textarea',
            data: typeof track.proposed === 'string' ? JSON.stringify(merged) : merged
          }
        }
      }
    }
  }

  return {
    changeSetId,
    changeSetReviewActionParameters: amendments === undefined ? { excludePaths } : { excludePaths, amendments }
  }
}

export interface MergeSummary {
  readonly merged: string[]
  readonly leftOut: string[]
}

/** what the tab reports after the merge: the lines that went in, and those the reviewer left out */
export function mergeSummary (rows: CoasterRow[], excludedKeys: string[]): MergeSummary {
  const excluded = new Set(excludedKeys)
  return {
    merged: rows.filter(row => !excluded.has(row.key)).map(row => row.label),
    leftOut: rows.filter(row => excluded.has(row.key)).map(row => row.label)
  }
}
