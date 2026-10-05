/**
 * cms-derived-fields.mjs — keeps the CMS fields that are computed from other
 * fields in step with their source: a piece's word count, reading time and
 * table of contents, from its body.
 *
 * Why here and not in the browser: rule 1 in CLAUDE.md, JS never produces
 * content. A reading time worked out on the page would be invisible to
 * crawlers and LLMs, impossible on a listing card (the body is not there)
 * and blank until the script ran. So the number lives in the CMS like any
 * other field, is bound in Designer like any other field, and this script
 * is the only thing that writes it.
 *
 * Runs in GitHub Actions every hour and on demand
 * (.github/workflows/cms-derived-fields.yml). For each collection listed in
 * webflow/cms-derived-fields.json it
 *   1. checks the configured fields exist — a collection whose fields are
 *      not there yet is skipped with a warning, so the fields can come first;
 *   2. lists every item, drafts included and archived ones skipped, strips
 *      the body's HTML, counts the words and works out the minutes; where
 *      the entry names a tableOfContents field, lists the body's H2s as
 *      links to their anchors (src/runtime/anchors.js — the toc component
 *      gives the H2s on the page the same ids); where it names an updatedAt
 *      and a signature field, stamps today's date when the body's text has
 *      really changed (the signature is a digest of the text alone, so a
 *      style, link or picture change does not count, and the first run only
 *      records it); an item with no update date yet takes its creation
 *      date, so the field (and dateModified in the page's structured data)
 *      is never empty;
 *   3. writes only the items whose stored values differ: the staged item
 *      always, and the live item too when the item is published, so no site
 *      publish is needed.
 *
 * Then, for each entry under `counts`, it counts the published items of one
 * collection that point at each item of another — the posts in a blog
 * category — and writes the number into the target item the same way.
 * Only published, unarchived items count: the number is what a visitor can
 * read, so a draft does not raise it.
 *
 *   WEBFLOW_API_TOKEN=… node scripts/cms-derived-fields.mjs [--dry-run] [--collection <slug>]
 *
 * The token is a site API token with the CMS read and write scopes
 * (docs/webflow-setup.md); it never goes into the repository.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { api, listAll } from "./webflow-api.mjs";
import {
  textOf,
  tableOfContents,
  tableOfContentsHtml,
  entriesOf,
} from "../src/runtime/anchors.js";

/** Items per bulk write the API accepts. */
const PAGE = 100;

// ---- Pure parts, tested in cms-derived-fields.test.mjs ---------------------

export { textOf };

/** Words: whitespace-separated runs that carry at least one letter or digit. */
export function countWords(html) {
  const text = textOf(html);
  if (!text) return 0;
  return text.split(" ").filter((token) => /[\p{L}\p{N}]/u.test(token)).length;
}

/** Minutes to read `words`: rounded up, never under one for a non-empty body. */
export function minutesFor(words, wordsPerMinute) {
  if (words <= 0) return 0;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

/** A digest of the body's readable text: what "really changed" compares. */
export function signatureOf(html) {
  const text = textOf(html);
  if (!text) return null;
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

/**
 * What to write, item by item, given the collection's field slugs. An item
 * is listed only when a stored value differs from the computed one; an
 * empty body clears every derived field rather than leaving stale values
 * behind. `fields.tableOfContents` is optional; a stored table of contents
 * is compared by its links (anchor and text), not its markup, since the
 * CMS rewrites rich text as it stores it. `fields.updatedAt` with
 * `fields.signature` are optional too: a new signature with an old one
 * stored stamps `now` as the update date; with none stored (the first run,
 * a new item) only the signature is recorded. An item with no update date
 * at all takes its creation date (`item.createdOn`, else `now`).
 */
export function planUpdates(items, fields, wordsPerMinute, now = new Date()) {
  const updates = [];
  for (const item of items) {
    if (item.isArchived) continue;
    const data = item.fieldData ?? {};
    const body = data[fields.body];
    const words = countWords(body);
    const wanted = {
      [fields.wordCount]: words > 0 ? words : null,
      [fields.readingTime]:
        words > 0 ? minutesFor(words, wordsPerMinute) : null,
    };
    let changed = Object.entries(wanted).some(
      ([slug, value]) => (data[slug] ?? null) !== value,
    );
    let headings = 0;
    if (fields.tableOfContents) {
      const entries = tableOfContents(body);
      headings = entries.length;
      const stored = entriesOf(data[fields.tableOfContents]);
      if (JSON.stringify(stored) !== JSON.stringify(entries)) {
        wanted[fields.tableOfContents] = tableOfContentsHtml(entries);
        changed = true;
      }
    }
    let revised = false;
    if (fields.updatedAt && fields.signature) {
      const signature = signatureOf(body);
      const stored = data[fields.signature] ?? null;
      if (signature !== stored) {
        wanted[fields.signature] = signature;
        changed = true;
        if (stored !== null && signature !== null) {
          wanted[fields.updatedAt] = now.toISOString();
          revised = true;
        }
      }
      if (!wanted[fields.updatedAt] && !data[fields.updatedAt]) {
        wanted[fields.updatedAt] = item.createdOn ?? now.toISOString();
        changed = true;
      }
    }
    if (!changed) continue;
    updates.push({
      id: item.id,
      name: data.name ?? item.id,
      words,
      minutes: wanted[fields.readingTime] ?? 0,
      headings,
      revised,
      fieldData: wanted,
    });
  }
  return updates;
}

/**
 * How many `sources` point at each of `targets` through the `reference`
 * field (a single or a multi reference), and which targets store a
 * different number in `field`. Archived and draft sources do not count;
 * archived targets are left alone. A target nothing points at stores 0.
 */
export function planCounts(targets, sources, field, reference) {
  const counts = new Map();
  for (const item of sources) {
    if (item.isArchived || item.isDraft) continue;
    const value = item.fieldData?.[reference];
    const ids = Array.isArray(value) ? value : value ? [value] : [];
    for (const id of new Set(ids)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const updates = [];
  for (const item of targets) {
    if (item.isArchived) continue;
    const count = counts.get(item.id) ?? 0;
    if ((item.fieldData?.[field] ?? null) === count) continue;
    updates.push({
      id: item.id,
      name: item.fieldData?.name ?? item.id,
      count,
      fieldData: { [field]: count },
    });
  }
  return updates;
}

// ---- Webflow Data API: scripts/webflow-api.mjs ---------------------------

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** A warning that GitHub Actions also shows on the run's summary page. */
function warn(message) {
  console.warn(`::warning::${message}`);
}

async function main() {
  const token = process.env.WEBFLOW_API_TOKEN;
  if (!token) {
    console.error(
      "WEBFLOW_API_TOKEN yok. Site settings › Apps & integrations › API access'ten CMS okuma-yazma izinli bir token al; GitHub'da repo secret, yerelde ortam değişkeni.",
    );
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const onlyIndex = args.indexOf("--collection");
  const only = onlyIndex >= 0 ? args[onlyIndex + 1] : null;

  const config = JSON.parse(
    await readFile(
      new URL("../webflow/cms-derived-fields.json", import.meta.url),
      "utf8",
    ),
  );
  const { collections } = await api(token, `/sites/${config.site}/collections`);

  for (const entry of config.collections) {
    if (only && entry.slug !== only) continue;
    const collection = collections.find((c) => c.slug === entry.slug);
    if (!collection) {
      warn(`${entry.slug}: sitede bu slug'la bir koleksiyon yok, atlandı.`);
      continue;
    }
    const detail = await api(token, `/collections/${collection.id}`);
    const present = new Set(detail.fields.map((field) => field.slug));
    const missing = [entry.body, entry.readingTime, entry.wordCount].filter(
      (slug) => !present.has(slug),
    );
    if (missing.length > 0) {
      warn(
        `${entry.slug}: ${missing.join(", ")} alanı yok, atlandı. Önce alanı aç (docs/webflow-setup.md).`,
      );
      continue;
    }
    const fields = { ...entry };
    if (fields.tableOfContents && !present.has(fields.tableOfContents)) {
      warn(
        `${entry.slug}: ${fields.tableOfContents} alanı yok, içindekiler atlandı; okuma süresi yine yazılıyor.`,
      );
      delete fields.tableOfContents;
    }
    const dating = [fields.updatedAt, fields.signature].filter(Boolean);
    if (dating.length > 0 && dating.some((slug) => !present.has(slug))) {
      warn(
        `${entry.slug}: ${dating.filter((slug) => !present.has(slug)).join(", ")} alanı yok, güncelleme tarihi atlandı.`,
      );
      delete fields.updatedAt;
      delete fields.signature;
    }

    const items = await listAll(token, `/collections/${collection.id}/items`);
    const live = new Set(
      (await listAll(token, `/collections/${collection.id}/items/live`)).map(
        (item) => item.id,
      ),
    );
    const updates = planUpdates(items, fields, config.wordsPerMinute);
    for (const update of updates) {
      const contents = fields.tableOfContents
        ? `, ${update.headings} başlık`
        : "";
      const revised = update.revised ? ", metin değişti" : "";
      console.log(
        `  ${update.name}: ${update.words} kelime, ${update.minutes} dk${contents}${revised}${live.has(update.id) ? "" : " (taslak)"}`,
      );
    }
    if (!dryRun) {
      for (const chunk of chunks(updates, PAGE)) {
        const payload = (list) =>
          list.map(({ id, fieldData }) => ({ id, fieldData }));
        await api(token, `/collections/${collection.id}/items`, {
          method: "PATCH",
          body: { items: payload(chunk) },
        });
        const published = chunk.filter((update) => live.has(update.id));
        if (published.length > 0) {
          await api(token, `/collections/${collection.id}/items/live`, {
            method: "PATCH",
            body: { items: payload(published) },
          });
        }
      }
    }
    const liveCount = updates.filter((update) => live.has(update.id)).length;
    console.log(
      `${entry.slug}: ${items.length} kayıt, ${updates.length} ${dryRun ? "güncellenecek" : "güncellendi"} (${liveCount} canlı)`,
    );
  }

  for (const entry of config.counts ?? []) {
    if (only && entry.slug !== only) continue;
    const target = collections.find((c) => c.slug === entry.slug);
    const source = collections.find((c) => c.slug === entry.source);
    if (!target || !source) {
      warn(
        `${entry.slug} ← ${entry.source}: koleksiyonlardan biri sitede yok, sayım atlandı.`,
      );
      continue;
    }
    const [targetDetail, sourceDetail] = await Promise.all([
      api(token, `/collections/${target.id}`),
      api(token, `/collections/${source.id}`),
    ]);
    const hasField = targetDetail.fields.some((f) => f.slug === entry.field);
    const hasReference = sourceDetail.fields.some(
      (f) => f.slug === entry.reference,
    );
    if (!hasField || !hasReference) {
      warn(
        `${entry.slug}: ${hasField ? `${entry.source}.${entry.reference}` : entry.field} alanı yok, sayım atlandı.`,
      );
      continue;
    }
    const targets = await listAll(token, `/collections/${target.id}/items`);
    const liveTargets = new Set(
      (await listAll(token, `/collections/${target.id}/items/live`)).map(
        (item) => item.id,
      ),
    );
    // What a visitor can read: the live items of the source.
    const sources = await listAll(
      token,
      `/collections/${source.id}/items/live`,
    );
    const updates = planCounts(targets, sources, entry.field, entry.reference);
    for (const update of updates) {
      console.log(`  ${update.name}: ${update.count}`);
    }
    if (!dryRun) {
      for (const chunk of chunks(updates, PAGE)) {
        const payload = (list) =>
          list.map(({ id, fieldData }) => ({ id, fieldData }));
        await api(token, `/collections/${target.id}/items`, {
          method: "PATCH",
          body: { items: payload(chunk) },
        });
        const published = chunk.filter((update) => liveTargets.has(update.id));
        if (published.length > 0) {
          await api(token, `/collections/${target.id}/items/live`, {
            method: "PATCH",
            body: { items: payload(published) },
          });
        }
      }
    }
    console.log(
      `${entry.slug}: ${targets.length} kayıt, ${updates.length} sayı ${dryRun ? "güncellenecek" : "güncellendi"}`,
    );
  }
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
