# Coaster viewer on the projector

Both views draw on demand. The orbit view's animation loop runs only while the camera moves (a drag, a zoom and the
damping after them) and stops on the first still frame; the ride's only while the train moves. A hidden view (the
page in another tab, the element `display: none` or scrolled out of sight) stops its loop at once: a playing train
waits where it is and rides on when shown again. The drawing buffer is at most 1.5x the CSS size, whatever the
screen's `devicePixelRatio` or the `pixelRatio` option asks (a 2x screen would shade four times the pixels for a
picture the room can't tell apart). `dispose()` stops the loop, frees the geometry and gives the WebGL context back
at once (a browser keeps only about 16, so a review opened and closed again and again would otherwise lose them).
The frame time itself is measured on the presentation laptop, not in the tests.

## What it adds

- `display.mjs`: what both views share for the projector: `capPixelRatio(requested, window)` (the pixel ratio,
  at most `MAX_PIXEL_RATIO` 1.5) and `watchVisible(element, onChange)` (the page is shown and the element on screen).
- `renders()` and `looping()` on the results of `mountCoasterViewer` (`orbit.mjs`) and `mountCoasterRide`
  (`ride.mjs`): the number of frames drawn and whether the loop runs, for tests and a quick look in the console.

## Tests

`enterprise/tests/coaster-projector.test.mjs` checks the above in headless Chromium: no redraw while idle, hidden
views stop their loops, and the buffer stays at 1.5x on a 2x screen.
