/**
 * image-trail.js — a stack of picture cards that chases the pointer across a
 * section: the lead card follows the cursor, every card behind it follows
 * the one in front, so the stack fans out into a lagging trail as the
 * pointer moves and gathers back when it stops.
 *
 * The root is the area the pointer is tracked over (the section). The cards
 * are `item` parts inside a `trail` part that covers the root. The code owns
 * their position only — written as the `translate` property, so the CSS
 * reveal (scale + clip-path on `idle` → `active`) composes with it instead
 * of fighting over `transform`.
 *
 * Nothing runs unless the device has a fine pointer that can hover and the
 * viewport is at least `data-rc-min-width` wide, and nothing runs under
 * prefers-reduced-motion: the root is stamped `static` and the CSS lays the
 * cards out as a still fan, which is also what shows without JavaScript.
 * The animation loop runs only while a card is still on its way; the pointer
 * is watched only while the root is on screen.
 *
 * Structure and options: README.md in this folder.
 */

import { parts, numberOption, setState } from "../../runtime/dom.js";
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
} from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Share of the remaining distance the lead card covers per frame. */
const DEFAULT_LEAD = 0.25;
/** Share of the remaining distance each following card covers per frame. */
const DEFAULT_FOLLOW = 0.16;
/** Below this viewport width the effect stays off. `data-rc-min-width`. */
const DEFAULT_MINIMUM_WIDTH = 992;
/** Pixels of remaining distance under which a card counts as arrived. */
const SETTLED = 0.05;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export default function imageTrail(root) {
  const items = parts(root, "item");
  if (items.length === 0) {
    warn('image-trail needs at least one [data-rc-part="item"].', root);
    return;
  }
  const lead = numberOption(root, "lead", DEFAULT_LEAD);
  const follow = numberOption(root, "follow", DEFAULT_FOLLOW);
  const minimumWidth = numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH);
  const capable = window.matchMedia(
    `${FINE_POINTER} and (min-width: ${minimumWidth}px)`,
  );

  // The lead card paints on top, each follower one step below it.
  const cards = items.map((element, index) => {
    element.style.zIndex = String(items.length - index);
    return { element, x: 0, y: 0, width: 0, height: 0 };
  });

  /** The effect is on: sizes measured, states stamped, listeners allowed. */
  let running = false;
  /** Pointer listeners are attached (only while the root is on screen). */
  let listening = false;
  let onScreen = false;
  /** The pointer is over the root. */
  let inside = false;
  /** Last pointer position in viewport coordinates, if any. */
  let last = null;
  /** Where the lead card is heading, in root coordinates. */
  let target = { x: 0, y: 0 };
  let frame = 0;

  const measure = () => {
    cards.forEach((card) => {
      card.width = card.element.offsetWidth;
      card.height = card.element.offsetHeight;
    });
  };

  // The card's centre sits on (x, y): offset by half its size, since the
  // CSS reveal scales about the centre and a percentage translate would
  // drift with the scale.
  const place = (card) => {
    card.element.style.translate = `${card.x - card.width / 2}px ${card.y - card.height / 2}px`;
  };

  function step() {
    let moving = false;
    cards.forEach((card, index) => {
      const goal = index === 0 ? target : cards[index - 1];
      const ease = index === 0 ? lead : follow;
      const dx = goal.x - card.x;
      const dy = goal.y - card.y;
      if (Math.abs(dx) > SETTLED || Math.abs(dy) > SETTLED) moving = true;
      card.x += dx * ease;
      card.y += dy * ease;
      place(card);
    });
    frame = moving ? requestAnimationFrame(step) : 0;
  }
  const wake = () => {
    if (!frame) frame = requestAnimationFrame(step);
  };

  // Inside or out is decided from the last pointer position against the
  // root's box, not from enter/leave events: the page scrolls under a still
  // pointer too.
  function track() {
    if (!last) return;
    const box = root.getBoundingClientRect();
    const within =
      last.x >= box.left &&
      last.x <= box.right &&
      last.y >= box.top &&
      last.y <= box.bottom;
    if (within) {
      target = { x: last.x - box.left, y: last.y - box.top };
      wake();
    }
    if (within !== inside) {
      inside = within;
      setState(root, inside ? "active" : "idle");
    }
  }
  const onPointerMove = (event) => {
    last = { x: event.clientX, y: event.clientY };
    track();
  };
  const onScroll = () => track();

  function listen(on) {
    if (on === listening) return;
    listening = on;
    const method = on ? "addEventListener" : "removeEventListener";
    document[method]("pointermove", onPointerMove, { passive: true });
    window[method]("scroll", onScroll, { passive: true });
    if (!on && inside) {
      inside = false;
      setState(root, "idle");
    }
  }

  function start() {
    if (running) return;
    running = true;
    measure();
    // The stack waits gathered at the centre and flies out to the pointer
    // on its first visit.
    const box = root.getBoundingClientRect();
    target = { x: box.width / 2, y: box.height / 2 };
    cards.forEach((card) => {
      card.x = target.x;
      card.y = target.y;
      place(card);
    });
    setState(root, "idle");
    listen(onScreen);
    track();
  }

  function stop() {
    if (running) {
      running = false;
      listen(false);
      cancelAnimationFrame(frame);
      frame = 0;
      cards.forEach((card) => {
        card.element.style.translate = "";
      });
    }
    setState(root, "static");
  }

  const decide = () => {
    if (capable.matches && !prefersReducedMotion()) start();
    else stop();
  };
  capable.addEventListener("change", decide);
  onMotionPreferenceChange(decide);

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (running) listen(onScreen);
  }).observe(root);

  // Card sizes decide the centring offset; they change with breakpoints.
  new ResizeObserver(() => {
    measure();
    if (running) cards.forEach(place);
  }).observe(items[0]);

  decide();
}
