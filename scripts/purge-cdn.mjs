/**
 * purge-cdn.mjs — flush jsDelivr's cache for the files the site loads.
 *
 *   npm run purge
 *
 * Only needed while head.html follows a branch (config.cdnRef = "main"):
 * jsDelivr caches branch refs for up to 12 hours, so a push is not visible
 * until then. Tags are immutable and never need this.
 *
 * Component chunks are purged by name; the hashed shared chunks under
 * dist/chunks/ get a new name on every build and never need it.
 */

import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { cdnRef } from "./cdn-ref.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

/** "https://github.com/Roicool/roicool-web.git" → "roicool/roicool-web" */
function repositorySlug(manifest) {
  const match = manifest.repository?.url?.match(
    /github\.com[/:]([^/]+\/[^/.]+)/,
  );
  if (!match)
    throw new Error("package.json › repository.url is not a GitHub URL");
  return match[1].toLowerCase();
}

async function componentFiles() {
  try {
    const names = await readdir(path.join(root, "dist", "components"));
    return names.filter((n) => n.endsWith(".js")).map((n) => `components/${n}`);
  } catch {
    return [];
  }
}

async function main() {
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  if (manifest.config?.cdnRef === "tag") {
    console.log(
      'config.cdnRef is "tag" — tags are immutable, nothing to purge.',
    );
    return;
  }

  const base = `https://purge.jsdelivr.net/gh/${repositorySlug(manifest)}@${cdnRef(manifest)}/dist/`;
  const files = ["rc.js", "rc.css", ...(await componentFiles())];

  let failed = 0;
  for (const file of files) {
    const response = await fetch(base + file);
    const body = await response.json().catch(() => ({}));
    const ok = response.ok && body.status === "finished";
    if (!ok) failed++;
    console.log(
      `${ok ? "ok  " : "FAIL"} ${file}  ${body.status ?? response.status}`,
    );
  }

  if (failed) process.exitCode = 1;
}

await main();
