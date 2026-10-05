/**
 * dropdown.js — a button that opens a list of links under it (Ramp's
 * "Explore categories"): the blog's categories, a hub's topics. The links
 * are in the HTML — a Collection List or static links — and without the
 * code the list simply stands open under the button.
 *
 * WAI-ARIA disclosure, not a menu: the button carries aria-expanded and
 * aria-controls, the links stay links. On top of that, Radix DropdownMenu's
 * keyboard: ↓, Enter or Space on the button opens it and focuses the first
 * link; ↑ / ↓ move, Home / End jump; Esc closes and gives the focus back to
 * the button; Tab out or a click outside closes it. The link to the page
 * being read is marked aria-current="page".
 *
 * The list opens 8px under the button, at least as wide as the button
 * (Radix: --radix-dropdown-menu-trigger-width); its look is Designer's.
 *
 * Structure: README.md in this folder.
 */

import { part, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

let sequence = 0;

const samePage = (href) => {
  const url = new URL(href, location.href);
  return url.origin === location.origin && url.pathname === location.pathname;
};

export default function dropdown(root) {
  const trigger = part(root, "trigger");
  const menu = part(root, "menu");
  if (!trigger || !menu) {
    warn(
      'dropdown needs a [data-rc-part="trigger"] button and a [data-rc-part="menu"] element.',
      root,
    );
    return;
  }

  menu.id ||= `rc-dropdown-${++sequence}`;
  trigger.setAttribute("aria-controls", menu.id);
  trigger.setAttribute("aria-expanded", "false");

  const links = () => [...menu.querySelectorAll("a[href]")];
  for (const link of links()) {
    if (samePage(link.href)) link.setAttribute("aria-current", "page");
  }

  let open = false;

  function setOpen(next, { focus = null } = {}) {
    open = next;
    trigger.setAttribute("aria-expanded", String(open));
    setState(root, open ? "open" : null);
    if (open) {
      root.style.setProperty(
        "--rc-dropdown-trigger-width",
        `${trigger.offsetWidth}px`,
      );
      const items = links();
      if (focus === "first") items[0]?.focus();
      if (focus === "last") items.at(-1)?.focus();
    } else if (focus === "trigger") {
      trigger.focus();
    }
  }

  trigger.addEventListener("click", () => setOpen(!open));

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true, { focus: "first" });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true, { focus: "last" });
    } else if (event.key === "Enter" || event.key === " ") {
      // A keyboard open lands on the first link, as in Radix.
      event.preventDefault();
      setOpen(!open, { focus: open ? null : "first" });
    }
  });

  menu.addEventListener("keydown", (event) => {
    const items = links();
    const index = items.indexOf(document.activeElement);
    let target = null;
    if (event.key === "ArrowDown") target = items[(index + 1) % items.length];
    else if (event.key === "ArrowUp") {
      target = items[(index - 1 + items.length) % items.length];
    } else if (event.key === "Home") target = items[0];
    else if (event.key === "End") target = items.at(-1);
    else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false, { focus: "trigger" });
      return;
    }
    if (target) {
      event.preventDefault();
      target.focus();
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) setOpen(false);
  });

  // Focus or a click anywhere else closes it.
  root.addEventListener("focusout", (event) => {
    if (open && !root.contains(event.relatedTarget)) setOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (open && !root.contains(event.target)) setOpen(false);
  });
}
