/**
 * reel.js — a column of rows (a figure, a caption, a logo) that keeps
 * rolling upward, and a photo that follows the pointer while a row is under
 * it. Every row is a link to its case. The rows and the photos are two
 * Collection Lists from the same collection with the same sort, filter and
 * limit, so the n-th photo belongs to the n-th row; nothing is generated
 * here.
 *
 * Reconstructed from riseatseven.com/about's "Awards" list.
 *
 * The roll is a CSS animation on the track and its copies (reel.css): the
 * marquee's strip turned vertical. The code clones the track as many times
 * as it takes to fill the strip, measures one track's height for the
 * keyframes and drives the play state through runtime/loop.js. Pointing at
 * a row eases the roll to a stop — the rows are links, nobody chases a
 * moving one — marks that row current, which dims the others (CSS), and
 * shows the row's photo at the pointer, where it follows with a short lag.
 * Keyboard focus on a row stops the roll and marks the row the same way,
 * without a photo. The photo needs a fine pointer that can hover and a wide
 * viewport; touch and narrow screens get the roll and the links alone.
 *
 * The photos live outside the strip on purpose: the track is transformed
 * and the strip clips, so a fixed-position photo inside a row would be
 * pinned to the moving row and cut at the strip's edge.
 *
 * Without JavaScript both lists are plain, static and fully visible. With
 * reduced motion nothing rolls and no photo follows; the rows still light
 * up under the pointer.
 *
 * Structure and options: README.md in this folder.
 */

import {
  FOCUSABLE,
  part,
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { createLoop } from "../../runtime/loop.js";
import { scan } from "../../runtime/registry.js";
import { warn } from "../../runtime/log.js";

/** Pixels per second the rows roll at. `data-rc-speed`. */
const DEFAULT_SPEED = 30;
/** Below this viewport width no photo follows. `data-rc-min-width`. */
const DEFAULT_MINIMUM_WIDTH = 992;
/** Share of the remaining distance the photo covers per frame. */
const FOLLOW = 0.25;
/** Pixels of remaining distance under which the photo counts as arrived. */
const SETTLED = 0.05;
/** The most copies of the track the code will stack under it. */
const MAXIMUM_COPIES = 6;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";
const ANIMATION_NAME = "rc-reel";

/**
 * The Collection List inside a Wrapper: the named part, or Webflow's own
 * list class stamped as that part so one attribute on the Wrapper is enough.
 */
function findList(wrapper, name) {
  const list = part(wrapper, name);
  if (list) return list;
  const fallback = wrapper.querySelector(":scope > .w-dyn-items");
  fallback?.setAttribute("data-rc-part", name);
  return fallback;
}

/** A visual copy that assistive tech and the keyboard never reach. */
function cloneTrack(track) {
  const copy = track.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  // The copy is not the track: the part name stays with the original.
  copy.removeAttribute("data-rc-part");
  for (const el of copy.querySelectorAll("[id]")) el.removeAttribute("id");
  for (const el of copy.querySelectorAll(FOCUSABLE)) {
    el.setAttribute("tabindex", "-1");
  }
  return copy;
}

/** `data-rc-fade`: a length as written, a bare number as a percentage. */
function fadeLength(value) {
  return /^\d+(\.\d+)?$/.test(value) ? `${value}%` : value;
}

export default function reel(root) {
  const strip = part(root, "strip");
  const track = strip && findList(strip, "track");
  if (!strip || !track) {
    warn(
      'reel needs a [data-rc-part="strip"] Collection List Wrapper with its Collection List inside.',
      root,
    );
    return;
  }
  // An empty collection renders Webflow's .w-dyn-empty instead of items.
  if (track.children.length === 0) return;

  const photos = part(root, "photos");
  const cursor = photos && findList(photos, "cursor");
  const pictures = cursor ? Array.from(cursor.children) : [];
  if (cursor && pictures.length !== track.children.length) {
    warn(
      `reel: ${track.children.length} rows but ${pictures.length} photos — give both Collection Lists the same source, sort, filter and limit. The extra ones are ignored.`,
      root,
    );
  }

  const speed = numberOption(root, "speed", DEFAULT_SPEED);
  const minimumWidth = numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH);
  const fade = option(root, "fade");
  if (fade !== null) root.style.setProperty("--rc-reel-fade", fadeLength(fade));
  const finePointer = window.matchMedia(FINE_POINTER);
  const capable = window.matchMedia(
    `${FINE_POINTER} and (min-width: ${minimumWidth}px)`,
  );
  const reduced = prefersReducedMotion();

  // ---- The roll --------------------------------------------------------

  /** The track's copies, stacked under it inside the strip. */
  const copies = [];
  /** Every list a row can belong to: the track and its copies. */
  const lists = new Set([track]);
  let loop = null;

  if (!reduced) {
    const animations = () =>
      [track, ...copies].flatMap((el) =>
        el.getAnimations().filter((a) => a.animationName === ANIMATION_NAME),
      );
    const durationOf = (a) => a.effect.getComputedTiming().duration || 0;

    // Enough copies under the track to keep the strip full while the track
    // slides its own height out of it. A strip without a height of its own
    // grows with every copy instead of clipping; that one gets a single
    // copy and a warning.
    let warned = false;
    function fill() {
      const trackHeight = track.getBoundingClientRect().height;
      if (trackHeight <= 0) return;
      const needed = Math.min(
        MAXIMUM_COPIES,
        Math.max(
          1,
          Math.ceil(strip.getBoundingClientRect().height / trackHeight),
        ),
      );
      while (copies.length < needed) {
        const before = strip.getBoundingClientRect().height;
        const copy = cloneTrack(track);
        strip.append(copy);
        copies.push(copy);
        lists.add(copy);
        // Components inside the rows exist in the copy too.
        scan(copy);
        if (strip.getBoundingClientRect().height > before + 1) {
          if (!warned) {
            warned = true;
            warn(
              'reel: the strip grows with its rows — give [data-rc-part="strip"] a height in Designer so the roll has something to roll through.',
              strip,
            );
          }
          return;
        }
      }
    }

    // One loop = one track height plus the gap that separates it from its
    // copy. Duration follows from the speed, so every reel on the site
    // rolls at the same pace whatever its length.
    function measure() {
      fill();
      const gap = Number.parseFloat(getComputedStyle(strip).rowGap) || 0;
      const distance = track.getBoundingClientRect().height + gap;
      // Keep the fraction travelled so a resize re-scales the roll in place.
      const progress = animations().map((a) => {
        const duration = durationOf(a);
        return [a, duration ? (a.currentTime ?? 0) / duration : 0];
      });
      strip.style.setProperty("--rc-reel-distance", `${distance}px`);
      strip.style.setProperty("--rc-reel-duration", `${distance / speed}s`);
      for (const [a, fraction] of progress) {
        const duration = durationOf(a);
        if (duration) a.currentTime = fraction * duration;
      }
    }

    loop = createLoop(animations, {
      onChange(holds) {
        setState(root, holds.size ? "paused" : "running");
      },
    });
    setState(root, "running");
    measure();
    // Logos load late and breakpoints change the strip; keep the roll true.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    observer.observe(strip);
  } else {
    setState(root, "static");
  }

  // ---- The current row -------------------------------------------------

  /** Which item of its list a row is, so its photo can be found. */
  function indexOf(row) {
    let el = row;
    while (el.parentElement && !lists.has(el.parentElement)) {
      el = el.parentElement;
    }
    return el.parentElement
      ? Array.prototype.indexOf.call(el.parentElement.children, el)
      : -1;
  }

  /** The row under the pointer or the keyboard's focus, in any copy. */
  let activeRow = null;

  function select(row, withPhoto) {
    if (row === activeRow) return;
    if (activeRow) setState(activeRow, null);
    activeRow = row;
    setState(row, "active");
    if (withPhoto) showPhoto(indexOf(row));
    else hidePhoto();
  }

  function clear() {
    if (activeRow) setState(activeRow, null);
    activeRow = null;
    hidePhoto();
  }

  const rowOf = (target) =>
    target instanceof Element ? target.closest('[data-rc-part="row"]') : null;

  strip.addEventListener("pointerover", (event) => {
    if (!finePointer.matches) return;
    const row = rowOf(event.target);
    if (row && strip.contains(row)) select(row, true);
  });
  strip.addEventListener("pointerenter", (event) => {
    if (event.pointerType === "mouse") loop?.hold("hover");
  });
  strip.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    clear();
    loop?.release("hover");
  });

  // Keyboard focus stops the roll and marks the row: nobody chases a moving
  // link. Only visible focus counts — a click also focuses the link under
  // the pointer, and that must not leave the strip standing still after.
  strip.addEventListener("focusin", (event) => {
    if (!event.target.matches(":focus-visible")) return;
    const row = rowOf(event.target);
    if (row) select(row, false);
    loop?.hold("focus");
  });
  strip.addEventListener("focusout", (event) => {
    if (strip.contains(event.relatedTarget)) return;
    if (!finePointer.matches || !strip.matches(":hover")) clear();
    loop?.release("focus");
  });

  // ---- The photo at the pointer ---------------------------------------

  /** Index of the photo on show, -1 for none. */
  let shown = -1;
  /** The photo's box, from its own size; it is centred on the pointer. */
  let width = 0;
  let height = 0;
  /** Where the pointer is and where the photo has got to, viewport px. */
  let target = { x: 0, y: 0 };
  let position = { x: 0, y: 0 };
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

  function showPhoto(index) {
    if (!cursor || reduced || !capable.matches) return;
    if (index < 0 || index >= pictures.length) {
      hidePhoto();
      return;
    }
    if (index === shown) return;
    pictures.forEach((picture, i) =>
      setState(picture, i === index ? "active" : null),
    );
    // A photo appears where the pointer is, not where the last one was left.
    if (shown < 0) {
      position = target;
      place();
    }
    shown = index;
    wake();
  }

  function hidePhoto() {
    if (shown < 0) return;
    pictures.forEach((picture) => setState(picture, null));
    shown = -1;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  if (cursor && !reduced) {
    // The photo's size decides the centring offset; it changes with
    // breakpoints and when the pictures load.
    new ResizeObserver(() => {
      const box = cursor.getBoundingClientRect();
      width = box.width;
      height = box.height;
      if (shown >= 0) place();
    }).observe(cursor);
    // The pointer is watched only while the strip is on screen.
    new IntersectionObserver(([entry]) => listen(entry.isIntersecting)).observe(
      strip,
    );
    capable.addEventListener("change", () => {
      if (!capable.matches) hidePhoto();
    });
  }

  setState(root, root.getAttribute("data-rc-state") ?? "static");
}
