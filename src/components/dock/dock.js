/**
 * dock.js — a bar that waits off screen and docks to the bottom of the
 * viewport once the visitor has scrolled past a chosen section: a logo
 * strip, "Get started", "Book a demo". It leaves again when they scroll back
 * above that section, and when the footer comes into view, so it never sits
 * on top of the footer's own links.
 *
 * The bar usually sits in a Symbol shared by every page; the page decides
 * whether it shows by marking one section with `data-rc-dock-trigger`. A
 * page without that section, or with it hidden at the current breakpoint,
 * never shows the bar — no warning either, that is a normal page. The
 * element marked `data-rc-dock-stop` (the footer) is optional.
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

/** Where the bar leaves again — the footer; the first one counts. */
const STOP_SELECTOR = "[data-rc-dock-stop]";

/** A marker hidden with display: none reports a rect at 0; it does not count. */
function rendered(el) {
  return el.checkVisibility?.() ?? true;
}

export default function dock(root) {
  const trigger = document.querySelector(TRIGGER_SELECTOR);
  if (!trigger) {
    debug("dock: no [data-rc-dock-trigger] on this page — staying hidden.");
    return;
  }
  const stop = document.querySelector(STOP_SELECTOR);

  let past = false;
  let stopped = false;

  function render() {
    setState(root, past && !stopped ? "shown" : null);
  }

  // Past = the trigger has left through the top edge.
  new IntersectionObserver(([entry]) => {
    past =
      rendered(trigger) &&
      !entry.isIntersecting &&
      entry.boundingClientRect.bottom <= 0;
    render();
  }).observe(trigger);

  // Stopped = the stop element is on screen, or already above it.
  if (stop) {
    new IntersectionObserver(([entry]) => {
      stopped =
        rendered(stop) &&
        (entry.isIntersecting || entry.boundingClientRect.bottom <= 0);
      render();
    }).observe(stop);
  }
}
