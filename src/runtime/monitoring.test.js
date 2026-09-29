import { test } from "node:test";
import assert from "node:assert/strict";
import { createMonitor, environmentOf, summarize } from "./monitoring.js";

/** A fake SDK chunk: records what it is told, counts how often it loads. */
function fakeChunk() {
  const sdk = { exceptions: [], messages: [], crumbs: [], options: null };
  const module = {
    start(options) {
      sdk.options = options;
      return {
        exception: (error, event) => sdk.exceptions.push({ error, event }),
        message: (text, context) => sdk.messages.push({ text, context }),
        breadcrumb: (message) => sdk.crumbs.push(message),
      };
    },
  };
  let loads = 0;
  return {
    sdk,
    loads: () => loads,
    load: () => {
      loads += 1;
      return Promise.resolve(module);
    },
  };
}

function errorEvent(error) {
  return Object.assign(new Event("error"), { error, message: error.message });
}

function rejectionEvent(reason) {
  return Object.assign(new Event("unhandledrejection"), { reason });
}

function monitorWith(chunk, target = new EventTarget()) {
  return {
    target,
    monitor: createMonitor({
      dsn: "https://key@example.ingest.sentry.io/1",
      release: "roicool-web@test",
      environment: "development",
      target,
      load: chunk.load,
    }),
  };
}

test("environmentOf: hostname → ortam", () => {
  assert.equal(environmentOf("roicool.com"), "production");
  assert.equal(environmentOf("www.roicool.com"), "production");
  assert.equal(environmentOf("rc-main.webflow.io"), "staging");
  assert.equal(environmentOf("localhost"), "development");
  assert.equal(environmentOf("notroicool.com"), "development");
});

test("summarize: metin, hata ve eleman tek satıra iner", () => {
  assert.equal(
    summarize(["reel: strip grows", new Error("boom"), { tagName: "DIV" }, 3]),
    "reel: strip grows boom <div> 3",
  );
});

test("ilk hata SDK'yı bir kez getirir, kuyruğu boşaltır, dinleyicileri bırakır", async () => {
  const chunk = fakeChunk();
  const { target, monitor } = monitorWith(chunk);

  const first = new Error("first");
  target.dispatchEvent(errorEvent(first));
  target.dispatchEvent(rejectionEvent(new Error("second")));
  target.dispatchEvent(rejectionEvent("plain reason"));
  assert.equal(chunk.loads(), 1);

  await monitor.ready();
  assert.equal(chunk.sdk.options.release, "roicool-web@test");
  assert.deepEqual(
    chunk.sdk.exceptions.map((entry) => entry.error.message),
    ["first", "second"],
  );
  assert.deepEqual(
    chunk.sdk.messages.map((entry) => entry.text),
    ["plain reason"],
  );

  // Once the SDK's own handlers are in place, ours must be gone: a new
  // page error reaches the SDK through Sentry, not through us twice.
  target.dispatchEvent(errorEvent(new Error("third")));
  assert.equal(chunk.sdk.exceptions.length, 2);
  assert.equal(chunk.loads(), 1);
});

test("uyarılar SDK'yı getirmez; hata gelince breadcrumb olarak önden gider", async () => {
  const chunk = fakeChunk();
  const { monitor } = monitorWith(chunk);

  monitor.note("warning", ["reel: strip grows", { tagName: "DIV" }]);
  assert.equal(chunk.loads(), 0);

  monitor.note("error", ['"marquee" failed to initialise.', new Error("bad")]);
  assert.equal(chunk.loads(), 1);
  await monitor.ready();

  assert.deepEqual(chunk.sdk.crumbs, ["reel: strip grows <div>"]);
  assert.equal(chunk.sdk.exceptions.length, 1);
  assert.equal(chunk.sdk.exceptions[0].error.message, "bad");
  assert.equal(
    chunk.sdk.exceptions[0].event.message,
    '"marquee" failed to initialise. bad',
  );

  // With the SDK up, a warning becomes a breadcrumb straight away.
  monitor.note("warning", ["later"]);
  assert.deepEqual(chunk.sdk.crumbs, ["reel: strip grows <div>", "later"]);
});

test("report: bağlamıyla birlikte gider", async () => {
  const chunk = fakeChunk();
  const { monitor } = monitorWith(chunk);
  monitor.report(new Error("custom"), { component: "carousel" });
  await monitor.ready();
  assert.equal(chunk.sdk.exceptions[0].event.context.component, "carousel");
  monitor.report("not an error");
  assert.deepEqual(chunk.sdk.messages[0], {
    text: "not an error",
    context: undefined,
  });
});

test("SDK gelmezse bir daha denenmez ve hiçbir şey fırlatılmaz", async () => {
  let loads = 0;
  const target = new EventTarget();
  const monitor = createMonitor({
    dsn: "x",
    release: "r",
    environment: "development",
    target,
    load: () => {
      loads += 1;
      return Promise.reject(new Error("offline"));
    },
  });
  target.dispatchEvent(errorEvent(new Error("one")));
  await monitor.ready();
  target.dispatchEvent(errorEvent(new Error("two")));
  monitor.report(new Error("three"));
  assert.equal(loads, 1);
});

test("kuyruk sınırlı: ilk on hata kalır, uyarılarda son on", async () => {
  const chunk = fakeChunk();
  // A load that never resolves until we say so keeps the queue filling.
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  const target = new EventTarget();
  const monitor = createMonitor({
    dsn: "x",
    release: "r",
    environment: "development",
    target,
    load: () => gate.then(chunk.load),
  });
  for (let i = 0; i < 12; i += 1) {
    monitor.note("warning", [`warning ${i}`]);
    target.dispatchEvent(errorEvent(new Error(`error ${i}`)));
  }
  release();
  await monitor.ready();
  assert.equal(chunk.sdk.exceptions.length, 10);
  assert.equal(chunk.sdk.exceptions[0].error.message, "error 0");
  assert.equal(chunk.sdk.crumbs.length, 10);
  assert.equal(chunk.sdk.crumbs[0], "warning 2");
});
