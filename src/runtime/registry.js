/**
 * registry.js — finds component roots in the DOM and loads their code.
 *
 * One deferred module (`rc.js`) is everything a page needs. Each `[data-rc]`
 * element is discovered here and its chunk is fetched only as the element
 * approaches the viewport, so a page downloads exactly the components it uses
 * and nothing else.
 *
 * The failure behaviour is the point of this design: a chunk that never arrives
 * disables that one component and leaves the rest of the page untouched. There
 * is no hand-written init list to fall out of sync, and no single call chain
 * that one missing file can break.
 */

import { ROOT_SELECTOR, names, flagOption } from "./dom.js";
import { debug, warn, error } from "./log.js";

/** Chunks sit next to this module: dist/rc.js → dist/components/<name>.js */
const CHUNK_BASE = new URL("./components/", import.meta.url);

/** Start loading before the root is on screen, so mounting is not visible. */
const PRELOAD_MARGIN = "200px";

/** name -> Promise<init>, so a component used twice is fetched once. */
const modules = new Map();

/** element -> Set<name>, so a re-scan never mounts the same pair twice. */
const mountedOn = new WeakMap();

const observer =
  "IntersectionObserver" in window
    ? new IntersectionObserver(onIntersect, { rootMargin: PRELOAD_MARGIN })
    : null;

function onIntersect(entries) {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    mountAll(entry.target);
  }
}

function loadComponent(name) {
  let pending = modules.get(name);
  if (!pending) {
    pending = import(new URL(`${name}.js`, CHUNK_BASE).href).then(
      (module) => module.default,
    );
    modules.set(name, pending);
  }
  return pending;
}

async function mount(root, name) {
  let mounted = mountedOn.get(root);
  if (!mounted) mountedOn.set(root, (mounted = new Set()));
  if (mounted.has(name)) return;
  mounted.add(name);

  let init;
  try {
    init = await loadComponent(name);
  } catch (cause) {
    warn(`"${name}" could not be loaded — skipping it.`, cause);
    return;
  }

  if (typeof init !== "function") {
    warn(`"${name}" has no default export — skipping it.`);
    return;
  }

  try {
    init(root);
    debug(`mounted "${name}"`, root);
  } catch (cause) {
    error(`"${name}" failed to initialise.`, cause);
  }
}

function mountAll(root) {
  for (const name of names(root)) mount(root, name);
}

function schedule(root) {
  // Above-the-fold roots opt out of lazy loading with `data-rc-eager`.
  if (!observer || flagOption(root, "eager")) {
    mountAll(root);
    return;
  }
  observer.observe(root);
}

/**
 * Discover every component root inside `scope`. Called once on load; call it
 * again through `window.rc.scan(container)` after injecting markup yourself.
 */
export function scan(scope = document) {
  for (const root of scope.querySelectorAll(ROOT_SELECTOR)) schedule(root);
}
