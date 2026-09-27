/**
 * card-stack.js — a column of cards (a service each: a title, a line or
 * two, a picture) that stack as the page scrolls. The column pins, each card
 * slides up to sit under the heading strips of the ones before it, and of a
 * card that has been passed only its heading strip stays in view — the
 * strips pile up like the tabs of a card index while the newest card reads
 * in full.
 *
 * Reconstructed from riseatseven.com/services "Our Services", with one
 * change: the pile is capped. riseatseven keeps every strip, and with eight
 * cards the pile eats most of the viewport and pushes the card being read
 * below the fold. Here at most `data-rc-visible` strips (three) stay in the
 * window: when a further card arrives the oldest strip slides out of the
 * window's top edge, so the card being read always starts the same distance
 * from the top. If even that does not fit the viewport the cap drops by
 * itself, and when nothing fits the column is left static.
 *
 * The pin is `position: sticky` on the list's wrapper (card-stack.css),
 * sized to fill the viewport below the pin line so the next card shows at
 * its bottom edge; the wrapper's parent is given the scroll distance as its
 * height on top of that, and every
 * card's place is written from the scroll position each frame — no scroll
 * library, no timeline, a change of direction runs the same path backwards.
 * Wide screens only; narrow screens, reduced motion and no JavaScript get
 * the plain column.
 *
 * Structure and options: README.md in this folder.
 */

import { part, parts, numberOption, setState } from "../../runtime/dom.js";
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
} from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Pixels from the top of the viewport the window pins at. `data-rc-top`. */
const DEFAULT_TOP = 0;
/** Heading strips kept in view above the card being read. `data-rc-visible`. */
const DEFAULT_VISIBLE = 3;
/**
 * Scroll pixels a card rests in the reading position before the next one
 * starts moving — reading time, so the stack does not race. `data-rc-hold`.
 */
const DEFAULT_HOLD = 200;
/** Below this viewport width nothing stacks. `data-rc-min-width`. */
const DEFAULT_MINIMUM_WIDTH = 992;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function cardStack(root) {
  const body = part(root, "body");
  const stack = part(root, "stack");
  const cards = parts(root, "card");
  if (!body || !stack || cards.length < 2) {
    warn(
      'card-stack needs [data-rc-part="body"] > [data-rc-part="stack"] and at least two [data-rc-part="card"] elements.',
      root,
    );
    return;
  }
  // The strip that stays in view is the card's top down to its heading's
  // bottom edge; a card without a heading part keeps its first child.
  const headings = cards.map(
    (card) => parts(card, "heading")[0] ?? card.firstElementChild ?? card,
  );
  const last = cards.length - 1;

  const top = numberOption(root, "top", DEFAULT_TOP);
  const visible = Math.max(
    0,
    Math.round(numberOption(root, "visible", DEFAULT_VISIBLE)),
  );
  const hold = Math.max(0, numberOption(root, "hold", DEFAULT_HOLD));
  const wide = window.matchMedia(
    `(min-width: ${numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH)}px)`,
  );
  root.style.setProperty("--rc-card-stack-top", `${top}px`);

  // ---- Geometry, from the last measure ----------------------------------

  /** Column travel (pixels the cards have moved up) at which card i sits in its slot. */
  let offsets = [];
  /** How far the whole pile has been pushed up once card i is in its slot. */
  let shifts = [];
  /** Scroll pixels the pin lasts: the last card's travel plus every hold. */
  let distance = 0;
  /** Stacking is on: wide screen, motion allowed, the window fits. */
  let active = false;
  let onScreen = false;
  /** What each card last rendered as, so the DOM is only written on change. */
  let rendered = cards.map(() => ({ y: NaN, state: "" }));

  /** Every card back in the column, inline sizes gone. */
  function clear() {
    for (const card of cards) {
      card.style.translate = "";
      setState(card, null);
    }
    stack.style.height = "";
    body.style.height = "";
    rendered = cards.map(() => ({ y: NaN, state: "" }));
  }

  /**
   * Measure the column at rest and work out the stack: where each card
   * sits once stacked (under the strips of the cards before it), how far it
   * travels to get there, and how tall the window has to be. The cap on the
   * pile drops until the window fits the viewport.
   */
  function measure() {
    for (const card of cards) card.style.translate = "";
    const first = cards[0].getBoundingClientRect().top;
    const tops = [];
    const heights = [];
    const strips = [];
    cards.forEach((card, i) => {
      const box = card.getBoundingClientRect();
      tops.push(box.top - first);
      heights.push(box.height);
      strips.push(
        Math.max(1, headings[i].getBoundingClientRect().bottom - box.top),
      );
    });
    // A card's slot, before any push-up: the strips of the cards before it.
    const slots = [];
    let sum = 0;
    for (const strip of strips) {
      slots.push(sum);
      sum += strip;
    }
    offsets = tops.map((t, i) => Math.max(0, t - slots[i]));
    // Every card but the last rests for `hold` once it is in place.
    distance = offsets[last] + hold * last;

    const room = window.innerHeight - top;
    let cap = visible;
    let height = 0;
    for (;;) {
      // Once card k is in its slot, the strips older than the last `cap`
      // are out of the window: the pile is pushed up by their height.
      shifts = cards.map((_, k) => slots[Math.max(0, k - cap)]);
      height = Math.max(
        ...cards.map((_, k) => slots[k] - shifts[k] + heights[k]),
      );
      if (height <= room || cap === 0) break;
      cap -= 1;
    }
    return { room, fits: height <= room };
  }

  /**
   * Scroll pixels into the pin → pixels the column has travelled. The column
   * moves with the page, except that it stands still for `hold` pixels each
   * time a card lands.
   */
  function travelled(scrolled) {
    let p = 0;
    for (let i = 1; i <= last; i += 1) {
      // Card i lands when the column has travelled offsets[i]; the scroll
      // needed for that is the travel plus the holds of the cards before.
      const lands = offsets[i] + hold * (i - 1);
      if (scrolled <= lands) return scrolled - hold * (i - 1);
      if (scrolled <= lands + hold) return offsets[i];
      p = offsets[i];
    }
    return p;
  }

  /** Write every card's place for the current scroll position. */
  let scheduled = false;
  function tick() {
    scheduled = false;
    if (!active || !onScreen) return;
    const scrolled = clamp(top - body.getBoundingClientRect().top, 0, distance);
    const p = travelled(scrolled);
    // The card arriving now is the first one not yet in its slot; while it
    // travels, the pile's push-up runs from the previous card's to its own.
    const arriving = offsets.findIndex((offset) => offset > p);
    let shift;
    if (arriving < 0) shift = shifts[last];
    else if (arriving === 0) shift = 0;
    else {
      const span = offsets[arriving] - offsets[arriving - 1];
      const fraction = span > 0 ? (p - offsets[arriving - 1]) / span : 1;
      shift =
        shifts[arriving - 1] +
        (shifts[arriving] - shifts[arriving - 1]) * fraction;
    }
    const current = arriving < 0 ? last : arriving - 1;
    cards.forEach((card, i) => {
      const y = Math.round(-(Math.min(p, offsets[i]) + shift) * 100) / 100;
      const state =
        i < current
          ? "stacked"
          : i === current
            ? "active"
            : i === arriving
              ? "entering"
              : null;
      const was = rendered[i];
      if (y !== was.y) card.style.translate = y ? `0 ${y}px` : "";
      if (state !== was.state) setState(card, state);
      rendered[i] = { y, state };
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(tick);
  }

  /** The layout changed (load, resize, a breakpoint, fonts): measure anew. */
  function layout() {
    if (!wide.matches || prefersReducedMotion()) {
      active = false;
      clear();
      setState(root, "static");
      return;
    }
    const { room, fits } = measure();
    if (!fits || distance <= 0) {
      active = false;
      clear();
      setState(root, "static");
      return;
    }
    active = true;
    // The window fills the viewport below the pin line, as in the source:
    // the pile and the card being read take its top, and the next card is
    // seen waiting at its bottom edge before it rises.
    stack.style.height = `${room}px`;
    body.style.height = `${room + distance}px`;
    rendered = cards.map(() => ({ y: NaN, state: "" }));
    setState(root, "stacking");
    tick();
  }

  // Keyboard: a card that takes visible focus is brought to the reading
  // position, so a stacked card is never read half-covered.
  root.addEventListener("focusin", (event) => {
    if (!active || !event.target.matches(":focus-visible")) return;
    const index = cards.findIndex((card) => card.contains(event.target));
    if (index < 0) return;
    // Rounded up: a scroll position lands on whole pixels, and a fraction
    // short would leave the card "entering" instead of in its slot.
    const target = Math.ceil(
      window.scrollY +
        body.getBoundingClientRect().top -
        top +
        offsets[index] +
        hold * Math.max(0, index - 1),
    );
    window.scrollTo({ top: target, behavior: "instant" });
    schedule();
  });

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) schedule();
    },
    { threshold: 0 },
  ).observe(root);
  // Pictures and fonts arriving change the cards' heights.
  const observer = new ResizeObserver(() => layout());
  for (const card of cards) observer.observe(card);
  document.fonts?.ready.then(layout);
  wide.addEventListener("change", layout);
  onMotionPreferenceChange(layout);
  window.addEventListener("resize", layout);
  window.addEventListener("scroll", schedule, { passive: true });

  layout();
}
