/**
 * copy.js — a button that puts something on the clipboard: the page's link,
 * or the post as Markdown (title, link, then the body) for pasting into a
 * notes app or an AI chat.
 *
 * The button's words are in the HTML (rule 1): a `label` part shown at
 * rest and a `done` part ("Kopyalandı") shown for two seconds after a copy;
 * the code only switches between them (state "copied" on the root). The
 * Markdown is read from the page as it is and goes only to the clipboard.
 *
 * Options on the root:
 *   data-rc-content  "link" (default) or "markdown"
 *   data-rc-source   for markdown: a selector for the body, by default the
 *                    page's [data-rc-part="body"] (the toc root's body)
 *
 * The link is the page's canonical URL, else its address without a hash.
 * Without JavaScript the button does nothing, so it is not shown.
 *
 * Structure: README.md in this folder.
 */

import { option, part, setState } from "../../runtime/dom.js";
import { warn } from "../../runtime/log.js";
import { markdownOf } from "../../runtime/markdown.js";

/** How long the "done" words stay, in ms. */
const DONE_FOR = 2000;

function pageLink() {
  const canonical = document.querySelector('link[rel="canonical"]')?.href;
  if (canonical) return canonical;
  const url = new URL(window.location.href);
  url.hash = "";
  return url.href;
}

function markdown(root) {
  const selector = option(root, "source", '[data-rc-part="body"]');
  const body = document.querySelector(selector);
  if (!body) {
    warn(`copy: no body to copy — nothing matches ${selector}.`, root);
    return null;
  }
  const title = document.querySelector("h1")?.textContent.trim();
  const head = [title ? `# ${title}` : "", pageLink()].filter(Boolean);
  return `${head.join("\n\n")}\n\n---\n\n${markdownOf(body)}\n`;
}

/** The older route, for a page without the async clipboard (http, old). */
function copyByCommand(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();
  let done = false;
  try {
    done = document.execCommand("copy");
  } catch {
    done = false;
  }
  area.remove();
  return done;
}

async function write(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyByCommand(text);
  }
}

export default function copy(root) {
  const content = option(root, "content", "link");
  if (content !== "link" && content !== "markdown") {
    warn(`copy: data-rc-content is "${content}"; use link or markdown.`, root);
    return;
  }
  if (root instanceof HTMLButtonElement) root.type = "button";
  const done = part(root, "done");
  if (done) done.setAttribute("role", "status");

  let timer = 0;
  root.addEventListener("click", async (event) => {
    event.preventDefault();
    const text = content === "markdown" ? markdown(root) : pageLink();
    if (!text) return;
    if (!(await write(text))) {
      warn("copy: the browser refused the clipboard.", root);
      return;
    }
    setState(root, "copied");
    clearTimeout(timer);
    timer = setTimeout(() => setState(root, "ready"), DONE_FOR);
  });
  setState(root, "ready");
}
