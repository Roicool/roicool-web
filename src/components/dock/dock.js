/**
 * dock.js — a bar that waits off screen and docks to the bottom of the
 * viewport once the visitor has scrolled past a chosen section: a logo
 * strip, "Get started", "Book a demo". It leaves again when they scroll back
 * above that section.
 *
 * The bar usually sits in a Symbol shared by every page; the page decides
 * whether it shows by marking one section with `data-rc-dock-trigger`. A
 * page without that section, or with it hidden at the current breakpoint,
 * never shows the bar — no warning either, that is a normal page.
 *
 * Nothing is generated: the bar's links and logos are in the HTML. This file
 * only stamps `data-rc-state="shown"`; dock.css positions the bar, hides it
 * until then and runs the entrance. Without JavaScript the bar is a normal
 * block where Designer put it.
 *
 * Structure and options: README.md in this folder.
 */

import { setState } from "../../runtime/dom.js";
import { debug } from "../../runtime/log.js";

/** The section the visitor scrolls past; the first one on the page counts. */
const TRIGGER_SELECTOR = "[data-rc-dock-trigger]";

export default function dock(root) {
  const trigger = document.querySelector(TRIGGER_SELECTOR);
  if (!trigger) {
    debug("dock: no [data-rc-dock-trigger] on this page — staying hidden.");
    return;
  }

  new IntersectionObserver(([entry]) => {
    // Past = the section has left through the top edge. A trigger hidden
    // with display: none also reports a rect at 0, so it is ruled out first.
    const past =
      (trigger.checkVisibility?.() ?? true) &&
      !entry.isIntersecting &&
      entry.boundingClientRect.bottom <= 0;
    setState(root, past ? "shown" : null);
  }).observe(trigger);
}
