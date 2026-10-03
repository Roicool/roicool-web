/**
 * three.js — three.js and its OrbitControls, on demand from the CDN.
 *
 * Like GSAP (motion.js) it is neither bundled nor in the Webflow head: only a
 * page with a component that asks for it pays for it, and only once that
 * component nears the viewport.
 *
 * jsDelivr's `+esm` build rewrites the controls' bare `import 'three'` to
 * this same pinned core URL, so the controls and the caller share one three
 * instance without an import map. Pin the version here and nowhere else.
 */

const THREE_BASE = "https://cdn.jsdelivr.net/npm/three@0.170.0/";

let pending = null;

/**
 * Resolve `{ THREE, OrbitControls }`, or null when the CDN did not deliver —
 * the caller then shows its static fallback.
 */
export function loadThree() {
  pending ??= (async () => {
    try {
      const [THREE, controls] = await Promise.all([
        import(`${THREE_BASE}+esm`),
        import(`${THREE_BASE}examples/jsm/controls/OrbitControls.js/+esm`),
      ]);
      return { THREE, OrbitControls: controls.OrbitControls };
    } catch {
      return null;
    }
  })();
  return pending;
}
