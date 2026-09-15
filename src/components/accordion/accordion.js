/**
 * accordion.js
 *
 * Progressive by design: the panels are open in the HTML and collapse only once
 * the runtime has confirmed JavaScript (`html.rc-js`, stamped in the Webflow
 * head). A crawler, a reader mode, and a visitor whose JS never arrives all get
 * the full text — see docs/geo.md.
 *
 * Structure and options: README.md in this folder.
 */

import {
  parts,
  part,
  flagOption,
  numberOption,
  setState,
} from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

let instanceCount = 0;

export default function accordion(root) {
  const items = parts(root, "item");
  if (items.length === 0) {
    warn('accordion has no [data-rc-part="item"] children.', root);
    return;
  }

  const single = flagOption(root, "single");
  const openIndex = numberOption(root, "open", -1);
  const namespace = `rc-accordion-${instanceCount++}`;

  const entries = items
    .map((item, index) => {
      const trigger = part(item, "trigger");
      const panel = part(item, "panel");

      if (!trigger || !panel) {
        warn("accordion item needs both a trigger and a panel.", item);
        return null;
      }
      if (trigger.tagName !== "BUTTON") {
        warn(
          "accordion trigger should be a <button> so it is keyboard operable.",
          trigger,
        );
      }

      trigger.id ||= `${namespace}-trigger-${index}`;
      panel.id ||= `${namespace}-panel-${index}`;
      trigger.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", trigger.id);

      return { item, trigger, panel };
    })
    .filter(Boolean);

  function setOpen(entry, open) {
    entry.trigger.setAttribute("aria-expanded", String(open));
    // `inert` keeps a collapsed panel out of the tab order and the a11y tree
    // while its text stays in the document for crawlers.
    entry.panel.toggleAttribute("inert", !open);
    setState(entry.item, open ? "open" : "closed");
  }

  function isOpen(entry) {
    return entry.trigger.getAttribute("aria-expanded") === "true";
  }

  entries.forEach((entry, index) => {
    setOpen(entry, index === openIndex);

    entry.trigger.addEventListener("click", () => {
      const open = !isOpen(entry);
      if (single && open) {
        for (const other of entries) {
          if (other !== entry) setOpen(other, false);
        }
      }
      setOpen(entry, open);
    });
  });
}
