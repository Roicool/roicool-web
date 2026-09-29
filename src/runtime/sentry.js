/**
 * sentry.js — the Sentry SDK, in a chunk of its own.
 *
 * Imported by monitoring.js only once there is something to report, so the
 * SDK (about 25 KB gzipped) never rides along with a page view that goes
 * well. Bundled from the npm package into dist/chunks/ and served from the
 * same CDN as the rest: no third-party origin, one version pinned in
 * package.json. The SDK keeps its own carrier on `globalThis.__SENTRY__`;
 * that is the one global besides `rc`, and only on pages that had an error.
 *
 * Errors only: no tracing, replay or profiling. Those mean more code on
 * every page and more personal data than a marketing site has any use for.
 */

import {
  init,
  captureException,
  captureMessage,
  addBreadcrumb,
} from "@sentry/browser";

/**
 * Browser extensions inject scripts that fail in ways we cannot fix; their
 * errors would drown ours.
 */
const EXTENSION_URLS = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari(?:-web)?-extension:\/\//i,
  /\/extensions\//i,
];

/** Benign browser noise the SDK's own default list does not cover. */
const IGNORED_MESSAGES = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
];

export function start({ dsn, release, environment }) {
  init({
    dsn,
    release,
    environment,
    sendDefaultPii: false,
    ignoreErrors: IGNORED_MESSAGES,
    denyUrls: EXTENSION_URLS,
    // No release-health sessions: the SDK only exists on pages that already
    // failed, so a "crash-free rate" measured from here would mean nothing
    // and each session is one more request.
    integrations: (defaults) =>
      defaults.filter((integration) => integration.name !== "BrowserSession"),
  });

  return {
    exception(error, { message, context } = {}) {
      const extra = { ...context };
      if (message && message !== error.message) extra.note = message;
      captureException(error, { extra });
    },
    message(text, context) {
      captureMessage(text, { level: "error", extra: context });
    },
    breadcrumb(message) {
      addBreadcrumb({ category: "rc", level: "warning", message });
    },
  };
}
