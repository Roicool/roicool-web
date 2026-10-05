/**
 * search.js — a search dialog: results appear as the visitor types, grouped
 * (posts, services, glossary terms, categories), with the matching part of
 * each title in bold. Modelled on ramp.com/blog's search: the same dialog,
 * 300 ms debounce, spinner, "try a broader search" state and "see all
 * results" link, plus Turkish-aware matching, a little typo tolerance,
 * keyboard navigation, recent searches and ⌘K / Ctrl K / "/" to open.
 *
 * What it searches is dist/search-index.json, built from the published CMS
 * items every hour (scripts/search-index.mjs); it is downloaded once, when
 * the dialog first opens (or when the pointer nears a trigger). Results are
 * an answer to what the visitor types, not page content: every result's
 * own page keeps its content in its HTML (rule 1).
 *
 * The markup is Designer's: the dialog, the form, each group with one
 * result card as a template — the code clones the template per result and
 * fills its parts (title, text, picture, category, minutes); it never
 * touches a class. Without JS the trigger is a link to the site search page
 * and the form submits there.
 *
 * Structure: README.md in this folder.
 */

import { option, part, parts, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";

/** Milliseconds after the last keystroke before searching (Ramp: 300). */
const DEBOUNCE = 300;

/** Recent searches kept in this browser. */
const RECENT_KEY = "rc-search-recent";
const RECENT_MAX = 5;

/** Results per group when the group sets no data-rc-limit. */
const LIMITS = { post: 6, service: 3, term: 4, category: 4 };

const TURKISH = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/**
 * One character folded for matching: lower case the Turkish way, accents
 * off. Always one character out for one in, so positions found in the
 * folded text are positions in the original (for the bold part).
 */
function foldChar(char) {
  const lower = char.toLocaleLowerCase("tr").normalize("NFD")[0] ?? char;
  return TURKISH[lower] ?? lower;
}
const fold = (text = "") => Array.from(String(text), foldChar).join("");

const termsOf = (query) =>
  fold(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

/** Levenshtein distance, capped: enough to forgive one or two typos. */
function distance(a, b, cap) {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      next[j] = Math.min(
        row[j] + 1,
        next[j - 1] + 1,
        row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      best = Math.min(best, next[j]);
    }
    if (best > cap) return cap + 1;
    row = next;
  }
  return row[b.length];
}

/** Prepared once per entry: folded fields and title words. */
function prepare(entry) {
  const title = fold(entry.title);
  return {
    entry,
    title,
    words: title.split(/[^\p{L}\p{N}]+/u).filter(Boolean),
    category: fold(entry.category),
    text: fold(entry.text),
  };
}

/**
 * Score an entry against the query's terms: every term must be found
 * somewhere (title, category or text), the title weighing most; a term of
 * four letters or more may miss by a typo against a title word. 0 = no match.
 */
function score(prepared, terms) {
  let total = 0;
  for (const term of terms) {
    let points = 0;
    if (prepared.title.startsWith(term)) points += 40;
    else if (prepared.words.some((word) => word.startsWith(term))) points += 25;
    else if (prepared.title.includes(term)) points += 15;
    if (prepared.category.includes(term)) points += 8;
    if (prepared.text.includes(term)) points += 4;
    if (points === 0 && term.length >= 4) {
      // A typo: the term against the start of a title word, one letter
      // shorter, as long, or one longer (a dropped or doubled letter).
      const cap = term.length >= 7 ? 2 : 1;
      const near = (word) =>
        [-1, 0, 1].some(
          (d) => distance(term, word.slice(0, term.length + d), cap) <= cap,
        );
      if (prepared.words.some(near)) points += 10;
    }
    if (points === 0) return 0;
    total += points;
  }
  return total;
}

/** The title as text nodes, the parts that match the terms in <strong>. */
function highlighted(title, terms) {
  const folded = fold(title);
  const marks = new Array(title.length).fill(false);
  for (const term of terms) {
    let from = folded.indexOf(term);
    while (from >= 0) {
      marks.fill(true, from, from + term.length);
      from = folded.indexOf(term, from + term.length);
    }
  }
  const nodes = [];
  let start = 0;
  for (let i = 1; i <= title.length; i += 1) {
    if (i === title.length || marks[i] !== marks[start]) {
      const text = title.slice(start, i);
      if (marks[start]) {
        const strong = document.createElement("strong");
        strong.textContent = text;
        nodes.push(strong);
      } else {
        nodes.push(document.createTextNode(text));
      }
      start = i;
    }
  }
  return nodes;
}

function readRecent() {
  try {
    const list = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((q) => typeof q === "string") : [];
  } catch {
    return [];
  }
}

function remember(query) {
  const q = query.trim();
  if (!q) return;
  try {
    const list = [q, ...readRecent().filter((r) => fold(r) !== fold(q))];
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch {
    // Storage blocked: recent searches are a convenience, nothing breaks.
  }
}

const editable = (el) =>
  el?.isContentEditable || /^(input|textarea|select)$/i.test(el?.tagName ?? "");

/** The link a result card is, or holds. */
const linkOf = (card) => (card.matches("a") ? card : card.querySelector("a"));

/** Fill one part of a cloned card, or hide it when there is nothing. */
function fillPart(card, name, value, apply) {
  for (const el of parts(card, name)) {
    if (value === undefined || value === null || value === "") {
      el.hidden = true;
    } else {
      el.hidden = false;
      apply(el, value);
    }
  }
}

let index = null;
/** Download (once) and prepare the index. */
function loadIndex(url) {
  index ??= fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`${response.status} ${url}`);
      return response.json();
    })
    .then((data) => ({
      items: (data.items ?? []).map(prepare),
      categories: (data.categories ?? []).map((c) =>
        prepare({ type: "category", title: c.name, url: c.url }),
      ),
    }))
    .catch((error) => {
      index = null;
      throw error;
    });
  return index;
}

export default function search(root) {
  const dialog = part(root, "dialog");
  const input = part(root, "input");
  if (!dialog || !input || !(dialog instanceof HTMLDialogElement)) {
    warn(
      'search needs a <dialog> [data-rc-part="dialog"] holding an [data-rc-part="input"].',
      root,
    );
    return;
  }
  const form = part(root, "form") ?? input.form;
  const all = part(root, "all");
  const status = part(root, "status");
  const indexUrl =
    option(root, "index") ?? new URL("../search-index.json", import.meta.url);
  const action = new URL(
    form?.getAttribute("action") || "/search",
    location.href,
  );
  const param = input.name || "query";

  // The dialog scrolls by itself; Lenis leaves it alone.
  dialog.setAttribute("data-lenis-prevent", "");
  root.setAttribute(
    "data-rc-platform",
    /mac|iphone|ipad/i.test(
      navigator.userAgentData?.platform ?? navigator.platform,
    )
      ? "mac"
      : "other",
  );

  // Templates: the first result card in each group's list is the model;
  // whatever else Designer left there as an example goes.
  const groups = parts(root, "group").map((group) => {
    const list = part(group, "list") ?? group;
    const cards = parts(list, "result");
    const template = cards[0] ?? null;
    for (const card of cards) card.remove();
    const type = group.getAttribute("data-rc-type") ?? "post";
    return {
      group,
      list,
      template,
      type,
      limit:
        Number.parseInt(group.getAttribute("data-rc-limit") ?? "", 10) ||
        LIMITS[type] ||
        6,
    };
  });
  const recentBox = part(root, "recent");
  const recentList = recentBox ? (part(recentBox, "list") ?? recentBox) : null;
  const recentTemplate = recentList ? part(recentList, "recent-item") : null;
  recentTemplate?.remove();

  let opener = null;
  let timer = 0;
  let request = 0;

  function setView(state) {
    setState(root, state);
  }

  function renderRecent() {
    if (!recentBox || !recentTemplate) return;
    const list = readRecent();
    recentBox.hidden = list.length === 0;
    recentList.replaceChildren(
      ...list.map((query) => {
        const item = recentTemplate.cloneNode(true);
        const label = part(item, "recent-text") ?? item;
        label.textContent = query;
        item.addEventListener("click", (event) => {
          event.preventDefault();
          input.value = query;
          run();
          input.focus();
        });
        return item;
      }),
    );
  }

  function fillCard(template, entry, terms) {
    const card = template.cloneNode(true);
    const link = linkOf(card);
    if (link) link.href = entry.url;
    fillPart(card, "result-title", entry.title, (el) =>
      el.replaceChildren(...highlighted(entry.title, terms)),
    );
    fillPart(card, "result-text", entry.text, (el, v) => {
      el.textContent = v;
    });
    fillPart(card, "result-category", entry.category, (el, v) => {
      el.textContent = v;
    });
    fillPart(card, "result-minutes", entry.minutes, (el, v) => {
      el.textContent = String(v);
    });
    fillPart(card, "result-image", entry.image, (el, v) => {
      const img = el.matches("img") ? el : el.querySelector("img");
      if (!img) return;
      img.src = v;
      img.removeAttribute("srcset");
      img.alt = "";
      img.loading = "lazy";
    });
    link?.addEventListener("click", () => remember(input.value));
    return card;
  }

  async function run() {
    const query = input.value;
    const terms = termsOf(query);
    const id = ++request;
    if (all) {
      const url = new URL(action);
      url.searchParams.set(param, query.trim());
      all.href = url.href;
    }
    if (terms.length === 0) {
      setView("idle");
      renderRecent();
      if (status) status.textContent = "";
      return;
    }
    setView("loading");
    let data;
    try {
      data = await loadIndex(indexUrl);
    } catch (error) {
      warn("search: the index did not load.", error);
      if (id === request) setView("empty");
      return;
    }
    if (id !== request) return; // a newer query is on its way

    let shown = 0;
    for (const { group, list, template, type, limit } of groups) {
      const pool = type === "category" ? data.categories : data.items;
      const found = pool
        .filter((p) => p.entry.type === type)
        .map((p) => ({ p, s: score(p, terms) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, limit);
      group.hidden = found.length === 0;
      if (template) {
        list.replaceChildren(
          ...found.map(({ p }) => fillCard(template, p.entry, terms)),
        );
      }
      shown += found.length;
    }
    setView(shown > 0 ? "results" : "empty");
    if (status) {
      const pattern =
        shown > 0
          ? (status.getAttribute("data-rc-results") ?? "{n} sonuç")
          : (status.getAttribute("data-rc-none") ?? "Sonuç yok");
      status.textContent = pattern.replace("{n}", String(shown));
    }
  }

  function open(trigger) {
    if (dialog.open) return;
    opener = trigger ?? document.activeElement;
    dialog.showModal();
    if (input.value.trim()) run();
    else {
      setView("idle");
      renderRecent();
    }
    input.focus();
    input.select();
    loadIndex(indexUrl).catch(() => {});
  }

  function close() {
    if (!dialog.open) return;
    dialog.close();
  }

  dialog.addEventListener("close", () => {
    clearTimeout(timer);
    setState(root, null);
    const back = opener && opener !== document.body ? opener : null;
    back?.focus?.({ preventScroll: true });
    opener = null;
  });

  // Triggers: inside the root, and anywhere on the page with the marker.
  const triggers = [
    ...parts(root, "open"),
    ...document.querySelectorAll("[data-rc-search-open]"),
  ];
  for (const trigger of triggers) {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      open(trigger);
    });
    // Fetch the index ahead when the pointer or the focus comes near.
    const ahead = () => loadIndex(indexUrl).catch(() => {});
    trigger.addEventListener("pointerenter", ahead, { once: true });
    trigger.addEventListener("focus", ahead, { once: true });
  }

  // ⌘K / Ctrl K anywhere, "/" outside a text field. The first search on
  // the page answers.
  document.addEventListener("keydown", (event) => {
    if (dialog.open) return;
    if (document.querySelector('[data-rc~="search"]') !== root) return;
    const k = event.key.toLowerCase();
    const combo = k === "k" && (event.metaKey || event.ctrlKey);
    const slash = event.key === "/" && !editable(event.target);
    if (!combo && !slash) return;
    event.preventDefault();
    open(document.activeElement);
  });

  for (const button of parts(root, "close")) {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      close();
    });
  }
  // A press on the backdrop (the dialog itself, outside its content).
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });

  input.addEventListener("input", () => {
    clearTimeout(timer);
    if (termsOf(input.value).length > 0) setView("loading");
    timer = setTimeout(run, DEBOUNCE);
  });

  // Enter: off to the full results page, remembering the query.
  form?.addEventListener("submit", () => remember(input.value));

  // Esc closes at once — a search field would first spend it on clearing
  // itself. Arrows walk the links in view: input → results → "see all".
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = Array.from(dialog.querySelectorAll("a[href], button")).filter(
      (el) =>
        el.getClientRects().length > 0 &&
        !parts(root, "close").includes(el) &&
        el !== input,
    );
    if (links.length === 0) return;
    const at = links.indexOf(document.activeElement);
    event.preventDefault();
    if (event.key === "ArrowDown") {
      links[Math.min(links.length - 1, at + 1)]?.focus();
    } else if (at <= 0) {
      input.focus();
    } else {
      links[at - 1].focus();
    }
  });
}
