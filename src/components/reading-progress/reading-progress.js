/**
 * reading-progress.js — a thin bar that fills as the post is read: empty
 * while the top of the body is below the top of the screen, full once its
 * end reaches the bottom of the screen. Decoration only (aria-hidden), and
 * it never moves the layout: the bar is scaled, not resized.
 *
 * Where the browser has scroll-driven animations the bar runs on CSS alone
 * (reading-progress.css: a view timeline on the body), off the main thread,
 * and this code only hides the bar from screen readers. Elsewhere it
 * follows the scroll here and writes the share read into
 * --rc-reading-progress (0 to 1) on the root, which the bar's scaleX reads.
 *
 * Usually on the same root as toc (data-rc="toc reading-progress"), sharing
 * its `body` part. Writes no state on the root, so the two never clash.
 *
 * Structure: README.md in this folder.
 */

import { part, parts } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

export default function readingProgress(root) {
  const body = part(root, "body");
  const bars = parts(root, "bar");
  if (!body || bars.length === 0) {
    warn(
      'reading-progress needs a [data-rc-part="body"] (the post) and a [data-rc-part="bar"] (the fill).',
      root,
    );
    return;
  }
  for (const bar of bars) bar.setAttribute("aria-hidden", "true");
  if (CSS.supports?.("animation-timeline: view()")) return;

  let queued = false;
  const update = () => {
    queued = false;
    const box = body.getBoundingClientRect();
    const span = box.height - window.innerHeight;
    let read = span <= 0 ? (box.top <= 0 ? 1 : 0) : -box.top / span;
    read = Math.min(1, Math.max(0, read));
    root.style.setProperty("--rc-reading-progress", read.toFixed(4));
  };
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", queue, { passive: true });
  window.addEventListener("resize", queue);
  update();
}
