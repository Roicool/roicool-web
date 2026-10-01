/**
 * hero-video-scroll.js — a sticky hero scene. A portrait video in the
 * centre grows from a tilted, half-size card into a straight, full-size one
 * as the page scrolls, while two large words on either side of it drift up
 * at different speeds — one behind the video, one in front — and, when the
 * scene first comes into view, rise into place letter by letter.
 *
 * Reconstructed from riseatseven.com/culture "Est. 2019"; the values are the
 * source's.
 *
 * The scene (`stage`) is position: sticky inside the root. On mouse and
 * trackpad devices the root is two stage heights tall, so the stage stays
 * put for one stage height of scrolling, and the timeline runs over exactly
 * that distance (GSAP ScrollTrigger, scrubbed 1:1). Touch devices, reduced
 * motion, a GSAP that never arrives and no JavaScript at all get the plain
 * scene: one screen tall, the video straight, the words in place — the
 * source hands touch devices the same.
 *
 * The start states (tilted frame, hidden words) come from
 * hero-video-scroll.critical.css, gated on .rc-js, on a fine pointer, on
 * prefers-reduced-motion: no-preference and on the root carrying no state
 * yet; the code stamps `armed` once every animated element holds its start
 * values inline, `static` when the scene is not wanted, and either releases
 * them.
 *
 * Structure and options: README.md in this folder.
 */

import { part, parts, numberOption, setState } from "../../runtime/dom.js";
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
  loadGsap,
} from "../../runtime/motion.js";
import { warn } from "../../runtime/log.js";

/** Only mouse and trackpad devices get the scene; the source does the same. */
const FINE_POINTER = "(pointer: fine)";

/**
 * The frame's start, and the corner it starts with: CSS custom properties
 * on the root, so the critical CSS shows the same start before the code
 * runs. `--rc-hero-video-scroll-tilt`, `-scale`, `-radius-start`.
 */
const DEFAULT_TILT = -5;
const DEFAULT_SCALE = 0.5;
const DEFAULT_START_RADIUS = "2.5rem";

/**
 * Viewport heights each word drifts up over the scene: the one behind the
 * video half a screen, the one in front a full screen — the difference is
 * the parallax.
 */
const DRIFT = { back: 0.5, front: 1 };

/** Letters: each rises from below its line, one after the other, once. */
const LETTERS = {
  duration: 0.5,
  ease: "power4.out",
  stagger: 0.015,
  start: "top 85%",
};
/** Seconds before the first letter moves. `data-rc-delay`. */
const DEFAULT_DELAY = 1;

/** A custom property of the root as a number, or `fallback`. */
function numberProperty(root, name, fallback) {
  const value = Number.parseFloat(
    getComputedStyle(root).getPropertyValue(`--rc-hero-video-scroll-${name}`),
  );
  return Number.isNaN(value) ? fallback : value;
}

/**
 * The video plays whenever any part of the scene is on screen and pauses
 * off screen; with reduced motion it never plays and the poster stands.
 */
function initVideo(root, video) {
  if (!video) return;
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
}

export default async function heroVideoScroll(root) {
  const stage = part(root, "stage");
  const frame = part(root, "frame");
  if (!stage || !frame) {
    warn(
      'hero-video-scroll needs [data-rc-part="stage"] with a [data-rc-part="frame"] inside it.',
      root,
    );
    setState(root, "static");
    return;
  }
  initVideo(root, frame.querySelector("video"));

  const back = part(root, "heading-back");
  const front = part(root, "heading-front");
  const texts = parts(root, "text");
  const finePointer = window.matchMedia(FINE_POINTER);
  const wanted = () => finePointer.matches && !prefersReducedMotion();

  let motion = null;
  let loading = null;
  /** The built scene, with the function that takes it down again. */
  let scene = null;

  /**
   * Build the scene once a fine pointer and motion are both on, take it
   * down when either goes — a visitor does flip reduced motion mid-session,
   * and a convertible does change its pointer.
   */
  async function apply() {
    if (!wanted()) {
      scene?.kill();
      scene = null;
      setState(root, "static");
      return;
    }
    if (scene) return;
    if (!motion) {
      loading ??= loadGsap(["ScrollTrigger", "SplitText"]);
      motion = await loading;
      if (!motion) {
        warn(
          "hero-video-scroll: GSAP did not load — showing the scene static.",
        );
        setState(root, "static");
        return;
      }
      // The preference may have flipped, or a second call may have built
      // the scene, while the library was on its way.
      if (!wanted()) {
        setState(root, "static");
        return;
      }
      if (scene) return;
    }
    scene = build(motion);
    setState(root, "armed");
    // The words settle once web fonts are in; measure the triggers again.
    document.fonts?.ready.then(() => motion.ScrollTrigger.refresh());
  }

  function build({ gsap, ScrollTrigger, SplitText }) {
    const tilt = numberProperty(root, "tilt", DEFAULT_TILT);
    const scale = numberProperty(root, "scale", DEFAULT_SCALE);
    const startRadius =
      getComputedStyle(root)
        .getPropertyValue("--rc-hero-video-scroll-radius-start")
        .trim() || DEFAULT_START_RADIUS;
    const delay = numberOption(root, "delay", DEFAULT_DELAY);

    // Only the words are split. They sit aria-hidden behind a visually
    // hidden heading that carries the whole phrase (README); a heading used
    // as a word keeps its full text in aria-label the SplitText way.
    const splits = texts.map((text) => {
      const split = new SplitText(text, {
        type: "chars,words",
        charsClass: "rc-char",
        wordsClass: "rc-word",
        aria: text.matches("h1, h2, h3, h4, h5, h6, a, button")
          ? "auto"
          : "none",
      });
      gsap.set(split.chars, { yPercent: 125 });
      return split;
    });

    // Every animated element now holds its start values inline (the frame's
    // come with the fromTo below, rendered at once). Stamping the state
    // releases the CSS start states — and lets the frame's own corner, where
    // it lands, be read: the start-state rule was overriding it.
    setState(root, "armed");
    const restRadius = getComputedStyle(frame).borderRadius;

    const timeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        // The stage is stuck for the root's height beyond its own: that is
        // the scene, whatever height Designer gave the section.
        end: () => `+=${Math.max(1, root.offsetHeight - stage.offsetHeight)}`,
        scrub: true,
        invalidateOnRefresh: true,
        refreshPriority: numberOption(root, "priority", 9),
      },
    });
    // Every tween is a fromTo with an explicit "from": on a refresh the
    // start value must not be read from the page, which may be showing a
    // state from anywhere along the scene.
    timeline.fromTo(
      frame,
      { rotation: tilt, scale, borderRadius: startRadius },
      { rotation: 0, scale: 1, borderRadius: restRadius },
      0,
    );
    for (const [layer, share] of [
      [back, DRIFT.back],
      [front, DRIFT.front],
    ]) {
      if (!layer) continue;
      timeline.fromTo(
        layer,
        { y: 0 },
        { y: () => -window.innerHeight * share },
        0,
      );
    }

    const entrances = splits.map((split) =>
      gsap.to(split.chars, {
        yPercent: 0,
        duration: LETTERS.duration,
        ease: LETTERS.ease,
        stagger: LETTERS.stagger,
        delay,
        scrollTrigger: {
          trigger: split.elements[0],
          start: LETTERS.start,
          once: true,
        },
      }),
    );

    return {
      kill() {
        timeline.scrollTrigger?.kill();
        timeline.kill();
        for (const tween of entrances) {
          tween.scrollTrigger?.kill();
          tween.kill();
        }
        for (const split of splits) split.revert();
        gsap.set([frame, back, front].filter(Boolean), {
          clearProps: "transform,borderRadius",
        });
      },
    };
  }

  finePointer.addEventListener("change", apply);
  onMotionPreferenceChange(apply);
  await apply();
}
