/**
 * tabs.js — a list of tabs beside a stack of panels: pressing a tab brings
 * its panel up. The n-th tab belongs to the n-th panel. Either side may be a
 * Collection List (Home's industries: both are, from the same collection
 * with the same sort, filter and limit) or static elements (Home's services:
 * one button per cluster, one panel per cluster, each panel holding its own
 * Collection List of services). Nothing is generated here; every tab's and
 * every panel's text is in the HTML for readers and bots.
 *
 * Reconstructed from digidop.com's "across three industries"; the services
 * variant takes its folding descriptions and its card grid from rulebase.co.
 *
 * The tabs are real buttons, and the code wires them up as a WAI-ARIA tab
 * list: roles, aria-selected, aria-controls, a roving tabindex, arrow keys
 * on both axes, Home and End. Selection follows focus. The panels stack in
 * one grid cell (tabs.css) and the current one fades and rises in; the
 * others stay in the DOM but are invisible and out of reach of the pointer
 * and the keyboard.
 *
 * Optional parts, all inside a tab-list item or a panel:
 *   description  — beside the tab button: open on the current tab, folded on
 *                  the others (tabs.css); the button is described by it;
 *   count        — the number of services a tab stands for, typed in
 *                  Designer. The code never writes it (rule 1); it checks it
 *                  against the panel's cards and warns when it is stale;
 *   card         — the panel's cards rise one after another; the code only
 *                  numbers them (--rc-tabs-order) for tabs.css;
 *   preview      — a box in the panel that shows the picture (image part)
 *                  of the card under the pointer or focus; the pictures are
 *                  moved there from their cards and slide in like the case
 *                  studies' slideshow. That card is marked active and the
 *                  other rows rest (tabs.css);
 *   arrow        — a box whose glyph runs out and back in when its link is
 *                  hovered (tabs.css only).
 * With data-rc-hash the current tab is in the address: a tab whose button
 * has an ID in Designer is opened by #<id> on load or from a link, and
 * choosing it writes #<id> back with replaceState (no history entry, no
 * scroll). When the tab list is laid out as a row (a strip on narrow
 * screens) the list is stamped "strip", the descriptions stay folded, and
 * the chosen tab is scrolled into the strip's view.
 *
 * Without JavaScript the tabs are plain buttons that do nothing and every
 * panel and description is on show, one under the other. With reduced
 * motion the fades are cut short by base/motion.css and the cards come in
 * together; the switching is the same.
 *
 * Structure and options: README.md in this folder.
 */

import { flagOption, part, parts, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { slideFrames } from "../../runtime/slide.js";

/** Seconds a preview switch takes: the case studies' slideshow pace. */
const PREVIEW_DURATION = 0.9;

/** Percent of the preview the pictures move while their frames move 100. */
const PREVIEW_PARALLAX = 30;

/** Keys that move the selection, and by how much. */
const STEPS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/** Room left beside a tab scrolled into the strip's view, in px. */
const REVEAL_MARGIN = 16;

/** Every tab list on the page gets its own id prefix. */
let sequence = 0;

/** An item hidden by a Webflow condition counts on neither side. */
const shown = (el) => el.checkVisibility?.() ?? true;

export default function tabs(root) {
  const tablist = part(root, "tablist");
  const panelList = part(root, "panels");
  if (!tablist || !panelList) {
    warn(
      'tabs needs a [data-rc-part="tablist"] and a [data-rc-part="panels"] element.',
      root,
    );
    return;
  }
  const items = Array.from(tablist.children).filter(shown);
  const buttons = items.map(
    (item) => part(item, "tab") ?? item.querySelector("button, a") ?? item,
  );
  const panels = Array.from(panelList.children).filter(shown);
  if (buttons.length === 0 || panels.length === 0) return;
  if (buttons.length !== panels.length) {
    warn(
      `tabs: ${buttons.length} tabs but ${panels.length} panels — every tab needs its panel, in the same order (for two Collection Lists: the same source, sort, filter and limit). The extra ones are ignored.`,
      root,
    );
  }
  const count = Math.min(buttons.length, panels.length);
  const prefix = `rc-tabs-${(sequence += 1)}`;
  const useHash = flagOption(root, "hash");
  // Only an ID given in Designer goes into the address; generated ones are
  // internal and would make an ugly, unstable link.
  const named = buttons.map((button) => Boolean(button.id));
  if (useHash && named.slice(0, count).includes(false)) {
    warn(
      "tabs: data-rc-hash needs an ID on every tab button (Designer › Element settings › ID); tabs without one never reach the address.",
      root,
    );
  }

  // Webflow marks a Collection List and its items as a list; to a reader
  // this is a tab list, and the items are only wrappers.
  tablist.setAttribute("role", "tablist");
  // The panels' list too: a list may not hold tabpanels (ARIA), and the
  // panels are only labelled by their tabs.
  panelList.setAttribute("role", "presentation");
  for (let i = 0; i < count; i += 1) {
    const item = items[i];
    const button = buttons[i];
    const panel = panels[i];
    if (item !== button) item.setAttribute("role", "presentation");
    if (!button.id) button.id = `${prefix}-tab-${i + 1}`;
    if (!panel.id) panel.id = `${prefix}-panel-${i + 1}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", panel.id);
    // A <button> outside a form still defaults to type="submit".
    if (button instanceof HTMLButtonElement) button.type = "button";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", button.id);

    const description = item === button ? null : part(item, "description");
    if (description) {
      if (!description.id) description.id = `${prefix}-description-${i + 1}`;
      button.setAttribute("aria-describedby", description.id);
    }

    const cards = parts(panel, "card").filter(shown);
    cards.forEach((card, order) =>
      card.style.setProperty("--rc-tabs-order", String(order)),
    );
    checkCount(part(item, "count"), cards.length, button, root);
    preview(panel, cards);
  }

  /** Scroll the chosen tab into the strip's view, sideways only. */
  function reveal(button) {
    if (tablist.scrollWidth <= tablist.clientWidth + 1) return;
    const strip = tablist.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    let delta = 0;
    if (box.left < strip.left) delta = box.left - strip.left - REVEAL_MARGIN;
    else if (box.right > strip.right)
      delta = box.right - strip.right + REVEAL_MARGIN;
    if (delta === 0) return;
    tablist.scrollBy({
      left: delta,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  let current = -1;

  function select(index, { focus = false, chosen = false } = {}) {
    if (index !== current) {
      current = index;
      for (let i = 0; i < count; i += 1) {
        const on = i === index;
        setState(buttons[i], on ? "active" : null);
        buttons[i].setAttribute("aria-selected", on ? "true" : "false");
        buttons[i].tabIndex = on ? 0 : -1;
        setState(panels[i], on ? "active" : null);
      }
      if (chosen && useHash && named[index]) {
        history.replaceState(
          history.state,
          "",
          `#${encodeURIComponent(buttons[index].id)}`,
        );
      }
      reveal(buttons[index]);
    }
    if (focus) buttons[index].focus();
  }

  /** The tab the address names, or -1. */
  function fromHash() {
    if (!useHash) return -1;
    let id = window.location.hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      return -1;
    }
    if (!id) return -1;
    return buttons
      .slice(0, count)
      .findIndex((button, i) => named[i] && button.id === id);
  }

  for (let index = 0; index < count; index += 1) {
    const button = buttons[index];
    button.addEventListener("click", (event) => {
      // A Link Block used as a tab must not leave the page.
      if (button instanceof HTMLAnchorElement) event.preventDefault();
      select(index, { chosen: true });
    });
    button.addEventListener("keydown", (event) => {
      let target;
      if (event.key in STEPS)
        target = (index + STEPS[event.key] + count) % count;
      else if (event.key === "Home") target = 0;
      else if (event.key === "End") target = count - 1;
      else return;
      event.preventDefault();
      select(target, { focus: true, chosen: true });
    });
  }

  if (useHash) {
    // A link elsewhere on the page (a menu item, a footer link) may name a
    // tab; the browser has already scrolled to it.
    window.addEventListener("hashchange", () => {
      const index = fromHash();
      if (index >= 0) select(index);
    });
  }

  // A row of tabs is a strip: descriptions stay folded (tabs.css) and the
  // chosen tab is kept in view. Read from the layout, not a breakpoint, so
  // Designer decides where the strip begins.
  if (items.length > 1) {
    const measure = () => {
      const first = items[0].getBoundingClientRect();
      const second = items[1].getBoundingClientRect();
      setState(
        tablist,
        Math.abs(first.top - second.top) < 1 && first.left !== second.left
          ? "strip"
          : null,
      );
      if (current >= 0) reveal(buttons[current]);
    };
    measure();
    new ResizeObserver(measure).observe(tablist);
  }

  const start = fromHash();
  select(start >= 0 ? start : 0);
  setState(root, "ready");
}

/**
 * A panel's preview: the picture of the card under the pointer or the
 * keyboard. Each card's picture (an image part, alt="") is moved into the
 * panel's preview part, in card order, inside a frame of its own; the first
 * one shows until another card is pointed at or focused, and the last one
 * chosen stays. The chosen card is marked active at once and the other rows
 * rest (tabs.css).
 *
 * A switch slides like the case studies' slideshow, on the list's axis: a
 * card further down brings its picture up from below, one further up brings
 * it down from above, and the pictures lag behind their frames (parallax,
 * runtime/slide.js). A switch asked for mid-move waits for it to end, and
 * only the last one asked for plays. Reduced motion switches at once.
 *
 * The preview is stamped ready while it is laid out; when Designer hides it
 * (on phones) the stamp goes and the rows stop resting, since no picture
 * says which row is chosen. Without JavaScript the pictures stay in their
 * own rows and the preview is not shown (tabs.css). Nothing is copied or
 * generated; the pictures only move.
 */
function preview(panel, cards) {
  const box = part(panel, "preview");
  if (!box) return;
  const pairs = cards
    .map((card) => [card, part(card, "image")])
    .filter(([, picture]) => picture);
  if (pairs.length === 0) return;

  // The frame slides the full height of the box; the picture inside it
  // slides a fraction of that.
  const frames = pairs.map(([, picture]) => {
    const frame = document.createElement("div");
    frame.setAttribute("data-rc-part", "frame");
    frame.append(picture);
    box.append(frame);
    return frame;
  });

  let current = 0;
  let animating = false;
  /** The card asked for while a switch was under way, or null. */
  let pending = null;

  const mark = (index) => {
    pairs.forEach(([card], i) => setState(card, i === index ? "active" : null));
  };

  function play(index) {
    const incoming = frames[index];
    const outgoing = frames[current];
    const direction = Math.sign(index - current);
    current = index;
    pending = null;
    animating = true;
    setState(incoming, "entering");
    setState(outgoing, "leaving");
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    const { animations, finished } = slideFrames({
      incoming,
      outgoing,
      axis: "y",
      direction,
      duration: prefersReducedMotion() ? 0 : PREVIEW_DURATION * 1000,
      parallax: PREVIEW_PARALLAX,
    });
    const settle = () => {
      animating = false;
      if (pending !== null) play(pending);
    };
    finished.then(() => {
      setState(incoming, "active");
      setState(outgoing, null);
      incoming.style.zIndex = "";
      outgoing.style.zIndex = "";
      // Drop the fills once the states above hide the outgoing frame.
      for (const animation of animations) animation.cancel();
      settle();
    }, settle);
  }

  function show(index) {
    if (index === (pending ?? current)) return;
    mark(index);
    if (animating) {
      pending = index === current ? null : index;
      return;
    }
    play(index);
  }

  pairs.forEach(([card], index) => {
    card.addEventListener("pointerenter", () => show(index));
    card.addEventListener("focus", () => show(index));
  });
  setState(frames[0], "active");
  mark(0);

  const measure = () => {
    setState(box, box.getClientRects().length > 0 ? "ready" : null);
  };
  measure();
  new ResizeObserver(measure).observe(box);
}

/**
 * Warn when a tab's typed count no longer matches its panel. The number is
 * content, so it lives in the HTML; a stale one is a Designer note, not
 * something the code may patch.
 */
function checkCount(element, cards, button, root) {
  if (!element) return;
  const typed = Number.parseInt(element.textContent.replace(/\D+/g, ""), 10);
  if (typed === cards) return;
  // The tab's visible name: without the count and any screen-reader text.
  const copy = button.cloneNode(true);
  copy
    .querySelectorAll('[data-rc-part="count"], .rc-sr-only')
    .forEach((el) => el.remove());
  const label = copy.textContent.replace(/\s+/g, " ").trim();
  warn(
    Number.isNaN(typed)
      ? `tabs: the count beside "${label}" is not a number.`
      : `tabs: "${label}" says ${typed} but its panel holds ${cards} card${cards === 1 ? "" : "s"} — update the number in Designer.`,
    root,
  );
}
