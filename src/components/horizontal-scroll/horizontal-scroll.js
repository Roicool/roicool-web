/**
 * horizontal-scroll.js — a row of cards that travels sideways while the page
 * scrolls: the section pins for as long as the row needs to pass, then lets
 * go.
 *
 * The root is the section. `stage` is the block that is pinned (heading, the
 * row, whatever else sits with it); `track` is the Collection List whose
 * items are the cards. The code measures how far the row overshoots the
 * viewport, pins the stage with GSAP ScrollTrigger for exactly that much
 * scrolling (the same pin the hero uses, kept in step with Lenis), and
 * scrubs the row across as the page moves.
 *
 * When the row fits (narrow layouts, few cards), the visitor asked for
 * reduced motion, or GSAP did not arrive, nothing pins: the row stays a
 * plain sideways-scrollable strip, which is also what the CSS shows without
 * JavaScript. Keyboard focus on a card that is out of view scrolls the page
 * until the card is in view.
 *
 * Structure and options: README.md in this folder.
 */

import { part, numberOption, setState } from "../../runtime/dom.js";
import { loadGsap, prefersReducedMotion } from "../../runtime/motion.js";
import { smoothScroll } from "../../runtime/scroll.js";
import { warn } from "../../runtime/log.js";

/** Milliseconds a resize is allowed to settle before the pin is rebuilt. */
const REBUILD_DELAY = 150;

/**
 * Seconds the row takes to catch up with the scroll position. Following it
 * 1:1 reads as harsh; a short lag rounds every start and stop off.
 * `data-rc-scrub` changes it; 0 follows exactly.
 */
const DEFAULT_SCRUB = 0.3;

/**
 * Share of the travel the row covers while the section is still scrolling
 * into view, before the pin. The row is already moving when the pin lands,
 * so the moment reads as a continuation rather than a stop. Capped by
 * LEAD_VIEWPORT_SHARE of the viewport width.
 */
const LEAD_SHARE = 0.25;
const LEAD_VIEWPORT_SHARE = 0.2;

/** A row overshooting by less than this is treated as fitting: no pin. */
const MINIMUM_TRAVEL = 24;

/**
 * Below this viewport width nothing pins, whatever the layout: a scroll-
 * driven sideways row on a phone hijacks the one gesture the visitor has.
 * `data-rc-min-width` changes it.
 */
const DEFAULT_MINIMUM_WIDTH = 768;

function findTrack(root) {
  // Explicit part first; fall back to Webflow's own list class so a plain
  // Collection List works with the part on the stage alone. The fallback is
  // stamped as the part: the CSS selects the track that way.
  const track = part(root, "track");
  if (track) return track;
  const list = root.querySelector(".w-dyn-items");
  list?.setAttribute("data-rc-part", "track");
  return list;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default async function horizontalScroll(root) {
  const stage = part(root, "stage");
  const track = findTrack(root);
  if (!stage || !track) {
    warn(
      'horizontal-scroll needs [data-rc-part="stage"] (the pinned block) and a Collection List inside it.',
      root,
    );
    return;
  }
  if (track.children.length === 0) return;
  if (prefersReducedMotion()) {
    setState(root, "static");
    return;
  }

  const motion = await loadGsap(["ScrollTrigger"]);
  if (!motion) {
    warn("horizontal-scroll: GSAP did not load — leaving the row static.");
    setState(root, "static");
    return;
  }
  const { gsap, ScrollTrigger } = motion;

  // Pixels between the viewport's top and the pinned stage: room for a fixed
  // header. Also the stage's height shortfall, through the CSS variable.
  const top = numberOption(root, "top", 0);
  root.style.setProperty("--rc-horizontal-scroll-top", `${top}px`);
  // Space kept free at the row's end; NaN mirrors the space at its start.
  const inset = numberOption(root, "inset", Number.NaN);
  const minimumWidth = numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH);
  const scrub = numberOption(root, "scrub", DEFAULT_SCRUB);

  /** Pixels the row has to travel; 0 means it fits and nothing pins. */
  let distance = 0;
  /** Pixels of that travel spent before the pin, as the section scrolls in. */
  let lead = 0;
  /** The pin itself; `trigger.start` is the scroll position it begins at. */
  let trigger = null;
  /** Watches the whole range, entrance included, and positions the row. */
  let driver = null;
  /** Moves the row to a target x, easing over `scrub` seconds. */
  let glide = null;

  function measure() {
    const viewport = document.documentElement.clientWidth;
    if (viewport < minimumWidth) {
      distance = 0;
      lead = 0;
      return distance;
    }
    // Where the row starts once its transform is taken away, and how much
    // of the viewport it may use.
    const x = Number(gsap.getProperty(track, "x")) || 0;
    const start = track.getBoundingClientRect().left - x;
    const end = Number.isNaN(inset) ? start : inset;
    distance = Math.round(track.scrollWidth - (viewport - start - end));
    if (distance < MINIMUM_TRAVEL) distance = 0;
    lead = Math.round(
      Math.min(distance * LEAD_SHARE, viewport * LEAD_VIEWPORT_SHARE),
    );
    return distance;
  }

  /** Scroll position at which the stage's top enters the viewport. */
  const entrance = () => trigger.start - (window.innerHeight - top);

  /**
   * How far the row has travelled at scroll position `y`: a slow drift of
   * `lead` while the stage scrolls into view, then 1:1 while pinned.
   */
  function travelAt(y) {
    const pinStart = trigger.start;
    if (y < pinStart) {
      const from = entrance();
      return lead * clamp((y - from) / (pinStart - from || 1), 0, 1);
    }
    return lead + clamp(y - pinStart, 0, distance - lead);
  }

  /** The scroll position at which the row has travelled `travelled` px. */
  function scrollFor(travelled) {
    const pinStart = trigger.start;
    if (travelled <= lead) {
      const from = entrance();
      return from + (pinStart - from) * (lead ? travelled / lead : 0);
    }
    return pinStart + (travelled - lead);
  }

  function place(y, immediate = false) {
    const x = -travelAt(y);
    if (immediate || !glide) gsap.set(track, { x });
    else glide(x);
  }

  function build() {
    driver?.kill(true);
    trigger?.kill(true);
    driver = null;
    trigger = null;
    gsap.set(track, { clearProps: "transform" });

    if (measure() <= 0) {
      setState(root, "static");
      // A pin-spacer that has just gone moved everything below it; every
      // trigger on the page measures again.
      ScrollTrigger.refresh();
      return;
    }
    setState(root, "pinned");

    // The pin: from the stage's top reaching the pin line, for the travel
    // that remains after the entrance drift. The spacer grows the section by
    // exactly that much, so the page below moves down by as much as the
    // visitor scrolls while pinned.
    trigger = ScrollTrigger.create({
      trigger: stage,
      start: `top ${top}px`,
      end: () => `+=${distance - lead}`,
      pin: stage,
      pinSpacing: true,
      // A refresh (resize, fonts, images) measures the travel again before
      // the end is recomputed.
      invalidateOnRefresh: true,
      onRefreshInit: measure,
    });

    // The motion, one owner for x: from the stage entering at the bottom of
    // the viewport to the end of the pin, the row is placed from the scroll
    // position on every change, easing there over `scrub` seconds.
    glide =
      scrub > 0
        ? gsap.quickTo(track, "x", { duration: scrub, ease: "power1.out" })
        : null;
    driver = ScrollTrigger.create({
      trigger: stage,
      start: "top bottom",
      end: () => `+=${window.innerHeight - top + distance - lead}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => place(self.scroll()),
      onRefresh: (self) => place(self.scroll(), true),
    });
    // The pin-spacer just added moved everything below it: every trigger on
    // the page (the hero's, another row's) measures again.
    ScrollTrigger.refresh();
    place(window.scrollY, true);
  }

  // Cards resize as images arrive and breakpoints change: the travel can go
  // to zero (a column layout on a phone) or back, so the pin is rebuilt
  // rather than merely refreshed.
  let rebuild = 0;
  const scheduleRebuild = () => {
    clearTimeout(rebuild);
    rebuild = setTimeout(build, REBUILD_DELAY);
  };
  let firstSize = true;
  new ResizeObserver(() => {
    // The first callback fires on observe(); build() below covers it.
    if (firstSize) {
      firstSize = false;
      return;
    }
    scheduleRebuild();
  }).observe(track);
  window.addEventListener("resize", scheduleRebuild);
  build();

  // A card focused from the keyboard may sit beyond the viewport's edge;
  // the browser cannot scroll a transformed row, so move the page to the
  // scroll position that brings the card into view.
  root.addEventListener("focusin", (event) => {
    if (!trigger || distance <= 0) return;
    const card = Array.from(track.children).find((el) =>
      el.contains(event.target),
    );
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const viewport = document.documentElement.clientWidth;
    if (rect.left >= 0 && rect.right <= viewport) return;

    const travelled = -(Number(gsap.getProperty(track, "x")) || 0);
    const start = rect.left - track.getBoundingClientRect().left;
    const visible = track.scrollWidth - distance;
    let target = travelled;
    if (start + rect.width - travelled > visible) {
      target = start + rect.width - visible;
    }
    if (start - travelled < 0) target = start;
    target = clamp(target, 0, distance);

    const y = scrollFor(target);
    const lenis = smoothScroll();
    if (lenis) lenis.scrollTo(y);
    else window.scrollTo({ top: y });
  });
}
