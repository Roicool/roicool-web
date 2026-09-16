/**
 * carousel.js — a looping, draggable row of cards over a Webflow Collection
 * List: one card centred at a time, its neighbours peeking in at both edges.
 *
 * Webflow allows nothing between Wrapper › List › Item, so the root is the
 * Wrapper, the track is the List and the cards are the Items. The strip is
 * an endless loop: the code clones the items (aria-hidden) until the strip
 * comfortably covers the viewport, then moves every card with a transform
 * and wraps the ones that leave one side round to the other.
 *
 * Moving it: autoplay steps to the next card on an interval; a press and a
 * drag (mouse or finger) scrubs it and a release glides to the nearest card;
 * a horizontal wheel or trackpad swipe does the same; keyboard focus inside
 * a card centres that card. Hover, focus, a press and a hidden tab pause the
 * autoplay. No arrows, by design.
 *
 * Without JavaScript, or with reduced motion, the code does nothing and the
 * CSS leaves a plain, horizontally scrollable, snapping row.
 *
 * Structure and options: README.md in this folder.
 */

import {
  part,
  flagOption,
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Seconds between autoplay steps when `data-rc-interval` is not set. */
const DEFAULT_INTERVAL = 4;

/** Seconds one step takes when `data-rc-duration` is not set. */
const DEFAULT_DURATION = 0.8;

/** A press that travels less than this stays a click. */
const DRAG_THRESHOLD = 4;

/** Milliseconds of the release velocity carried into the glide. */
const GLIDE = 250;

/** Milliseconds after the last wheel event before the strip settles. */
const WHEEL_SETTLE = 120;

/** The loop is cloned until it covers at least this many pixels plus a card. */
const MINIMUM_COVER = 1920;

const easeOut = (t) => 1 - (1 - t) ** 3;

/** `value` folded into [min, max). */
function wrap(value, min, max) {
  const range = max - min;
  return ((((value - min) % range) + range) % range) + min;
}

function findTrack(root) {
  // Explicit part first; fall back to Webflow's own list class so a plain
  // Collection List works with a single attribute on the wrapper.
  return part(root, "track") ?? root.querySelector(":scope > .w-dyn-items");
}

/** A visual copy that assistive tech and the keyboard never reach. */
function cloneItem(item) {
  const copy = item.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  copy.setAttribute("data-rc-clone", "");
  for (const el of copy.querySelectorAll("[id]")) el.removeAttribute("id");
  for (const el of copy.querySelectorAll("a, button, input, [tabindex]")) {
    el.setAttribute("tabindex", "-1");
  }
  return copy;
}

export default function carousel(root) {
  const track = findTrack(root);
  if (!track) {
    warn(
      'carousel needs a [data-rc-part="track"] (the Collection List).',
      root,
    );
    return;
  }
  const originals = Array.from(track.children);
  // An empty collection renders Webflow's .w-dyn-empty instead of items.
  if (originals.length === 0) return;
  if (prefersReducedMotion()) return;

  const interval = numberOption(root, "interval", DEFAULT_INTERVAL) * 1000;
  const duration = numberOption(root, "duration", DEFAULT_DURATION) * 1000;
  const autoplay =
    option(root, "autoplay") === null || flagOption(root, "autoplay");

  const gap = () => Number.parseFloat(getComputedStyle(track).columnGap) || 0;

  // Clone whole sets until the strip covers a wide viewport plus one card:
  // then a card leaving one edge can always be wrapped to the other unseen.
  const first = originals[0];
  const last = originals[originals.length - 1];
  const setWidth =
    last.offsetLeft - first.offsetLeft + last.offsetWidth + gap();
  const widest = Math.max(...originals.map((el) => el.offsetWidth));
  const cover = Math.max(root.getBoundingClientRect().width, MINIMUM_COVER);
  const copies = Math.min(
    8,
    Math.max(1, Math.ceil((cover + widest) / setWidth)),
  );
  for (let copy = 1; copy < copies; copy++) {
    for (const item of originals) track.append(cloneItem(item));
  }

  const items = Array.from(track.children);
  const count = originals.length;

  // Geometry, in px, relative to the root's left edge: where each card sits
  // in the untransformed layout, how wide it is, and the length of one loop.
  const positions = [];
  const widths = [];
  const shifts = items.map(() => 0);
  let loopWidth = 0;
  let spacing = 0;
  let rootWidth = 0;

  /** How far the strip has moved to the left. Any real number; wraps. */
  let offset = 0;
  /** Index (into items, clones included) of the centred card. */
  let current = 0;

  function render() {
    items.forEach((item, i) => {
      const min = positions[0] - widths[i] - spacing;
      const shown = wrap(positions[i] - offset, min, min + loopWidth);
      shifts[i] = shown - positions[i];
      item.style.transform = `translate3d(${shifts[i]}px, 0, 0)`;
    });
  }

  function measure() {
    const rootRect = root.getBoundingClientRect();
    rootWidth = rootRect.width;
    spacing = gap();
    items.forEach((item, i) => {
      const rect = item.getBoundingClientRect();
      positions[i] = rect.left - rootRect.left - shifts[i];
      widths[i] = rect.width;
    });
    const end = items.length - 1;
    loopWidth = positions[end] + widths[end] + spacing - positions[0];
  }

  /** The offset that centres card `i`, at the loop repeat nearest `near`. */
  function centreOf(i, near) {
    const centre = positions[i] + widths[i] / 2 - rootWidth / 2;
    return centre + Math.round((near - centre) / loopWidth) * loopWidth;
  }

  /** The card whose centre is nearest to the offset `near`, and that offset. */
  function nearest(near) {
    let index = 0;
    let target = 0;
    let best = Infinity;
    items.forEach((item, i) => {
      const candidate = centreOf(i, near);
      const distance = Math.abs(candidate - near);
      if (distance < best) {
        best = distance;
        index = i;
        target = candidate;
      }
    });
    return { index, target };
  }

  function markActive() {
    items.forEach((item, i) => {
      if (i % count === current % count)
        item.setAttribute("data-rc-active", "");
      else item.removeAttribute("data-rc-active");
    });
  }

  // Motion: one tween at a time, on the offset, rendered every frame.
  let frame = 0;
  function animateTo(target, ms, done) {
    cancelAnimationFrame(frame);
    const from = offset;
    const start = performance.now();
    const step = (now) => {
      const t = ms > 0 ? Math.min(1, (now - start) / ms) : 1;
      offset = from + (target - from) * easeOut(t);
      render();
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      offset = wrap(offset, 0, loopWidth);
      done?.();
    };
    frame = requestAnimationFrame(step);
  }

  // Autoplay, and why it is not running right now; empty means it runs.
  const holds = new Set();
  let timer = 0;
  let dragging = false;

  function sync() {
    setState(root, dragging ? "dragging" : holds.size ? "paused" : "running");
  }
  function schedule() {
    clearTimeout(timer);
    if (!autoplay || holds.size) return;
    timer = setTimeout(() => goTo(current + 1, duration), interval);
  }
  function hold(reason) {
    holds.add(reason);
    clearTimeout(timer);
    sync();
  }
  function release(reason) {
    holds.delete(reason);
    sync();
    schedule();
  }

  function goTo(index, ms) {
    current = wrap(index, 0, items.length);
    markActive();
    animateTo(centreOf(current, offset), ms, schedule);
  }

  /** Come to rest on the card nearest `near`, then resume autoplay. */
  function settle(near, ms) {
    const rest = nearest(near);
    current = rest.index;
    markActive();
    animateTo(rest.target, ms, schedule);
  }

  new ResizeObserver(() => {
    // Cards resize as images arrive and breakpoints change; keep the
    // centred card centred.
    measure();
    offset = centreOf(current, offset);
    render();
  }).observe(track);
  measure();
  offset = centreOf(0, 0);
  render();
  markActive();
  sync();
  schedule();

  // Hover pause is for mice only; a finger is a press, not a hover.
  root.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") hold("hover");
  });
  root.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") release("hover");
  });

  // Keyboard focus inside a card centres it and holds the strip still. Only
  // visible focus counts: a mouse press also focuses the link underneath,
  // and that must not freeze the autoplay afterwards.
  root.addEventListener("focusin", (event) => {
    // Browsers without overflow: clip would scroll the wrapper to reveal the
    // focused card; undo that, the centring below takes care of it.
    root.scrollLeft = 0;
    track.scrollLeft = 0;
    if (!event.target.matches(":focus-visible")) return;
    hold("focus");
    const index = items.findIndex((item) => item.contains(event.target));
    if (index >= 0 && index !== current) goTo(index, duration / 2);
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) release("focus");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) hold("hidden");
    else release("hidden");
  });

  // Drag: a press stops the strip, moving scrubs it, a release glides to the
  // nearest card. Links inside keep working — a press that never travels is
  // a click, and the first click after a drag is swallowed.
  let pointerId = null;
  let startX = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let dragged = false;

  root.addEventListener("dragstart", (event) => event.preventDefault());
  root.addEventListener(
    "click",
    (event) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  root.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    lastTime = event.timeStamp;
    velocity = 0;
    dragged = false;
    cancelAnimationFrame(frame);
    hold("drag");
  });
  root.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    if (!dragged) {
      if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD) return;
      dragged = true;
      dragging = true;
      // Captured only once it is a drag, so a plain click still reaches the
      // link under the pointer.
      root.setPointerCapture(pointerId);
      sync();
    }
    const dx = event.clientX - lastX;
    const dt = Math.max(1, event.timeStamp - lastTime);
    offset -= dx;
    render();
    velocity = dx / dt;
    lastX = event.clientX;
    lastTime = event.timeStamp;
  });
  function endDrag(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    dragging = false;
    holds.delete("drag");
    sync();
    settle(offset - velocity * GLIDE, duration * 0.75);
  }
  root.addEventListener("pointerup", endDrag);
  root.addEventListener("pointercancel", endDrag);

  // A horizontal wheel or trackpad swipe scrubs the strip; it settles on the
  // nearest card once the gesture stops. Vertical deltas stay with the page.
  let wheelTimer = 0;
  root.addEventListener(
    "wheel",
    (event) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      cancelAnimationFrame(frame);
      if (!holds.has("wheel")) hold("wheel");
      offset += event.deltaX;
      render();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(() => {
        holds.delete("wheel");
        sync();
        settle(offset, duration / 2);
      }, WHEEL_SETTLE);
    },
    { passive: false },
  );
}
