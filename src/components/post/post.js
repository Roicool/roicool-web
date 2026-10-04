/**
 * post.js — small things a blog post's rich text cannot do by itself:
 *
 *   - Wide tables scroll sideways on narrow screens (post.css); a table
 *     that overflows becomes a keyboard stop (tabindex="0") so it can be
 *     scrolled without a mouse.
 *   - The sources list (`sources` part, Blog › Kaynaklar, a numbered list)
 *     gets anchors: its n-th item is #kaynak-n, which the body's footnote
 *     links point to. Webflow's rich text cannot give an item an id.
 *   - The in-post call to action (`cta` part, written once in the template
 *     after the body) is moved into the middle of the body: before the
 *     H2 at data-rc-cta-before (1-based), by default the middle one. With
 *     fewer than two H2s, or without JS, it stays where Designer put it.
 *     Nothing is copied or generated; the box only moves.
 *
 * Usually on the same root as toc (data-rc="toc reading-progress post"),
 * sharing its `body` part. Writes no state on the root.
 *
 * Structure: README.md in this folder.
 */

import { numberOption, part, parts } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

/** The anchor of the n-th source; the body's footnotes link to it. */
export const SOURCE_PREFIX = "kaynak-";

export default function post(root) {
  const body = part(root, "body");
  if (!body) {
    warn('post needs a [data-rc-part="body"] (the post\'s rich text).', root);
    return;
  }

  for (const table of body.querySelectorAll("table")) {
    const check = () => {
      if (table.scrollWidth > table.clientWidth + 1) table.tabIndex = 0;
      else table.removeAttribute("tabindex");
    };
    check();
    new ResizeObserver(check).observe(table);
  }

  for (const sources of parts(root, "sources")) {
    const items = sources.querySelectorAll("li");
    items.forEach((item, i) => {
      if (!item.id) item.id = `${SOURCE_PREFIX}${i + 1}`;
    });
    // The page may have opened on #kaynak-n before the ids existed.
    let id = "";
    try {
      id = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      id = "";
    }
    const target = id.startsWith(SOURCE_PREFIX) && document.getElementById(id);
    if (target && sources.contains(target)) target.scrollIntoView();
  }

  const cta = part(root, "cta");
  if (cta) {
    const headings = Array.from(body.querySelectorAll(":scope > h2"));
    if (headings.length >= 2) {
      const wanted = numberOption(root, "cta-before", 0);
      const index =
        wanted >= 2 && wanted <= headings.length
          ? wanted - 1
          : Math.ceil(headings.length / 2);
      headings[Math.min(index, headings.length - 1)].before(cta);
    }
  }
}
