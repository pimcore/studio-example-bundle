// What the viewers share for the projector (F80): the drawing buffer's pixel ratio cap, and whether a viewer is on
// screen at all, so a hidden one (a closed tab, a collapsed panel, scrolled away) stops its animation loop.
//
//   import { capPixelRatio, watchVisible } from './display.mjs';
//   renderer.setPixelRatio(capPixelRatio(options.pixelRatio, doc.defaultView));
//   const watch = watchVisible(canvas, (visible) => (visible ? resume() : stop()));
//   watch.visible(); watch.disconnect();

// A 4K projector or a retina laptop reports a devicePixelRatio of 2 or more: four times the pixels to shade for an
// image the room cannot tell apart from 1.5x.
export const MAX_PIXEL_RATIO = 1.5;

/**
 * The pixel ratio to draw at: the one asked for, else the window's devicePixelRatio, at most MAX_PIXEL_RATIO.
 * @param {number | undefined} requested
 * @param {{ devicePixelRatio?: number } | null | undefined} view
 */
export function capPixelRatio(requested, view) {
  const ratio = Number(requested ?? view?.devicePixelRatio ?? 1);
  return Math.min(ratio > 0 ? ratio : 1, MAX_PIXEL_RATIO);
}

/**
 * Follows whether `element` can be seen: its page is not hidden and it is not display: none, of no size or out of the
 * viewport. It counts as visible until the browser says otherwise, so a viewer draws its first frame at once.
 * @param {Element} element
 * @param {(visible: boolean) => void} onChange called only when it changes
 * @returns {{ visible(): boolean, disconnect(): void }}
 */
export function watchVisible(element, onChange) {
  const doc = element.ownerDocument;
  const view = doc.defaultView;
  let onPage = true;
  let pageShown = !doc.hidden;
  let visible = pageShown;
  const update = () => {
    const next = pageShown && onPage;
    if (next === visible) return;
    visible = next;
    onChange(visible);
  };
  const IntersectionObserver = view?.IntersectionObserver;
  const observer = IntersectionObserver
    ? new IntersectionObserver((entries) => {
        onPage = entries[entries.length - 1].isIntersecting;
        update();
      })
    : undefined;
  observer?.observe(element);
  const onVisibility = () => {
    pageShown = !doc.hidden;
    update();
  };
  doc.addEventListener('visibilitychange', onVisibility);
  return {
    visible: () => visible,
    disconnect() {
      observer?.disconnect();
      doc.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
