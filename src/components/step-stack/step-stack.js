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
 * a scroll library: wide screens keep the frame in a full-height rail beside
 * the steps, narrow screens keep the whole stage at the top and let the
 * steps pass under it. This file only decides which step is current (the
 * last one whose top has crossed the trigger line) and plays the moves.
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

/** Pixels from the top of the viewport the frame docks at (wide screens). `data-rc-top`. */
const DEFAULT_TOP = 120;
/** Pixels left for a fixed header above the stage (narrow screens). `data-rc-header`. */
const DEFAULT_HEADER = 0;
/** Trigger line as a percent of the viewport height. `data-rc-line`. */
const DEFAULT_LINE = 50;
/** Seconds a move takes. `data-rc-duration`. */
const DEFAULT_DURATION = 0.9;
/** Percent of the frame the picture inside lags. `data-rc-parallax`. */
const DEFAULT_PARALLAX = 30;
/** Brightness a covered picture dims to, 0–1. `data-rc-dim`. */
const DEFAULT_DIM = 0.6;

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
    "--rc-step-stack-header",
    `${numberOption(root, "header", DEFAULT_HEADER)}px`,
  );
  root.style.setProperty(
    "--rc-step-stack-dim",
    String(numberOption(root, "dim", DEFAULT_DIM)),
  );
  root.style.setProperty("--rc-step-stack-duration", `${duration}ms`);

  let current = 0;
  let onScreen = false;

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

  /**
   * The current step's video plays while the stack is on screen; the others
   * pause and rewind. With reduced motion none plays and the posters stand.
   */
  function playVideos() {
    const playing = onScreen && !document.hidden && !prefersReducedMotion();
    medias.forEach((media, index) => {
      for (const video of media.querySelectorAll("video")) {
        video.muted = true;
        video.playsInline = true;
        if (playing && index === current) {
          video.play().catch(() => {});
        } else {
          video.pause();
          if (index !== current) video.currentTime = 0;
        }
      }
    });
  }

  /** Make step `index` the current one, sliding pictures as needed. */
  function go(index) {
    const from = current;
    if (index === from) return;
    current = index;
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
    steps.forEach((step, i) => setState(step, i === index ? "active" : null));
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

  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) aim();
      playVideos();
    },
    { threshold: 0 },
  ).observe(root);
  document.addEventListener("visibilitychange", playVideos);
  onMotionPreferenceChange(playVideos);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  setState(medias[0], "active");
  setState(steps[0], "active");
  setState(root, "ready");
  aim();
  playVideos();
}
