/**
 * tabs.js — a list of tabs beside a stack of panels: pressing a tab brings
 * its panel up. Both sides are Collection Lists from the same collection
 * with the same sort, filter and limit, so the n-th tab belongs to the n-th
 * panel; nothing is generated here, every panel's text is in the HTML for
 * readers and bots.
 *
 * Reconstructed from digidop.com's "across three industries".
 *
 * The tabs are real buttons, and the code wires them up as a WAI-ARIA tab
 * list: roles, aria-selected, aria-controls, a roving tabindex, arrow keys
 * on both axes, Home and End. Selection follows focus. The panels stack in
 * one grid cell (tabs.css) and the current one fades and rises in; the
 * others stay in the DOM but are invisible and out of reach of the pointer
 * and the keyboard.
 *
 * Without JavaScript the tabs are plain buttons that do nothing and every
 * panel is on show, one under the other. With reduced motion the fades are
 * cut short by base/motion.css; the switching is the same.
 *
 * Structure and options: README.md in this folder.
 */

import { part, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

/** Keys that move the selection, and by how much. */
const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Every tab list on the page gets its own id prefix. */
let sequence = 0;

export default function tabs(root) {
  const tablist = part(root, "tablist");
  const panelList = part(root, "panels");
  if (!tablist || !panelList) {
    warn(
      'tabs needs a [data-rc-part="tablist"] and a [data-rc-part="panels"] Collection List.',
      root,
    );
    return;
  }
  // An item hidden by a Webflow condition is skipped on both sides.
  const shown = (el) => el.checkVisibility?.() ?? true;
  const items = Array.from(tablist.children).filter(shown);
  const buttons = items.map(
    (item) => part(item, "tab") ?? item.querySelector("button, a") ?? item,
  );
  const panels = Array.from(panelList.children).filter(shown);
  if (buttons.length === 0 || panels.length === 0) return;
  if (buttons.length !== panels.length) {
    warn(
      `tabs: ${buttons.length} tabs but ${panels.length} panels — give both Collection Lists the same source, sort, filter and limit. The extra ones are ignored.`,
      root,
    );
  }
  const count = Math.min(buttons.length, panels.length);
  const prefix = `rc-tabs-${(sequence += 1)}`;

  // Webflow marks the list and its items as a list; to a reader this is a
  // tab list, and the items are only wrappers.
  tablist.setAttribute("role", "tablist");
  for (const item of items) {
    if (item !== buttons[items.indexOf(item)]) {
      item.setAttribute("role", "presentation");
    }
  }
  for (let i = 0; i < count; i += 1) {
    const button = buttons[i];
    const panel = panels[i];
    if (!button.id) button.id = `${prefix}-tab-${i + 1}`;
    if (!panel.id) panel.id = `${prefix}-panel-${i + 1}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", panel.id);
    // A <button> outside a form still defaults to type="submit".
    if (button instanceof HTMLButtonElement) button.type = "button";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);
  }

  let current = -1;

  function select(index, { focus = false } = {}) {
    if (index !== current) {
      current = index;
      for (let i = 0; i < count; i += 1) {
        const on = i === index;
        setState(buttons[i], on ? "active" : null);
        buttons[i].setAttribute("aria-selected", on ? "true" : "false");
        buttons[i].tabIndex = on ? 0 : -1;
        setState(panels[i], on ? "active" : null);
      }
    }
    if (focus) buttons[index].focus();
  }

  for (let index = 0; index < count; index += 1) {
    const button = buttons[index];
    button.addEventListener("click", (event) => {
      // A Link Block used as a tab must not leave the page.
      if (button instanceof HTMLAnchorElement) event.preventDefault();
      select(index);
    });
    button.addEventListener("keydown", (event) => {
      let target;
      if (event.key in STEPS)
        target = (index + STEPS[event.key] + count) % count;
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = count - 1;
      else return;
      event.preventDefault();
      select(target, { focus: true });
    });
  }

  select(0);
  setState(root, "ready");
}
