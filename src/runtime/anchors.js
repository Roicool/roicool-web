/**
 * anchors.js — how a heading's text becomes its #anchor, in one place for
 * both sides that need it:
 *
 *   scripts/cms-derived-fields.mjs writes a post's table of contents into
 *   the CMS (Blog › İçindekiler) as links to "#<anchor>", worked out from
 *   the H2s of the stored body;
 *   components/toc gives the same H2s on the page the same ids, since
 *   Webflow's rich text cannot carry an id.
 *
 * Both read the heading's HTML (stored HTML on one side, the element's
 * innerHTML on the other) through the same textOf and slugify, so the two
 * agree character for character. Pure functions, no DOM: they run in Node
 * too and are tested in anchors.test.js.
 */

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/** The readable text of a piece of HTML: tags dropped, entities decoded. */
export function textOf(html) {
  return String(html ?? "")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (_, code) => {
      if (code[0] !== "#") return ENTITIES[code.toLowerCase()] ?? " ";
      const number =
        code[1].toLowerCase() === "x"
          ? Number.parseInt(code.slice(2), 16)
          : Number(code.slice(1));
      return Number.isFinite(number) ? String.fromCodePoint(number) : " ";
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Turkish letters with no decomposition to a Latin base. */
const TURKISH = { ı: "i", ğ: "g", ş: "s", ç: "c", ö: "o", ü: "u" };

/** The anchor used when a heading has no letter or digit at all. */
export const FALLBACK_ANCHOR = "bolum";

/**
 * A URL-safe anchor from a heading's text: Turkish lower case, accents
 * dropped, anything else between words becomes one hyphen.
 * "Neden Webflow'a Geçmeli?" → "neden-webflowa-gecmeli".
 */
export function slugify(text) {
  const slug = String(text ?? "")
    .toLocaleLowerCase("tr")
    .replace(/[ığşçöü]/g, (letter) => TURKISH[letter])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || FALLBACK_ANCHOR;
}

/**
 * One anchor per heading text, in order. A repeated anchor takes -2, -3 …
 * in the order it appears, so the second "Sonuç" is "sonuc-2" on both
 * sides.
 */
export function anchorsFor(texts) {
  const used = new Map();
  return texts.map((text) => {
    const base = slugify(text);
    const count = (used.get(base) ?? 0) + 1;
    used.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

/** The inner HTML of every <h2> in a piece of HTML, in order. */
export function headingsOf(html) {
  return Array.from(
    String(html ?? "").matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi),
    (match) => match[1],
  );
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * A table of contents for a body: [{ anchor, text }] per H2. Empty for a
 * body with no H2 with text in it.
 */
export function tableOfContents(html) {
  const texts = headingsOf(html)
    .map(textOf)
    .filter((text) => text !== "");
  const anchors = anchorsFor(texts);
  return texts.map((text, i) => ({ anchor: anchors[i], text }));
}

/** The table of contents as the rich text the CMS stores: one list. */
export function tableOfContentsHtml(entries) {
  if (entries.length === 0) return null;
  const items = entries
    .map(
      ({ anchor, text }) =>
        `<li><a href="#${anchor}">${escapeHtml(text)}</a></li>`,
    )
    .join("");
  return `<ul>${items}</ul>`;
}

/**
 * The entries a stored table of contents holds, read back from its HTML so
 * a stored list compares with a computed one whatever markup the CMS added
 * around it (attributes, wrappers, entity spelling).
 */
export function entriesOf(html) {
  return Array.from(
    String(html ?? "").matchAll(
      /<a\b[^>]*\bhref="#([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    ),
    (match) => ({ anchor: textOf(match[1]), text: textOf(match[2]) }),
  );
}
