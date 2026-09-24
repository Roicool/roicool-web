/**
 * step-stack.js — a column of steps (number, title, a few lines) with one
 * picture frame that stays put while the steps scroll past it. Each step
 * has its own picture; as a step approaches the trigger line its picture
 * slides up into the frame over the previous one, which dims underneath,
 * and scrolling back slides it out again.
 *
 * Reconstructed from webnomads.com's "Driving growth by design".
 *
 * The moves are driven by the scroll position, not by a clock: every frame
 * each picture's place is computed from where its step is, so the frame can
 * never fall behind a fast scroll, never queues moves, and a change of
 * direction simply runs the same path backwards. A short scrub (an
 * exponential lag) rounds off the steps of a mouse wheel; with Lenis the
 * scroll is smooth already.
 *
 * The pinning is the browser's own `position: sticky` (step-stack.css), not
 * a scroll library, and only on wide screens, where the frame rides in a
 * full-height rail beside the steps. Narrow screens — Webflow's tablet
 * breakpoint and below — get the frame once, static, above the steps, with
 * the first picture in it: nothing sticks and no picture moves; only the
 * steps' highlight follows the scroll.
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
import { pictureOf } from "../../runtime/slide.js";
import { warn } from "../../runtime/log.js";

/** Pixels from the top of the viewport the frame docks at. `data-rc-top`. */
const DEFAULT_TOP = 120;
/** Trigger line as a percent of the viewport height. `data-rc-line`. */
const DEFAULT_LINE = 50;
/**
 * Scroll distance a picture takes to slide in, as a percent of the viewport
 * height, ending as its step's top reaches the line. `data-rc-zone`.
 */
const DEFAULT_ZONE = 25;
/** Seconds of lag the pictures trail the scroll by. `data-rc-scrub`. */
const DEFAULT_SCRUB = 0.12;
/** Percent of the frame the picture inside lags. `data-rc-parallax`. */
const DEFAULT_PARALLAX = 30;
/** Brightness a covered picture dims to, 0–1. `data-rc-dim`. */
const DEFAULT_DIM = 0.6;
/** How much a covered picture shrinks. */
const UNDER_SCALE = 0.04;
/** A zone never spans more than this share of the way from the step before. */
const ZONE_SHARE = 0.9;
/** Where the frame is pinned and the pictures move; step-stack.css agrees. */
const WIDE = "(min-width: 992px)";
/** The pictures are fetched and decoded once the stack is this close. */
const PREPARE_MARGIN = "100% 0px";
/**
 * Below this gap the scrub snaps to its target. Invisible: smoothstep is
 * flat at both ends, so the eased gap is a hundredth of this.
 */
const SETTLED = 0.01;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
/** Ease applied to a picture's progress along its zone. */
const smoothstep = (t) => t * t * (3 - 2 * t);

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
  const pictures = medias.map(pictureOf);

  const line = numberOption(root, "line", DEFAULT_LINE) / 100;
  const zone = numberOption(root, "zone", DEFAULT_ZONE) / 100;
  const scrub = numberOption(root, "scrub", DEFAULT_SCRUB) * 1000;
  const parallax = numberOption(root, "parallax", DEFAULT_PARALLAX);
  root.style.setProperty(
    "--rc-step-stack-top",
    `${numberOption(root, "top", DEFAULT_TOP)}px`,
  );
  root.style.setProperty(
    "--rc-step-stack-dim",
    String(numberOption(root, "dim", DEFAULT_DIM)),
  );
  const wide = window.matchMedia(WIDE);

  /** The current step. */
  let current = 0;
  /** The picture on top of the frame: `current` on wide screens, 0 on narrow. */
  let shown = 0;
  /** Some of the stack is in the viewport: only then is anything measured. */
  let onScreen = false;
  /** The frame itself is in the viewport: only then does a video play. */
  let frameOnScreen = false;
  /** The stack is within a viewport of showing: time to fetch the pictures. */
  let near = false;

  /**
   * How far each picture is into the frame, 0 (below it) to 1 (in place):
   * where the scroll says it should be, and where it is shown right now —
   * the two differ while the scrub catches up. The first picture is always
   * in place.
   */
  const target = medias.map((_, k) => (k === 0 ? 1 : 0));
  const progress = target.slice();
  /** What each picture last rendered as, so the DOM is only written on change. */
  const rendered = medias.map(() => ({ eased: NaN, cover: NaN, state: "" }));

  /** Measure where every picture should be and which step is current. */
  function measure() {
    const lineY = window.innerHeight * line;
    const reduced = prefersReducedMotion();
    let index = 0;
    let previousTop = steps[0].getBoundingClientRect().top;
    for (let k = 1; k < count; k += 1) {
      const top = steps[k].getBoundingClientRect().top;
      // The distance still to travel until this step reaches the line: the
      // picture slides in over the last `zone` of it, and is in place when
      // the step is.
      const remaining = top - lineY;
      if (remaining <= 0) index = k;
      const span = Math.min(
        zone * window.innerHeight,
        ZONE_SHARE * Math.max(top - previousTop, 1),
      );
      target[k] = reduced
        ? remaining <= 0
          ? 1
          : 0
        : clamp(1 - remaining / span, 0, 1);
      previousTop = top;
    }
    return index;
  }

  /** Write one picture's place: its slide, its parallax, its dimming. */
  function render(k) {
    const media = medias[k];
    const eased = smoothstep(progress[k]);
    // Covered by the next picture as far as that one has come in.
    const cover = k + 1 < count ? smoothstep(progress[k + 1]) : 0;
    const last = rendered[k];
    if (eased !== last.eased) {
      media.style.translate = eased >= 1 ? "" : `0 ${(1 - eased) * 100}%`;
      const picture = pictures[k];
      if (picture) {
        picture.style.translate =
          eased >= 1 ? "" : `0 ${-parallax * (1 - eased)}%`;
      }
    }
    if (cover !== last.cover) {
      media.style.scale = cover <= 0 ? "" : String(1 - UNDER_SCALE * cover);
      media.style.setProperty("--rc-step-stack-cover", String(cover));
    }
    const state =
      eased <= 0
        ? null
        : eased < 1
          ? "entering"
          : cover > 0
            ? "under"
            : "active";
    if (state !== last.state) setState(media, state);
    rendered[k] = { eased, cover, state };
  }

  /** Every picture back to its resting place, inline styles gone. */
  function clear() {
    medias.forEach((media, k) => {
      media.style.translate = "";
      media.style.scale = "";
      media.style.removeProperty("--rc-step-stack-cover");
      if (pictures[k]) pictures[k].style.translate = "";
      rendered[k] = { eased: NaN, cover: NaN, state: "" };
    });
  }

  // The frame loop: runs on scroll and resize, and keeps running while the
  // scrub is still catching up. Nothing runs while the stack is off screen.
  let scheduled = false;
  let lastFrame = 0;
  function tick(now = performance.now(), instant = false) {
    scheduled = false;
    if (!onScreen || !wide.matches) return;
    const index = measure();
    const elapsed = lastFrame ? Math.min(now - lastFrame, 100) : 16;
    lastFrame = now;
    // No lag when told to land at once, when the scrub is off, or under
    // reduced motion — the scrub itself would be a short slide.
    const lag =
      instant || scrub <= 0 || prefersReducedMotion()
        ? 0
        : Math.exp(-elapsed / scrub);
    let settling = false;
    for (let k = 1; k < count; k += 1) {
      const gap = target[k] - progress[k];
      if (Math.abs(gap) <= SETTLED) progress[k] = target[k];
      else {
        progress[k] = target[k] - gap * lag;
        settling = true;
      }
    }
    for (let k = 0; k < count; k += 1) render(k);
    go(index);
    if (settling) schedule();
    else lastFrame = 0;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame((now) => tick(now));
  }

  /** Narrow screens: the first picture, static; nothing moves. */
  function rest() {
    clear();
    for (let k = 1; k < count; k += 1) target[k] = progress[k] = 0;
    medias.forEach((media, k) => setState(media, k === 0 ? "active" : null));
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

  /** Make step `index` the current one; on wide screens its picture is on top. */
  function go(index) {
    if (index === current) return;
    current = index;
    steps.forEach((step, i) => setState(step, i === index ? "active" : null));
    if (wide.matches) shown = index;
    playVideos();
  }

  /** The layout changed under the stack (a resize, a rotation). */
  function layout() {
    if (wide.matches) {
      shown = current;
      clear();
      prepare();
      tick(performance.now(), true);
    } else {
      shown = 0;
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
      // Coming into view lands wherever the page is (a jump, a reload
      // half-way down): no catching up to watch.
      if (onScreen) tick(performance.now(), true);
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
  onMotionPreferenceChange(() => {
    playVideos();
    schedule();
  });
  wide.addEventListener("change", layout);
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  setState(steps[0], "active");
  if (wide.matches) {
    // Before the observer reports, the first picture is in place.
    render(0);
  } else {
    rest();
  }
  setState(root, "ready");
}
