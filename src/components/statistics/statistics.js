/**
 * statistics.js — a row of figures (a big number, a caption) that roll into
 * place like an odometer when they come into view, and a photo that follows
 * the pointer while a card is under it.
 *
 * Reconstructed from riseatseven.com/about's "Global Offices" cards.
 *
 * Every figure is written in Designer as plain text ("75+", "8.4"). Once
 * the chunk runs, each character becomes a slot one character tall that
 * clips a column of every character the reel knows; the column waits pushed
 * down, blurred and invisible, and when the figure is far enough on screen
 * it rises to its character — one slot after another (statistics.css). The
 * original text stays in the markup for readers and bots, in a span that
 * only assistive technology sees; the columns are decoration.
 *
 * The cards are what the pointer is over; the photos are a separate stack
 * at the end of the root (n-th photo ↔ n-th card) that runtime/cursor-photo.js
 * moves to the pointer. Kept outside the cards so a narrow screen's
 * scrolling strip can clip freely. Photo only with a fine pointer that can
 * hover and a wide enough viewport.
 *
 * Without JavaScript the figures are plain text and the photos a small row.
 * With reduced motion nothing is rebuilt: the text stays, no photo follows.
 *
 * Structure and options: README.md in this folder.
 */

import { part, parts, numberOption, setState } from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { createCursorPhoto } from "../../runtime/cursor-photo.js";
import { warn } from "../../runtime/log.js";

/**
 * The characters a column carries, in the order they roll past. A character
 * that is not here gets a column of its own alone and does not roll.
 */
const REEL = Array.from("-.,0123456789#£$€₺%+KBMXx");
/** Below this viewport width no photo follows. `data-rc-min-width`. */
const DEFAULT_MINIMUM_WIDTH = 992;
/** Share of a figure that must be on screen before it rolls. `data-rc-threshold`. */
const DEFAULT_THRESHOLD = 0.4;
/** Seconds between one character's roll and the next. `data-rc-stagger`. */
const DEFAULT_STAGGER = 0.08;
const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Every statistics root on the page gets its own id prefix. */
let sequence = 0;

function span(partName, text) {
  const el = document.createElement("span");
  if (partName) el.setAttribute("data-rc-part", partName);
  if (text !== undefined) el.textContent = text;
  return el;
}

/**
 * Rebuild a figure as columns of characters, one per character of its
 * text, and keep the text itself for readers. Returns false when there is
 * nothing to roll.
 */
function buildReels(figure, stagger) {
  const text = figure.textContent.trim();
  if (!text) return false;
  const reader = span(null, text);
  reader.className = "rc-sr-only";
  const reels = span("reels");
  reels.setAttribute("aria-hidden", "true");
  Array.from(text).forEach((character, i) => {
    const slot = span("slot");
    // The target character, invisible: it gives the slot its width.
    const placeholder = span("placeholder", character);
    const column = span("column");
    const index = REEL.indexOf(character);
    for (const c of index >= 0 ? REEL : [character])
      column.append(span(null, c));
    column.style.setProperty(
      "--rc-statistics-offset",
      String(Math.max(index, 0)),
    );
    column.style.setProperty(
      "--rc-statistics-delay",
      `${(i * stagger).toFixed(2)}s`,
    );
    slot.append(placeholder, column);
    reels.append(slot);
  });
  figure.replaceChildren(reader, reels);
  return true;
}

export default function statistics(root) {
  const figures = parts(root, "figure");
  const cards = parts(root, "card");
  if (figures.length === 0 && cards.length === 0) {
    warn(
      'statistics needs [data-rc-part="figure"] numbers and [data-rc-part="card"] boxes.',
      root,
    );
    return;
  }
  const track = part(root, "track") ?? root;
  const photos = part(root, "photos");
  const cursor = photos && part(root, "cursor");
  const pictures = cursor ? Array.from(cursor.children) : [];
  if (cursor && pictures.length !== cards.length) {
    warn(
      `statistics: ${cards.length} cards but ${pictures.length} photos — put one photo in the cursor per card, in the same order. The extra ones are ignored.`,
      root,
    );
  }

  const reduced = prefersReducedMotion();
  const threshold = numberOption(root, "threshold", DEFAULT_THRESHOLD);
  const stagger = numberOption(root, "stagger", DEFAULT_STAGGER);
  const minimumWidth = numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH);

  // ---- The roll --------------------------------------------------------

  if (!reduced && figures.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setState(entry.target, "counted");
          observer.unobserve(entry.target);
        }
      },
      { threshold: Math.min(Math.max(threshold, 0), 1) },
    );
    for (const figure of figures) {
      if (buildReels(figure, stagger)) observer.observe(figure);
    }
  }

  // ---- The strip on a narrow screen -----------------------------------

  // Where Designer lets the track scroll sideways, the keyboard must reach
  // it too (WCAG 2.1.1): while it overflows it takes a tab stop — the arrow
  // keys then scroll it — named after the section's heading when there is
  // one. On a wide screen, where it does not scroll, it stays out of the
  // tab order.
  if (track !== root) {
    const heading = root.querySelector("h1, h2, h3, h4");
    if (heading && !heading.id) {
      heading.id = `rc-statistics-${(sequence += 1)}-heading`;
    }
    const syncScrollable = () => {
      if (track.scrollWidth > track.clientWidth + 1) {
        track.tabIndex = 0;
        track.setAttribute("role", "group");
        if (heading) track.setAttribute("aria-labelledby", heading.id);
      } else {
        track.removeAttribute("tabindex");
        track.removeAttribute("role");
        track.removeAttribute("aria-labelledby");
      }
    };
    new ResizeObserver(syncScrollable).observe(track);
    syncScrollable();
  }

  // ---- The photo at the pointer ---------------------------------------

  const finePointer = window.matchMedia(FINE_POINTER);
  const capable = window.matchMedia(
    `${FINE_POINTER} and (min-width: ${minimumWidth}px)`,
  );
  const photo =
    cursor && !reduced
      ? createCursorPhoto({ cursor, pictures, within: track, capable })
      : null;

  /** The card under the pointer. */
  let activeCard = null;

  function select(card) {
    if (card === activeCard) return;
    if (activeCard) setState(activeCard, null);
    activeCard = card;
    setState(card, "active");
    photo?.show(cards.indexOf(card));
  }

  function clear() {
    if (activeCard) setState(activeCard, null);
    activeCard = null;
    photo?.hide();
  }

  const cardOf = (target) =>
    target instanceof Element ? target.closest('[data-rc-part="card"]') : null;

  track.addEventListener("pointerover", (event) => {
    if (!finePointer.matches) return;
    const card = cardOf(event.target);
    // Between two cards there is no card, and no photo.
    if (card && cards.includes(card)) select(card);
    else clear();
  });
  track.addEventListener("pointerleave", (event) => {
    if (event.pointerType === "mouse") clear();
  });

  setState(root, reduced ? "static" : "ready");
}
