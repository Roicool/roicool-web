/**
 * case-switcher.js — a grid of client logos on one side and, on the other,
 * the matching case's headline and figures. Pointing at a logo brings that
 * case's panel up; the logo itself is a link to the case study.
 *
 * Reconstructed from digidop.com's "Recent projects we've supported". Both
 * sides are Collection Lists from the same collection with the same sort
 * and limit, so the n-th logo belongs to the n-th panel; nothing is
 * generated here, every panel's text is in the HTML for readers and bots.
 *
 * Fine pointer (mouse, trackpad): hovering a logo selects its panel, a click
 * follows the link. Touch: the first tap selects, a second tap on the
 * selected logo follows the link. Keyboard: focusing a logo selects it.
 * The first case is selected on load; the CSS shows it before this runs.
 *
 * Without JavaScript the logos are plain links and every panel is on show,
 * one under the other. Hovering a logo still lifts its cover (pure CSS).
 *
 * Structure: README.md in this folder.
 */

import { part, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

/** Pointers that can hover: hovering selects, a click follows the link. */
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

export default function caseSwitcher(root) {
  const logoList = part(root, "logos");
  const panelList = part(root, "panels");
  if (!logoList || !panelList) {
    warn(
      'case-switcher needs a [data-rc-part="logos"] and a [data-rc-part="panels"] Collection List.',
      root,
    );
    return;
  }
  // An item hidden by a Webflow condition is skipped on both sides.
  const shown = (el) => el.checkVisibility?.() ?? true;
  const logos = Array.from(logoList.children)
    .filter(shown)
    .map((item) => part(item, "logo") ?? item.querySelector("a") ?? item);
  const panels = Array.from(panelList.children).filter(shown);
  if (logos.length === 0 || panels.length === 0) return;
  if (logos.length !== panels.length) {
    warn(
      `case-switcher: ${logos.length} logos but ${panels.length} panels — give both Collection Lists the same source, sort, filter and limit. The extra ones are ignored.`,
      root,
    );
  }
  const count = Math.min(logos.length, panels.length);
  const finePointer = window.matchMedia(FINE_POINTER);
  let current = -1;

  function select(index) {
    if (index === current) return;
    current = index;
    logos.forEach((logo, i) => {
      if (i === index) {
        setState(logo, "active");
        logo.setAttribute("aria-current", "true");
      } else {
        setState(logo, null);
        logo.removeAttribute("aria-current");
      }
    });
    panels.forEach((panel, i) =>
      setState(panel, i === index ? "active" : null),
    );
  }

  logos.slice(0, count).forEach((logo, index) => {
    logo.addEventListener("pointerenter", () => {
      if (finePointer.matches) select(index);
    });
    // Keyboard focus selects; focus that a tap or click gave does not, so a
    // first tap stays a selection rather than turning into the link.
    logo.addEventListener("focusin", () => {
      if (logo.matches(":focus-visible")) select(index);
    });
    logo.addEventListener("click", (event) => {
      if (finePointer.matches || index === current) return;
      event.preventDefault();
      select(index);
    });
  });

  select(0);
  setState(root, "ready");
}
