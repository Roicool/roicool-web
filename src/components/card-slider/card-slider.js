/**
 * card-slider.js — a row of cards (a Webflow Collection List) that scrolls
 * sideways, with previous / next buttons and edges that fade out on the
 * side where more cards wait: the "other resources" row under a post.
 *
 * The row is a native scroller with scroll snap, so it works before and
 * without this code: a finger swipes it, a trackpad slides it, Tab scrolls
 * the focused card into view. The code adds what native scrolling lacks:
 *
 *   - the buttons step one page of whole cards at a time and switch off
 *     (aria-disabled) at either end;
 *   - a mouse can grab the row and throw it; it settles on a card;
 *   - the root says where the row stands — `start`, `middle`, `end`, or
 *     `static` when every card fits — and the CSS fades the edges from it,
 *     so a faded edge always means "there is more this way".
 *
 * No library, no clones, no transforms: the cards stay where the browser
 * put them, and so do their links.
 *
 * Structure and options: README.md in this folder.
 */

import { option, part, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** A press that travels less than this stays a click. */
const DRAG_THRESHOLD = 4;

/** Milliseconds of the release velocity carried into the throw. */
const THROW = 200;

/** Scroll positions this close to an end count as the end. */
const EDGE = 2;

/** `data-rc-fade`: a length as written, a bare number as a percentage. */
function fadeLength(value) {
  return /^\d+(\.\d+)?$/.test(value) ? `${value}%` : value;
}

/**
 * The Collection List. Webflow allows nothing between Wrapper › List ›
 * Item, so the List itself scrolls; without the part written, the Webflow
 * list inside the root is stamped as the part (the CSS selects it that way).
 */
function findTrack(root) {
  const track = part(root, "track");
  if (track) return track;
  const list = root.querySelector(".w-dyn-items");
  list?.setAttribute("data-rc-part", "track");
  return list;
}

export default function cardSlider(root) {
  const track = findTrack(root);
  if (!track) {
    warn(
      'card-slider needs a [data-rc-part="track"] (the Collection List).',
      root,
    );
    return;
  }
  const previous = part(root, "previous");
  const next = part(root, "next");

  const fade = option(root, "fade");
  if (fade !== null) {
    root.style.setProperty("--rc-card-slider-fade", fadeLength(fade));
  }
  // A sideways wheel or trackpad swipe scrolls the row natively; Lenis keeps
  // the vertical ones for the page.
  track.setAttribute("data-lenis-prevent-horizontal", "");

  const behavior = () => (prefersReducedMotion() ? "auto" : "smooth");
  const maxScroll = () => track.scrollWidth - track.clientWidth;

  /** Where each card starts, in the track's scroll coordinates. */
  function stops() {
    const origin = track.getBoundingClientRect().left - track.scrollLeft;
    const max = maxScroll();
    const positions = Array.from(track.children, (card) =>
      Math.min(card.getBoundingClientRect().left - origin, max),
    );
    return [...new Set(positions.map(Math.round))].sort((a, b) => a - b);
  }

  /** How many whole cards fit side by side — one page. */
  function pageSize() {
    const first = track.children[0];
    if (!first) return 1;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    const card = first.getBoundingClientRect().width + gap;
    return Math.max(1, Math.floor((track.clientWidth + gap) / card));
  }

  function nearestStop(position) {
    return stops().reduce((best, stop) =>
      Math.abs(stop - position) < Math.abs(best - position) ? stop : best,
    );
  }

  function step(direction) {
    const list = stops();
    if (list.length === 0) return;
    const here = nearestStop(track.scrollLeft);
    const index = list.indexOf(here);
    const target =
      list[
        Math.max(0, Math.min(list.length - 1, index + direction * pageSize()))
      ];
    track.scrollTo({ left: target, behavior: behavior() });
  }

  // Where the row stands, written only when it changes.
  let frame = 0;
  function update() {
    frame = 0;
    const max = maxScroll();
    const x = track.scrollLeft;
    const state =
      max <= EDGE
        ? "static"
        : x <= EDGE
          ? "start"
          : x >= max - EDGE
            ? "end"
            : "middle";
    if (root.getAttribute("data-rc-state") !== state) setState(root, state);
    const atStart = state === "static" || state === "start";
    const atEnd = state === "static" || state === "end";
    previous?.setAttribute("aria-disabled", String(atStart));
    next?.setAttribute("aria-disabled", String(atEnd));
  }
  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };
  track.addEventListener("scroll", schedule, { passive: true });
  new ResizeObserver(schedule).observe(track);
  update();

  const press = (button, direction) =>
    button?.addEventListener("click", (event) => {
      event.preventDefault();
      if (button.getAttribute("aria-disabled") === "true") return;
      step(direction);
    });
  press(previous, -1);
  press(next, 1);

  initDrag(track, nearestStop, behavior);
}

/**
 * A mouse can grab the row: it follows the pointer with snapping off, and
 * on release it is thrown by the last velocity and settles on the nearest
 * card. Touch and pens scroll natively and never come here. A press that
 * never travels is a click; the click after a drag is swallowed.
 */
function initDrag(track, nearestStop, behavior) {
  let pointerId = null;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let dragging = false;
  let swallowClick = false;

  track.addEventListener("dragstart", (event) => event.preventDefault());

  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startScroll = track.scrollLeft;
    lastTime = event.timeStamp;
    velocity = 0;
    dragging = false;
  });

  track.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      dragging = true;
      track.setPointerCapture(pointerId);
      setState(track, "dragging");
    }
    const elapsed = event.timeStamp - lastTime;
    if (elapsed > 0) velocity = (event.clientX - lastX) / elapsed;
    lastX = event.clientX;
    lastTime = event.timeStamp;
    track.scrollLeft = startScroll - dx;
  });

  const release = (event) => {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    if (!dragging) return;
    dragging = false;
    swallowClick = true;
    // A pause before letting go means no throw.
    if (event.timeStamp - lastTime > 80) velocity = 0;
    const target = nearestStop(track.scrollLeft - velocity * THROW);
    setState(track, null);
    track.scrollTo({ left: target, behavior: behavior() });
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", release);

  track.addEventListener(
    "click",
    (event) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );
  // A drag that ends outside any link leaves no click to swallow.
  track.addEventListener("pointerdown", () => {
    swallowClick = false;
  });
}
