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
const DEFAULT_SCRUB = 0.8;

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
  // Collection List works with the part on the stage alone.
  return part(root, "track") ?? root.querySelector(".w-dyn-items");
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
  ScrollTrigger.config({ ignoreMobileResize: true });

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
  let trigger = null;

  function measure() {
    const viewport = document.documentElement.clientWidth;
    if (viewport < minimumWidth) {
      distance = 0;
      return distance;
    }
    // Where the row starts once its transform is taken away, and how much
    // of the viewport it may use.
    const x = Number(gsap.getProperty(track, "x")) || 0;
    const start = track.getBoundingClientRect().left - x;
    const end = Number.isNaN(inset) ? start : inset;
    distance = Math.round(track.scrollWidth - (viewport - start - end));
    if (distance < MINIMUM_TRAVEL) distance = 0;
    return distance;
  }

  function build() {
    trigger?.kill(true);
    trigger = null;
    gsap.set(track, { clearProps: "transform" });

    if (measure() <= 0) {
      setState(root, "static");
      return;
    }
    setState(root, "pinned");

    trigger = ScrollTrigger.create({
      trigger: stage,
      start: `top ${top}px`,
      end: () => `+=${distance}`,
      pin: stage,
      // The spacer grows the section by the travel, so the page below moves
      // down by exactly as much as the visitor scrolls while pinned.
      pinSpacing: true,
      scrub: scrub > 0 ? scrub : true,
      anticipatePin: 1,
      // A refresh (resize, fonts, images) measures the travel again before
      // the end and the tween's target are recomputed.
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      animation: gsap.fromTo(
        track,
        { x: 0 },
        { x: () => -distance, ease: "none" },
      ),
    });
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

    const y = trigger.start + target;
    const lenis = smoothScroll();
    if (lenis) lenis.scrollTo(y);
    else window.scrollTo({ top: y });
  });
}
