/**
 * build-seo.mjs — content/ → dist/seo/
 *
 * Renders the JSON-LD blocks that get pasted into Webflow's per-page head.
 * Generating them from content/ rather than writing them by hand is the whole
 * point: the structured data and the visible copy cannot drift apart if they
 * come from the same file.
 */

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import yaml from "js-yaml";
import { organization } from "../src/seo/json-ld/organization.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const content = path.join(root, "content");
const out = path.join(root, "dist", "seo");

const LOCALES = ["tr-TR", "en-US"];

/** Fields still marked TODO are dropped rather than published as "TODO". */
function stripTodo(value) {
  if (Array.isArray(value)) {
    const kept = value.map(stripTodo).filter((item) => item !== undefined);
    return kept.length ? kept : undefined;
  }
  if (value && typeof value === "object") {
    const kept = Object.fromEntries(
      Object.entries(value)
        .map(([key, item]) => [key, stripTodo(item)])
        .filter(([, item]) => item !== undefined),
    );
    return Object.keys(kept).length ? kept : undefined;
  }
  return value === "TODO" ? undefined : value;
}

/** A <script> block ready to paste into Page Settings › Custom Code › Head. */
function scriptBlock(node) {
  return `<script type="application/ld+json">\n${JSON.stringify(node, null, 2)}\n</script>\n`;
}

function countTodos(value) {
  if (Array.isArray(value)) return value.reduce((n, v) => n + countTodos(v), 0);
  if (value && typeof value === "object")
    return Object.values(value).reduce((n, v) => n + countTodos(v), 0);
  return value === "TODO" ? 1 : 0;
}

async function main() {
  const raw = yaml.load(
    await readFile(path.join(content, "organization.yml"), "utf8"),
  );
  const todos = countTodos(raw);

  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });

  const data = stripTodo(raw);
  for (const locale of LOCALES) {
    const file = path.join(out, `organization.${locale}.html`);
    await writeFile(file, scriptBlock(organization(data, { locale })));
    console.log(`wrote dist/seo/organization.${locale}.html`);
  }

  if (todos > 0) {
    console.warn(
      `\n⚠ content/organization.yml has ${todos} TODO field(s); they were left out of the output. Fill them before launch.`,
    );
  }
}

await main();
