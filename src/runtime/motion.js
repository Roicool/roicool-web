/**
 * motion.js — the visitor's motion preference.
 *
 * Animation is an enhancement, never a requirement: every component stays
 * fully usable when the visitor asked for reduced motion. motion.css is the
 * CSS side of the same rule; this is the JS side, for animation CSS cannot
 * see — autoplay, scroll-driven effects, anything started from code.
 */

const query = window.matchMedia("(prefers-reduced-motion: reduce)");

/** True when the visitor asked the system for reduced motion. */
export function prefersReducedMotion() {
  return query.matches;
}

/**
 * Call `handler(reduced)` whenever the preference changes — visitors do flip
 * it mid-session. Returns a function that removes the listener.
 */
export function onMotionPreferenceChange(handler) {
  const listener = (event) => handler(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
