# Coaster viewer: orbit view

Draws the track of a `.coaster` file (see [`../FORMAT.md`](../FORMAT.md)) in 3D with
[three.js](https://threejs.org) **0.187.0** (pinned exactly in `package.json`), and lets the user orbit it: drag
to turn around the track, wheel or pinch to zoom, right-drag to pan. Yellow rails on a dark ground, so it reads on a
projector. It needs no backend: hand it the file's text and it draws.

The centre line comes from [`../geometry/track.mjs`](../geometry/track.mjs); this folder only draws it.

## Files

- `orbit.mjs`: `mountCoasterViewer(element, { file, size, colors })`, the viewer in any DOM element (plain DOM, no
  framework). Returns `{ canvas, camera, controls, scene, render, setSize, dispose }`, or `{ error }` with the reason
  shown in the element when the file is not a valid `.coaster` file.
- `react.mjs`: `createCoasterViewer(React)`, the same as a React component with the props `file` and `size`. The
  host passes its own React in, so no second copy of React is loaded.
- `scene.mjs`: `buildCoasterScene(design)`, the three.js scene (rails, spine, ties, supports, station, ground)
  without a renderer; it also builds in Node, for tests.
- `demo.html`: the viewer on its own page.

## Props

| Prop     | Type                                   | Meaning                                                                    |
| -------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `file`   | string or parsed object                | the `.coaster` file; it is validated against the schema first             |
| `size`   | `{ width, height }` in CSS pixels      | the canvas size; without it the canvas fills its element and follows it   |
| `colors` | `{ background, ground, grid, rail, steel, station }` | optional colour overrides (e.g. the host's accent for `rail`) |

```jsx
import React from 'react';
import { createCoasterViewer } from '<path>/shared/coaster/viewer/react.mjs';

const CoasterViewer = createCoasterViewer(React);

export const Preview = ({ text }) => <CoasterViewer file={text} size={{ width: 800, height: 500 }} />;
```

## Install and try

three.js is this folder's own dependency: install it once, then serve the `enterprise` folder over HTTP (ES modules
don't load from `file://`) and open the demo page.

```bash
cd enterprise/assets/shared/coaster/viewer && npm ci
cd ../../../.. && python3 -m http.server 8044
# open http://localhost:8044/assets/shared/coaster/viewer/demo.html
#   ?file=<url of a .coaster file>  (default: demo-data/thunder-loop-rev3.coaster)
#   &width=1200&height=700           (default: the whole window)
```

A bundler (rsbuild in the portal and Studio plugins) resolves `three` from this folder's `node_modules`, so run
`npm ci` here before building a plugin that imports the viewer.

## Tests

`enterprise/tests/coaster-viewer.test.mjs` (`node --test 'enterprise/tests/*.test.mjs'`) builds the scene in Node,
checks the pin, and opens `demo.html` in headless Chromium (`CHROMIUM`, else `chromium` on the PATH): the canvas
shows the track, a drag orbits the camera, and the screenshot is kept in `COASTER_VIEWER_SCREENSHOT` (default
`coaster-viewer.png` in the temp folder).
