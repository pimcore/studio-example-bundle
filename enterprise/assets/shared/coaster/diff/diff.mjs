// Element-level diff of two .coaster revisions, without dependencies, in the browser and in Node.
// One entry per change, readable ("loop #1: diameter 24 -> 30", "element added: loop"), each naming the metadata
// leaf it corresponds to ({ key, old, new }): Change Control on 2026.3 reviews metadata leaves, not the file (F7).
// Takes two parsed, already validated documents (run validateCoaster first) and changes neither.
//
// Metadata keys:
//   coaster.meta.<field>                  name, designer, park (meta.revision is not a change: every save raises it)
//   coaster.train.<field>                 cars, seatsPerCar
//   coaster.track.<type>.<n>.<field>      a field of the n-th element of that type (1-based), e.g. coaster.track.loop.1.diameter
//   coaster.track.<type>.<n>              a whole element that was added (old: null) or removed (new: null)
// A changed or removed element is numbered as in the old revision, an added one as in the new revision.

const IGNORED_META = new Set(['revision']);

const NONE = '(none)';
const show = (value) => (value === undefined || value === null ? NONE : typeof value === 'string' ? JSON.stringify(value) : String(value));
const leafValue = (value) => (value === undefined ? null : value);

// Field names of both objects: those of the old one in its order, then the new ones.
const fieldsOf = (before, after, skip) =>
  [...new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])].filter((field) => !skip.has(field));

const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const sameElement = (a, b) => {
  const fields = fieldsOf(a, b, new Set());
  return fields.every((field) => sameValue(a[field], b[field]));
};

// Field-by-field changes between two objects; `prefix` names them in the text, `keyBase` in the metadata key.
function fieldChanges(before, after, { prefix, keyBase, skip = new Set(), extra = {} }) {
  return fieldsOf(before, after, skip)
    .filter((field) => !sameValue(before?.[field], after?.[field]))
    .map((field) => ({
      kind: 'changed',
      ...extra,
      field,
      text: `${prefix}: ${field} ${show(before?.[field])} -> ${show(after?.[field])}`,
      metadata: { key: `${keyBase}.${field}`, old: leafValue(before?.[field]), new: leafValue(after?.[field]) },
    }));
}

// Pairs the elements of two tracks in ride order: the most elements of the same type, and among those pairings
// the most identical ones (so inserting a loop next to another marks the new one as added, not the old as changed).
// Returns [oldIndex, newIndex] pairs; an index missing on one side is an added or removed element.
function align(before, after) {
  const better = (a, b) => (a[0] !== b[0] ? a[0] > b[0] : a[1] >= b[1]);
  const n = before.length;
  const m = after.length;
  // best[i][j]: [type matches, identical matches] of before[i..] against after[j..].
  const best = Array.from({ length: n + 1 }, () => Array.from({ length: m + 1 }, () => [0, 0]));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      let score = better(best[i + 1][j], best[i][j + 1]) ? best[i + 1][j] : best[i][j + 1];
      if (before[i].type === after[j].type) {
        const rest = best[i + 1][j + 1];
        const pair = [rest[0] + 1, rest[1] + (sameElement(before[i], after[j]) ? 1 : 0)];
        if (better(pair, score)) score = pair;
      }
      best[i][j] = score;
    }
  }
  const steps = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && before[i].type === after[j].type) {
      const rest = best[i + 1][j + 1];
      const pair = [rest[0] + 1, rest[1] + (sameElement(before[i], after[j]) ? 1 : 0)];
      if (pair[0] === best[i][j][0] && pair[1] === best[i][j][1]) {
        steps.push([i++, j++]);
        continue;
      }
    }
    if (j >= m || (i < n && best[i + 1][j][0] === best[i][j][0] && best[i + 1][j][1] === best[i][j][1])) {
      steps.push([i++, undefined]);
    } else {
      steps.push([undefined, j++]);
    }
  }
  return steps;
}

// The 1-based number of each element among the elements of its type, e.g. [1, 1, 1, 1, 1, 1, 2, 1, 2].
const ordinals = (track) => {
  const seen = {};
  return track.map((element) => (seen[element.type] = (seen[element.type] ?? 0) + 1));
};

/**
 * Diffs two .coaster revisions.
 * @param {object} before the older revision (parsed, valid)
 * @param {object} after the newer revision (parsed, valid)
 * @returns {Array<{kind: 'changed'|'added'|'removed', text: string, elementType?: string, field?: string,
 *   metadata: {key: string, old: unknown, new: unknown}}>} one entry per change, meta and train first, then the
 *   track in ride order; [] when the two are equal
 */
export function diffCoaster(before, after) {
  const entries = [
    ...fieldChanges(before.meta, after.meta, { prefix: 'meta', keyBase: 'coaster.meta', skip: IGNORED_META }),
    ...fieldChanges(before.train, after.train, { prefix: 'train', keyBase: 'coaster.train' }),
  ];
  const oldTrack = before.track ?? [];
  const newTrack = after.track ?? [];
  const oldNumber = ordinals(oldTrack);
  const newNumber = ordinals(newTrack);
  for (const [i, j] of align(oldTrack, newTrack)) {
    if (i !== undefined && j !== undefined) {
      const type = oldTrack[i].type;
      const name = `${type} #${oldNumber[i]}`;
      entries.push(...fieldChanges(oldTrack[i], newTrack[j], {
        prefix: name,
        keyBase: `coaster.track.${type}.${oldNumber[i]}`,
        skip: new Set(['type']),
        extra: { elementType: type },
      }));
    } else if (i !== undefined) {
      const type = oldTrack[i].type;
      entries.push({
        kind: 'removed',
        elementType: type,
        text: `element removed: ${type}`,
        metadata: { key: `coaster.track.${type}.${oldNumber[i]}`, old: structuredClone(oldTrack[i]), new: null },
      });
    } else {
      const type = newTrack[j].type;
      entries.push({
        kind: 'added',
        elementType: type,
        text: `element added: ${type}`,
        metadata: { key: `coaster.track.${type}.${newNumber[j]}`, old: null, new: structuredClone(newTrack[j]) },
      });
    }
  }
  return entries;
}
