/**
 * paged-list.js — Webflow's own Collection List pagination, without the
 * page reload: "Next" and "Previous" swap the list in place, the address
 * follows (back and forward work), and the page stays where the reader is.
 *
 * Every page still exists as its own URL rendered by Webflow (`?xxxx_page=2`),
 * with its items in the HTML: crawlers follow the plain links, and without
 * this code the links simply load the page. The code fetches that same URL,
 * takes this list out of it and puts it in place of the current one — it
 * moves markup the server already rendered, it makes none (rule 1).
 *
 * The root is the Collection List Wrapper (or any element around the list
 * and its pagination). The links are recognised by their address — a query
 * parameter ending in `_page` on this same page — not by Webflow's classes.
 * A link is fetched ahead when the pointer or the focus reaches it.
 *
 * Numbered pages (Ramp's KbPagination): when Webflow's page count is shown
 * and marked `data-rc-part="count"` ("2 / 5", server-rendered), the code
 * puts page links in front of it — `1 2 3 … 5` — and the count gives way.
 * They are links to the same `?xxxx_page=N` addresses Webflow already
 * serves; without the code, Previous / Next and the count remain.
 *
 * Structure: README.md in this folder.
 */

import { FOCUSABLE, option, part, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { scan } from "../../runtime/registry.js";
import { warn } from "../../runtime/log.js";

/** Fetched pages, by URL: a hover fetches ahead, the click reuses it. */
const pages = new Map();

const PAGE_LABEL = "Sayfa {n}";

/** A link to another page of a Webflow Collection List on this page. */
function pageLink(target) {
  const link = target.closest?.("a[href]");
  if (!link) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname) {
    return null;
  }
  const key = [...url.searchParams.keys()].find((name) =>
    name.endsWith("_page"),
  );
  return key ? { link, url, key } : null;
}

/**
 * The page numbers to show (Ramp's KbPagination, as is): every page up to
 * five; beyond that the first, the last, the current one and its
 * neighbours, `null` for each gap.
 */
export function pageList(total, current) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current === 1 || current === total) {
    return [1, 2, null, total - 1, total];
  }
  if (current === 2) return [1, 2, 3, null, total];
  if (current === total - 1) return [1, null, total - 2, total - 1, total];
  let from = Math.max(2, current - 1);
  let to = Math.min(total - 1, current + 1);
  if (current <= 3) to = 4;
  if (current >= total - 2) from = total - 3;
  const list = [1];
  if (from > 2) list.push(null);
  for (let n = from; n <= to; n += 1) list.push(n);
  if (to < total - 1) list.push(null);
  list.push(total);
  return list;
}

const COUNT = /^\s*(\d+)\s*\/\s*(\d+)\s*$/;

/**
 * Webflow's page count: `data-rc-part="count"` when Designer could give it,
 * otherwise the "2 / 5" beside the page links (Designer takes no attribute
 * on that element). Found by what it says, not by Webflow's class.
 */
function pageCount(root, links) {
  const marked = part(root, "count");
  if (marked) return marked;
  const bar = links[0]?.link.parentElement;
  const found = bar
    ? [...bar.children].find((el) => COUNT.test(el.textContent))
    : null;
  if (found) found.dataset.rcPart = "count";
  return found ?? null;
}

/** Page links between Previous and Next, built from Webflow's "2 / 5". */
function numberPages(root) {
  const links = [...root.querySelectorAll("a[href]")]
    .map((link) => pageLink(link))
    .filter(Boolean);
  const count = pageCount(root, links);
  const match = count?.textContent.match(COUNT);
  if (!match || links.length === 0) return;
  const current = Number(match[1]);
  const total = Number(match[2]);
  // The query parameter Webflow named this list's pages with.
  const { key } = links[0];
  if (total < 2) return;
  const label = option(root, "page-label") ?? PAGE_LABEL;
  const list = document.createElement("ol");
  list.dataset.rcPart = "pages";
  for (const n of pageList(total, current)) {
    const item = document.createElement("li");
    if (n === null) {
      item.textContent = "…";
      item.setAttribute("aria-hidden", "true");
      item.dataset.rcState = "gap";
    } else {
      const url = new URL(location.href);
      url.searchParams.set(key, String(n));
      url.hash = "";
      const link = document.createElement("a");
      link.href = url.pathname + url.search;
      link.textContent = String(n);
      link.setAttribute("aria-label", label.replace("{n}", String(n)));
      if (n === current) {
        link.setAttribute("aria-current", "page");
        item.dataset.rcState = "active";
      }
      item.append(link);
    }
    list.append(item);
  }
  // Between Previous and Next, wherever Webflow put the count. The bar and
  // its arrows are marked so the CSS can hold the numbers in the middle:
  // Webflow leaves Previous out on the first page and Next on the last.
  const bar = count.parentElement;
  const arrow = (direction) =>
    links.find(
      ({ url, link }) =>
        link.parentElement === bar &&
        Math.sign(Number(url.searchParams.get(key)) - current) === direction,
    )?.link;
  const previous = arrow(-1);
  const next = arrow(1);
  bar.dataset.rcPart = "pagination";
  if (previous) previous.dataset.rcPart = "previous";
  if (next) next.dataset.rcPart = "next";
  (next ?? count).before(list);
}

function load(url) {
  const key = url.href;
  if (!pages.has(key)) {
    const pending = fetch(key, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${key}`);
        return response.text();
      })
      .then((html) => new DOMParser().parseFromString(html, "text/html"));
    pending.catch(() => pages.delete(key));
    pages.set(key, pending);
  }
  return pages.get(key);
}

export default function pagedList(root) {
  const all = () => [...document.querySelectorAll('[data-rc~="paged-list"]')];
  let busy = false;
  // The query the list on screen belongs to: a hash change is not a page.
  let shown = location.search;

  /** This list's counterpart in a fetched page: same place in the order. */
  const counterpart = (doc) =>
    doc.querySelectorAll('[data-rc~="paged-list"]')[all().indexOf(root)] ??
    null;

  async function show(url, { push, focus }) {
    if (busy) return;
    busy = true;
    setState(root, "loading");
    root.setAttribute("aria-busy", "true");
    try {
      const doc = await load(url);
      const next = counterpart(doc);
      if (!next) throw new Error("list not found in the fetched page");
      root.replaceChildren(
        ...[...next.childNodes].map((node) => document.importNode(node, true)),
      );
      if (push) history.pushState({ rcPagedList: true }, "", url.href);
      shown = url.search;
      numberPages(root);
      scan(root);
      // A list that now starts above the viewport comes back into view.
      if (root.getBoundingClientRect().top < 0) {
        root.scrollIntoView({
          block: "start",
          behavior: prefersReducedMotion() ? "auto" : "smooth",
        });
      }
      // Keyboard users land on the first item of the new page.
      if (focus) root.querySelector(FOCUSABLE)?.focus({ preventScroll: true });
    } catch (error) {
      warn("paged-list: falling back to a page load.", error);
      location.assign(url.href);
    } finally {
      busy = false;
      setState(root, null);
      root.removeAttribute("aria-busy");
    }
  }

  numberPages(root);

  root.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const target = pageLink(event.target);
    if (!target) return;
    event.preventDefault();
    show(target.url, { push: true, focus: event.detail === 0 });
  });

  // Fetch ahead on intent.
  const ahead = (event) => {
    const target = pageLink(event.target);
    if (target) load(target.url).catch(() => {});
  };
  root.addEventListener("pointerover", ahead);
  root.addEventListener("focusin", ahead);

  // Back and forward: show whatever page the address now names.
  addEventListener("popstate", () => {
    if (location.search === shown) return;
    show(new URL(location.href), { push: false, focus: false });
  });
}
