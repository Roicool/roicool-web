/**
 * dom.js — reading the `data-rc-*` contract that joins Designer to this code.
 *
 *   data-rc="<name>"           component root; several names separated by space
 *   data-rc-part="<part>"      a named element belonging to the nearest root
 *   data-rc-state="<state>"    state stamped by JS, styled from CSS
 *   data-rc-<option>="<value>" component option; read from the root only
 *
 * `part`, `state` and `eager` are reserved and cannot be used as option names.
 * The full contract, with the reasoning behind it, is in docs/naming.md.
 */

export const ROOT_SELECTOR = "[data-rc]";

/**
 * Everything the keyboard can land on. A visual copy of content (a marquee's
 * second track, a carousel's clones) sets tabindex="-1" on all of these so
 * the copy is never a tab stop, while its links still take a click.
 */
export const FOCUSABLE =
  "a[href], area[href], button, input, select, textarea, summary, iframe, audio[controls], video[controls], [contenteditable]:not([contenteditable='false']), [tabindex]";

const FALSE_VALUES = new Set(["false", "0", "no", "off"]);

/** The component names declared on a root element. */
export function names(root) {
  return (root.getAttribute("data-rc") || "").split(/[\s,]+/).filter(Boolean);
}

/**
 * Every `[data-rc-part="<name>"]` that belongs to `scope`'s component.
 *
 * `scope` may be the component root or any element inside it — parts are always
 * resolved against the nearest enclosing root, so a nested component's parts
 * stay with that component instead of leaking into its parent's.
 */
export function parts(scope, name) {
  const found = Array.from(scope.querySelectorAll(`[data-rc-part="${name}"]`));
  const owner = scope.closest(ROOT_SELECTOR);
  if (!owner) return found;
  return found.filter(
    (el) => el.parentElement?.closest(ROOT_SELECTOR) === owner,
  );
}

/** The first matching part, or null. */
export function part(scope, name) {
  return parts(scope, name)[0] ?? null;
}

/** A string option read from the root, or `fallback` when absent or empty. */
export function option(root, name, fallback = null) {
  const value = root.getAttribute(`data-rc-${name}`);
  return value === null || value === "" ? fallback : value;
}

/** A numeric option; `fallback` when the attribute is absent or not a number. */
export function numberOption(root, name, fallback) {
  const value = Number.parseFloat(option(root, name, ""));
  return Number.isNaN(value) ? fallback : value;
}

/**
 * A boolean option. Absent → false. Present but empty → true (so `data-rc-single`
 * alone means yes). "false" / "0" / "no" / "off" → false. Anything else → true.
 */
export function flagOption(root, name) {
  const value = root.getAttribute(`data-rc-${name}`);
  if (value === null) return false;
  if (value === "") return true;
  return !FALSE_VALUES.has(value.toLowerCase());
}

/** Stamp the element's state, or clear it with `null`. */
export function setState(el, state) {
  if (state === null) el.removeAttribute("data-rc-state");
  else el.setAttribute("data-rc-state", state);
}
