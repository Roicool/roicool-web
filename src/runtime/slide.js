/**
 * slide.js — one frame replaces another by sliding: the new frame comes in
 * from one side while the old one leaves through the other, and the pictures
 * inside move at a fraction of that distance, so the move reads as depth
 * rather than a flat push. Web Animations API, no library.
 *
 * Shared by slideshow (sideways) and step-stack (vertical). The caller owns the
 * states: it settles them once `finished` resolves and then cancels the
 * animations, in that order, so the outgoing frame is hidden before its
 * fill is dropped. Both happen in one microtask; nothing paints in between.
 */

/** Ease in and out, close to GSAP's power3.inOut. */
export const SLIDE_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

/** The moving picture inside a frame, if the frame is not the picture. */
export function pictureOf(frame) {
  return frame.querySelector("img, video");
}

/**
 * Slide `incoming` in over `outgoing`.
 *
 *   axis       "x" (sideways) or "y" (vertical)
 *   direction  1: the new frame comes from the far side (right or bottom),
 *              -1: from the near side (left or top)
 *   duration   milliseconds; 0 switches at once
 *   parallax   percent of the frame the pictures inside move
 *   picture    finds the picture inside a frame; pictureOf by default
 *
 * Returns the animations and a promise resolved when every one has
 * finished (rejected when one is cancelled from outside).
 */
export function slideFrames({
  incoming,
  outgoing,
  axis = "x",
  direction = 1,
  duration,
  parallax = 30,
  picture = pictureOf,
}) {
  const translate = (value) =>
    axis === "y" ? `translateY(${value}%)` : `translateX(${value}%)`;
  const moves = [
    [incoming, direction * 100, 0],
    [outgoing, 0, -direction * 100],
    [picture(incoming), -direction * parallax, 0],
    [picture(outgoing), 0, direction * parallax],
  ];
  const timing = { duration, easing: SLIDE_EASING, fill: "both" };
  const animations = moves
    .filter(([el]) => el)
    .map(([el, from, to]) =>
      el.animate(
        [{ transform: translate(from) }, { transform: translate(to) }],
        timing,
      ),
    );
  return {
    animations,
    finished: Promise.all(animations.map((a) => a.finished)),
  };
}
