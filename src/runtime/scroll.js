/**
 * scroll.js — smooth scrolling for the whole site, via Lenis.
 *
 * The runtime starts it once per page (index.js). Lenis arrives from the CDN
 * as an ES module after first paint; if it never arrives the page scrolls
 * natively and nothing else notices. Lenis honours prefers-reduced-motion by
 * itself: smoothing off, the scroll tracks the input 1:1, programmatic
 * scrolls jump.
 *
 * Designer-side contract:
 *   <body data-rc-scroll="native">   this page scrolls natively
 *   data-lenis-prevent               on an element that scrolls by itself
 *                                    (modal body, code block, map)
 *
 * ScrollTrigger is kept in step from motion.js once GSAP loads.
 */

import { debug, warn } from "./log.js";

/** Pin the version here and nowhere else. */
const LENIS_BASE = "https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/";

let instance = null;
let starting = null;
let scrollTriggerBound = false;

/** The running Lenis instance, or null before it starts / when opted out. */
export function smoothScroll() {
  return instance;
}

/** Resolves with the instance, or null when this page scrolls natively. */
export function startSmoothScroll() {
  if (starting) return starting;
  starting = (async () => {
    if (document.body?.dataset.rcScroll === "native") return null;
    try {
      const { default: Lenis } = await import(`${LENIS_BASE}lenis.mjs`);
      instance = new Lenis({
        autoRaf: true,
        // Stops and restarts itself when something — a modal — sets
        // overflow: hidden on <html>. Needs the CSS in base/scroll.css.
        autoToggle: true,
        // In-page links scroll smoothly instead of fighting the inertia.
        // Lenis does not cancel the click, so the browser still moves focus.
        anchors: true,
        stopInertiaOnNavigate: true,
      });
      debug("smooth scroll ready");
      return instance;
    } catch (error) {
      warn("smooth scroll: Lenis did not load — scrolling natively.", error);
      return null;
    }
  })();
  return starting;
}

/**
 * Let ScrollTrigger read Lenis's position the moment it changes, and stop
 * GSAP's lag smoothing from delaying scrubbed animations. Called by loadGsap
 * when ScrollTrigger is registered; harmless before Lenis is up or when the
 * page opted out.
 */
export function bindScrollTrigger(gsap, ScrollTrigger) {
  if (scrollTriggerBound) return;
  scrollTriggerBound = true;
  (starting ?? Promise.resolve(null)).then((lenis) => {
    if (!lenis) return;
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.lagSmoothing(0);
  });
}
