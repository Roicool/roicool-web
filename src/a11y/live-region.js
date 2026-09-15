/**
 * live-region.js — announce a change to screen readers.
 *
 * A change a sighted visitor notices on its own — a filter result count, a
 * "copied" confirmation, a validation error — is silent to a screen reader
 * unless it is announced. One shared region per politeness level is created on
 * first use and reused afterwards.
 */

const regions = new Map();

function region(politeness) {
  let el = regions.get(politeness);
  if (el) return el;

  el = document.createElement("p");
  el.className = "rc-sr-only";
  el.setAttribute("aria-live", politeness);
  el.setAttribute("aria-atomic", "true");
  document.body.append(el);
  regions.set(politeness, el);
  return el;
}

/**
 * Speak `message`. Use "assertive" only when interrupting is right — an error
 * the visitor must hear now. Status updates stay "polite".
 */
export function announce(message, politeness = "polite") {
  const el = region(politeness);
  // Clearing first makes an identical repeated message announce again.
  el.textContent = "";
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}
