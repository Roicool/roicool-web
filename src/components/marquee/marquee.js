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
 *
 * Without JavaScript the list simply renders once, static and fully visible.
 * With reduced motion the code does nothing at all — no clone, no animation —
 * so the list stays a plain, scrollable row.
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

/** Pixels per second when `data-rc-speed` is not set. */
const DEFAULT_SPEED = 70;

/** A press that travels less than this stays a click. */
const DRAG_THRESHOLD = 4;

/** Share of the fling velocity kept every 16 ms while gliding. */
const FRICTION = 0.94;

/** Below this speed (px/ms) the glide ends and the loop resumes. */
const REST_VELOCITY = 0.02;

const ANIMATION_NAME = "rc-marquee";

function findTrack(root) {
  // Explicit part first; fall back to Webflow's own list class so a plain
  // Collection List works with a single attribute on the wrapper.
  return part(root, "track") ?? root.querySelector(":scope > .w-dyn-items");
}

/** A visual copy that assistive tech and the keyboard never reach. */
function cloneTrack(track) {
  const copy = track.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  for (const el of copy.querySelectorAll("[id]")) el.removeAttribute("id");
  for (const el of copy.querySelectorAll("a, button, input, [tabindex]")) {
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

  // One loop = one track width plus the gap that separates it from its copy.
  // Duration follows from the configured speed so every marquee on the site
  // moves at the same pace whatever its length.
  function measure() {
    const gap = Number.parseFloat(getComputedStyle(root).columnGap) || 0;
    const distance = track.getBoundingClientRect().width + gap;
    root.style.setProperty("--rc-marquee-distance", `${distance}px`);
    root.style.setProperty("--rc-marquee-duration", `${distance / speed}s`);
  }

  // Images load late and fonts swap; the track's width settles over time.
  new ResizeObserver(measure).observe(track);
  measure();

  setState(root, "running");

  /** The two CSS animations (track and copy), always scrubbed together. */
  const animations = () =>
    [track, copy].flatMap((el) =>
      el.getAnimations().filter((a) => a.animationName === ANIMATION_NAME),
    );

  // Why the loop is not running right now; empty means it runs.
  const holds = new Set();
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
      for (const a of animations()) holds.size ? a.pause() : a.play();
      setState(
        root,
        holds.has("drag") ? "dragging" : holds.size ? "paused" : "running",
      );
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
