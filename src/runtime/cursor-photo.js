/**
 * cursor-photo.js — a picture that follows the pointer. Shared by reel and
 * statistics: both keep a stack of photos in a fixed layer over the page and
 * show the one that belongs to whatever the pointer is over.
 *
 * The caller owns the markup: `cursor` is the box the photos stack in (the
 * component's CSS positions it and stacks its children), `pictures` are the
 * children, one per thing that can be pointed at. This module moves the box
 * to the pointer with a short lag, stamps `data-rc-state="active"` on the
 * picture on show, and listens for the pointer only while `within` is on
 * screen. `capable` is the media query that allows a photo at all — a fine
 * pointer that can hover, wide enough a viewport; when it stops matching the
 * photo hides.
 */

import { setState } from "./dom.js";

/** Share of the remaining distance the photo covers per frame. */
const FOLLOW = 0.25;
/** Pixels of remaining distance under which the photo counts as arrived. */
const SETTLED = 0.05;

export function createCursorPhoto({ cursor, pictures, within, capable }) {
  /** Index of the photo on show, -1 for none. */
  let shown = -1;
  /** The photo's box, from its own size; it is centred on the pointer. */
  let width = 0;
  let height = 0;
  /** Where the pointer is and where the photo has got to, viewport px. */
  let target = { x: 0, y: 0 };
  let position = { x: 0, y: 0 };
  /** Whether the pointer has been seen at all; no photo before that. */
  let known = false;
  let frame = 0;
  let listening = false;

  const place = () => {
    cursor.style.translate = `${position.x - width / 2}px ${position.y - height / 2}px`;
  };

  function step() {
    const dx = target.x - position.x;
    const dy = target.y - position.y;
    if (Math.abs(dx) > SETTLED || Math.abs(dy) > SETTLED) {
      position = { x: position.x + dx * FOLLOW, y: position.y + dy * FOLLOW };
      place();
      frame = requestAnimationFrame(step);
      return;
    }
    position = target;
    place();
    frame = 0;
  }
  const wake = () => {
    if (shown >= 0 && !frame) frame = requestAnimationFrame(step);
  };

  const onPointerMove = (event) => {
    target = { x: event.clientX, y: event.clientY };
    known = true;
    wake();
  };

  function listen(on) {
    if (on === listening) return;
    listening = on;
    document[on ? "addEventListener" : "removeEventListener"](
      "pointermove",
      onPointerMove,
      { passive: true },
    );
  }

  function hide() {
    if (shown < 0) return;
    pictures.forEach((picture) => setState(picture, null));
    shown = -1;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  /**
   * Show picture `index` at `point` (viewport px, from the event that chose
   * it) or, without one, where the pointer was last seen. With neither the
   * photo stays hidden: a page scrolling under a resting pointer raises
   * pointerover without any pointermove, and the box would otherwise appear
   * at the viewport's corner.
   */
  function show(index, point) {
    if (!capable.matches) return;
    if (index < 0 || index >= pictures.length) {
      hide();
      return;
    }
    if (point) {
      target = { x: point.x, y: point.y };
      known = true;
    }
    if (!known) return;
    if (index !== shown) {
      pictures.forEach((picture, i) =>
        setState(picture, i === index ? "active" : null),
      );
      // A photo appears where the pointer is, not where the last one was left.
      if (shown < 0) {
        position = target;
        place();
      }
      shown = index;
    }
    wake();
  }

  // The photo's size decides the centring offset; it changes with breakpoints
  // and when the pictures load.
  new ResizeObserver(() => {
    const box = cursor.getBoundingClientRect();
    width = box.width;
    height = box.height;
    if (shown >= 0) place();
  }).observe(cursor);
  // The pointer is watched only while the component is on screen, and a
  // photo never outlives the component's stay there.
  new IntersectionObserver(([entry]) => {
    listen(entry.isIntersecting);
    if (!entry.isIntersecting) hide();
  }).observe(within);
  capable.addEventListener("change", () => {
    if (!capable.matches) hide();
  });

  return { show, hide };
}
