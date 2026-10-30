// The coaster scene: turns the centre line of geometry/track.mjs into three.js meshes (two rails, a spine, ties,
// supports, a station platform and the ground). No renderer and no DOM, so it builds in the browser and in Node;
// orbit.mjs puts it on a canvas.
//
//   import { buildCoasterScene } from './scene.mjs';
//   const { scene, track, center, radius } = buildCoasterScene(design);
//   // scene:  a THREE.Scene with the background, lights, ground and the group `track` (name 'coaster-track')
//   // center: THREE.Vector3, the middle of the track's bounding box; radius: its bounding sphere's radius
import * as THREE from 'three';
import { buildTrack } from '../geometry/track.mjs';

// High contrast for a projector: a dark ground, a bright yellow track, light grey steel.
export const DEFAULT_COLORS = Object.freeze({
  background: '#0d1117',
  ground: '#1b222c',
  grid: '#3a4656',
  rail: '#ffd200',
  steel: '#c9d1d9',
  station: '#00d0ff',
});

const GAUGE = 1.2; // metres between the rails
const RAIL_RADIUS = 0.22;
const SPINE_DROP = 0.55; // the spine runs this far below the rails
const TIE_EVERY = 2; // samples (about metres)
const SUPPORT_EVERY = 8;

/**
 * Frames along a closed line: tangent, up (normal) and right for every point, the up vector parallel-transported
 * (no flip in loops) with the remaining twist spread over the circuit, then rolled by the point's bank.
 * @param {THREE.Vector3[]} points the closed line; the last point repeats the first
 * @param {number[]} banks roll in degrees per point, positive leans right
 */
export function trackFrames(points, banks) {
  const n = points.length;
  const tangents = points.map((p, i) => {
    const prev = points[i === 0 ? n - 2 : i - 1];
    const next = points[i === n - 1 ? 1 : i + 1];
    const t = new THREE.Vector3().subVectors(next, prev);
    return t.lengthSq() > 0 ? t.normalize() : new THREE.Vector3(1, 0, 0);
  });
  const ups = [];
  let up = new THREE.Vector3(0, 1, 0);
  up.addScaledVector(tangents[0], -up.dot(tangents[0])).normalize();
  ups.push(up.clone());
  const turn = new THREE.Quaternion();
  for (let i = 1; i < n; i++) {
    turn.setFromUnitVectors(tangents[i - 1], tangents[i]);
    up = up.clone().applyQuaternion(turn);
    up.addScaledVector(tangents[i], -up.dot(tangents[i])).normalize();
    ups.push(up);
  }
  // Transport around a twisted circuit (a loop drifting sideways, a helix) ends rolled against where it began:
  // undo that roll gradually so the rails join at the station.
  const end = ups[n - 1];
  const start = ups[0];
  const twist = Math.atan2(new THREE.Vector3().crossVectors(end, start).dot(tangents[n - 1]), end.dot(start));
  return points.map((_, i) => {
    const t = tangents[i];
    const roll = (twist * i) / (n - 1) + THREE.MathUtils.degToRad(banks[i] ?? 0);
    const u = ups[i].clone().applyAxisAngle(t, roll);
    const right = new THREE.Vector3().crossVectors(t, u).normalize();
    return { tangent: t, up: u, right };
  });
}

const tube = (points, radius, material, name) => {
  const curve = new THREE.CatmullRomCurve3(points.slice(0, -1), true);
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, points.length, radius, 8, true), material);
  mesh.name = name;
  return mesh;
};

/**
 * Builds the three.js scene of a coaster design (a parsed, valid `.coaster` file, see FORMAT.md).
 * @param {object} design
 * @param {{ colors?: Partial<typeof DEFAULT_COLORS> }} [options]
 */
export function buildCoasterScene(design, { colors = {} } = {}) {
  const c = { ...DEFAULT_COLORS, ...colors };
  const line = buildTrack(design);
  const points = line.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const frames = trackFrames(
    points,
    line.points.map((p) => p.bank),
  );

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(c.background);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x404850, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2.5);
  sun.position.set(0.4, 1, 0.3);
  scene.add(sun);

  const railMaterial = new THREE.MeshStandardMaterial({ color: c.rail, roughness: 0.45, metalness: 0.1 });
  const steelMaterial = new THREE.MeshStandardMaterial({ color: c.steel, roughness: 0.6 });
  const track = new THREE.Group();
  track.name = 'coaster-track';

  const offset = (side, down) =>
    points.map((p, i) => p.clone().addScaledVector(frames[i].right, side).addScaledVector(frames[i].up, -down));
  track.add(tube(offset(-GAUGE / 2, 0), RAIL_RADIUS, railMaterial, 'rail-left'));
  track.add(tube(offset(GAUGE / 2, 0), RAIL_RADIUS, railMaterial, 'rail-right'));
  track.add(tube(offset(0, SPINE_DROP), RAIL_RADIUS * 1.6, steelMaterial, 'spine'));

  const ties = new THREE.Group();
  ties.name = 'ties';
  const tieGeometry = new THREE.BoxGeometry(0.15, 0.12, GAUGE + 0.2);
  for (let i = 0; i < points.length - 1; i += TIE_EVERY) {
    const { tangent, up, right } = frames[i];
    const tie = new THREE.Mesh(tieGeometry, steelMaterial);
    tie.matrixAutoUpdate = false;
    tie.matrix.makeBasis(tangent, up, right).setPosition(points[i].clone().addScaledVector(up, -0.1));
    ties.add(tie);
  }
  track.add(ties);

  // Supports where the rails are upright and off the ground (none from inside a loop's crown).
  const supports = new THREE.Group();
  supports.name = 'supports';
  for (let i = 0; i < points.length - 1; i += SUPPORT_EVERY) {
    const foot = points[i].clone().addScaledVector(frames[i].up, -SPINE_DROP);
    if (foot.y < 1.5 || frames[i].up.y < 0.5) continue;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.25, foot.y, 6), steelMaterial);
    post.position.set(foot.x, foot.y / 2, foot.z);
    supports.add(post);
  }
  track.add(supports);

  const stationElement = line.elements.find((e) => e.type === 'station');
  const stationLength = stationElement ? Math.max(4, points[stationElement.end].x - points[stationElement.start].x) : 4;
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(stationLength, 0.4, 3.5),
    new THREE.MeshStandardMaterial({ color: c.station, roughness: 0.7 }),
  );
  platform.name = 'station';
  platform.position.set(stationLength / 2, -0.4, -GAUGE / 2 - 2.2);
  track.add(platform);
  scene.add(track);

  const box = new THREE.Box3().setFromObject(track);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const size = Math.ceil((sphere.radius * 3) / 10) * 10;
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: c.ground, roughness: 1 }),
  );
  ground.name = 'ground';
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(center.x, -0.62, center.z);
  scene.add(ground);
  const grid = new THREE.GridHelper(size, size / 10, c.grid, c.grid);
  grid.position.set(center.x, -0.6, center.z);
  scene.add(grid);

  return { scene, track, line, center, radius: sphere.radius };
}
