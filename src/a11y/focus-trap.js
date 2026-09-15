/**
 * focus-trap.js — keep Tab inside an open dialog, drawer or menu.
 *
 * Anything that covers the page must trap focus, otherwise keyboard and screen
 * reader users tab straight into the content behind it while it is still open.
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function focusableWithin(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Trap focus inside `container` and move focus into it. The returned function
 * releases the trap and returns focus to wherever it came from.
 *
 * `container` should carry `tabindex="-1"` so focus can land on it when it has
 * no focusable children yet.
 */
export function trapFocus(container) {
  const returnTo = document.activeElement;

  function onKeydown(event) {
    if (event.key !== "Tab") return;

    const items = focusableWithin(container);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    const leaving = event.shiftKey ? first : last;

    if (
      document.activeElement === leaving ||
      !container.contains(document.activeElement)
    ) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    }
  }

  // Capture phase, so a component's own key handling cannot swallow Tab first.
  document.addEventListener("keydown", onKeydown, true);
  (focusableWithin(container)[0] ?? container).focus({ preventScroll: true });

  return function releaseFocus() {
    document.removeEventListener("keydown", onKeydown, true);
    returnTo?.focus?.({ preventScroll: true });
  };
}
