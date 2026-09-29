/**
 * sentry-release.mjs — what the source-map upload needs to know, printed
 * for GitHub Actions (.github/workflows/sentry-sourcemaps.yml).
 *
 *   release      the value the runtime stamps into every event
 *                (build.mjs: `<name>@<version>`), so the uploaded maps are
 *                found under the same release
 *   url_prefix   where the site loads dist/ from, host replaced by `~` so
 *                Sentry matches any host: a frame at
 *                https://raw.githack.com/Roicool/roicool-web/main/dist/rc.js
 *                is looked up as ~/Roicool/roicool-web/main/dist/rc.js
 *
 * Run by hand to see the values: `node scripts/sentry-release.mjs`.
 */

import { readFile } from "node:fs/promises";
import { cdnLocation } from "./cdn-ref.mjs";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const { origin, base } = cdnLocation(manifest);

const release = `${manifest.name}@${manifest.version}`;
const urlPrefix = `~${base.slice(origin.length).replace(/\/$/, "")}`;

console.log(`release=${release}`);
console.log(`url_prefix=${urlPrefix}`);
