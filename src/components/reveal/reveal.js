/**
 * reveal.js — a section whose content plays in once it scrolls into view.
 *
 * Reconstructed from squareup.com's "Square AI" section. Three kinds of part,
 * any number of each, revealed together the first time a share of the root
 * is on screen:
 *   – `text`: split into lines and words (GSAP SplitText); the words rise
 *     from below their line, dim to full, one after the other, each line
 *     clipping the words still under it;
 *   – `rise`: rises and brightens as one block (body copy, a link);
 *   – `media`: fades in while a clip-path inset opens and whatever is inside
 *     (a video, a picture) settles from a slight zoom over a long, slow
 *     breath. A video inside plays while the root is on screen and pauses
 *     off screen.
 *
 * The content is never absent: the text sits complete in the HTML and the
 * split is reverted once the reveal has played, so the DOM ends as it
 * began. Start states come from reveal.css, gated on .rc-js, on
 * prefers-reduced-motion: no-preference and on the root carrying no state
 * yet; the code stamps `armed` once every part holds its start values
 * inline, `revealed` when the text has landed, `static` when motion is
 * reduced or GSAP did not arrive. No JS, no script: everything is visible
 * from the first paint.
 *
 * Structure and options: README.md in this folder.
 */

import { parts, numberOption, setState } from "../../runtime/dom.js";
import { prefersReducedMotion, loadGsap } from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Share of the root that must be on screen before the reveal plays. */
const DEFAULT_THRESHOLD = 0.25;
/** Seconds between one word starting and the next. */
const DEFAULT_STAGGER = 0.06;
/** Seconds a word or a block takes to rise. */
const DEFAULT_DURATION = 0.9;
/** Words and blocks start this dim; media starts invisible. */
const DIM = 0.2;
const TEXT_EASE = "expo.out";
/** Blocks start a beat after the words, and a beat after each other. */
const RISE = { delay: 0.12, stagger: 0.08 };
/** The media reveal: a long fade, a quicker opening, a very slow settle. */
const MEDIA = {
  fade: 3,
  open: 1.2,
  zoom: 1.2,
  settle: 20,
  ease: "power2.out",
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

/** Videos inside the media parts play on screen and pause off screen. */
function initVideos(root, videos) {
  if (videos.length === 0) return;
  videos.forEach((video) => {
    video.muted = true;
    video.playsInline = true;
  });
  let onScreen = false;
  const sync = () => {
    videos.forEach((video) => {
      if (onScreen && !document.hidden) video.play().catch(() => {});
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
  const motion = await loadGsap(texts.length ? ["SplitText"] : []);
  if (!motion) {
    warn("reveal: GSAP did not load — showing the section static.");
    setState(root, "static");
    return;
  }
  const { gsap, SplitText } = motion;

  const threshold = numberOption(root, "threshold", DEFAULT_THRESHOLD);
  const stagger = numberOption(root, "stagger", DEFAULT_STAGGER);
  const duration = numberOption(root, "duration", DEFAULT_DURATION);
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

  function play() {
    const timeline = gsap.timeline({
      defaults: { ease: TEXT_EASE },
      onComplete: () => {
        // Back to plain markup: the split reverted, nothing inline left, so
        // the text wraps with the viewport again and Designer's own hover
        // transforms on links are not outranked.
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

  const watcher = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      watcher.disconnect();
      play();
    },
    { threshold },
  );
  watcher.observe(root);
}
