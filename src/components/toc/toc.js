/**
 * toc.js — a blog post's table of contents: anchors for the body's H2s, the
 * section being read marked in the list, and on narrow screens the list
 * folded into a bar that floats at the bottom of the screen.
 *
 * The list itself is not built here (rule 1): scripts/cms-derived-fields.mjs
 * writes it into the CMS (Blog › Table of contents) as links to "#<anchor>", and
 * Designer binds that rich text into the `list` part. Webflow's rich text
 * cannot give a heading an id, so this code gives each H2 of the `body` part
 * the anchor the script computed from the same text (runtime/anchors.js, the
 * same functions on both sides). Clicks need no code: the browser and Lenis
 * both scroll to an anchor and both honour the heading's scroll-margin-top
 * (toc.css, --rc-toc-offset), which keeps it clear of the sticky header.
 *
 * Narrow screens (FLOAT_QUERY, the same breakpoint as toc.critical.css): the
 * `navigation` part is fixed to the bottom of the screen, its `panel` folded
 * under a `toggle` button. Pressing the toggle unfolds the list upwards;
 * choosing a link, pressing it again, Escape or a press outside folds it back.
 * The bar steps aside while the body is off screen (above the post or past
 * its end). The fixed bar and the fold are in the critical CSS, so the page
 * does not jump when this chunk arrives.
 *
 * States on the root, space separated: "ready" once running, "open" while
 * the floating list is unfolded, "away" while the body is off screen. The
 * current section's link: data-rc-state="active" and aria-current="true".
 *
 * Without JavaScript the list is in the page as Designer laid it out, open,
 * and its links lead to the post (no anchor to scroll to); the toggle is not
 * shown.
 *
 * Structure and options: README.md in this folder.
 */

import { part, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";
import { smoothScroll } from "../../runtime/scroll.js";
import { anchorsFor, textOf } from "../../runtime/anchors.js";

/** Where the floating bar takes over; keep in step with toc.critical.css. */
const FLOAT_QUERY = "(max-width: 991px)";

/** Pixels below the scroll margin a heading may sit and still count as read. */
const READ_SLACK = 8;

let sequence = 0;

export default function toc(root) {
  const body = part(root, "body");
  if (!body) {
    warn('toc needs a [data-rc-part="body"] (the post\'s rich text).', root);
    return;
  }
  const headings = Array.from(body.querySelectorAll("h2")).filter(
    (heading) => textOf(heading.innerHTML) !== "",
  );
  const anchors = anchorsFor(headings.map((h) => textOf(h.innerHTML)));
  headings.forEach((heading, i) => {
    if (!heading.id) heading.id = anchors[i];
  });

  const list = part(root, "list");
  const links = list ? Array.from(list.querySelectorAll('a[href^="#"]')) : [];
  const linkFor = new Map();
  for (const link of links) {
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const target = document.getElementById(id);
    if (target && headings.includes(target)) linkFor.set(target, link);
  }
  if (links.length > 0 && linkFor.size < links.length) {
    warn(
      `toc: ${links.length - linkFor.size} of ${links.length} links point to no heading — the list is older than the body; the hourly CMS job will rewrite it.`,
      root,
    );
  }

  arriveAtHash(headings);
  spy(headings, linkFor);

  const state = { open: false, away: false };
  const write = () => {
    const tokens = ["ready"];
    if (state.open) tokens.push("open");
    if (state.away) tokens.push("away");
    setState(root, tokens.join(" "));
  };
  const float = floating(root, list, (open) => {
    state.open = open;
    write();
  });

  // The bar steps aside while the body is off screen.
  new IntersectionObserver(([entry]) => {
    state.away = !entry.isIntersecting;
    if (state.away) float?.close();
    write();
  }).observe(body);
  write();
}

/**
 * A link from elsewhere (an AI answer quoting a section, a shared link) names
 * a heading the browser could not find on load, since the id came later.
 */
function arriveAtHash(headings) {
  let id = window.location.hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {
    return;
  }
  const target = id && headings.find((heading) => heading.id === id);
  if (!target) return;
  const lenis = smoothScroll();
  if (lenis) lenis.scrollTo(target, { immediate: true });
  else target.scrollIntoView();
}

/** Mark the link of the section being read: the last H2 above the line. */
function spy(headings, linkFor) {
  if (headings.length === 0 || linkFor.size === 0) return;
  let current = null;
  let queued = false;
  const update = () => {
    queued = false;
    const margin =
      Number.parseFloat(getComputedStyle(headings[0]).scrollMarginTop) || 0;
    const line = margin + READ_SLACK;
    let reading = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= line) reading = heading;
      else break;
    }
    // Scrolled to the very end: the last section is the one being read, even
    // when its heading cannot reach the line.
    const bottom =
      window.innerHeight + window.scrollY >=
      document.documentElement.scrollHeight - 2;
    if (bottom && reading) reading = headings[headings.length - 1];
    const link = reading ? (linkFor.get(reading) ?? null) : null;
    if (link === current) return;
    if (current) {
      setState(current, null);
      current.removeAttribute("aria-current");
    }
    if (link) {
      setState(link, "active");
      link.setAttribute("aria-current", "true");
    }
    current = link;
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}

/**
 * The floating bar's fold; `onChange(open)` hears every change. Returns
 * { close } or null when the navigation, toggle or panel is missing.
 */
function floating(root, list, onChange) {
  const navigation = part(root, "navigation");
  const toggle = part(root, "toggle");
  const panel = part(root, "panel");
  if (!navigation || !toggle || !panel) return null;
  const narrow = window.matchMedia(FLOAT_QUERY);

  sequence += 1;
  if (!panel.id) panel.id = `rc-toc-panel-${sequence}`;
  if (toggle instanceof HTMLButtonElement) toggle.type = "button";
  toggle.setAttribute("aria-controls", panel.id);
  toggle.setAttribute("aria-expanded", "false");
  // A long list scrolls inside the panel, not the page under it.
  panel.setAttribute("data-lenis-prevent", "");

  let open = false;
  const set = (next) => {
    if (next === open) return;
    open = next;
    toggle.setAttribute("aria-expanded", String(open));
    onChange(open);
  };

  toggle.addEventListener("click", () => set(!open));
  list?.addEventListener("click", (event) => {
    if (narrow.matches && event.target.closest("a")) set(false);
  });
  navigation.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !open) return;
    set(false);
    toggle.focus();
  });
  document.addEventListener("pointerdown", (event) => {
    if (open && !navigation.contains(event.target)) set(false);
  });
  narrow.addEventListener("change", () => set(false));
  return { close: () => set(false) };
}
