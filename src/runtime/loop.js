/**
 * loop.js — the play state of an endless CSS animation loop: a marquee's
 * strip, a reel's column. Who is holding it still, and easing it to a stop
 * and back up to speed through the Web Animations API.
 *
 * A component hands over a function that returns the animations to drive
 * (the CSS animations on its track and the track's clones) and gets back
 * `hold(reason)` / `release(reason)`: the loop runs while nothing holds it.
 * A hold eases the animations to a stop over EASE milliseconds unless it
 * asks to stop dead (`hold(reason, { instant: true })` — a pointer holding
 * the strip); a release eases back up to speed. `onChange(holds)` runs after
 * every change so the component can stamp its own state.
 *
 * Rates change through updatePlaybackRate(), never the setter: the setter
 * re-syncs a compositor-driven animation on the spot and the strip visibly
 * jumps. A stop ends in pause(), so scrubbing currentTime while held moves
 * nothing but the scrub.
 */

/** Milliseconds the loop takes to ease to a stop, and back up to speed. */
const EASE = 450;

/**
 * The slowest playback rate the ease reaches before the animation is paused
 * outright, and the rate it restarts from. Never 0: a running animation at
 * rate 0 has no usable current time to resume from.
 */
const MINIMUM_RATE = 0.02;

const smoothstep = (t) => t * t * (3 - 2 * t);

/**
 * @param {() => Animation[]} animations the animations to drive, read fresh
 *   on every change: a CSS animation is replaced when its keyframes are.
 * @param {{ onChange?: (holds: Set<string>) => void }} [options]
 */
export function createLoop(animations, { onChange } = {}) {
  /** Why the loop is not running right now; empty means it runs. */
  const holds = new Set();
  /** The holds that stopped the loop dead rather than easing it. */
  const instant = new Set();
  let ramp = 0;

  /**
   * Tween the playback rate to `rate` over `ms`; `ms` 0 switches at once.
   * Rate 0 ends in pause().
   */
  function ease(rate, ms) {
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
    // A paused loop restarts from a crawl, whatever rate it stopped at.
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
  }

  function sync() {
    ease(holds.size ? 0 : 1, instant.size ? 0 : EASE);
    onChange?.(holds);
  }

  return {
    holds,
    hold(reason, { instant: dead = false } = {}) {
      holds.add(reason);
      if (dead) instant.add(reason);
      sync();
    },
    release(reason) {
      holds.delete(reason);
      instant.delete(reason);
      sync();
    },
    ease,
  };
}
