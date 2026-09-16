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

/**
 * GSAP is not bundled and not in the Webflow head: a component that needs it
 * imports it here, on demand, from the CDN as ES modules. Only pages that use
 * such a component pay for it, first paint is never involved, and the browser
 * caches one copy for every component on the site.
 *
 * The plugin files import "./gsap-core.js" relatively, so all of them share
 * one core instance. Pin the version here and nowhere else.
 */
const GSAP_BASE = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/";

const PLUGIN_FILES = {
  ScrollTrigger: "ScrollTrigger.js",
  SplitText: "SplitText.js",
};

const loaded = new Map();

/**
 * Resolve `{ gsap, ...plugins }` with the named plugins registered, or null
 * when the CDN did not deliver — the caller then leaves its content static.
 */
export async function loadGsap(pluginNames = []) {
  const key = [...pluginNames].sort().join(",");
  let pending = loaded.get(key);
  if (pending) return pending;

  pending = (async () => {
    try {
      const { gsap } = await import(`${GSAP_BASE}index.js`);
      const result = { gsap };
      for (const name of pluginNames) {
        const module = await import(`${GSAP_BASE}${PLUGIN_FILES[name]}`);
        result[name] = module[name];
        gsap.registerPlugin(module[name]);
      }
      return result;
    } catch {
      return null;
    }
  })();

  loaded.set(key, pending);
  return pending;
}
