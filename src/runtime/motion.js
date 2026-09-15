/**
 * motion.js — motion preference and the optional animation peer.
 *
 * Animation is an enhancement here, never a requirement. Two things must hold
 * for every component: it stays fully usable when the visitor asked for reduced
 * motion, and it stays fully usable when the animation library never arrives
 * (a blocked CDN, a corporate proxy, an extension). Both are real.
 */

const query = window.matchMedia("(prefers-reduced-motion: reduce)");

/** True when the visitor asked the system for reduced motion. */
export function prefersReducedMotion() {
  return query.matches;
}

/**
 * Call `handler(reduced)` whenever the preference changes — visitors do flip it
 * mid-session. Returns a function that removes the listener.
 */
export function onMotionPreferenceChange(handler) {
  const listener = (event) => handler(event.matches);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/**
 * The GSAP global, or null when it is not on the page. GSAP is loaded as a
 * plain deferred script from the Webflow head (docs/webflow-setup.md) and is
 * deliberately not bundled: most pages do not need it.
 */
export function getGsap() {
  return globalThis.gsap ?? null;
}
