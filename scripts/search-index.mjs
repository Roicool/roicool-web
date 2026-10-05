/**
 * search-index.mjs — the site search's index: what the search dialog
 * (src/components/search) looks through as the visitor types.
 *
 * A small JSON file, dist/search-index.json, built from the published CMS
 * items listed in webflow/search-index.json — blog posts, services, glossary
 * terms — with what a result shows: title, address, a short text, a
 * picture, the category and the reading time. The CDN serves it next to the
 * code; the dialog downloads it once, when it first opens.
 *
 * Why a file and not the page: the pages keep their content in their own
 * HTML (rule 1); search results are an answer to what a visitor types, not
 * page content, and Webflow has no search API a page could ask. Only
 * published items go in: the index holds nothing the site does not show.
 *
 * Fields are found by slug or by display name (the config lists the
 * candidates), so a renamed field is a config line, not a code change; a
 * field not found is left out of the results, with a warning.
 *
 * Runs in GitHub Actions every hour and on demand
 * (.github/workflows/search-index.yml), which commits the file when it
 * changed. The file carries no timestamp: an unchanged CMS leaves it
 * byte-for-byte the same, and nothing is committed.
 *
 *   WEBFLOW_API_TOKEN=… node scripts/search-index.mjs [--dry-run]
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { api, listAll } from "./webflow-api.mjs";
import { textOf } from "../src/runtime/anchors.js";

// ---- Pure parts, tested in search-index.test.mjs ---------------------------

/** The slug of the first field among `candidates` (slug or display name). */
export function resolveField(fields, candidates = []) {
  for (const candidate of candidates) {
    const wanted = candidate.toLocaleLowerCase("tr");
    const field = fields.find(
      (f) =>
        f.slug === candidate ||
        f.displayName?.toLocaleLowerCase("tr") === wanted,
    );
    if (field) return field.slug;
  }
  return null;
}

/** Plain text, cut at a word boundary within `limit` characters. */
export function excerpt(value, limit) {
  const text = textOf(typeof value === "string" ? value : "");
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit + 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > limit * 0.6 ? cut.slice(0, space) : cut.slice(0, limit)).replace(/[\s,.;:–-]+$/, "")}…`;
}

const fill = (pattern, slug) => pattern.replace("{slug}", slug);

/**
 * The index from the collections' data:
 *   data[collectionSlug] = { fields: [...], items: [...] }  (live items)
 * Archived and draft items are left out. Returns { index, warnings }.
 */
export function buildIndex(config, data) {
  const warnings = [];
  const limit = config.excerpt ?? 180;

  // Categories: id → { name, url }.
  const categories = new Map();
  const categorySource = config.categories;
  if (categorySource && data[categorySource.collection]) {
    for (const item of data[categorySource.collection].items) {
      if (item.isArchived || item.isDraft) continue;
      const { name, slug } = item.fieldData ?? {};
      if (!name || !slug) continue;
      categories.set(item.id, { name, url: fill(categorySource.url, slug) });
    }
  }

  const items = [];
  for (const source of config.sources) {
    const collection = data[source.collection];
    if (!collection) {
      warnings.push(`${source.collection}: koleksiyon yok, atlandı.`);
      continue;
    }
    const slugs = {};
    for (const [key, candidates] of Object.entries(source.fields ?? {})) {
      slugs[key] = resolveField(collection.fields, candidates);
      if (!slugs[key] && candidates.length > 0) {
        warnings.push(
          `${source.collection}: ${key} alanı bulunamadı (${candidates.join(", ")}); sonuçlarda gösterilmeyecek.`,
        );
      }
    }
    for (const item of collection.items) {
      if (item.isArchived || item.isDraft) continue;
      const fields = item.fieldData ?? {};
      if (!fields.name || !fields.slug) continue;
      const entry = {
        type: source.type,
        title: fields.name,
        url: fill(source.url, fields.slug),
      };
      const text = slugs.text ? excerpt(fields[slugs.text], limit) : "";
      if (text) entry.text = text;
      const image = slugs.image ? fields[slugs.image]?.url : null;
      if (image) entry.image = image;
      const category = slugs.category
        ? categories.get(fields[slugs.category])
        : null;
      if (category) {
        entry.category = category.name;
        entry.categoryUrl = category.url;
      }
      const minutes = slugs.minutes ? fields[slugs.minutes] : null;
      if (Number.isFinite(minutes) && minutes > 0) entry.minutes = minutes;
      const date = slugs.date ? fields[slugs.date] : null;
      if (date) entry.date = String(date).slice(0, 10);
      items.push(entry);
    }
  }

  // Newest first within a type keeps an empty-ranked tie sensible.
  items.sort(
    (a, b) =>
      config.sources.findIndex((s) => s.type === a.type) -
        config.sources.findIndex((s) => s.type === b.type) ||
      (b.date ?? "").localeCompare(a.date ?? "") ||
      a.title.localeCompare(b.title, "tr"),
  );
  return {
    index: {
      version: 1,
      categories: [...categories.values()].sort((a, b) =>
        a.name.localeCompare(b.name, "tr"),
      ),
      items,
    },
    warnings,
  };
}

// ---- Run --------------------------------------------------------------------

async function main() {
  const token = process.env.WEBFLOW_API_TOKEN;
  if (!token) {
    console.error(
      "WEBFLOW_API_TOKEN yok (docs/webflow-setup.md › Türetilen CMS alanları; aynı token).",
    );
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry-run");
  const root = new URL("..", import.meta.url).pathname;
  const config = JSON.parse(
    await readFile(path.join(root, "webflow/search-index.json"), "utf8"),
  );

  const { collections } = await api(token, `/sites/${config.site}/collections`);
  const wanted = new Set([
    ...config.sources.map((s) => s.collection),
    config.categories?.collection,
  ]);
  const data = {};
  for (const slug of wanted) {
    if (!slug) continue;
    const collection = collections.find((c) => c.slug === slug);
    if (!collection) continue;
    const detail = await api(token, `/collections/${collection.id}`);
    // Live items: only what the site shows.
    const items = await listAll(
      token,
      `/collections/${collection.id}/items/live`,
    );
    data[slug] = { fields: detail.fields, items };
  }

  const { index, warnings } = buildIndex(config, data);
  for (const message of warnings) console.warn(`::warning::${message}`);
  const counts = {};
  for (const item of index.items)
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  console.log(
    `dizin: ${index.items.length} kayıt (${Object.entries(counts)
      .map(([type, n]) => `${type} ${n}`)
      .join(", ")}), ${index.categories.length} kategori`,
  );
  if (dryRun) return;
  const output = path.join(root, config.output);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(index)}\n`);
  console.log(`yazıldı: ${config.output}`);
}

if (
  process.argv[1] &&
  import.meta.url === new URL(process.argv[1], "file:").href
) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
