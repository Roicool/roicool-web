/**
 * slideshow.js — one picture at a time in a fixed frame, switched from a
 * row of thumbnails, by a swipe, or from the keyboard.
 *
 * The pictures come from a Webflow multi-image field: the nested Collection
 * List is the `slides` part and its items are the slides. The thumbnails are
 * cloned from the one template button Designer styles (`thumbnail`), one per
 * slide, each carrying the slide's own picture — same URL, nothing new to
 * download.
 *
 * A switch slides the frame: the new picture comes in from the side it was
 * chosen from and the old one leaves through the other, while the pictures
 * inside move at a fraction of that distance (parallax). Web Animations API,
 * no library. Reduced motion switches at once.
 *
 * Without JavaScript the first picture shows and the thumbnails stay hidden:
 * a control with nothing to do.
 *
 * Structure and options: README.md in this folder.
 */

import {
  part,
  flagOption,
  numberOption,
  option,
  setState,
} from "../../runtime/dom.js";
import { prefersReducedMotion } from "../../runtime/motion.js";
import { slideFrames, pictureOf } from "../../runtime/slide.js";
import { warn } from "../../runtime/log.js";

/** Seconds a switch takes when `data-rc-duration` is not set. */
const DEFAULT_DURATION = 0.9;

/** Percent of the frame the pictures move while the frame moves 100. */
const DEFAULT_PARALLAX = 30;

/** Pixels a press must travel sideways to count as a swipe. */
const SWIPE_THRESHOLD = 40;

/** The word thumbnails are labelled with: "Görsel 2 / 3", "Image 2 / 3". */
function thumbnailWord(root) {
  const given = option(root, "label");
  if (given) return given;
  const lang = document.documentElement.lang.toLowerCase();
  return lang.startsWith("tr") ? "Görsel" : "Image";
}

export default function slideshow(root) {
  const container = part(root, "slides");
  if (!container) {
    warn(
      'slideshow needs a [data-rc-part="slides"] (the nested Collection List).',
      root,
    );
    return;
  }
  // A slide hidden by a Webflow condition (an empty image field) is skipped.
  const slides = Array.from(container.children).filter(
    (slide) => slide.checkVisibility?.() ?? true,
  );
  if (slides.length === 0) return;

  const duration = numberOption(root, "duration", DEFAULT_DURATION) * 1000;
  const parallax = numberOption(root, "parallax", DEFAULT_PARALLAX);
  const word = thumbnailWord(root);

  let current = 0;
  let animating = false;
  /** A switch asked for mid-move; it plays once the move has ended. */
  let pending = null;
  /** The slide the show is heading for: the queued one, else the current. */
  const intended = () => pending?.index ?? current;

  slides.forEach((slide, i) => {
    if (i === 0) setState(slide, "active");
    else slide.setAttribute("aria-hidden", "true");
  });

  // Thumbnails: Designer leaves one styled template button in the strip; it
  // becomes one button per slide, and the template itself goes.
  const strip = part(root, "thumbnails");
  const template = strip ? part(root, "thumbnail") : null;
  const thumbnails = [];
  if (strip && template) {
    if (template.tagName !== "BUTTON") {
      warn(
        'slideshow: the thumbnail template should be a <button> (DOM element, tag "button").',
        template,
      );
    }
    slides.forEach((slide, i) => {
      const button = template.cloneNode(true);
      button.removeAttribute("id");
      for (const el of button.querySelectorAll("[id]"))
        el.removeAttribute("id");
      if (button.tagName === "BUTTON") button.type = "button";
      button.setAttribute("aria-label", `${word} ${i + 1} / ${slides.length}`);
      button.setAttribute("aria-pressed", String(i === current));

      const target = button.querySelector("img");
      const source = pictureOf(slide);
      if (target && source instanceof HTMLImageElement) {
        for (const name of ["src", "srcset", "sizes"]) {
          const value = source.getAttribute(name);
          if (value === null) target.removeAttribute(name);
          else target.setAttribute(name, value);
        }
        // The button carries the name; the picture inside is decoration.
        target.alt = "";
        target.setAttribute("aria-hidden", "true");
      }

      button.addEventListener("click", () => go(i));
      strip.append(button);
      thumbnails.push(button);
    });
    template.remove();

    strip.addEventListener("keydown", (event) => {
      const last = slides.length - 1;
      // Counted from where the show is heading, so a quick run of presses
      // adds up instead of each repeating the one before.
      const from = intended();
      let index = null;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        index = from === last ? 0 : from + 1;
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        index = from === 0 ? last : from - 1;
      } else if (event.key === "Home") index = 0;
      else if (event.key === "End") index = last;
      if (index === null) return;
      event.preventDefault();
      // Focus follows the switch — at once, even when the switch has to
      // wait for the move under way.
      if (go(index, index > from ? 1 : -1)) thumbnails[index].focus();
    });
  }

  /**
   * Switch to slide `index`. `direction` is where the new slide comes from:
   * 1 from the right (forward), -1 from the left (back). Wrapping round from
   * the last slide to the first is still forward. True when the switch
   * starts or is queued behind the move under way (the last one asked for
   * wins); false when it is the slide the show is already heading for.
   */
  function go(index, direction = Math.sign(index - current)) {
    if (index === intended()) return false;
    if (animating) {
      pending = index === current ? null : { index, direction };
      return true;
    }
    pending = null;
    const outgoing = slides[current];
    const incoming = slides[index];
    animating = true;
    current = index;

    setState(incoming, "entering");
    setState(outgoing, "leaving");
    incoming.removeAttribute("aria-hidden");
    incoming.style.zIndex = "2";
    outgoing.style.zIndex = "1";
    thumbnails.forEach((button, i) => {
      button.setAttribute("aria-pressed", String(i === index));
    });

    // The frames cross at full width; the pictures inside lag behind so the
    // move reads as depth rather than a flat push (runtime/slide.js).
    const { animations, finished } = slideFrames({
      incoming,
      outgoing,
      axis: "x",
      direction,
      duration: prefersReducedMotion() ? 0 : duration,
      parallax,
    });

    finished.then(
      () => {
        setState(incoming, "active");
        setState(outgoing, null);
        outgoing.setAttribute("aria-hidden", "true");
        incoming.style.zIndex = "";
        outgoing.style.zIndex = "";
        // Drop the fills once the states above hide the outgoing slide, so
        // no animation lingers on either element.
        for (const a of animations) a.cancel();
        animating = false;
        playPending();
      },
      () => {
        // Cancelled from outside (unlikely); leave the DOM as it is.
        animating = false;
        playPending();
      },
    );
    return true;
  }

  function playPending() {
    if (!pending) return;
    const { index, direction } = pending;
    pending = null;
    go(index, direction);
  }

  // A sideways swipe over the frame goes to the next or previous slide. A
  // press on a thumbnail is a click, never a swipe.
  if (option(root, "swipe") === null || flagOption(root, "swipe")) {
    let pointerId = null;
    let startX = 0;
    let swiped = false;

    root.addEventListener("dragstart", (event) => event.preventDefault());
    root.addEventListener(
      "click",
      (event) => {
        if (!swiped) return;
        swiped = false;
        event.preventDefault();
        event.stopPropagation();
      },
      true,
    );
    root.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || pointerId !== null) return;
      if (strip?.contains(event.target)) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      swiped = false;
    });
    root.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId || swiped) return;
      const dx = event.clientX - startX;
      if (Math.abs(dx) < SWIPE_THRESHOLD) return;
      swiped = true;
      root.setPointerCapture(pointerId);
      const last = slides.length - 1;
      const from = intended();
      if (dx < 0) go(from === last ? 0 : from + 1, 1);
      else go(from === 0 ? last : from - 1, -1);
    });
    const endSwipe = (event) => {
      if (event.pointerId !== pointerId) return;
      pointerId = null;
    };
    root.addEventListener("pointerup", endSwipe);
    root.addEventListener("pointercancel", endSwipe);
  }

  setState(root, "ready");
}
