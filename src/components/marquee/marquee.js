/**
 * marquee.js — an endless horizontal loop over a Webflow Collection List.
 *
 * Webflow allows nothing between Wrapper › List › Item, so this component
 * takes that structure as is: the root is the Wrapper, the track is the List,
 * the items need no attribute. The seamless loop needs a second copy of the
 * track; the code clones it itself rather than asking Designer for one.
 *
 * Without JavaScript the list simply renders once, static and fully visible.
 * With reduced motion the code does nothing at all — no clone, no animation —
 * so the list stays a plain, scrollable row.
 *
 * Structure and options: README.md in this folder.
 */

import { part, numberOption, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Pixels per second when `data-rc-speed` is not set. */
const DEFAULT_SPEED = 70;

function findTrack(root) {
  // Explicit part first; fall back to Webflow's own list class so a plain
  // Collection List works with a single attribute on the wrapper.
  return part(root, "track") ?? root.querySelector(":scope > .w-dyn-items");
}

/** A visual copy that assistive tech and the keyboard never reach. */
function cloneTrack(track) {
  const copy = track.cloneNode(true);
  copy.setAttribute("aria-hidden", "true");
  for (const el of copy.querySelectorAll("[id]")) el.removeAttribute("id");
  for (const el of copy.querySelectorAll("a, button, input, [tabindex]")) {
    el.setAttribute("tabindex", "-1");
  }
  return copy;
}

export default function marquee(root) {
  const track = findTrack(root);
  if (!track) {
    warn('marquee needs a [data-rc-part="track"] (the Collection List).', root);
    return;
  }
  // An empty collection renders Webflow's .w-dyn-empty instead of items.
  if (track.children.length === 0) return;
  if (prefersReducedMotion()) return;

  const speed = numberOption(root, "speed", DEFAULT_SPEED);
  root.append(cloneTrack(track));

  // One loop = one track width plus the gap that separates it from its copy.
  // Duration follows from the configured speed so every marquee on the site
  // moves at the same pace whatever its length.
  function measure() {
    const gap = Number.parseFloat(getComputedStyle(root).columnGap) || 0;
    const distance = track.getBoundingClientRect().width + gap;
    root.style.setProperty("--rc-marquee-distance", `${distance}px`);
    root.style.setProperty("--rc-marquee-duration", `${distance / speed}s`);
  }

  // Images load late and fonts swap; the track's width settles over time.
  new ResizeObserver(measure).observe(track);
  measure();

  setState(root, "running");
}
