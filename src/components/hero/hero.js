/**
 * hero.js — the scroll-choreographed, pinned home hero.
 *
 * Reconstructed from squareup.com's HomePageV3Hero: the start states and the
 * timing live in CSS + this file, the scroll progress is GSAP ScrollTrigger
 * with the stage pinned for the length of the track.
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
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion, loadGsap } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Progress timeline, 0 → 1 over the track. Values follow the source site. */
const PRIMARY = { end: 0.35, rise: "2rem", stagger: 0.014 };
const SECONDARY_WORDS = { start: 0.4, duration: 0.5, stagger: 0.015 };
const TILES = { start: 0.4, duration: 0.46, stagger: 0.023 };
const MEDIA_EXIT = { start: 0.3, duration: 0.4 };

const PORTRAIT = "(max-width: 767px)";

/** Autoplay only while on screen; portrait poster on small screens. */
function initVideo(root) {
  const video = part(root, "media")?.querySelector("video");
  if (!video) return;

  const portraitPoster = option(root, "poster-portrait");
  if (portraitPoster && window.matchMedia(PORTRAIT).matches) {
    video.poster = portraitPoster;
  }

  video.muted = true;
  video.playsInline = true;
  new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      }
    },
    { threshold: 0.05 },
  ).observe(video);
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
  if (!box?.width) {
    const x = frame.width * 0.12;
    const y = frame.height * 0.12;
    return `inset(${y}px ${x}px ${y}px ${x}px round 32px)`;
  }
  const radius =
    Number.parseFloat(getComputedStyle(tileCenter).borderTopLeftRadius) || 0;
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
  const media = part(root, "media");
  const tileCenter = part(root, "tile-center");
  const heading = part(root, "secondary")?.querySelector("h2, h3");
  const tiles = parts(root, "tile");
  const tileImages = tiles
    .map((tile) => tile.querySelector("img:not([src$='.svg'])"))
    .filter(Boolean);

  const titleWords = splitWords(SplitText, title);
  const headingWords = splitWords(SplitText, heading);

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
      scrub: true,
      anticipatePin: 1,
      // Function-based values (the media's target clip) are measured again on
      // every refresh: resize, orientation change, fonts arriving.
      invalidateOnRefresh: true,
      refreshPriority: numberOption(root, "priority", 10),
    },
  });

  timeline
    .fromTo(
      titleWords,
      { opacity: 0.2, y: PRIMARY.rise },
      { opacity: 1, y: 0, duration: PRIMARY.end, stagger: PRIMARY.stagger },
      0,
    )
    .fromTo(
      actions ? Array.from(actions.children) : [],
      { opacity: 0.2, y: PRIMARY.rise },
      { opacity: 1, y: 0, duration: PRIMARY.end, stagger: PRIMARY.stagger },
      0,
    )
    // The media leaves by being clipped down to the centre tile's box: the
    // video turns into one tile of the mosaic. Content is not scaled, only
    // cropped, so it stays sharp and the tile shows exactly what was there.
    .fromTo(
      media ?? [],
      { clipPath: "inset(0px 0px 0px 0px round 0px)" },
      {
        clipPath: () => mediaExitClip(media, tileCenter),
        duration: MEDIA_EXIT.duration,
      },
      MEDIA_EXIT.start,
    )
    .to(
      [title, actions].filter(Boolean),
      { opacity: 0, duration: MEDIA_EXIT.duration },
      MEDIA_EXIT.start,
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
