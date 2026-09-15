/**
 * cdn-ref.mjs — which ref the CDN URLs point at, from package.json:
 *
 *   config.cdnRef = "tag"        production — pins v<version>; immutable,
 *                                cached by jsDelivr forever
 *   config.cdnRef = "<branch>"   development — follows the branch; jsDelivr
 *                                caches it for up to 12 hours, so a push is
 *                                not live until `npm run purge`
 */
export function cdnRef({ config, version }) {
  const setting = config?.cdnRef;
  if (!setting) {
    throw new Error(
      'package.json needs config.cdnRef — "tag" or a branch name',
    );
  }
  return setting === "tag" ? `v${version}` : setting;
}
