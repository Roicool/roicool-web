/**
 * rc.js — the single entry point the Webflow site loads.
 *
 *   <script type="module" src="…/dist/rc.js"></script>
 *
 * Module scripts are deferred by definition, so this never blocks the first
 * paint and needs no `defer` attribute. It discovers components (the work is
 * in registry.js) and starts site-wide smooth scrolling (scroll.js).
 *
 * `html.rc-js` is NOT set here on purpose. It is stamped by an inline snippet
 * in the Webflow head (webflow/embeds/head.html) so it lands before the first
 * paint — setting it from this deferred module would let collapsed content
 * flash open first.
 */

import { scan } from "./registry.js";
import { startSmoothScroll, smoothScroll } from "./scroll.js";
import { debug } from "./log.js";

debug("runtime ready");
scan();
startSmoothScroll();

/** The one global this library defines. */
globalThis.rc = Object.freeze({
  scan,
  /** The Lenis instance once smooth scrolling is up; null otherwise. */
  get lenis() {
    return smoothScroll();
  },
});
