/**
 * step-stack.js — a column of steps (number, title, a few lines) with one
 * picture frame that stays put while the steps scroll past it. Each step
 * has its own picture; when a step reaches the trigger line its picture
 * slides up into the frame over the previous one, which dims underneath.
 * Scrolling back slides it out again.
 *
 * Reconstructed from webnomads.com's "Driving growth by design", with the
 * picture changes turned into eased slides (runtime/slide.js's move) instead
 * of the scroll-locked pile.
 *
 * The pinning is the browser's own `position: sticky` (step-stack.css), not
 * a scroll library, and only on wide screens, where the frame rides in a
 * full-height rail beside the steps. Narrow screens — Webflow's tablet
 * breakpoint and below — get the frame once, static, above the steps, with
 * the first picture in it: nothing sticks and no picture moves; only the
 * steps' highlight follows the scroll. This file decides which step is
 * current (the last one whose top has crossed the trigger line) and plays
 * the moves.
 *
 * Without JavaScript the frame is a small gallery of every picture above the
 * steps; the steps themselves are plain text in every case.
 *
 * Structure and options: README.md in this folder.
 */

import { part, parts, numberOption, setState } from "../../runtime/dom.js";
import {
  prefersReducedMotion,
  onMotionPreferenceChange,
} from "../../runtime/motion.js";
import { SLIDE_EASING, pictureOf } from "../../runtime/slide.js";
import { warn } from "../../runtime/log.js";

/** Pixels from the top of the viewport the frame docks at. `data-rc-top`. */
const DEFAULT_TOP = 120;
/** Trigger line as a percent of the viewport height. `data-rc-line`. */
const DEFAULT_LINE = 50;
/** Seconds a move takes. `data-rc-duration`. */
const DEFAULT_DURATION = 0.9;
/** Percent of the frame the picture inside lags. `data-rc-parallax`. */
const DEFAULT_PARALLAX = 30;
/** Brightness a covered picture dims to, 0–1. `data-rc-dim`. */
const DEFAULT_DIM = 0.6;
/**
 * A move still running when a newer one starts is sped up to this rate, so
 * a fast scroll never queues slides: the frame keeps up with the steps.
 */
const CATCH_UP_RATE = 3;
/** Where the frame is pinned and the pictures move; step-stack.css agrees. */
const WIDE = "(min-width: 992px)";
/** The pictures are fetched and decoded once the stack is this close. */
const PREPARE_MARGIN = "100% 0px";

export default function stepStack(root) {
  const stage = part(root, "stage");
  const frame = part(root, "frame");
  const steps = parts(root, "step");
  const medias = parts(root, "media");
  if (!stage || !frame || steps.length === 0 || medias.length === 0) {
    warn(
      'step-stack needs [data-rc-part="stage"] > [data-rc-part="frame"] > [data-rc-part="media"] and [data-rc-part="step"] elements.',
      root,
    );
    return;
  }
  if (steps.length !== medias.length) {
    warn(
      `step-stack: ${steps.length} steps but ${medias.length} pictures — the extra ones are ignored.`,
      root,
    );
  }
  const count = Math.min(steps.length, medias.length);

  const duration = numberOption(root, "duration", DEFAULT_DURATION) * 1000;
  const parallax = numberOption(root, "parallax", DEFAULT_PARALLAX);
  const line = numberOption(root, "line", DEFAULT_LINE) / 100;
  root.style.setProperty(
    "--rc-step-stack-top",
    `${numberOption(root, "top", DEFAULT_TOP)}px`,
  );
  root.style.setProperty(
    "--rc-step-stack-dim",
    String(numberOption(root, "dim", DEFAULT_DIM)),
  );
  root.style.setProperty("--rc-step-stack-duration", `${duration}ms`);
  const wide = window.matchMedia(WIDE);

  /** The current step. */
  let current = 0;
  /** The picture in the frame: follows `current` on wide screens, 0 on narrow. */
  let shown = 0;
  /** Some of the stack is in the viewport: only then is the line measured. */
  let onScreen = false;
  /** The frame itself is in the viewport: only then does a video play. */
  let frameOnScreen = false;
  /** The stack is within a viewport of showing: time to fetch the pictures. */
  let near = false;

  /** The move under way on each picture, so a reversal plays it backwards. */
  const moves = new Map();

  /** Slide a picture into the frame ("in") or out below it ("out"). */
  function slide(media, to) {
    const running = moves.get(media);
    if (
      running &&
      running.to !== to &&
      running.animations[0].playState === "running"
    ) {
      for (const a of running.animations) a.reverse();
      running.to = to;
      return;
    }
    if (running) for (const a of running.animations) a.cancel();
    // A newer move takes over: whatever else is still moving wraps up fast.
    // The sign keeps a reversed move going backwards.
    for (const [other, record] of moves) {
      if (other === media) continue;
      for (const a of record.animations) {
        if (a.playState !== "running") continue;
        a.updatePlaybackRate(Math.sign(a.playbackRate) * CATCH_UP_RATE);
      }
    }
    const ms = prefersReducedMotion() ? 0 : duration;
    const timing = { duration: ms, easing: SLIDE_EASING, fill: "both" };
    const frameKeyframes =
      to === "in"
        ? [{ translate: "0 100%" }, { translate: "0 0" }]
        : [{ translate: "0 0" }, { translate: "0 100%" }];
    const animations = [media.animate(frameKeyframes, timing)];
    const picture = pictureOf(media);
    if (picture) {
      const pictureKeyframes =
        to === "in"
          ? [{ translate: `0 -${parallax}%` }, { translate: "0 0" }]
          : [{ translate: "0 0" }, { translate: `0 -${parallax}%` }];
      animations.push(picture.animate(pictureKeyframes, timing));
    }
    const record = { animations, to };
    moves.set(media, record);
    Promise.all(animations.map((a) => a.finished)).then(
      () => {
        if (moves.get(media) !== record) return;
        moves.delete(media);
        // Out: hide first, then drop the fill, so nothing flashes back.
        if (record.to === "out") setState(media, null);
        for (const a of animations) a.cancel();
      },
      () => {},
    );
  }

  /** Cancel every move; the states alone then decide what shows. */
  function settle() {
    for (const { animations } of moves.values()) {
      for (const a of animations) a.cancel();
    }
    moves.clear();
  }

  /**
   * Put picture `index` in the frame — wide screens only. `instant` skips
   * the move (the layout just changed under the stack).
   */
  function show(index, instant = false) {
    const from = shown;
    if (index === from && !instant) return;
    shown = index;
    if (instant) {
      settle();
      medias.forEach((media, i) =>
        setState(media, i < index ? "under" : i === index ? "active" : null),
      );
      return;
    }
    if (index > from) {
      // Forward: the pictures passed go under; the new one slides in on top.
      for (let k = from; k < index; k += 1) setState(medias[k], "under");
      setState(medias[index], "active");
      slide(medias[index], "in");
    } else {
      // Back: the pictures left behind slide out below; the one underneath
      // comes back to full.
      for (let k = index + 1; k <= from; k += 1) {
        if (medias[k].getAttribute("data-rc-state")) slide(medias[k], "out");
      }
      setState(medias[index], "active");
    }
  }

  /** Narrow screens: the first picture, static; nothing moves. */
  function rest() {
    settle();
    shown = 0;
    medias.forEach((media, i) => setState(media, i === 0 ? "active" : null));
  }

  /**
   * Every picture is fetched and decoded ahead of its step, so the first
   * paint of a picture never waits for a decode mid-move. Wide screens
   * only: narrow ones show the first picture alone.
   */
  let prepared = false;
  function prepare() {
    if (prepared || !near || !wide.matches) return;
    prepared = true;
    for (const media of medias) {
      for (const image of media.querySelectorAll("img")) {
        image.loading = "eager";
        image.decoding = "async";
        image.decode().catch(() => {});
      }
    }
  }

  /**
   * The shown picture's video plays while the frame is on screen; the
   * others pause and rewind. With reduced motion none plays.
   */
  function playVideos() {
    const playing =
      frameOnScreen && !document.hidden && !prefersReducedMotion();
    medias.forEach((media, index) => {
      for (const video of media.querySelectorAll("video")) {
        video.muted = true;
        video.playsInline = true;
        if (playing && index === shown) {
          video.play().catch(() => {});
        } else {
          video.pause();
          if (index !== shown) video.currentTime = 0;
        }
      }
    });
  }

  /** Make step `index` the current one; on wide screens its picture follows. */
  function go(index) {
    if (index === current) return;
    current = index;
    steps.forEach((step, i) => setState(step, i === index ? "active" : null));
    if (wide.matches) show(index);
    playVideos();
  }

  /** The last step whose top has crossed the trigger line. */
  function aim() {
    const y = window.innerHeight * line;
    let index = 0;
    for (let i = 0; i < count; i += 1) {
      if (steps[i].getBoundingClientRect().top <= y) index = i;
    }
    go(index);
  }

  // One measurement per frame, and none while the stack is scrolled out of
  // view: nothing can cross the line there. Coming back into view aims once
  // at the spot the page landed on (a jump, a reload half-way down).
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      if (onScreen) aim();
    });
  }

  /** The layout changed under the stack (a resize, a rotation). */
  function layout() {
    if (wide.matches) {
      show(current, true);
      prepare();
    } else {
      rest();
    }
    playVideos();
  }

  new IntersectionObserver(
    ([entry]) => {
      near = entry.isIntersecting;
      prepare();
    },
    { rootMargin: PREPARE_MARGIN },
  ).observe(root);
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) aim();
    },
    { threshold: 0 },
  ).observe(root);
  new IntersectionObserver(
    ([entry]) => {
      frameOnScreen = entry.isIntersecting;
      playVideos();
    },
    { threshold: 0 },
  ).observe(frame);
  document.addEventListener("visibilitychange", playVideos);
  onMotionPreferenceChange(playVideos);
  wide.addEventListener("change", layout);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  setState(steps[0], "active");
  layout();
  setState(root, "ready");
  aim();
}
