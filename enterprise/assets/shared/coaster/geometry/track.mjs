// The coaster track geometry: turns the element list of a `.coaster` design (FORMAT.md) into a sampled 3D centre
// line. Pure and dependency-free (no three.js), in the browser and in Node; the viewer only draws what it returns.
//
//   import { buildTrack } from './geometry/track.mjs';
//   const { points, elements, station, closed } = buildTrack(design);
//   // points:   [{ x, y, z, bank }, ...] about one per metre; y is up, the ride leaves the station along +x,
//   //           "right" is +z; bank is the roll in degrees, positive leans right (into a right-hand curve)
//   // elements: [{ index, type, label?, start, end }, ...] the sample range of every track element in ride order,
//   //           then { index: -1, type: 'return' }; neighbouring ranges share their boundary sample
//   // station:  { x: 0, y: 0, z: 0 }, the first and the last point; closed: true
//
// Every element is built from where the one before it ended (a "turtle" walk), so a change to one element changes
// the line only from that element on. The format does not say how the circuit closes, so the line ends with a
// generated return curve from the last element back into the station (the accepted demo shortcut): two Hermite
// arcs via a point beside the course, then a straight lead-in along +x.

const DEG = Math.PI / 180;
const STATION = Object.freeze({ x: 0, y: 0, z: 0 });
const LEAD_IN = 30; // metres of straight track before the station on the return
const MAX_SLOPE = 80 * DEG; // steepest slope drawn for lift hills and drops (90 degrees would have no run)
const HELIX_RISE = 5; // metres a helix climbs or descends per turn, so its turns do not overlap

const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const scale = (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const norm = (a) => Math.hypot(a.x, a.y, a.z);
const sum = (...terms) => terms.reduce(add, { x: 0, y: 0, z: 0 });

const forwardOf = (yaw) => ({ x: Math.cos(yaw), y: 0, z: Math.sin(yaw) });
const rightOf = (yaw) => ({ x: -Math.sin(yaw), y: 0, z: Math.cos(yaw) });
const UP = { x: 0, y: 1, z: 0 };

const smoothstep = (t) => t * t * (3 - 2 * t);
const samplesFor = (length, step, min = 1) => Math.max(min, Math.ceil(length / step));
// Bank eases in over the first and out over the last 15 % of a curve.
const bankEnvelope = (t) => smoothstep(Math.min(1, t / 0.15)) * smoothstep(Math.min(1, (1 - t) / 0.15));

// Straight run, optionally with a smooth height change (zero slope at both ends).
const ramp = (state, run, rise, step) => {
  const forward = forwardOf(state.yaw);
  const n = samplesFor(Math.hypot(run, rise), step, run > 0 || rise !== 0 ? 8 : 0);
  const at = (t) => ({ ...sum(state.p, scale(forward, run * t), scale(UP, rise * smoothstep(t))), bank: 0 });
  return { n, at, end: { p: sum(state.p, scale(forward, run), scale(UP, rise)), yaw: state.yaw } };
};

const straight = (state, length, step) => {
  const forward = forwardOf(state.yaw);
  const n = length > 0 ? samplesFor(length, step) : 0;
  const at = (t) => ({ ...add(state.p, scale(forward, length * t)), bank: 0 });
  return { n, at, end: { p: add(state.p, scale(forward, length)), yaw: state.yaw } };
};

const slope = (height, angle) => (1.5 * height) / Math.tan(Math.min(angle * DEG, MAX_SLOPE)); // smoothstep's peak slope is 1.5x

// A horizontal arc of `degrees` on `radius`, with an optional smooth height change and bank.
const arc = (state, degrees, radius, direction, bank, rise, step) => {
  const side = direction === 'left' ? -1 : 1;
  const forward = forwardOf(state.yaw);
  const right = rightOf(state.yaw);
  const sweep = degrees * DEG;
  const n = samplesFor(Math.hypot(radius * sweep, rise), step, 8);
  const at = (t) => {
    const phi = sweep * t;
    return {
      ...sum(state.p, scale(forward, radius * Math.sin(phi)), scale(right, side * radius * (1 - Math.cos(phi))), scale(UP, rise * smoothstep(t))),
      bank: side * bank * bankEnvelope(t),
    };
  };
  const { bank: _bank, ...p } = at(1);
  return { n, at, end: { p, yaw: state.yaw + side * sweep } };
};

// A vertical loop of `diameter`, drifting sideways to the right by a fifth of it so exit and entry do not meet.
const loop = (state, diameter, step) => {
  const radius = diameter / 2;
  const drift = diameter / 5;
  const forward = forwardOf(state.yaw);
  const right = rightOf(state.yaw);
  let n = samplesFor(Math.PI * diameter, step, 24);
  n += n % 2; // even, so the top of the loop is a sample
  const at = (t) => {
    const theta = 2 * Math.PI * t;
    return {
      ...sum(state.p, scale(forward, radius * Math.sin(theta)), scale(UP, radius * (1 - Math.cos(theta))), scale(right, drift * smoothstep(t))),
      bank: 0,
    };
  };
  return { n, at, end: { p: add(state.p, scale(right, drift)), yaw: state.yaw } };
};

const builders = {
  station: (e, s, step) => straight(s, e.length, step),
  brakeRun: (e, s, step) => straight(s, e.length, step),
  liftHill: (e, s, step) => ramp(s, slope(e.height, e.angle), e.height, step),
  // A drop never goes below the ground: it falls at most the height the train has.
  drop: (e, s, step) => ramp(s, slope(e.height, e.angle), -Math.min(e.height, s.p.y), step),
  airtimeHill: (e, s, step) => {
    const run = Math.max(3 * e.height, 20);
    const forward = forwardOf(s.yaw);
    const n = samplesFor(run + e.height, step, 8);
    const at = (t) => ({ ...sum(s.p, scale(forward, run * t), scale(UP, e.height * Math.sin(Math.PI * t) ** 2)), bank: 0 });
    return { n, at, end: { p: add(s.p, scale(forward, run)), yaw: s.yaw } };
  },
  loop: (e, s, step) => loop(s, e.diameter, step),
  turn: (e, s, step) => arc(s, e.angle, e.radius, e.direction, e.bank ?? 0, 0, step),
  // A helix descends while it has the height for it, else it climbs.
  helix: (e, s, step) => {
    const rise = HELIX_RISE * e.turns;
    return arc(s, 360 * e.turns, e.radius, e.direction, e.bank ?? 0, s.p.y >= rise ? -rise : rise, step);
  },
};

// Cubic Hermite curve from a to b with tangents ta and tb.
const hermite = (a, ta, b, tb) => (t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return sum(scale(a, 2 * t3 - 3 * t2 + 1), scale(ta, t3 - 2 * t2 + t), scale(b, -2 * t3 + 3 * t2), scale(tb, t3 - t2));
};

const curveLength = (f) => {
  let length = 0;
  for (let i = 1; i <= 64; i++) length += norm(sub(f(i / 64), f((i - 1) / 64)));
  return length;
};

// The generated return: from the end of the last element to the lead-in point behind the station via a point beside
// the course (on the side away from the track's centre, so the curve swings around rather than doubling back), then
// straight into the station along +x.
const returnPieces = (state, points) => {
  const leadIn = { x: -LEAD_IN, y: 0, z: 0 };
  const lead = { x: 1, y: 0, z: 0 };
  const from = state.p;
  const pieces = [];
  const span = sub(leadIn, from);
  const distance = norm(span);
  const forward = forwardOf(state.yaw);
  if (distance > 1e-9 || Math.abs(Math.sin(state.yaw)) > 1e-9 || Math.cos(state.yaw) < 0) {
    const across = Math.hypot(span.x, span.z) > 1e-9 ? { x: -span.z, y: 0, z: span.x } : { x: 0, y: 0, z: 1 };
    const unit = scale(across, 1 / norm(across));
    const middle = scale(add(from, leadIn), 0.5);
    const centre = scale(points.reduce(add, { x: 0, y: 0, z: 0 }), 1 / points.length);
    const away = (unit.x * (centre.x - middle.x) + unit.z * (centre.z - middle.z)) > 0 ? -1 : 1;
    const via = add(middle, scale(unit, away * Math.max(15, distance / 4)));
    const viaTangent = distance > 1e-9 ? scale(span, 1 / distance) : scale(forward, -1);
    const first = norm(sub(via, from));
    const second = norm(sub(leadIn, via));
    pieces.push(hermite(from, scale(forward, first), via, scale(viaTangent, first)));
    pieces.push(hermite(via, scale(viaTangent, second), leadIn, scale(lead, second)));
  }
  pieces.push((t) => add(leadIn, scale(lead, LEAD_IN * t)));
  return pieces;
};

/**
 * Builds the closed centre line of a coaster design (a parsed `.coaster` file, see FORMAT.md; validate it first).
 * @param {{ track: Array<{ type: string, label?: string }> }} design
 * @param {{ step?: number }} [options] step: metres between samples (default 1)
 * @returns {{ points: Array<{ x: number, y: number, z: number, bank: number }>,
 *   elements: Array<{ index: number, type: string, label?: string, start: number, end: number }>,
 *   station: { x: number, y: number, z: number }, closed: true }}
 */
export function buildTrack(design, { step = 1 } = {}) {
  const points = [{ ...STATION, bank: 0 }];
  const elements = [];
  let state = { p: { ...STATION }, yaw: 0 };

  design.track.forEach((element, index) => {
    const build = builders[element.type];
    if (!build) throw new Error(`/track/${index}/type: unknown element type ${JSON.stringify(element.type)}`);
    const start = points.length - 1;
    const { n, at, end } = build(element, state, step);
    for (let i = 1; i <= n; i++) points.push(at(i / n));
    elements.push({ index, type: element.type, ...(element.label === undefined ? {} : { label: element.label }), start, end: points.length - 1 });
    state = end;
  });

  const start = points.length - 1;
  for (const piece of returnPieces(state, points)) {
    const n = samplesFor(curveLength(piece), step, 1);
    for (let i = 1; i <= n; i++) points.push({ ...piece(i / n), bank: 0 });
  }
  points[points.length - 1] = { ...STATION, bank: 0 }; // exactly the station, not a rounding error away
  elements.push({ index: -1, type: 'return', start, end: points.length - 1 });

  return { points, elements, station: { ...STATION }, closed: true };
}
