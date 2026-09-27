/**
 * rc.js — the single entry point the Webflow site loads.
 *
 *   <script type="module" src="…/dist/rc.js"></script>
 *
 * Module scripts are deferred by definition, so this never blocks the first
 * paint and needs no `defer` attribute. It discovers components (the work is
 * in registry.js), starts site-wide smooth scrolling (scroll.js) and the
 * floating scrollbar (scrollbar.js).
 *
 * `html.rc-js` is NOT set here on purpose. It is stamped by an inline snippet
 * in the Webflow head (webflow/embeds/head.html) so it lands before the first
 * paint — setting it from this deferred module would let collapsed content
 * flash open first.
 */

import { locateChunks, scan } from "./registry.js";
import { startSmoothScroll, smoothScroll } from "./scroll.js";
import { startOverlayScrollbar } from "./scrollbar.js";
import { debug } from "./log.js";

debug("runtime ready");
// `html.rc-runtime`: this module is running. The critical CSS holds its
// "rc.js never arrived" fallback reveals while it is set (a slow chunk must
// not let them play), and the registry drops it again if a chunk fails, so
// the fallbacks resume and nothing stays hidden for want of a script.
document.documentElement.classList.add("rc-runtime");
// Chunks sit next to this module: dist/rc.js → dist/components/<name>.js
locateChunks(new URL("./components/", import.meta.url));
scan();
startSmoothScroll();
startOverlayScrollbar();

/** The one global this library defines. */
globalThis.rc = Object.freeze({
  scan,
  /** The Lenis instance once smooth scrolling is up; null otherwise. */
  get lenis() {
    return smoothScroll();
  },
});
