/**
 * scrollbar.js — a floating scrollbar for the page: a slim thumb over the
 * content, no gutter, fading out when idle.
 *
 * The native bar is hidden from the first paint by base/critical.css
 * (html.rc-js, fine pointers only), so this takeover shifts nothing. Touch
 * devices keep their own overlay bars and never see this.
 *
 * The markup is built here rather than in Designer: it is chrome, not
 * content, it is aria-hidden, and no page should have to remember it. The
 * page keeps scrolling by wheel and keyboard exactly as before; dragging the
 * thumb or clicking the track scrolls through Lenis when it runs, natively
 * otherwise.
 */

import { smoothScroll } from "./scroll.js";

const FINE_POINTER = "(hover: hover) and (pointer: fine)";

/** Milliseconds after the last scroll before the bar fades. */
const IDLE_DELAY = 1200;

/** The thumb never shrinks below this, so a long page still shows one. */
const MINIMUM_THUMB = 40;

export function startOverlayScrollbar() {
  if (!window.matchMedia(FINE_POINTER).matches) return null;

  const bar = document.createElement("div");
  bar.className = "rc-scrollbar";
  bar.setAttribute("aria-hidden", "true");
  const thumb = document.createElement("div");
  thumb.className = "rc-scrollbar__thumb";
  bar.append(thumb);
  document.body.append(bar);

  const page = document.documentElement;
  let trackHeight = 0;
  let thumbHeight = 0;
  let maxScroll = 0;
  let hovering = false;
  let dragging = false;
  let idle = 0;

  function render() {
    const state = dragging ? "dragging" : hovering || idle ? "active" : null;
    if (state) bar.setAttribute("data-rc-state", state);
    else bar.removeAttribute("data-rc-state");
  }

  /** Show the bar now and let it fade once the page has rested. */
  function wake() {
    clearTimeout(idle);
    idle = setTimeout(() => {
      idle = 0;
      render();
    }, IDLE_DELAY);
    render();
  }

  function position() {
    const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const travel = trackHeight - thumbHeight;
    thumb.style.transform = `translateY(${Math.round(ratio * travel)}px)`;
  }

  function measure() {
    trackHeight = bar.clientHeight;
    maxScroll = page.scrollHeight - window.innerHeight;
    const share = window.innerHeight / page.scrollHeight;
    thumbHeight = Math.max(MINIMUM_THUMB, Math.round(trackHeight * share));
    thumb.style.height = `${thumbHeight}px`;
    bar.hidden = maxScroll <= 0;
    position();
  }

  function scrollTo(top, immediate) {
    const lenis = smoothScroll();
    if (lenis) lenis.scrollTo(top, { immediate, force: true });
    else window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
  }

  /** The scroll position that puts the thumb's grab point under the pointer. */
  function scrollFor(clientY, grabOffset) {
    const top = clientY - bar.getBoundingClientRect().top - grabOffset;
    const travel = trackHeight - thumbHeight;
    const ratio = travel > 0 ? Math.min(1, Math.max(0, top / travel)) : 0;
    return ratio * maxScroll;
  }

  window.addEventListener(
    "scroll",
    () => {
      position();
      wake();
    },
    { passive: true },
  );
  window.addEventListener("resize", measure);
  // The page grows as images and fonts arrive and as sections expand.
  new ResizeObserver(measure).observe(document.body);
  measure();

  bar.addEventListener("pointerenter", () => {
    hovering = true;
    render();
  });
  bar.addEventListener("pointerleave", () => {
    hovering = false;
    render();
  });

  // Dragging the thumb.
  let pointerId = null;
  let grabOffset = 0;
  thumb.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    pointerId = event.pointerId;
    grabOffset = event.clientY - thumb.getBoundingClientRect().top;
    dragging = true;
    thumb.setPointerCapture(pointerId);
    render();
  });
  thumb.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    scrollTo(scrollFor(event.clientY, grabOffset), true);
  });
  function release(event) {
    if (event.pointerId !== pointerId) return;
    pointerId = null;
    dragging = false;
    wake();
  }
  thumb.addEventListener("pointerup", release);
  thumb.addEventListener("pointercancel", release);

  // Clicking the track brings the thumb under the pointer, smoothly.
  bar.addEventListener("pointerdown", (event) => {
    if (event.target !== bar || event.button !== 0) return;
    scrollTo(scrollFor(event.clientY, thumbHeight / 2), false);
  });

  return bar;
}
