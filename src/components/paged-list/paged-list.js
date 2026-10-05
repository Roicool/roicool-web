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
 * Structure: README.md in this folder.
 */

import { FOCUSABLE, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { scan } from "../../runtime/registry.js";
import { warn } from "../../runtime/log.js";

/** Fetched pages, by URL: a hover fetches ahead, the click reuses it. */
const pages = new Map();

/** A link to another page of a Webflow Collection List on this page. */
function pageLink(target) {
  const link = target.closest?.("a[href]");
  if (!link) return null;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname) {
    return null;
  }
  const paged = [...url.searchParams.keys()].some((key) =>
    key.endsWith("_page"),
  );
  return paged ? { link, url } : null;
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
