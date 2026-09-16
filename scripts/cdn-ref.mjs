/**
 * cdn-ref.mjs — where the site loads dist/ from, decided by package.json:
 *
 *   config.cdnRef = "tag"        production — jsDelivr, pinned to v<version>.
 *                                Immutable, cached forever, fastest edge.
 *   config.cdnRef = "<branch>"   development — raw.githack.com, following the
 *                                branch. No CDN cache of its own; only GitHub's
 *                                five-minute raw cache stands between a push
 *                                and the site. jsDelivr is not used here on
 *                                purpose: it caches branch refs for 12 hours
 *                                and its purge is unreliable for branches.
 */

/** "https://github.com/Roicool/roicool-web.git" → "Roicool/roicool-web" */
export function repositorySlug(manifest) {
  const match = manifest.repository?.url?.match(
    /github\.com[/:]([^/]+\/[^/.]+)/,
  );
  if (!match) {
    throw new Error("package.json › repository.url is not a GitHub URL");
  }
  return match[1];
}

/** The git ref the URLs point at: v<version> in tag mode, else the branch. */
export function cdnRef({ config, version }) {
  const setting = config?.cdnRef;
  if (!setting) {
    throw new Error(
      'package.json needs config.cdnRef — "tag" or a branch name',
    );
  }
  return setting === "tag" ? `v${version}` : setting;
}

/**
 * `origin` for the preconnect hint, `base` for every dist/ URL (trailing
 * slash included), `ref` for the stamp in head.html's first line.
 */
export function cdnLocation(manifest) {
  const ref = cdnRef(manifest);
  const slug = repositorySlug(manifest);
  if (manifest.config.cdnRef === "tag") {
    const origin = "https://cdn.jsdelivr.net";
    return { ref, origin, base: `${origin}/gh/${slug}@${ref}/dist/` };
  }
  const origin = "https://raw.githack.com";
  return { ref, origin, base: `${origin}/${slug}/${ref}/dist/` };
}
