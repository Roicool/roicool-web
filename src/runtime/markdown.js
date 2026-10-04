/**
 * markdown.js — a rich text element as Markdown, for the "copy as Markdown"
 * button (components/copy). Reads what is already on the page and returns a
 * string for the clipboard; it never writes into the page.
 *
 * Covers what Webflow's rich text produces: headings, paragraphs, bold,
 * italic, links, line breaks, ordered and unordered lists (nested),
 * blockquotes, code, images and figures with captions, horizontal rules and
 * tables (GitHub style). Anything hidden from readers (aria-hidden, script,
 * style, buttons, forms) is left out. Links and images come out absolute.
 */

const SKIP = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEMPLATE",
  "SVG",
  "BUTTON",
  "FORM",
  "IFRAME",
]);

const BLOCK = new Set([
  "P",
  "DIV",
  "SECTION",
  "ARTICLE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "UL",
  "OL",
  "LI",
  "BLOCKQUOTE",
  "PRE",
  "FIGURE",
  "FIGCAPTION",
  "TABLE",
  "HR",
]);

function skipped(node) {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (SKIP.has(node.tagName.toUpperCase()) ||
      node.getAttribute("aria-hidden") === "true" ||
      node.hidden)
  );
}

/** Characters that would start Markdown syntax in running text. */
function escape(text) {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

/** Inline Markdown for a node's content, whitespace collapsed. */
function inline(node) {
  let out = "";
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      out += escape(child.textContent.replace(/\s+/g, " "));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE || skipped(child)) continue;
    const tag = child.tagName.toUpperCase();
    const inner = () => inline(child).trim();
    switch (tag) {
      case "BR":
        out += "  \n";
        break;
      case "STRONG":
      case "B": {
        const text = inner();
        if (text) out += `**${text}**`;
        break;
      }
      case "EM":
      case "I": {
        const text = inner();
        if (text) out += `*${text}*`;
        break;
      }
      case "CODE":
        out += `\`${child.textContent}\``;
        break;
      case "A": {
        const text = inner();
        const href = child.href;
        out += href ? `[${text || href}](${href})` : text;
        break;
      }
      case "IMG":
        out += image(child);
        break;
      default:
        out += BLOCK.has(tag) ? ` ${inner()} ` : inline(child);
    }
  }
  return out;
}

function image(img) {
  const src = img.currentSrc || img.src;
  return src ? `![${escape(img.alt || "")}](${src})` : "";
}

function table(element) {
  const rows = Array.from(element.querySelectorAll("tr")).map((row) =>
    Array.from(row.children).map((cell) =>
      inline(cell)
        .trim()
        .replace(/\|/g, "\\|")
        .replace(/\s*\n\s*/g, " "),
    ),
  );
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((row) => row.length));
  const line = (cells) =>
    `| ${Array.from({ length: width }, (_, i) => cells[i] ?? "").join(" | ")} |`;
  return [
    line(rows[0]),
    line(Array.from({ length: width }, () => "---")),
    ...rows.slice(1).map(line),
  ].join("\n");
}

function list(element, depth) {
  const ordered = element.tagName.toUpperCase() === "OL";
  const start = Number(element.getAttribute("start")) || 1;
  const items = Array.from(element.children).filter(
    (child) => child.tagName.toUpperCase() === "LI" && !skipped(child),
  );
  return items
    .map((item, i) => {
      const marker = ordered ? `${start + i}.` : "-";
      const indent = "  ".repeat(depth);
      const nested = Array.from(item.children).filter((child) =>
        ["UL", "OL"].includes(child.tagName.toUpperCase()),
      );
      const own = item.cloneNode(true);
      for (const sub of own.querySelectorAll(":scope > ul, :scope > ol"))
        sub.remove();
      const text = inline(own).trim();
      const below = nested.map((sub) => list(sub, depth + 1)).join("\n");
      return `${indent}${marker} ${text}${below ? `\n${below}` : ""}`;
    })
    .join("\n");
}

/** Markdown blocks for a node's children, separated by blank lines. */
function blocks(node) {
  const out = [];
  let run = "";
  const flush = () => {
    const text = run.replace(/[ \t]+/g, " ").trim();
    if (text) out.push(text);
    run = "";
  };
  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      run += escape(child.textContent.replace(/\s+/g, " "));
      continue;
    }
    if (child.nodeType !== Node.ELEMENT_NODE || skipped(child)) continue;
    const tag = child.tagName.toUpperCase();
    if (!BLOCK.has(tag)) {
      run += inline({ childNodes: [child] });
      continue;
    }
    flush();
    const block = blockOf(child, tag);
    if (block) out.push(block);
  }
  flush();
  return out.join("\n\n");
}

function blockOf(element, tag) {
  switch (tag) {
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6": {
      const text = inline(element).trim();
      return text ? `${"#".repeat(Number(tag[1]))} ${text}` : "";
    }
    case "P":
      return inline(element).trim();
    case "UL":
    case "OL":
      return list(element, 0);
    case "BLOCKQUOTE":
      return blocks(element)
        .split("\n")
        .map((line) => (line ? `> ${line}` : ">"))
        .join("\n");
    case "PRE":
      return `\`\`\`\n${element.textContent.replace(/\n$/, "")}\n\`\`\``;
    case "HR":
      return "---";
    case "TABLE":
      return table(element);
    case "FIGCAPTION": {
      const text = inline(element).trim();
      return text ? `*${text}*` : "";
    }
    default:
      return blocks(element);
  }
}

/** The element's content as Markdown. */
export function markdownOf(element) {
  return blocks(element)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
