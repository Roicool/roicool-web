/**
 * marquee.js — an endless horizontal loop over a Webflow Collection List.
 *
 * Webflow allows nothing between Wrapper › List › Item, so this component
 * takes that structure as is: the root is the Wrapper, the track is the List,
 * the items need no attribute. The seamless loop needs a second copy of the
 * track; the code clones it itself rather than asking Designer for one.
 *
 * The motion is a CSS animation (marquee.css) and stays on the compositor.
 * Everything that changes its play state — hover, keyboard focus, a press —
 * goes through the Web Animations API, and dragging simply scrubs the same
 * animation's current time: no inline transforms, nothing to hand back.
 * Hover and focus ease the strip to a stop and back up to speed; only a
 * press stops it dead, because the pointer is holding it.
 *
 * Without JavaScript the list simply renders once, static and fully visible.
 * With reduced motion the code does nothing at all — no clone, no animation —
 * so the list stays a plain, scrollable row.
 *
 * Structure and options: README.md in this folder.
 */

import {
  FOCUSABLE,
  part,
  flagOption,
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { scan } from "../../runtime/registry.js";
import { warn } from "../../runtime/log.js";

/** Pixels per second when `data-rc-speed` is not set. */
const DEFAULT_SPEED = 70;

/** Milliseconds the strip takes to ease to a stop, and back up to speed. */
const EASE = 450;

/**
 * The slowest playback rate the ease reaches before the animation is paused
 * outright, and the rate it restarts from. Never 0: a running animation at
 * rate 0 has no usable current time to resume from.
 */
const MINIMUM_RATE = 0.02;

/** A press that travels less than this stays a click. */
const DRAG_THRESHOLD = 4;

/** Share of the fling velocity kept every 16 ms while gliding. */
const FRICTION = 0.94;

/** Below this speed (px/ms) the glide ends and the loop resumes. */
const REST_VELOCITY = 0.02;

const ANIMATION_NAME = "rc-marquee";

const smoothstep = (t) => t * t * (3 - 2 * t);

function findTrack(root) {
  // Explicit part first; fall back to Webflow's own list class so a plain
  // Collection List works with a single attribute on the wrapper. The
  // fallback is stamped as the part: the CSS selects the track that way.
  const track = part(root, "track");
  if (track) return track;
  const list = root.querySelector(":scope > .w-dyn-items");
  list?.setAttribute("data-rc-part", "track");
  return list;
}

/** A visual copy that assistive tech and the keyboard never reach. */
function cloneTrack(track) {
  const copy = track.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
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

/**
 * Drag: a press pauses the loop, moving the pointer scrubs it by the same
 * distance, releasing lets it glide to rest and then run again. Links inside
 * keep working — a press that never travels is a click.
 */
function initDrag(root, loop) {
  let pointerId = null;
  let startX = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let dragged = false;
  let glide = 0;

  // The browser's own image and link dragging would take the pointer away.
  root.addEventListener("dragstart", (event) => event.preventDefault());

  // A drag must not end in a click on whatever the pointer was released over.
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
    cancelAnimationFrame(glide);
    loop.hold("drag");
  });

  root.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    if (!dragged) {
      if (Math.abs(event.clientX - startX) < DRAG_THRESHOLD) return;
      dragged = true;
      // Captured only once it is a drag, so a plain click still reaches the
      // link under the pointer.
      root.setPointerCapture(pointerId);
    }
    const dx = event.clientX - lastX;
    const dt = Math.max(1, event.timeStamp - lastTime);
    loop.shift(dx);
    velocity = dx / dt;
    lastX = event.clientX;
    lastTime = event.timeStamp;
  });

  function release(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    let last = performance.now();
    const step = (now) => {
      const dt = now - last;
      last = now;
      loop.shift(velocity * dt);
      velocity *= FRICTION ** (dt / 16);
      if (Math.abs(velocity) > REST_VELOCITY) {
        glide = requestAnimationFrame(step);
        return;
      }
      loop.release("drag");
    };
    glide = requestAnimationFrame(step);
  }
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);
}

export default function marquee(root) {
  const track = findTrack(root);
  if (!track) {
    warn('marquee needs a [data-rc-part="track"] (the Collection List).', root);
    return;
  }
  // An empty collection renders Webflow's .w-dyn-empty instead of items.
  if (track.children.length === 0) return;
  if (prefersReducedMotion()) return;

  const speed = numberOption(root, "speed", DEFAULT_SPEED);
  const reverse = option(root, "direction") === "right";
  const fade = option(root, "fade");
  if (fade !== null) {
    root.style.setProperty("--rc-marquee-fade", fadeLength(fade));
  }

  const copy = cloneTrack(track);
  root.append(copy);
  // Components inside the items (a card that reveals on hover, say) exist
  // in the copy too; the runtime only knows the originals.
  scan(copy);

  /** The two CSS animations (track and copy), always scrubbed together. */
  const animations = () =>
    [track, copy].flatMap((el) =>
      el.getAnimations().filter((a) => a.animationName === ANIMATION_NAME),
    );

  const durationOf = (a) => a.effect.getComputedTiming().duration || 0;

  // One loop = one track width plus the gap that separates it from its copy.
  // Duration follows from the configured speed so every marquee on the site
  // moves at the same pace whatever its length.
  function measure() {
    const gap = Number.parseFloat(getComputedStyle(root).columnGap) || 0;
    const distance = track.getBoundingClientRect().width + gap;
    // A new duration would leave each animation at its old current time, at
    // a different point of the loop: keep the fraction travelled instead, so
    // a resize re-scales the strip in place rather than jumping it.
    const progress = animations().map((a) => {
      const duration = durationOf(a);
      return [a, duration ? (a.currentTime ?? 0) / duration : 0];
    });
    root.style.setProperty("--rc-marquee-distance", `${distance}px`);
    root.style.setProperty("--rc-marquee-duration", `${distance / speed}s`);
    for (const [a, fraction] of progress) {
      const duration = durationOf(a);
      if (duration) a.currentTime = fraction * duration;
    }
  }

  // Images load late and fonts swap; the track's width settles over time.
  new ResizeObserver(measure).observe(track);
  measure();

  setState(root, "running");

  // Why the loop is not running right now; empty means it runs.
  const holds = new Set();
  let ramp = 0;
  const loop = {
    hold(reason) {
      holds.add(reason);
      loop.sync();
    },
    release(reason) {
      holds.delete(reason);
      loop.sync();
    },
    sync() {
      // A press stops the strip dead — the pointer is holding it. Anything
      // else eases it to a stop, and letting go eases it back up to speed.
      loop.ease(holds.size ? 0 : 1, holds.has("drag") ? 0 : EASE);
      setState(
        root,
        holds.has("drag") ? "dragging" : holds.size ? "paused" : "running",
      );
    },
    /**
     * Tween the playback rate to `rate` over `ms`; `ms` 0 switches at once.
     * Rate 0 ends in pause(), so a scrub while held moves nothing but the
     * scrub. Rates change through updatePlaybackRate(), never the setter:
     * the setter re-syncs a compositor-driven animation on the spot and the
     * strip visibly jumps.
     */
    ease(rate, ms) {
      cancelAnimationFrame(ramp);
      const list = animations();
      if (list.length === 0) return;
      if (ms <= 0) {
        for (const a of list) {
          if (rate > 0) {
            a.updatePlaybackRate(rate);
            a.play();
          } else a.pause();
        }
        return;
      }
      // A paused strip restarts from a crawl, whatever rate it stopped at.
      const paused = list[0].playState === "paused";
      const from = paused ? MINIMUM_RATE : list[0].playbackRate;
      const to = Math.max(rate, MINIMUM_RATE);
      if (rate > 0) {
        for (const a of list) {
          if (paused) a.updatePlaybackRate(MINIMUM_RATE);
          a.play();
        }
      }
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / ms);
        const value = from + (to - from) * smoothstep(t);
        for (const a of list) a.updatePlaybackRate(value);
        if (t < 1) {
          ramp = requestAnimationFrame(step);
          return;
        }
        if (rate === 0) for (const a of list) a.pause();
      };
      ramp = requestAnimationFrame(step);
    },
    /**
     * Move the strip by `dx` pixels. Speed is px per second, so the time to
     * scrub is dx ÷ speed whatever the track's length; the sign follows the
     * animation's direction.
     */
    shift(dx) {
      const ms = (dx / speed) * 1000 * (reverse ? 1 : -1);
      for (const a of animations()) {
        const duration = a.effect.getComputedTiming().duration;
        if (!duration) continue;
        const t = (a.currentTime ?? 0) + ms;
        a.currentTime = ((t % duration) + duration) % duration;
      }
    },
  };

  // Keyboard focus inside the strip stops it: nobody chases a moving target.
  // Only visible focus counts — a press with the mouse also focuses the link
  // underneath, and that must not leave the strip standing still afterwards.
  root.addEventListener("focusin", (event) => {
    if (event.target.matches(":focus-visible")) loop.hold("focus");
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) loop.release("focus");
  });

  // Hover pause is opt-in and for mice only; a finger is a press, not a hover.
  if (flagOption(root, "pause-on-hover")) {
    root.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") loop.hold("hover");
    });
    root.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "mouse") loop.release("hover");
    });
  }

  if (option(root, "drag") === null || flagOption(root, "drag")) {
    initDrag(root, loop);
  }
}
