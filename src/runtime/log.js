/**
 * log.js — namespaced console output.
 *
 * Quiet by default so a visitor's console stays clean. Append `?rc-debug` to
 * any URL, or set `localStorage.rcDebug = "1"`, to see what the runtime is
 * doing. Warnings and errors always come through: they mean a component is
 * misconfigured in Designer and someone needs to know.
 */

const PREFIX = "[rc]";

const debugEnabled = (() => {
  try {
    return (
      new URLSearchParams(window.location.search).has("rc-debug") ||
      window.localStorage.getItem("rcDebug") === "1"
    );
  } catch {
    // Storage can throw in private mode or behind a strict cookie policy.
    return false;
  }
})();

export const isDebug = debugEnabled;

export function debug(...args) {
  if (debugEnabled) console.log(PREFIX, ...args);
}

export function warn(...args) {
  console.warn(PREFIX, ...args);
}

export function error(...args) {
  console.error(PREFIX, ...args);
}
