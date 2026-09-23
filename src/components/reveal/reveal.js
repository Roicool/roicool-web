/**
 * reveal.js — a section whose content plays in as it comes into view.
 *
 * Reconstructed from squareup.com's "Square AI" section. Three kinds of part,
 * any number of each:
 *   – `text`: split into lines and words (GSAP SplitText); the words rise
 *     from below their line, dim to full, one after the other, each line
 *     clipping the words still under it;
 *   – `rise`: rises and brightens as one block (body copy, a link);
 *   – `media`: fades in while a clip-path inset opens and whatever is inside
 *     (a video, a picture) settles from a slight zoom. A video inside plays
 *     while the root is on screen and pauses off screen.
 *
 * Two ways to drive it:
 *   – once (default): the first time a share of the root is on screen the
 *     reveal plays through on its own clock and stays;
 *   – scrubbed (`data-rc-scrub`): the reveal is tied to the scroll, from the
 *     root's top entering at the bottom of the viewport to the root sitting
 *     at its top — scrolling back winds it back, and a scroll that stops
 *     half-way snaps to whichever end is nearer, so the section lands in
 *     place. This is what the source site does with a full-viewport section.
 *
 * The content is never absent: the text sits complete in the HTML; in the
 * one-shot mode the split is reverted once the reveal has played, so the
 * DOM ends as it began. Start states come from reveal.css, gated on .rc-js,
 * on prefers-reduced-motion: no-preference and on the root carrying no state
 * yet; the code stamps `armed` once every part holds its start values
 * inline, `revealed` when the text has landed, `static` when motion is
 * reduced or GSAP did not arrive. No JS, no script: everything is visible
 * from the first paint.
 *
 * Structure and options: README.md in this folder.
 */

import {
  parts,
  option,
  flagOption,
  numberOption,
  setState,
} from "../../runtime/dom.js";
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
  loadGsap,
} from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** One-shot mode: share of the root on screen before the reveal plays. */
const DEFAULT_THRESHOLD = 0.25;
/**
 * One-shot mode: the observer reports at every twentieth of the root, so the
 * moment enough of it shows is caught whatever the threshold — and whatever
 * the root's height (see onceReveal).
 */
const OBSERVED_STEPS = Array.from({ length: 21 }, (_, i) => i / 20);
/** `data-rc-scrub` set to one of these keeps the one-shot mode. */
const SCRUB_OFF = new Set(["false", "no", "off"]);
/** One-shot mode: seconds between one word starting and the next. */
const DEFAULT_STAGGER = 0.06;
/** One-shot mode: seconds a word or a block takes to rise. */
const DEFAULT_DURATION = 0.9;
/** Scrubbed mode: seconds the reveal lags behind the scroll position. */
const DEFAULT_SCRUB = 0.6;
/** Words and blocks start this dim; media starts invisible. */
const DIM = 0.2;
const TEXT_EASE = "expo.out";
/** One-shot: blocks start a beat after the words, and a beat after each other. */
const RISE = { delay: 0.12, stagger: 0.08 };
/** One-shot media: a long fade, a quicker opening, a very slow settle. */
const MEDIA = {
  fade: 3,
  open: 1.2,
  zoom: 1.2,
  settle: 20,
  ease: "power2.out",
};
/**
 * Scrubbed timeline, 0 → 1 over the scroll range: the media opens over the
 * first half, the words follow from a tenth in, the blocks from the middle.
 */
const SCRUBBED = {
  media: { fade: 0.5, open: 0.6 },
  words: { start: 0.1, duration: 0.4, span: 0.4 },
  rises: { start: 0.5, duration: 0.4, stagger: 0.1 },
};
/**
 * Scrubbed mode never rests half-way: once scrolling stops, the page is
 * carried to whichever end is nearer. Same rule as the hero.
 */
const SNAP = {
  snapTo: [0, 1],
  directional: false,
  inertia: false,
  delay: 0.1,
  duration: { min: 0.5, max: 1.2 },
  ease: "power2.inOut",
};

/**
 * How far words and blocks rise: 10rem, capped at 20% of the viewport so
 * short screens keep them near their place. Same formula as the start state
 * in reveal.css.
 */
function riseDistance() {
  const rem = Number.parseFloat(
    getComputedStyle(document.documentElement).fontSize,
  );
  return Math.min(10 * rem, 0.2 * window.innerHeight);
}

/**
 * Videos inside the media parts play on screen and pause off screen; with
 * reduced motion they never play and their posters stand.
 */
function initVideos(root, videos) {
  if (videos.length === 0) return;
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
  });
  let onScreen = false;
  const sync = () => {
    const playing = onScreen && !document.hidden && !prefersReducedMotion();
    videos.forEach((video) => {
      if (playing) video.play().catch(() => {});
      else video.pause();
    });
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
}

export default async function reveal(root) {
  const texts = parts(root, "text");
  const rises = parts(root, "rise");
  const medias = parts(root, "media");
  if (texts.length + rises.length + medias.length === 0) {
    warn(
      'reveal needs at least one [data-rc-part="text"], "rise" or "media".',
      root,
    );
    return;
  }
  initVideos(
    root,
    medias.flatMap((media) => Array.from(media.querySelectorAll("video"))),
  );

  if (prefersReducedMotion()) {
    setState(root, "static");
    return;
  }

  // `data-rc-scrub` alone means the default lag, a number sets it (0 follows
  // the scroll exactly) and "false" keeps the one-shot mode.
  const scrubbed =
    root.hasAttribute("data-rc-scrub") &&
    !SCRUB_OFF.has(option(root, "scrub", "").toLowerCase());
  const scrub = scrubbed ? numberOption(root, "scrub", DEFAULT_SCRUB) : 0;
  const plugins = [];
  if (texts.length) plugins.push("SplitText");
  if (scrubbed) plugins.push("ScrollTrigger");
  const motion = await loadGsap(plugins);
  if (!motion) {
    warn("reveal: GSAP did not load — showing the section static.");
    setState(root, "static");
    return;
  }
  const { gsap, ScrollTrigger, SplitText } = motion;
  const rise = riseDistance();

  // Only the text parts are split; the accessible name stays whole
  // (aria: "auto" puts the full text on the element and hides the words).
  const splits = texts.map(
    (element) =>
      new SplitText(element, {
        type: "lines,words",
        linesClass: "rc-line",
        wordsClass: "rc-word",
        aria: "auto",
      }),
  );
  const words = splits.flatMap((split) => split.words);
  const mediaChildren = medias.flatMap((media) => Array.from(media.children));

  // Start values inline, then the state: stamping it releases the CSS start
  // states, so the split elements themselves — whose words took over the
  // dimming — render at full opacity.
  gsap.set(words, { opacity: DIM, y: rise });
  gsap.set(rises, { opacity: DIM, y: rise });
  gsap.set(medias, { autoAlpha: 0, clipPath: "inset(25%)" });
  gsap.set(mediaChildren, { scale: MEDIA.zoom });
  setState(root, "armed");

  if (scrubbed) {
    scrubbedReveal();
  } else {
    onceReveal();
  }

  /**
   * Tied to the scroll. Every tween is a fromTo with an explicit "from": on
   * a refresh (resize, fonts) the start value must not be read from the
   * page, which may be showing a state from anywhere along the range.
   * Nothing is reverted afterwards: the reveal has to be able to wind back.
   */
  function scrubbedReveal() {
    const snapOn = option(root, "snap") === null || flagOption(root, "snap");
    const wordStagger = SCRUBBED.words.span / Math.max(words.length - 1, 1);
    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top bottom",
        end: "top top",
        scrub,
        ...(snapOn ? { snap: SNAP } : {}),
        invalidateOnRefresh: true,
        onUpdate: (self) =>
          setState(root, self.progress >= 0.999 ? "revealed" : "armed"),
      },
    });
    timeline
      .fromTo(
        medias,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: SCRUBBED.media.fade },
        0,
      )
      .fromTo(
        medias,
        { clipPath: "inset(25%)" },
        {
          clipPath: "inset(0%)",
          duration: SCRUBBED.media.open,
          ease: "power2.out",
        },
        0,
      )
      .fromTo(
        mediaChildren,
        { scale: MEDIA.zoom },
        { scale: 1, duration: 1 },
        0,
      )
      .fromTo(
        words,
        { opacity: DIM, y: rise },
        {
          opacity: 1,
          y: 0,
          duration: SCRUBBED.words.duration,
          stagger: wordStagger,
          ease: "power2.out",
        },
        SCRUBBED.words.start,
      )
      .fromTo(
        rises,
        { opacity: DIM, y: rise },
        {
          opacity: 1,
          y: 0,
          duration: SCRUBBED.rises.duration,
          stagger: SCRUBBED.rises.stagger,
          ease: "power2.out",
        },
        SCRUBBED.rises.start,
      );
  }

  /** Plays once, on its own clock, the first time enough of the root shows. */
  function onceReveal() {
    const threshold = numberOption(root, "threshold", DEFAULT_THRESHOLD);
    const stagger = numberOption(root, "stagger", DEFAULT_STAGGER);
    const duration = numberOption(root, "duration", DEFAULT_DURATION);

    function play() {
      const timeline = gsap.timeline({
        defaults: { ease: TEXT_EASE },
        onComplete: () => {
          // Back to plain markup: the split reverted, nothing inline left,
          // so the text wraps with the viewport again and Designer's own
          // hover transforms on links are not outranked.
          splits.forEach((split) => split.revert());
          gsap.set(rises, { clearProps: "opacity,transform" });
          gsap.set(medias, { clearProps: "opacity,visibility,clipPath" });
          gsap.set(mediaChildren, { clearProps: "transform" });
        },
      });
      const textEnd = duration + stagger * Math.max(words.length - 1, 0);
      timeline
        .to(words, { opacity: 1, y: 0, duration, stagger }, 0)
        .to(
          rises,
          { opacity: 1, y: 0, duration, stagger: RISE.stagger },
          RISE.delay,
        )
        .to(medias, { autoAlpha: 1, duration: MEDIA.fade, ease: MEDIA.ease }, 0)
        .to(medias, { clipPath: "inset(0%)", duration: MEDIA.open }, 0)
        .to(
          mediaChildren,
          { scale: 1, duration: MEDIA.settle, ease: MEDIA.ease },
          0,
        )
        // The section reads as revealed once the text has landed; the media
        // keeps settling behind it.
        .call(() => setState(root, "revealed"), null, Math.max(textEnd, 0.01));
    }

    // Enough of the root shows when `threshold` of it is on screen — or, for
    // a root taller than the viewport, which can never show that share of
    // itself, when it covers `threshold` of the viewport.
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const viewport = entry.rootBounds?.height ?? window.innerHeight;
        const enough =
          entry.intersectionRatio >= threshold ||
          entry.intersectionRect.height >= threshold * viewport;
        if (!enough) return;
        watcher.disconnect();
        play();
      },
      { threshold: OBSERVED_STEPS },
    );
    watcher.observe(root);
  }
}
