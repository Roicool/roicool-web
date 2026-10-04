/**
 * card-slider.js — a row of cards (a Webflow Collection List) that scrolls
 * sideways, with previous / next buttons and edges that fade out on the
 * side where more cards wait: the "other resources" row under a post.
 *
 * The row is a native scroller with scroll snap, so it works before and
 * without this code: a finger swipes it, Tab scrolls the focused card into
 * view. The code adds what native scrolling does badly or not at all:
 *
 *   - buttons: one page of whole cards per press, switched off
 *     (aria-disabled) at either end;
 *   - trackpad and wheel: a sideways swipe, or Shift + wheel, moves the row
 *     by hand and settles on a card when the gesture (and its momentum)
 *     ends. Vertical gestures stay with the page. Native snapping alone
 *     swallows short swipes and Lenis takes the first, slightly vertical
 *     events of a swipe, so the row takes these itself;
 *   - mouse: grab the row and throw it; it settles on a card;
 *   - keyboard: inside the row, ← → move the focus card by card, Page Up /
 *     Page Down a page, Home / End to the ends; the row follows the focus.
 *     Tab into a card half out of view brings it in;
 *   - a click on a card mostly out of view brings it in first;
 *   - the root says where the row stands — `start`, `middle`, `end`,
 *     `static` when every card fits, `empty` when no card is left — and the
 *     CSS fades the edges from it, so a faded edge always means "there is
 *     more this way". An empty row takes its section with it;
 *   - an optional `progress` part shows how far along the row is.
 *
 * Every gesture ends on a card: past a small threshold it moves on to the
 * next one in its direction, so a short swipe back goes back.
 *
 * No library, no clones, no transforms: the cards stay where the browser
 * put them, and so do their links.
 *
 * Structure and options: README.md in this folder.
 */

import { FOCUSABLE, option, part, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** A press that travels less than this stays a click. */
const DRAG_THRESHOLD = 4;

/** Milliseconds of the release velocity carried into the throw. */
const THROW = 200;

/** Scroll positions this close to an end count as the end. */
const EDGE = 2;

/** Milliseconds without a wheel event that end a wheel gesture. */
const WHEEL_SETTLE = 140;

/** Pixels a wheel gesture travels before its axis is decided. */
const WHEEL_AXIS_LOCK = 24;

/** A gesture past this share of a card moves on to the next one. */
const COMMIT = 0.12;

/** Milliseconds a glide may take before snapping returns regardless. */
const GLIDE_LIMIT = 1200;

/** A clicked card showing less than this share is brought in instead. */
const MOSTLY_VISIBLE = 0.6;

let count = 0;

/** `data-rc-fade`: a length as written, a bare number as a percentage. */
function fadeLength(value) {
  return /^\d+(\.\d+)?$/.test(value) ? `${value}%` : value;
}

/** A URL reduced to its page: origin and path, no trailing slash. */
function samePage(url) {
  const { origin, pathname } = new URL(url, location.href);
  return origin + pathname.replace(/\/+$/, "");
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
  const progress = part(root, "progress");

  // Under a post the list holds that post too: the card that links back to
  // this very page steps out of the row.
  const here = samePage(location.href);
  for (const card of track.children) {
    const link = card.matches("a[href]") ? card : card.querySelector("a[href]");
    if (link && !link.hash && samePage(link.href) === here) card.hidden = true;
  }

  const fade = option(root, "fade");
  if (fade !== null) {
    root.style.setProperty("--rc-card-slider-fade", fadeLength(fade));
  }

  // The buttons say what they move.
  track.id ||= `rc-card-slider-${++count}`;
  for (const button of [previous, next]) {
    button?.setAttribute("aria-controls", track.id);
  }

  const behavior = () => (prefersReducedMotion() ? "auto" : "smooth");
  const maxScroll = () => track.scrollWidth - track.clientWidth;
  const cards = () => Array.from(track.children).filter((card) => !card.hidden);

  /**
   * Geometry in the row's scroll coordinates, measured from the first card:
   * a padded (full-bleed) row lines every card up where the first one
   * starts, not at the viewport's edge. `view` is the window the cards are
   * sized for — the container in full bleed, the row otherwise.
   */
  function measure() {
    const list = cards();
    const style = getComputedStyle(track);
    const view =
      track.clientWidth -
      (Number.parseFloat(style.paddingLeft) || 0) -
      (Number.parseFloat(style.paddingRight) || 0);
    if (list.length === 0) return { list, starts: [], widths: [], view };
    const origin = list[0].getBoundingClientRect().left + track.scrollLeft;
    const boxes = list.map((card) => card.getBoundingClientRect());
    return {
      list,
      starts: boxes.map((box) => box.left + track.scrollLeft - origin),
      widths: boxes.map((box) => box.width),
      view,
    };
  }

  /** Where the row rests with card `index` first in view. */
  const stopFor = (starts, index) =>
    Math.min(Math.max(0, Math.round(starts[index] ?? 0)), maxScroll());

  /** The card that sits first in view at scroll position `x`. */
  function indexAt(starts, x) {
    let best = 0;
    starts.forEach((start, index) => {
      const stop = Math.min(start, maxScroll());
      if (Math.abs(stop - x) < Math.abs(stopFor(starts, best) - x))
        best = index;
    });
    return best;
  }

  /** How many whole cards fit in view — one page. */
  function pageSize({ widths, view }) {
    if (widths.length === 0) return 1;
    const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
    return Math.max(1, Math.floor((view + gap) / (widths[0] + gap)));
  }

  /**
   * Scroll to `left` with snapping held off until the row gets there.
   * Turning snap back on in the same frame as a smooth scroll lets the
   * browser re-snap to the card it was leaving, and the scroll is lost —
   * a short swipe back would never go back.
   */
  let glideToken = 0;
  function glide(left) {
    const token = ++glideToken;
    setState(track, "settling");
    track.scrollTo({ left, behavior: behavior() });
    const started = performance.now();
    const done = () => {
      if (token !== glideToken) return;
      if (track.getAttribute("data-rc-state") === "settling") {
        setState(track, null);
      }
    };
    const check = () => {
      if (token !== glideToken) return;
      const arrived = Math.abs(track.scrollLeft - left) < 1;
      if (arrived || performance.now() - started > GLIDE_LIMIT) done();
      else requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }
  /** A new gesture takes over from a glide still under way. */
  const interrupt = () => {
    glideToken++;
  };

  function scrollToIndex(index) {
    const { starts } = measure();
    if (starts.length === 0) return;
    const clamped = Math.max(0, Math.min(starts.length - 1, index));
    glide(stopFor(starts, clamped));
  }

  /**
   * Where a gesture that started at `from` and stands at `x` comes to rest:
   * the card nearest the projected position, but never back where it
   * started once it has travelled past COMMIT of a card.
   */
  function settle(from, x, projected = x) {
    const { starts, widths } = measure();
    if (starts.length === 0) return;
    const origin = indexAt(starts, from);
    let target = indexAt(starts, projected);
    const moved = x - from;
    const card = widths[origin] || 1;
    if (target === origin && Math.abs(moved) > card * COMMIT) {
      target = origin + Math.sign(moved);
    }
    scrollToIndex(target);
  }

  function step(direction, size = pageSize(measure())) {
    const { starts } = measure();
    scrollToIndex(indexAt(starts, track.scrollLeft) + direction * size);
  }

  /**
   * Bring card `index` fully into view, moving as little as a page needs:
   * going right it lands last in view, going left first.
   */
  function reveal(index) {
    const geometry = measure();
    const { starts, widths, view } = geometry;
    const x = track.scrollLeft;
    const left = starts[index];
    const right = left + widths[index];
    if (left >= x - 1 && right <= x + view + 1) return;
    if (left < x) {
      scrollToIndex(index);
      return;
    }
    scrollToIndex(index - pageSize(geometry) + 1);
  }

  /** The share of card `index` inside the view. */
  function shown(index) {
    const { starts, widths, view } = measure();
    const x = track.scrollLeft;
    const left = Math.max(starts[index], x);
    const right = Math.min(starts[index] + widths[index], x + view);
    return Math.max(0, right - left) / (widths[index] || 1);
  }

  // Where the row stands, written only when it changes.
  let frame = 0;
  function update() {
    frame = 0;
    const max = maxScroll();
    const x = track.scrollLeft;
    const state =
      cards().length === 0
        ? "empty"
        : max <= EDGE
          ? "static"
          : x <= EDGE
            ? "start"
            : x >= max - EDGE
              ? "end"
              : "middle";
    if (root.getAttribute("data-rc-state") !== state) setState(root, state);
    const still = state === "static" || state === "empty";
    previous?.setAttribute("aria-disabled", String(still || state === "start"));
    next?.setAttribute("aria-disabled", String(still || state === "end"));
    if (progress) {
      const { view } = measure();
      const total = view + max;
      root.style.setProperty(
        "--rc-card-slider-progress",
        max > 0 ? (x / max).toFixed(4) : "0",
      );
      root.style.setProperty(
        "--rc-card-slider-visible",
        total > 0 ? Math.min(1, view / total).toFixed(4) : "1",
      );
    }
  }
  const schedule = () => {
    frame ||= requestAnimationFrame(update);
  };
  track.addEventListener("scroll", schedule, { passive: true });
  new ResizeObserver(schedule).observe(track);
  update();

  // Buttons.
  const press = (button, direction) =>
    button?.addEventListener("click", (event) => {
      event.preventDefault();
      if (button.getAttribute("aria-disabled") === "true") return;
      step(direction);
    });
  press(previous, -1);
  press(next, 1);

  // Keyboard, inside the row: the focus moves card by card and the row
  // follows it. On the buttons the arrows move the row itself.
  root.addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey) return;
    if (event.metaKey) return;
    const inRow = track.contains(event.target);
    const onButton = event.target === previous || event.target === next;
    if (!inRow && !onButton) return;
    const { list, starts } = measure();
    if (list.length === 0) return;
    const page = pageSize(measure());
    const focused = list.findIndex((card) => card.contains(event.target));
    const from = focused >= 0 ? focused : indexAt(starts, track.scrollLeft);
    const moves = {
      ArrowRight: from + 1,
      ArrowLeft: from - 1,
      PageDown: from + page,
      PageUp: from - page,
      Home: 0,
      End: list.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const index = Math.max(0, Math.min(list.length - 1, moves[event.key]));
    if (inRow) {
      const target = list[index].matches(FOCUSABLE)
        ? list[index]
        : list[index].querySelector(FOCUSABLE);
      target?.focus({ preventScroll: true });
      reveal(index);
    } else {
      scrollToIndex(index - (event.key === "End" ? page - 1 : 0));
    }
  });

  // Tab into a card half out of view: bring it in. A mouse press focuses
  // the link too; that one is the click's business, not this.
  track.addEventListener("focusin", (event) => {
    if (!event.target.matches(":focus-visible")) return;
    const index = cards().findIndex((card) => card.contains(event.target));
    if (index >= 0) reveal(index);
  });

  const drag = initDrag(track, settle, interrupt);

  // A click on a card mostly out of view brings it in instead of leaving.
  track.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.detail === 0 || drag.justDragged()) {
      return;
    }
    const index = cards().findIndex((card) => card.contains(event.target));
    if (index < 0 || shown(index) >= MOSTLY_VISIBLE) return;
    event.preventDefault();
    reveal(index);
  });

  initWheel(track, settle, maxScroll, interrupt);
}

/**
 * Trackpad and wheel. A gesture whose first few pixels run sideways (or
 * any Shift + wheel) belongs to the row: snapping waits, the row follows
 * the fingers and the momentum, and when the events stop it settles on a
 * card. A gesture that starts vertical belongs to the page and is left
 * alone. The row's events never reach Lenis, which would otherwise take the
 * slightly vertical ones that open most sideways swipes.
 */
function initWheel(track, settle, maxScroll, interrupt) {
  let axis = null;
  let sumX = 0;
  let sumY = 0;
  let from = 0;
  let timer = 0;
  let moving = false;

  const end = () => {
    timer = 0;
    axis = null;
    sumX = sumY = 0;
    if (!moving) return;
    moving = false;
    settle(from, track.scrollLeft);
  };

  track.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return; // pinch zoom
      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? track.clientWidth
            : 1;
      let dx = event.deltaX * unit;
      let dy = event.deltaY * unit;
      if (event.shiftKey && dx === 0) {
        dx = dy;
        dy = 0;
      }
      clearTimeout(timer);
      timer = setTimeout(end, WHEEL_SETTLE);

      // The axis is the one the gesture has mostly travelled on: decided
      // after a few pixels, and a gesture taken for vertical turns sideways
      // if it keeps going that way (trackpad swipes often open slightly
      // vertical). Once sideways it stays sideways.
      sumX += dx;
      sumY += dy;
      if (axis !== "x") {
        const travelled = Math.max(Math.abs(sumX), Math.abs(sumY));
        if (Math.abs(sumX) > Math.abs(sumY)) {
          if (travelled >= WHEEL_AXIS_LOCK || axis === null) axis = "x";
        } else if (travelled >= WHEEL_AXIS_LOCK) {
          axis = "y";
        }
      }
      if (axis !== "x" || maxScroll() <= EDGE) return;

      event.preventDefault();
      event.stopPropagation();
      if (!moving) {
        moving = true;
        interrupt();
        from = track.scrollLeft;
        setState(track, "wheeling");
      }
      track.scrollLeft += dx;
    },
    { passive: false },
  );
}

/**
 * A mouse can grab the row: it follows the pointer with snapping off, and
 * on release it is thrown by the last velocity and settles on a card.
 * Touch and pens scroll natively and never come here. A press that never
 * travels is a click; the click after a drag is swallowed.
 */
function initDrag(track, settle, interrupt) {
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
    swallowClick = false;
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
      interrupt();
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
    settle(startScroll, track.scrollLeft, track.scrollLeft - velocity * THROW);
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

  return { justDragged: () => swallowClick };
}
