/**
 * steps.js — a pinned scene that walks through its steps as the page
 * scrolls: each step is a full-frame picture or video with a title and a
 * few lines over it, and a row of numbered markers shows where you are.
 *
 * Reconstructed from superpower.com's "How it works". The root is the
 * section; the `stage` is pinned for as long as the steps need (GSAP
 * ScrollTrigger, the same pin the hero and horizontal-scroll use, kept in
 * step with Lenis), and the scroll position over that length picks the
 * step. Steps never skip: the shown step walks towards the one the scroll
 * asks for one at a time, each move playing through — a fast scroll shows
 * every step in order.
 *
 * A move is the slideshow's slide, turned vertical (runtime/slide.js): the
 * new step's media comes in from the bottom (from the top when going back),
 * the old one leaves through the other side dimming, the pictures inside
 * lag behind. The text of the old step fades out quickly; the new text
 * fades in and settles a beat later.
 *
 * Without JavaScript, under reduced motion, without GSAP or below
 * `data-rc-min-width`, nothing pins: the steps are a plain column, media
 * over text, every one visible, the markers hidden — a control with nothing
 * to do. All the text is in the HTML in every case.
 *
 * Structure and options: README.md in this folder.
 */

import { part, parts, numberOption, setState } from "../../runtime/dom.js";
import { prefersReducedMotion, loadGsap } from "../../runtime/motion.js";
import { smoothScroll } from "../../runtime/scroll.js";
import { slideFrames } from "../../runtime/slide.js";
import { warn } from "../../runtime/log.js";

/** Seconds a move takes. `data-rc-duration`. */
const DEFAULT_DURATION = 0.9;
/** Percent of the frame the pictures inside move. `data-rc-parallax`. */
const DEFAULT_PARALLAX = 30;
/** Brightness the leaving media dims to, 0–1. `data-rc-dim`. */
const DEFAULT_DIM = 0.5;
/** Viewport heights of scrolling per step. `data-rc-length`. */
const DEFAULT_LENGTH = 150;
/** Below this viewport width nothing pins. `data-rc-min-width`. */
const DEFAULT_MINIMUM_WIDTH = 0;
/** The text's exit and entrance, from the source site. */
const CONTENT = {
  out: 200,
  in: 900,
  delay: 220,
  rise: "1.5rem",
  ease: "cubic-bezier(0.22, 0.61, 0.36, 1)",
};
/** Milliseconds a resize is allowed to settle before the pin is rebuilt. */
const REBUILD_DELAY = 150;

export default async function steps(root) {
  const stage = part(root, "stage");
  const stepList = parts(root, "step");
  if (!stage || stepList.length === 0) {
    warn(
      'steps needs a [data-rc-part="stage"] with [data-rc-part="step"] children.',
      root,
    );
    return;
  }
  const markers = parts(root, "marker");
  markers.forEach((marker) => {
    if (marker.tagName === "BUTTON") marker.type = "button";
  });

  const duration = numberOption(root, "duration", DEFAULT_DURATION) * 1000;
  const parallax = numberOption(root, "parallax", DEFAULT_PARALLAX);
  const dim = numberOption(root, "dim", DEFAULT_DIM);
  const length = numberOption(root, "length", DEFAULT_LENGTH);
  const top = numberOption(root, "top", 0);
  const minimumWidth = numberOption(root, "min-width", DEFAULT_MINIMUM_WIDTH);
  root.style.setProperty("--rc-steps-top", `${top}px`);

  const medias = stepList.map((step) => part(step, "media"));
  const contents = stepList.map((step) => part(step, "content"));
  const videos = stepList.map((step) =>
    Array.from(step.querySelectorAll("video")),
  );

  if (prefersReducedMotion()) {
    setState(root, "static");
    return;
  }
  const motion = await loadGsap(["ScrollTrigger"]);
  if (!motion) {
    warn("steps: GSAP did not load — leaving the steps static.");
    setState(root, "static");
    return;
  }
  const { ScrollTrigger } = motion;
  ScrollTrigger.config({ ignoreMobileResize: true });

  /** The step on show. */
  let current = 0;
  /** The step the scroll position asks for; `current` walks towards it. */
  let target = 0;
  let animating = false;
  /** The animations of the move under way, for cancelling on a disarm. */
  let running = [];
  let trigger = null;
  let onScreen = false;

  const pinned = () => root.getAttribute("data-rc-state") === "pinned";

  // The current step's video plays while the section is on screen; in the
  // static column every step is on show, so every video plays.
  function playVideos() {
    videos.forEach((list, index) => {
      list.forEach((video) => {
        video.muted = true;
        video.playsInline = true;
        const shown = !pinned() || index === current;
        if (shown && onScreen && !document.hidden) {
          video.play().catch(() => {});
        } else {
          video.pause();
          if (index !== current) video.currentTime = 0;
        }
      });
    });
  }
  new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting;
      playVideos();
    },
    { threshold: 0 },
  ).observe(root);
  document.addEventListener("visibilitychange", playVideos);

  function mark(index) {
    markers.forEach((marker, i) => {
      if (i === index) marker.setAttribute("aria-current", "step");
      else marker.removeAttribute("aria-current");
    });
  }

  /** The move from `current` to `index`, one step away. */
  function go(index) {
    const from = current;
    const direction = index > from ? 1 : -1;
    const outgoing = stepList[from];
    const incoming = stepList[index];
    animating = true;
    current = index;

    setState(incoming, "entering");
    setState(outgoing, "leaving");
    incoming.removeAttribute("aria-hidden");
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    mark(index);
    playVideos();

    const reduced = prefersReducedMotion();
    const move = slideFrames({
      incoming: medias[index] ?? incoming,
      outgoing: medias[from] ?? outgoing,
      axis: "y",
      direction,
      duration: reduced ? 0 : duration,
      parallax,
    });
    const extras = [];
    if (!reduced && medias[from] && dim < 1) {
      extras.push(
        medias[from].animate(
          [{ filter: "brightness(1)" }, { filter: `brightness(${dim})` }],
          { duration, easing: "linear", fill: "both" },
        ),
      );
    }
    if (contents[from]) {
      extras.push(
        contents[from].animate(
          [
            { opacity: 1, transform: "translateY(0)" },
            {
              opacity: 0,
              transform: `translateY(calc(${-direction} * ${CONTENT.rise}))`,
            },
          ],
          {
            duration: reduced ? 0 : CONTENT.out,
            easing: CONTENT.ease,
            fill: "both",
          },
        ),
      );
    }
    if (contents[index]) {
      extras.push(
        contents[index].animate(
          [
            {
              opacity: 0,
              transform: `translateY(calc(${direction} * ${CONTENT.rise}))`,
            },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: reduced ? 0 : CONTENT.in,
            delay: reduced ? 0 : CONTENT.delay,
            easing: CONTENT.ease,
            fill: "both",
          },
        ),
      );
    }
    const animations = [...move.animations, ...extras];
    running = animations;

    Promise.all(animations.map((a) => a.finished)).then(
      () => {
        setState(incoming, "active");
        setState(outgoing, null);
        outgoing.setAttribute("aria-hidden", "true");
        incoming.style.zIndex = "";
        outgoing.style.zIndex = "";
        // The states above hide the outgoing step; only now drop the fills.
        for (const a of animations) a.cancel();
        running = [];
        animating = false;
        playVideos();
        advance();
      },
      () => {
        // Cancelled by a disarm; the column shows every step as it is.
        animating = false;
      },
    );
  }

  /** One step towards the target, if not already on the way. */
  function advance() {
    if (animating || !pinned() || current === target) return;
    go(current + Math.sign(target - current));
  }

  /** The step the scroll progress (0 → 1 over the pin) asks for. */
  function aim(progress) {
    target = Math.min(
      stepList.length - 1,
      Math.max(0, Math.floor(progress * stepList.length)),
    );
    advance();
  }

  /** Pinned layout: the current step on show, the rest waiting hidden. */
  function arm() {
    stepList.forEach((step, i) => {
      setState(step, i === current ? "active" : null);
      if (i === current) step.removeAttribute("aria-hidden");
      else step.setAttribute("aria-hidden", "true");
    });
    mark(current);
  }

  /** Static column: every step visible and readable, nothing marked. */
  function disarm() {
    for (const a of running) a.cancel();
    running = [];
    stepList.forEach((step) => {
      setState(step, null);
      step.removeAttribute("aria-hidden");
      step.style.zIndex = "";
    });
    markers.forEach((marker) => marker.removeAttribute("aria-current"));
  }

  /** Scroll distance the pin lasts: `length` viewport heights per step. */
  const distance = () => (stepList.length * length * window.innerHeight) / 100;

  function build() {
    trigger?.kill(true);
    trigger = null;
    const wasPinned = pinned();
    if (document.documentElement.clientWidth < minimumWidth) {
      if (wasPinned) disarm();
      setState(root, "static");
      playVideos();
      return;
    }
    if (!wasPinned) arm();
    setState(root, "pinned");
    trigger = ScrollTrigger.create({
      trigger: stage,
      start: `top ${top}px`,
      end: () => `+=${distance()}`,
      pin: stage,
      pinSpacing: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => aim(self.progress),
      onRefresh: (self) => aim(self.progress),
    });
    aim(trigger.progress);
    playVideos();
  }

  // A marker press scrolls the page to the middle of that step's slice; the
  // walk from the current step follows as usual.
  markers.forEach((marker, index) => {
    marker.addEventListener("click", () => {
      if (!trigger) return;
      const y =
        trigger.start +
        ((index + 0.5) / stepList.length) * (trigger.end - trigger.start);
      const lenis = smoothScroll();
      if (lenis) lenis.scrollTo(y);
      else window.scrollTo({ top: y });
    });
  });

  let rebuild = 0;
  window.addEventListener("resize", () => {
    clearTimeout(rebuild);
    rebuild = setTimeout(build, REBUILD_DELAY);
  });
  build();
}
