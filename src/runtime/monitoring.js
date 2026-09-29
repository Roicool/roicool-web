/**
 * monitoring.js — error reporting to Sentry, without paying for it up front.
 *
 * Nothing of the SDK is downloaded on a page view. Two listeners (`error`,
 * `unhandledrejection`) and the runtime's own warn()/error() hook watch the
 * page; the first thing worth reporting fetches the Sentry chunk (built from
 * runtime/sentry.js and the npm package into dist/chunks/), which then takes
 * over with its own handlers and gets the queued events replayed. Sentry's
 * "loader script" works the same way; doing it here keeps it inside rc.js
 * and under the repo's rules: no extra script tag, no third-party origin at
 * load, nothing in front of the first paint.
 *
 * The DSN is stamped in at build time from package.json › config.sentryDsn
 * (empty: monitoring off, not even the listeners), the release from the
 * package version, the environment from the hostname.
 *
 * What gets reported: uncaught errors and rejections, every `error()` the
 * runtime logs (a component that failed to initialise) and whatever a
 * component hands to `rc.report()`. `warn()` calls are Designer notes; they
 * do not fetch the SDK, they ride along as breadcrumbs if an error follows.
 */

import { setReporter, debug } from "./log.js";

/** Events and breadcrumbs kept while the SDK is not here yet. */
const QUEUE_LIMIT = 10;

/** Which Sentry environment a hostname belongs to. */
export function environmentOf(hostname) {
  if (/(^|\.)roicool\.com$/i.test(hostname)) return "production";
  if (/\.webflow\.io$/i.test(hostname)) return "staging";
  return "development";
}

/** One line of text for the arguments of a warn()/error() call. */
export function summarize(args) {
  return args
    .map((value) => {
      if (value instanceof Error) return value.message;
      if (typeof value === "string") return value;
      if (value && typeof value === "object" && "tagName" in value) {
        return `<${String(value.tagName).toLowerCase()}>`;
      }
      return String(value);
    })
    .join(" ");
}

/**
 * The watcher, kept free of globals so it can be tested: `target` receives
 * the two listeners, `load` resolves to the chunk (its `start` function).
 */
export function createMonitor({ dsn, release, environment, target, load }) {
  /** Errors seen before the SDK was up: the first ones, they cause the rest. */
  const events = [];
  /** Warnings seen before the SDK was up: the latest ones, they are context. */
  const crumbs = [];
  let loading = null;
  let sdk = null;
  let failed = false;

  // `unhandled` marks what nobody caught, so Sentry files it as a crash and
  // not as something the page reported on purpose.
  const onError = (event) => {
    const error = event.error instanceof Error ? event.error : undefined;
    capture({
      level: "error",
      error,
      message: error
        ? error.message
        : String(event.message ?? event.error ?? "Unknown error"),
      unhandled: true,
    });
  };
  const onRejection = (event) => {
    const reason = event.reason;
    capture({
      level: "error",
      error: reason instanceof Error ? reason : undefined,
      message: reason instanceof Error ? reason.message : String(reason),
      unhandled: true,
    });
  };

  function listen(on) {
    const method = on ? "addEventListener" : "removeEventListener";
    target[method]("error", onError);
    target[method]("unhandledrejection", onRejection);
  }

  function deliver(event) {
    try {
      if (event.level === "warning") sdk.breadcrumb(event.message);
      else if (event.error) sdk.exception(event.error, event);
      else sdk.message(event.message, event.context);
    } catch (cause) {
      debug("monitoring: could not deliver an event", cause);
    }
  }

  function start() {
    if (loading || failed) return;
    loading = load().then(
      (module) => {
        sdk = module.start({ dsn, release, environment });
        // The SDK's own handlers take it from here; ours would double up.
        listen(false);
        for (const crumb of crumbs) deliver(crumb);
        for (const event of events) deliver(event);
        crumbs.length = 0;
        events.length = 0;
        debug("monitoring: Sentry ready");
      },
      (cause) => {
        // No second attempt: the CDN is not there, or blocked; stay quiet.
        failed = true;
        listen(false);
        crumbs.length = 0;
        events.length = 0;
        debug("monitoring: Sentry did not load", cause);
      },
    );
  }

  function capture(event) {
    if (sdk) {
      deliver(event);
      return;
    }
    if (failed) return;
    if (event.level === "warning") {
      crumbs.push(event);
      if (crumbs.length > QUEUE_LIMIT) crumbs.shift();
      return;
    }
    if (events.length < QUEUE_LIMIT) events.push(event);
    start();
  }

  listen(true);

  return {
    /** Report an error a component caught itself, with optional context. */
    report(error, context) {
      capture({
        level: "error",
        error: error instanceof Error ? error : undefined,
        message: error instanceof Error ? error.message : String(error),
        context,
      });
    },
    /** A warn()/error() call from log.js. */
    note(level, args) {
      capture(
        level === "warning"
          ? { level, message: summarize(args) }
          : {
              level: "error",
              error: args.find((value) => value instanceof Error),
              message: summarize(args),
            },
      );
    },
    /** Resolves once the SDK is up or has failed; for tests. */
    ready() {
      return loading ?? Promise.resolve();
    },
  };
}

/**
 * Start watching the page. Returns the monitor, or a stand-in whose
 * `report` does nothing when no DSN was built in.
 */
export function startMonitoring() {
  const dsn = typeof __RC_SENTRY_DSN__ === "string" ? __RC_SENTRY_DSN__ : "";
  const release =
    typeof __RC_RELEASE__ === "string" ? __RC_RELEASE__ : "roicool-web";
  if (!dsn) {
    debug("monitoring: off (no DSN built in)");
    return { report() {} };
  }
  const monitor = createMonitor({
    dsn,
    release,
    environment: environmentOf(window.location.hostname),
    target: window,
    load: () => import("./sentry.js"),
  });
  setReporter((level, args) => {
    try {
      monitor.note(level, args);
    } catch {
      // Reporting must never turn a logged warning into a thrown error.
    }
  });
  debug("monitoring: watching");
  return monitor;
}
