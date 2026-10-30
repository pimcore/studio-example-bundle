// Two rides side by side, for a review: the live revision on the left, the proposed one on the right, each with its
// changed elements marked, and one Play/Pause and Restart that drive both trains at once. Plain DOM like ride.mjs;
// react.mjs wraps it as a component.
//
//   import { mountRidePair, pairMarks } from './pair.mjs';
//   const marks = pairMarks(live.track, proposed.track);
//   const pair = mountRidePair(element, {
//     left: { file: live, title: 'Revision 2 (live)', marks: marks.left },
//     right: { file: proposed, title: 'Revision 3 (proposed)', marks: marks.right },
//   });
//   pair.play(); pair.pause(); pair.restart();
//   pair.state();   // { playing, ended, rides: [left.state(), right.state()] }
//   pair.dispose();
import { align } from '../diff/diff.mjs';
import { mountCoasterRide } from './ride.mjs';

/**
 * The elements to mark on each side, by F43's pairing of the two element lists: a changed element on both sides, a
 * removed one on the left, an added one on the right.
 * @param {object[]} before the live revision's track
 * @param {object[]} after the proposed revision's track
 * @returns {{ left: number[], right: number[] }} indices into `before` and `after`
 */
export function pairMarks(before, after) {
  const left = [];
  const right = [];
  for (const [i, j] of align(before, after)) {
    if (i !== undefined && j !== undefined) {
      if (JSON.stringify(before[i]) === JSON.stringify(after[j])) continue;
      left.push(i);
      right.push(j);
    } else if (i !== undefined) left.push(i);
    else if (j !== undefined) right.push(j);
  }
  return { left: left.sort((a, b) => a - b), right: right.sort((a, b) => a - b) };
}

const BUTTON_STYLE =
  'font: 600 16px system-ui, sans-serif; padding: 0.5em 1.1em; margin-right: 0.5em; border: 0; border-radius: 6px;' +
  'background: #0d1117; color: #f0f6fc; cursor: pointer; min-width: 6.5em';

/**
 * Mounts two rides side by side in `container`, under one control bar.
 * @param {HTMLElement} container
 * @param {{ left: { file: string | object, title: string, marks?: number[] },
 *   right: { file: string | object, title: string, marks?: number[] },
 *   speed?: number, colors?: object, antialias?: boolean, pixelRatio?: number }} options
 */
export function mountRidePair(container, { left, right, speed, colors, antialias, pixelRatio } = {}) {
  const doc = container.ownerDocument;
  const root = doc.createElement('div');
  root.className = 'coaster-ride-pair';
  root.style.cssText = 'display: flex; flex-direction: column; gap: 8px';
  const grid = doc.createElement('div');
  grid.style.cssText = 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px';
  const bar = doc.createElement('div');
  bar.className = 'coaster-ride-pair-controls';
  bar.setAttribute('role', 'toolbar');
  bar.setAttribute('aria-label', 'Controls for both rides');
  bar.style.cssText = 'display: flex; align-items: center; font: 16px system-ui, sans-serif';
  root.append(grid, bar);
  container.append(root);

  const rides = [left, right].map((side, n) => {
    const column = doc.createElement('section');
    column.className = `coaster-ride-pair-side coaster-ride-pair-${n === 0 ? 'left' : 'right'}`;
    column.setAttribute('aria-label', side.title);
    column.style.minWidth = '0';
    const heading = doc.createElement('h4');
    heading.className = 'coaster-ride-pair-title';
    heading.style.cssText = 'margin: 0 0 4px; font: 600 15px system-ui, sans-serif';
    heading.textContent = side.title;
    const marked = doc.createElement('span');
    marked.className = 'coaster-ride-pair-marked';
    marked.style.cssText = 'font-weight: 400; margin-left: 0.5em; opacity: 0.75';
    const count = side.marks?.length ?? 0;
    marked.textContent = count === 0 ? '' : `${count} changed element${count === 1 ? '' : 's'} marked`;
    heading.append(marked);
    const host = doc.createElement('div');
    host.className = 'coaster-ride-pair-host';
    host.style.cssText = 'width: 100%; aspect-ratio: 16 / 10';
    column.append(heading, host);
    grid.append(column);
    const ride = mountCoasterRide(host, { file: side.file, marks: side.marks, speed, colors, antialias, pixelRatio });
    // One bar drives both: each ride's own buttons stay hidden.
    if (ride.controls) ride.controls.style.display = 'none';
    return ride;
  });

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
  progress.className = 'coaster-ride-pair-progress';
  bar.append(progress);

  const states = () => rides.map((ride) => ride.state?.() ?? { playing: false, ended: false, distance: 0, length: 0 });
  const state = () => {
    const all = states();
    return { playing: all.some((s) => s.playing), ended: all.every((s) => s.ended), rides: all };
  };
  const view = doc.defaultView;
  let frame; // the bar follows the trains while one of them rides
  const showState = () => {
    const { playing, ended, rides: all } = state();
    playButton.textContent = playing ? 'Pause' : 'Play';
    playButton.setAttribute('aria-pressed', String(playing));
    progress.textContent = ended
      ? 'Both back in the station'
      : all.map((s, n) => `${n === 0 ? 'Live' : 'Proposed'}: ${Math.round(s.distance)} m of ${Math.round(s.length)} m`).join(' · ');
    frame = playing && view ? view.requestAnimationFrame(showState) : undefined;
  };
  const follow = () => {
    if (frame !== undefined) view?.cancelAnimationFrame(frame);
    showState();
  };

  // Both trains start, stop and go back in the same click. A train already back in the station waits there for the
  // other one; once both are back, Play rides both again from the station.
  const play = () => {
    const all = states();
    const bothEnded = all.every((s) => s.ended);
    rides.forEach((ride, n) => {
      if (bothEnded || !all[n].ended) ride.play();
    });
    follow();
  };
  const pause = () => {
    for (const ride of rides) ride.pause();
    follow();
  };
  const restart = () => {
    for (const ride of rides) ride.restart();
    follow();
  };
  playButton.addEventListener('click', () => (state().playing ? pause() : play()));
  restartButton.addEventListener('click', restart);
  showState();

  return {
    rides,
    controls: bar,
    play,
    pause,
    restart,
    state,
    dispose() {
      if (frame !== undefined) view?.cancelAnimationFrame(frame);
      for (const ride of rides) ride.dispose();
      root.remove();
    },
  };
}
