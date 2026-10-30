# Coaster viewer: orbit view and ride view

Draws the track of a `.coaster` file (see [`../FORMAT.md`](../FORMAT.md)) in 3D with
[three.js](https://threejs.org) **0.187.0** (pinned exactly in `package.json`), and lets the user orbit it: drag
to turn around the track, wheel or pinch to zoom, right-drag to pan. Yellow rails on a dark ground, so it reads on a
projector. It needs no backend: hand it the file's text and it draws.

The **ride view** puts the camera in the front seat instead: Play takes it from the station round the whole circuit
(lift hill, drop, loops, helix) and back into the station, where it stops. Pause stops the train where it is, Play
goes on from there, Restart puts it back in the station and rides again. The train runs at a steady speed (no
physics); the sample circuit takes about 47 s.

The centre line comes from [`../geometry/track.mjs`](../geometry/track.mjs); this folder only draws it.

## Files

- `orbit.mjs`: `mountCoasterViewer(element, { file, size, colors })`, the viewer in any DOM element (plain DOM, no
  framework). Returns `{ canvas, camera, controls, scene, render, setSize, renders, looping, dispose }`, or `{ error }` with the reason
  shown in the element when the file is not a valid `.coaster` file.
- `ride.mjs`: `mountCoasterRide(element, { file, size, colors, speed, autoplay })`, the ride view with its Play/Pause
  and Restart buttons over the canvas. Returns `{ canvas, camera, scene, controls, play, pause, restart, state,
  stats, pose, render, setSize, renders, looping, dispose }`; `state()` gives `{ playing, ended, distance, length, progress }`,
  `stats()` the frames per second since Play. `createRide(line, options)` is the ride without a renderer (the
  camera's path and the buttons' logic), for tests.
- `react.mjs`: `createCoasterViewer(React)`, the same as a React component with the props `file` and `size`. The
  host passes its own React in, so no second copy of React is loaded. `createCoasterRide(React)` is the ride view,
  with the extra props `speed` and `autoplay`.
- `pair.mjs`: `mountRidePair(element, { left, right, speed })`, two rides side by side for a review, each side
  `{ file, title, marks }`, under one Play/Pause and Restart that drive both trains at once (each ride's own buttons
  are hidden). `pairMarks(before, after)` gives the elements to mark on each side from the coaster diff's pairing of
  the two element lists: a changed element on both sides, a removed one on the left, an added one on the right.
  `createRidePair(React)` in `react.mjs` is the same as a component, props `left`, `right` and `speed`.
- `display.mjs`: what both views share for the projector: `capPixelRatio(requested, window)` (the pixel ratio,
  at most `MAX_PIXEL_RATIO` 1.5) and `watchVisible(element, onChange)` (the page is shown and the element on screen).
- `scene.mjs`: `buildCoasterScene(design, { colors, marks })`, the three.js scene (rails, spine, ties, supports, station, ground)
  without a renderer; it also builds in Node, for tests.
- `demo.html`: the orbit view on its own page; `ride.html` the ride view; `pair.html` two rides side by side
  (`?live=<url>&proposed=<url>&speed=<m/s>`, default Thunder Loop revision 2 and 3).

## Props

| Prop     | Type                                   | Meaning                                                                    |
| -------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `file`   | string or parsed object                | the `.coaster` file; it is validated against the schema first             |
| `size`   | `{ width, height }` in CSS pixels      | the canvas size; without it the canvas fills its element and follows it   |
| `colors` | `{ background, ground, grid, rail, steel, station, mark }` | optional colour overrides (e.g. the host's accent for `rail`) |
| `marks`  | number[]                               | indices into `track` of the elements to mark: their rails are drawn over in `mark` (magenta) |

The ride view also takes:

| Prop        | Type    | Meaning                                                                         |
| ----------- | ------- | ------------------------------------------------------------------------------- |
| `speed`     | number  | metres per second, default 18                                                   |
| `autoplay`  | boolean | start riding at once (default: wait for Play)                                   |
| `antialias` | boolean | smooth edges, default true; false is faster on a machine without a graphics card |

```jsx
import React from 'react';
import { createCoasterViewer } from '<path>/shared/coaster/viewer/react.mjs';

const CoasterViewer = createCoasterViewer(React);

export const Preview = ({ text }) => <CoasterViewer file={text} size={{ width: 800, height: 500 }} />;
```

## On the projector

Both views draw on demand. The orbit view's animation loop runs only while the camera moves (a drag, a zoom and the
damping after them) and stops on the first still frame; the ride's only while the train moves. A hidden view (the
page in another tab, the element `display: none` or scrolled out of sight) stops its loop at once: a playing train
waits where it is and rides on when shown again. The drawing buffer is at most 1.5x the CSS size, whatever the
screen's `devicePixelRatio` or the `pixelRatio` option asks (a 2x screen would shade four times the pixels for a
picture the room can't tell apart). `dispose()` stops the loop, frees the geometry and gives the WebGL context back
at once (a browser keeps only about 16, so a review opened and closed again and again would otherwise lose them).
`renders()` counts the frames drawn and `looping()` says whether the loop runs, for tests and a quick look in the
console. The frame time itself is measured on the presentation laptop, not in the tests.

## Install and try

three.js is this folder's own dependency: install it once, then serve the `enterprise` folder over HTTP (ES modules
don't load from `file://`) and open the demo page.

```bash
cd enterprise/assets/shared/coaster/viewer && npm ci
cd ../../../.. && python3 -m http.server 8044
# open http://localhost:8044/assets/shared/coaster/viewer/demo.html
#   ?file=<url of a .coaster file>  (default: demo-data/thunder-loop-rev3.coaster)
#   &width=1200&height=700           (default: the whole window)
# the ride: http://localhost:8044/assets/shared/coaster/viewer/ride.html  (same parameters, plus &speed=<m/s>
#   and &autoplay=1)
```

A bundler (rsbuild in the portal and Studio plugins) resolves `three` from this folder's `node_modules`, so run
`npm ci` here before building a plugin that imports the viewer.

## Tests

`enterprise/tests/coaster-viewer.test.mjs` (`node --test 'enterprise/tests/*.test.mjs'`) builds the scene in Node,
checks the pin, and opens `demo.html` in headless Chromium (`CHROMIUM`, else `chromium` on the PATH): the canvas
shows the track, a drag orbits the camera, and the screenshot is kept in `COASTER_VIEWER_SCREENSHOT` (default
`coaster-viewer.png` in the temp folder).

`enterprise/tests/coaster-ride.test.mjs` rides the sample circuit in Node (station to station, through the loops,
pause and restart) and in headless Chromium: the buttons work with real clicks, the camera comes back to the
station.

`enterprise/tests/coaster-projector.test.mjs` checks the above in headless Chromium: no redraw while idle, hidden
views stop their loops, the buffer stays at 1.5x on a 2x screen, and the side-by-side review opened and closed 10
times leaves no canvas and no live WebGL context.

`enterprise/tests/coaster-ride.perf.mjs` measures the ride's frame rate, which is printed and must be 30 fps or more
(`coaster ride frame rate: ...`). Software WebGL tracks the machine's load, so this measurement is not part of the
regular suite: run it at a quiet moment, with no other heavy work on the machine (nightly, or before the dry run):
`node --test 'enterprise/tests/*.perf.mjs'`. Headless Chromium limits the frame rate of software WebGL far below a
real screen, so the measurement turns that limiter off (`--disable-gpu-vsync --disable-frame-rate-limit`); ties and
supports are instanced meshes, one draw call each, so the scene stays fast on a software renderer.
