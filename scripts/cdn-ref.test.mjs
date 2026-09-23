import { test } from "node:test";
import assert from "node:assert/strict";
import { repositorySlug, cdnRef, cdnLocation } from "./cdn-ref.mjs";

/** Just enough of package.json for the CDN readers. */
function manifest(setting, url = "https://github.com/Roicool/roicool-web.git") {
  return {
    version: "1.2.3",
    repository: { type: "git", url },
    config: setting === undefined ? {} : { cdnRef: setting },
  };
}

test("repositorySlug: GitHub URL'sinden owner/repo", () => {
  assert.equal(repositorySlug(manifest("main")), "Roicool/roicool-web");
  assert.equal(
    repositorySlug(manifest("main", "git@github.com:Roicool/roicool-web.git")),
    "Roicool/roicool-web",
  );
  assert.throws(
    () => repositorySlug(manifest("main", "https://gitlab.com/x/y.git")),
    /GitHub/,
  );
});

test("cdnRef: tag modunda v<sürüm>, dal modunda dal adı, ayar yoksa hata", () => {
  assert.equal(cdnRef(manifest("tag")), "v1.2.3");
  assert.equal(cdnRef(manifest("main")), "main");
  assert.throws(() => cdnRef(manifest()), /cdnRef/);
});

test("cdnLocation: tag → jsDelivr, dal → raw.githack", () => {
  assert.deepEqual(cdnLocation(manifest("tag")), {
    ref: "v1.2.3",
    origin: "https://cdn.jsdelivr.net",
    base: "https://cdn.jsdelivr.net/gh/Roicool/roicool-web@v1.2.3/dist/",
  });
  assert.deepEqual(cdnLocation(manifest("main")), {
    ref: "main",
    origin: "https://raw.githack.com",
    base: "https://raw.githack.com/Roicool/roicool-web/main/dist/",
  });
});
