/**
 * hero.js — the scroll-choreographed, pinned home hero.
 *
 * Reconstructed from squareup.com's HomePageV3Hero. Two movements:
 *   – on load, the tag, the title and the CTAs rise into place as three
 *     blocks (time-based);
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
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
  loadGsap,
} from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/**
 * Entrance on load: tag, title and CTAs rise into place one block after the
 * other. Not scroll-bound. Start values match hero.critical.css.
 */
const INTRO = {
  duration: 0.9,
  stagger: 0.12,
  rise: "1.5rem",
  ease: "power3.out",
};

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
 * snapTo is resolved in snapRule(): distance, or direction after a key press.
 */
const SNAP = {
  inertia: false,
  delay: 0.1,
  duration: { min: 0.5, max: 1.2 },
  ease: "power2.inOut",
};

/**
 * Keys that scroll the page. A snap that follows a press this recent goes
 * the way the press went, not to the nearer end: a single PageDown or Space
 * lands short of half-way, and "nearer" would carry it straight back up.
 * Wheel and touch keep the distance rule.
 */
const SCROLL_KEYS = new Set([
  "ArrowDown",
  "ArrowUp",
  "PageDown",
  "PageUp",
  " ",
]);
const KEY_SNAP_WINDOW = 1500;

const PORTRAIT = "(max-width: 767px)";

/** `SNAP` with snapTo resolved: by direction after a key, by distance else. */
function snapRule() {
  let keyedUntil = 0;
  document.addEventListener(
    "keydown",
    (event) => {
      if (SCROLL_KEYS.has(event.key)) {
        keyedUntil = performance.now() + KEY_SNAP_WINDOW;
      }
    },
    { passive: true },
  );
  return {
    ...SNAP,
    snapTo: (value, self) =>
      performance.now() < keyedUntil
        ? self.direction < 0
          ? 0
          : 1
        : value < 0.5
          ? 0
          : 1,
  };
}

/** The named timing functions a transition may report, as bezier points. */
const NAMED_EASINGS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** y for a given x on a CSS cubic-bezier easing; identity when unknown. */
function bezierAt(easing, x) {
  const match = /cubic-bezier\(([^)]+)\)/.exec(easing);
  const points = match
    ? match[1].split(",").map(Number)
    : NAMED_EASINGS[easing.trim()];
  if (!points || points.length !== 4) return x;
  const [x1, y1, x2, y2] = points;
  const along = (t, a, b) =>
    3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t ** 2 * b + t ** 3;
  let low = 0;
  let high = 1;
  let t = x;
  for (let i = 0; i < 24; i += 1) {
    t = (low + high) / 2;
    if (along(t, x1, x2) < x) low = t;
    else high = t;
  }
  return along(t, y1, y2);
}

const NUMBER = /-?\d*\.?\d+(?:e[-+]?\d+)?/g;

/**
 * The rest of a transition as keyframes: from `current` (its value at
 * `progress`) to `end`, along the same easing, sampled so each segment
 * plays linear. Works number by number, so "50% 50%" carries as well.
 */
function remainingKeyframes(current, end, easing, progress, steps = 32) {
  const from = (current.match(NUMBER) ?? []).map(Number);
  const to = (end.match(NUMBER) ?? []).map(Number);
  const y0 = bezierAt(easing, progress);
  const frames = [];
  for (let i = 0; i <= steps; i += 1) {
    const share =
      y0 >= 1
        ? 1
        : (bezierAt(easing, progress + ((1 - progress) * i) / steps) - y0) /
          (1 - y0);
    let n = 0;
    frames.push(
      end.replace(NUMBER, () => {
        const value = from[n] + (to[n] - from[n]) * share;
        n += 1;
        return String(value);
      }),
    );
  }
  return frames;
}

const toCamel = (property) =>
  property.replace(/^-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());

/**
 * The pin moves the stage in the DOM — when it is set up and on every
 * refresh — and each move makes the video a new element to CSS: its
 * first-paint reveal (hero.critical.css, a transition out of
 * @starting-style) started again from black, three seconds long. Before the
 * first move, whatever is left of that reveal is handed to the Web
 * Animations API, which survives a move: the same curve from where it
 * stands to its end, over the time it had left. The CSS transition is
 * switched off on the element for good, so no later move can restart it.
 */
function carryVideoReveal(video) {
  if (!video?.getAnimations) return;
  const computed = getComputedStyle(video);
  const carried = [];
  for (const transition of video.getAnimations()) {
    const property = transition.transitionProperty;
    if (!property) continue;
    const timing = transition.effect.getComputedTiming();
    // Time fraction, not `timing.progress`: browsers report that one with
    // the easing already applied, and the curve is sampled by time.
    const elapsed = (transition.currentTime ?? 0) - timing.delay;
    if (
      timing.progress === null ||
      !timing.duration ||
      elapsed < 0 ||
      elapsed >= timing.duration
    ) {
      continue;
    }
    carried.push({
      property,
      easing: timing.easing,
      progress: elapsed / timing.duration,
      remaining: timing.duration - elapsed,
      current: computed.getPropertyValue(property),
    });
  }
  // Cancels the transitions: the element now holds their end values, and
  // the animations below take over before anything is painted.
  video.style.transition = "none";
  if (carried.length === 0) return;
  const settled = getComputedStyle(video);
  for (const { property, easing, progress, remaining, current } of carried) {
    const end = settled.getPropertyValue(property);
    const frames = remainingKeyframes(current, end, easing, progress);
    video.animate(
      frames.map((value) => ({ [toCamel(property)]: value })),
      { duration: remaining, easing: "linear" },
    );
  }
}

/**
 * The video plays whenever any part of the hero is on screen and pauses off
 * screen to save power; with reduced motion it never plays and the poster
 * stands. Portrait poster on small screens. Returns the function that
 * applies the rule, for the pin below to call once it has moved the stage.
 */
function initVideo(root) {
  const video = part(root, "media")?.querySelector("video");
  if (!video) return () => {};

  const portraitPoster = option(root, "poster-portrait");
  if (portraitPoster && window.matchMedia(PORTRAIT).matches) {
    video.poster = portraitPoster;
  }

  video.muted = true;
  video.playsInline = true;

  let onScreen = false;
  const sync = () => {
    if (onScreen && !document.hidden && !prefersReducedMotion()) {
      if (video.paused) video.play().catch(() => {});
    } else video.pause();
  };

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    },
    { threshold: 0 },
  ).observe(root);
  document.addEventListener("visibilitychange", sync);
  onMotionPreferenceChange(sync);
  return sync;
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
    setState(root, "static");
    return;
  }

  const playVideo = initVideo(root);
  // Reduced motion: no timeline, and hero.critical.css lays the two screens
  // out on their own. The state only says the code has been here.
  if (prefersReducedMotion()) {
    setState(root, "static");
    return;
  }

  const motion = await loadGsap(["ScrollTrigger", "SplitText"]);
  if (!motion) {
    warn("hero: GSAP did not load — showing the hero static.");
    setState(root, "static");
    return;
  }
  const { gsap, ScrollTrigger, SplitText } = motion;

  // The pin wraps the stage in a spacer; a video that move paused is started
  // again once the move has settled — after the frame, never during it.
  const resumeVideo = () => requestAnimationFrame(playVideo);

  const primary = part(root, "primary");
  const tag = part(root, "tag");
  const title = part(root, "title");
  const actions = part(root, "actions");
  const media = part(root, "media");
  const footer = part(root, "footer");
  const tileCenter = part(root, "tile-center");
  const heading = part(root, "secondary")?.querySelector("h2, h3");
  const tiles = parts(root, "tile");
  const tileImages = tiles
    .map((tile) => tile.querySelector("img:not([src$='.svg'])"))
    .filter(Boolean);

  // Only the second heading is split: its words rise with the scroll. The
  // title moves as one block and keeps its markup untouched.
  const headingWords = splitWords(SplitText, heading);

  // Snapping is on unless the root says data-rc-snap="false".
  const snapOn = option(root, "snap") === null || flagOption(root, "snap");

  // Entrance. Tag, title and CTAs sit invisible and low from the critical
  // CSS; from here they rise into place one after the other. A visitor who
  // arrives already scrolled simply sees the exit below take over.
  const entrance = [tag, title, actions].filter(Boolean);
  gsap.fromTo(
    entrance,
    { opacity: 0, y: INTRO.rise },
    {
      opacity: 1,
      y: 0,
      duration: INTRO.duration,
      stagger: INTRO.stagger,
      ease: INTRO.ease,
      // Nothing inline once done: an inline transform on the CTA row would
      // outrank the buttons' own :hover and :active transforms from Designer.
      onComplete: () => gsap.set(entrance, { clearProps: "opacity,transform" }),
    },
  );

  // The pin is about to move the stage; the video's reveal must outlive that.
  carryVideoReveal(media?.querySelector("video"));

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
      ...(snapOn ? { snap: snapRule() } : {}),
      anticipatePin: 1,
      // Function-based values (the media's target clip) are measured again on
      // every refresh: resize, orientation change, fonts arriving.
      invalidateOnRefresh: true,
      refreshPriority: numberOption(root, "priority", 10),
      onRefresh: resumeVideo,
    },
  });
  resumeVideo();

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
    // The whole primary layer fades, not its children: the entrance above
    // owns the children's opacity, and two tweens must never share a target.
    // autoAlpha, not opacity: at zero GSAP also sets visibility hidden, so the
    // faded layer — which stays above the grid in z-order — stops catching
    // the pointer and drops out of the tab order; scrolling back restores it.
    .fromTo(
      primary ? [primary] : [title, actions].filter(Boolean),
      { autoAlpha: 1 },
      { autoAlpha: 0, duration: MEDIA_EXIT.duration },
      MEDIA_EXIT.start,
    )
    // The footer strip shrinks into the leaving video and is gone before the
    // clip reaches it. Same autoAlpha: it sits above the bottom tiles.
    .fromTo(
      footer ?? [],
      { autoAlpha: 1, scale: 1, transformOrigin: "50% 100%" },
      {
        autoAlpha: 0,
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
