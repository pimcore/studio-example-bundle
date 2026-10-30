// The ride view: the camera sits in the front seat and rides the track from the station round the circuit and back
// into it, at a steady speed (no physics). Play, Pause and Restart buttons sit over the canvas. Plain DOM like
// orbit.mjs; react.mjs wraps it as a component.
//
//   import { mountCoasterRide } from './ride.mjs';
//   const ride = mountCoasterRide(element, { file, size: { width: 800, height: 500 }, speed: 18 });
//   ride.play(); ride.pause(); ride.restart();
//   ride.state();  // { playing, ended, distance, length, progress }
//   ride.stats();  // { frames, seconds, fps } since the ride last started playing
//   ride.dispose(); // when the host removes it
//
// createRide() is the ride without a renderer (the camera's path, the clock and the buttons' logic), so it also runs
// in Node, for tests.
import * as THREE from 'three';
import { readCoasterFile } from './orbit.mjs';
import { buildCoasterScene, trackFrames } from './scene.mjs';

export const RIDE_DEFAULTS = Object.freeze({
  speed: 18, // metres per second, about 47 s for the sample circuit
  eyeHeight: 1.1, // metres above the rails, along the track's up
  lookAhead: 8, // metres down the track the rider looks at
  maxStep: 0.1, // seconds; a longer gap between frames (a hidden tab) does not jump the train
});

/**
 * The ride along a closed centre line, without a renderer.
 * @param {{ points: { x: number, y: number, z: number, bank: number }[] }} line from geometry/track.mjs: the first
 *   and the last point are the station
 * @param {Partial<typeof RIDE_DEFAULTS>} [options]
 */
export function createRide(line, options = {}) {
  const given = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined));
  const { speed, eyeHeight, lookAhead, maxStep } = { ...RIDE_DEFAULTS, ...given };
  const points = line.points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
  const frames = trackFrames(
    points,
    line.points.map((p) => p.bank),
  );
  const along = [0];
  for (let i = 1; i < points.length; i++) along.push(along[i - 1] + points[i].distanceTo(points[i - 1]));
  const length = along[along.length - 1];

  let distance = 0;
  let playing = false;
  let ended = false;
  let frameCount = 0;
  let seconds = 0;

  // The sample range holding `s` metres along the line, and how far into it.
  const locate = (s) => {
    const d = THREE.MathUtils.clamp(s, 0, length);
    let lo = 0;
    let hi = along.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (along[mid] <= d) lo = mid;
      else hi = mid;
    }
    const span = along[hi] - along[lo];
    return { i: lo, j: hi, f: span > 0 ? (d - along[lo]) / span : 0 };
  };
  const pointAt = (s) => {
    const { i, j, f } = locate(s);
    return points[i].clone().lerp(points[j], f);
  };
  const upAt = (s) => {
    const { i, j, f } = locate(s);
    return frames[i].up.clone().lerp(frames[j].up, f).normalize();
  };

  /** The front-seat camera at `s` metres: eye position, the point it looks at and its up. */
  const pose = (s = distance) => {
    const up = upAt(s);
    const eye = pointAt(s).addScaledVector(up, eyeHeight);
    // Past the end the rider looks down the station platform (the line's start), not at the buffer.
    const ahead = s + lookAhead <= length ? s + lookAhead : s + lookAhead - length;
    const target = pointAt(ahead).addScaledVector(upAt(ahead), eyeHeight);
    return { eye, target, up };
  };

  return {
    length,
    pose,
    play() {
      if (ended) distance = 0;
      ended = false;
      if (!playing) {
        frameCount = 0;
        seconds = 0;
      }
      playing = true;
    },
    pause() {
      playing = false;
    },
    restart() {
      distance = 0;
      ended = false;
      frameCount = 0;
      seconds = 0;
      playing = true;
    },
    /** Moves the train on by `dt` seconds of ride time; at the end of the circuit it stops in the station. */
    update(dt) {
      if (!playing) return false;
      const step = Math.min(Math.max(dt, 0), maxStep);
      frameCount++;
      seconds += dt;
      distance += speed * step;
      if (distance >= length) {
        distance = length;
        playing = false;
        ended = true;
      }
      return true;
    },
    state: () => ({ playing, ended, distance, length, progress: distance / length }),
    stats: () => ({ frames: frameCount, seconds, fps: seconds > 0 ? frameCount / seconds : 0 }),
  };
}

const BUTTON_STYLE =
  'font: 600 16px system-ui, sans-serif; padding: 0.5em 1.1em; margin-right: 0.5em; border: 0; border-radius: 6px;' +
  'background: #f0f6fc; color: #0d1117; cursor: pointer; min-width: 6.5em';

/**
 * Mounts the ride view in `container`: the canvas, and a bar with Play/Pause, Restart and the ride's progress.
 * @param {HTMLElement} container
 * @param {{ file: string | object, size?: { width: number, height: number }, autoplay?: boolean,
 *   colors?: Partial<import('./scene.mjs').DEFAULT_COLORS> } & Partial<typeof RIDE_DEFAULTS>} options
 */
export function mountCoasterRide(container, { file, size, colors, autoplay = false, antialias = true, pixelRatio, ...rideOptions } = {}) {
  const doc = container.ownerDocument;
  const { design, error } = readCoasterFile(file);
  if (error) {
    const message = doc.createElement('p');
    message.className = 'coaster-viewer-error';
    message.setAttribute('role', 'alert');
    message.textContent = error;
    container.append(message);
    return { error, play() {}, pause() {}, restart() {}, render() {}, setSize() {}, dispose: () => message.remove() };
  }

  const { scene, line, radius } = buildCoasterScene(design, { colors });
  const ride = createRide(line, rideOptions);
  const renderer = new THREE.WebGLRenderer({ antialias });
  renderer.setPixelRatio(pixelRatio ?? doc.defaultView?.devicePixelRatio ?? 1);
  const canvas = renderer.domElement;
  canvas.className = 'coaster-viewer coaster-ride';
  canvas.setAttribute('aria-label', `Front-seat ride on the coaster ${design.meta?.name ?? ''}`.trim());
  canvas.style.display = 'block';

  const frame = doc.createElement('div');
  frame.className = 'coaster-ride-frame';
  frame.style.position = 'relative';
  const bar = doc.createElement('div');
  bar.className = 'coaster-ride-controls';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Ride controls');
  bar.style.cssText =
    'position: absolute; left: 12px; bottom: 12px; display: flex; align-items: center; color: #f0f6fc;' +
    'font: 16px system-ui, sans-serif; text-shadow: 0 1px 2px #000';
  const button = (name, label) => {
    const b = doc.createElement('button');
    b.type = 'button';
    b.name = name;
    b.textContent = label;
    b.style.cssText = BUTTON_STYLE;
    bar.append(b);
    return b;
  };
  const playButton = button('play', 'Play');
  const restartButton = button('restart', 'Restart');
  const progress = doc.createElement('span');
  progress.className = 'coaster-ride-progress';
  progress.setAttribute('aria-live', 'off');
  bar.append(progress);
  frame.append(canvas, bar);
  container.append(frame);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, radius * 20);
  const place = () => {
    const { eye, target, up } = ride.pose();
    camera.position.copy(eye);
    camera.up.copy(up);
    camera.lookAt(target);
  };
  const showState = () => {
    const { playing, ended, distance, length } = ride.state();
    playButton.textContent = playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(playing));
    progress.textContent = ended
      ? 'Back in the station'
      : `${Math.round(distance)} m of ${Math.round(length)} m`;
  };
  const render = () => renderer.render(scene, camera);
  const setSize = (next = size) => {
    const width = next?.width ?? container.clientWidth;
    const height = next?.height ?? container.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  };
  place();
  setSize();
  showState();
  const observer =
    !size && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => setSize()) : undefined;
  observer?.observe(container);

  // The animation loop runs only while the train moves; a standing train is drawn once, so a paused ride costs
  // nothing (a laptop on battery, a busy headless browser).
  let last; // the loop's previous timestamp in ms; unset when it starts, so the train does not jump
  const tick = (time) => {
    const dt = last === undefined ? 0 : (time - last) / 1000;
    last = time;
    if (ride.update(dt)) {
      place();
      showState();
    }
    render();
    if (!ride.state().playing) renderer.setAnimationLoop(null);
  };
  const run = () => {
    last = undefined;
    renderer.setAnimationLoop(tick);
  };

  const play = () => {
    ride.play();
    place();
    showState();
    run();
  };
  const pause = () => {
    ride.pause();
    showState();
  };
  const restart = () => {
    ride.restart();
    place();
    showState();
    run();
  };
  playButton.addEventListener('click', () => (ride.state().playing ? pause() : play()));
  restartButton.addEventListener('click', restart);
  if (autoplay) play();

  return {
    canvas,
    camera,
    scene,
    controls: bar,
    play,
    pause,
    restart,
    state: ride.state,
    stats: ride.stats,
    pose: ride.pose,
    render,
    setSize,
    dispose() {
      renderer.setAnimationLoop(null);
      observer?.disconnect();
      scene.traverse((object) => {
        object.geometry?.dispose();
        object.material?.dispose?.();
      });
      renderer.dispose();
      frame.remove();
    },
  };
}
