/**
 * hover-reveal.js — a card that shows a picture behind its content while the
 * pointer is over it: the picture wipes in from the edge the pointer came
 * through and wipes out through the edge it leaves by, settling from a
 * slight zoom as it opens.
 *
 * The root is the card (a Link Block, usually inside a Collection Item); the
 * one part is `media`, the picture. The code moves nothing itself — it works
 * out the edge, stamps the state, and the CSS runs the transition — so
 * Designer keeps the card's size, radius, colours and whatever sits on top.
 * Inside a marquee the card is cloned with the strip; the clone behaves the
 * same because the marquee re-scans its copy.
 *
 * Keyboard focus reveals too, from the bottom. Without JavaScript the picture
 * stays hidden: it is decoration behind a logo, not content.
 *
 * Structure and options: README.md in this folder.
 */

import { part, numberOption, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

/** Seconds a reveal takes when `data-rc-duration` is not set. */
const DEFAULT_DURATION = 0.6;

/** The picture starts this many times its size and settles to 1. */
const DEFAULT_ZOOM = 1.12;

/** `clip-path: inset()` values that fold the picture away behind one edge. */
const FOLDED = {
  left: "0 100% 0 0",
  right: "0 0 0 100%",
  top: "0 0 100% 0",
  bottom: "100% 0 0 0",
};

/** The edge of `rect` nearest to the point, each axis taken in proportion. */
function edgeOf(rect, x, y) {
  const dx = (x - rect.left) / rect.width - 0.5;
  const dy = (y - rect.top) / rect.height - 0.5;
  if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right";
  return dy < 0 ? "top" : "bottom";
}

export default function hoverReveal(root) {
  const media = part(root, "media");
  if (!media) {
    warn('hover-reveal needs a [data-rc-part="media"] (the picture).', root);
    return;
  }

  root.style.setProperty(
    "--rc-hover-reveal-duration",
    `${numberOption(root, "duration", DEFAULT_DURATION)}s`,
  );
  root.style.setProperty(
    "--rc-hover-reveal-zoom",
    String(numberOption(root, "zoom", DEFAULT_ZOOM)),
  );

  function fold(edge) {
    root.style.setProperty("--rc-hover-reveal-inset", FOLDED[edge]);
  }

  /** Fold behind `edge` at once, so the next transition starts from there. */
  function jump(edge) {
    media.style.transition = "none";
    fold(edge);
    // Commit the folded value as the starting point before the CSS
    // transition is allowed back; otherwise the wipe would start from
    // wherever the picture was folded last time.
    void media.offsetWidth;
    media.style.transition = "";
  }

  // Why the picture is showing; empty means it is folded away.
  const reasons = new Set();

  function show(reason, edge) {
    if (reasons.size === 0) {
      // A wipe still running (the pointer came straight back) carries on
      // from where it is; a resting picture starts behind the entry edge.
      if (media.getAnimations().length === 0) jump(edge);
      setState(root, "active");
    }
    reasons.add(reason);
  }

  function hide(reason, edge) {
    reasons.delete(reason);
    if (reasons.size > 0) return;
    fold(edge);
    setState(root, "idle");
  }

  const edgeAt = (event) =>
    edgeOf(root.getBoundingClientRect(), event.clientX, event.clientY);

  root.addEventListener("pointerenter", (event) => {
    show("pointer", edgeAt(event));
  });
  root.addEventListener("pointerleave", (event) => {
    hide("pointer", edgeAt(event));
  });

  // Only visible focus counts: a mouse press focuses the link too, and the
  // pointer already covers that.
  root.addEventListener("focusin", (event) => {
    if (event.target.matches(":focus-visible")) show("focus", "bottom");
  });
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) hide("focus", "bottom");
  });

  fold("bottom");
  setState(root, "idle");
}
