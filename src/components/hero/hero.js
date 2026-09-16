/**
 * hero.js — the scroll-choreographed, pinned home hero.
 *
 * Reconstructed from squareup.com's HomePageV3Hero. Two movements:
 *   – on load, the title words and CTAs rise into place (time-based);
 *   – on scroll, with the stage pinned for the length of the track, the video
 *     is clipped down into the centre tile of a mosaic that scales in around
 *     it while the second heading rises (GSAP ScrollTrigger, scrubbed).
 *
 * Progressive by design:
 *   – the start states (dimmed words, shrunken tiles) come from
 *     hero.critical.css, inline in the head, gated on .rc-js, on
 *     prefers-reduced-motion: no-preference and on the root not carrying a
 *     data-rc-state yet — no JS or reduced motion means everything is simply
 *     visible from the first paint;
 *   – GSAP is fetched on demand (runtime/motion.js). If it never arrives the
 *     hero stamps data-rc-state="static", which releases the start states, and
 *     the page reads as a normal static section.
 *
 * Structure and options: README.md in this folder.
 */

import {
  part,
  parts,
  flagOption,
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion, loadGsap } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Entrance on load: title words and CTAs rise into place. Not scroll-bound. */
const INTRO = { duration: 1, stagger: 0.05, rise: "2rem", ease: "power3.out" };

/**
 * Scroll timeline, 0 → 1 over the track. Values follow the source site.
 * The media exit spends its first `corner` share rounding the corners in
 * place, so the video is already a rounded card when it starts to shrink.
 */
const MEDIA_EXIT = {
  start: 0.3,
  duration: 0.4,
  corner: 0.15,
  ease: "power2.inOut",
};
const FOOTER_EXIT = {
  start: 0.3,
  duration: 0.24,
  scale: 0.7,
  ease: "power2.in",
};
const SECONDARY_WORDS = { start: 0.4, duration: 0.5, stagger: 0.015 };
const TILES = { start: 0.4, duration: 0.46, stagger: 0.023 };

/** Scrub lag in seconds: the timeline eases towards the scroll position. */
const SCRUB = 0.6;

/**
 * The choreography never rests half-way: once scrolling stops, the page is
 * carried to whichever end is nearer. Plain distance, no momentum guess —
 * with smoothed scrolling the measured velocity is not a reliable intent.
 */
const SNAP = {
  snapTo: [0, 1],
  directional: false,
  inertia: false,
  delay: 0.1,
  duration: { min: 0.5, max: 1.2 },
  ease: "power2.inOut",
};

const PORTRAIT = "(max-width: 767px)";

/**
 * The video plays whenever any part of the hero is on screen, and pauses
 * off screen to save power. Anything else that pauses it while on screen —
 * the pin moving the stage in the DOM, a tab switch — is undone on the next
 * frame. Portrait poster on small screens.
 */
function initVideo(root) {
  const video = part(root, "media")?.querySelector("video");
  if (!video) return;

  const portraitPoster = option(root, "poster-portrait");
  if (portraitPoster && window.matchMedia(PORTRAIT).matches) {
    video.poster = portraitPoster;
  }

  video.muted = true;
  video.playsInline = true;

  let onScreen = false;
  const play = () => {
    if (onScreen && !document.hidden && video.paused) {
      video.play().catch(() => {});
    }
  };

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) play();
      else video.pause();
    },
    { threshold: 0 },
  ).observe(root);
  video.addEventListener("pause", () => requestAnimationFrame(play));
  document.addEventListener("visibilitychange", play);
}

/**
 * How far the secondary heading rises: 10rem, capped at 20% of the viewport
 * so short screens keep it in view. Must match the start state in
 * hero.critical.css, which uses the same formula in CSS.
 */
function secondaryRise() {
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Math.min(10 * rem, 0.2 * window.innerHeight);
}

function splitWords(SplitText, element) {
  if (!element) return [];
  return new SplitText(element, {
    type: "lines,words",
    linesClass: "rc-line",
    wordsClass: "rc-word",
    aria: "auto",
  }).words;
}

/** The element's top-left corner radius in px; a percentage is of its width. */
function cornerRadius(element, box) {
  const value = getComputedStyle(element).borderTopLeftRadius;
  const number = Number.parseFloat(value) || 0;
  return value.endsWith("%") ? (number / 100) * box.width : number;
}

/** The corner the media lands with: the centre tile's own, or a default. */
function landingRadius(tileCenter) {
  const box = tileCenter?.getBoundingClientRect();
  return box?.width ? cornerRadius(tileCenter, box) : 32;
}

/** Full-bleed, corners rounded to the landing radius: the exit's first step. */
function mediaRoundedClip(tileCenter) {
  return `inset(0px 0px 0px 0px round ${landingRadius(tileCenter)}px)`;
}

/**
 * Where the media ends up: clipped to the centre tile's box, so the video
 * becomes one tile of the mosaic while the others scale in around it. The
 * corner radius is the tile's own. Measured again on every ScrollTrigger
 * refresh (invalidateOnRefresh), so breakpoints, resizes and late fonts keep
 * it aligned. Without a tile-center part the media shrinks to a centred window.
 */
function mediaExitClip(media, tileCenter) {
  const frame = media.getBoundingClientRect();
  const box = tileCenter?.getBoundingClientRect();
  const radius = landingRadius(tileCenter);
  if (!box?.width) {
    const x = frame.width * 0.12;
    const y = frame.height * 0.12;
    return `inset(${y}px ${x}px ${y}px ${x}px round ${radius}px)`;
  }
  const top = box.top - frame.top;
  const right = frame.right - box.right;
  const bottom = frame.bottom - box.bottom;
  const left = box.left - frame.left;
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${radius}px)`;
}

export default async function hero(root) {
  const stage = part(root, "stage");
  if (!stage) {
    warn('hero needs a [data-rc-part="stage"] to pin.', root);
    return;
  }

  initVideo(root);
  if (prefersReducedMotion()) return;

  const motion = await loadGsap(["ScrollTrigger", "SplitText"]);
  if (!motion) {
    warn("hero: GSAP did not load — showing the hero static.");
    setState(root, "static");
    return;
  }
  const { gsap, ScrollTrigger, SplitText } = motion;

  // Mobile browsers resize the viewport as the address bar hides; refreshing
  // the pin on every such resize makes it jump.
  ScrollTrigger.config({ ignoreMobileResize: true });

  const title = part(root, "title");
  const actions = part(root, "actions");
  const actionItems = actions ? Array.from(actions.children) : [];
  const media = part(root, "media");
  const footer = part(root, "footer");
  const tileCenter = part(root, "tile-center");
  const heading = part(root, "secondary")?.querySelector("h2, h3");
  const tiles = parts(root, "tile");
  const tileImages = tiles
    .map((tile) => tile.querySelector("img:not([src$='.svg'])"))
    .filter(Boolean);

  const titleWords = splitWords(SplitText, title);
  const headingWords = splitWords(SplitText, heading);

  // Snapping is on unless the root says data-rc-snap="false".
  const snapOn = option(root, "snap") === null || flagOption(root, "snap");

  // Entrance. The words and CTAs sit dimmed and low from the critical CSS;
  // from here they rise into place. A visitor who arrives already scrolled
  // simply sees the exit below take over.
  gsap.fromTo(
    [...titleWords, ...actionItems],
    { opacity: 0.2, y: INTRO.rise },
    {
      opacity: 1,
      y: 0,
      duration: INTRO.duration,
      stagger: INTRO.stagger,
      ease: INTRO.ease,
    },
  );

  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      pin: stage,
      // The root is already taller than the stage; that height is the scroll
      // distance, so no spacer must be added.
      pinSpacing: false,
      scrub: SCRUB,
      ...(snapOn ? { snap: SNAP } : {}),
      anticipatePin: 1,
      // Function-based values (the media's target clip) are measured again on
      // every refresh: resize, orientation change, fonts arriving.
      invalidateOnRefresh: true,
      refreshPriority: numberOption(root, "priority", 10),
    },
  });

  // Every exit is a fromTo with an explicit "from": its start value must not
  // be read from the page, which may still be showing the CSS start states
  // or, on a reload mid-way down, a state from further along.
  const cornerDuration = MEDIA_EXIT.duration * MEDIA_EXIT.corner;
  timeline
    // The media leaves in two steps. First its corners round in place, so it
    // reads as a card before it moves; then it is clipped down to the centre
    // tile's box and the video turns into one tile of the mosaic. Content is
    // not scaled, only cropped, so it stays sharp and the tile shows exactly
    // what was there.
    .fromTo(
      media ?? [],
      { clipPath: "inset(0px 0px 0px 0px round 0px)" },
      {
        clipPath: () => mediaRoundedClip(tileCenter),
        duration: cornerDuration,
        ease: "power1.out",
      },
      MEDIA_EXIT.start,
    )
    .fromTo(
      media ?? [],
      { clipPath: () => mediaRoundedClip(tileCenter) },
      {
        clipPath: () => mediaExitClip(media, tileCenter),
        duration: MEDIA_EXIT.duration - cornerDuration,
        ease: MEDIA_EXIT.ease,
        immediateRender: false,
      },
      MEDIA_EXIT.start + cornerDuration,
    )
    .fromTo(
      [title, actions].filter(Boolean),
      { opacity: 1 },
      { opacity: 0, duration: MEDIA_EXIT.duration },
      MEDIA_EXIT.start,
    )
    // The footer strip shrinks into the leaving video and is gone before the
    // clip reaches it.
    .fromTo(
      footer ?? [],
      { opacity: 1, scale: 1, transformOrigin: "50% 100%" },
      {
        opacity: 0,
        scale: FOOTER_EXIT.scale,
        duration: FOOTER_EXIT.duration,
        ease: FOOTER_EXIT.ease,
      },
      FOOTER_EXIT.start,
    )
    .fromTo(
      headingWords,
      { opacity: 0.2, y: secondaryRise() },
      {
        opacity: 1,
        y: 0,
        duration: SECONDARY_WORDS.duration,
        stagger: SECONDARY_WORDS.stagger,
      },
      SECONDARY_WORDS.start,
    )
    .fromTo(
      tiles,
      { opacity: 0, scale: 0.25, visibility: "hidden" },
      {
        opacity: 1,
        scale: 1,
        visibility: "inherit",
        duration: TILES.duration,
        stagger: TILES.stagger,
      },
      TILES.start,
    )
    .fromTo(
      tileImages,
      { scale: 1.5 },
      { scale: 1, duration: TILES.duration, stagger: TILES.stagger },
      TILES.start,
    );

  // Every animated element now carries its start values inline. Stamping the
  // state releases the CSS start states, so the title and heading themselves
  // — whose words took over the dimming — render at full opacity.
  setState(root, "armed");

  // The grid settles once web fonts are in; measure the media's target again.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
}
