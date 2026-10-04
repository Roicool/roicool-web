import { test } from "node:test";
import assert from "node:assert/strict";
import {
  slugify,
  anchorsFor,
  headingsOf,
  tableOfContents,
  tableOfContentsHtml,
  entriesOf,
  FALLBACK_ANCHOR,
} from "./anchors.js";

test("slugify: Türkçe harfler, büyük İ/I, kesme işareti, aksan", () => {
  assert.equal(slugify("Neden Webflow'a Geçmeli?"), "neden-webflowa-gecmeli");
  assert.equal(slugify("İÇERİK ŞİMDİ ÖĞÜN ÇIKIŞ"), "icerik-simdi-ogun-cikis");
  assert.equal(slugify("Iğdır’ın Işıkları"), "igdirin-isiklari");
  assert.equal(slugify("Café & Crème — 2026"), "cafe-creme-2026");
  assert.equal(slugify("  --  "), FALLBACK_ANCHOR);
});

test("anchorsFor: tekrar eden başlık sırayla -2, -3 alır", () => {
  assert.deepEqual(anchorsFor(["Sonuç", "Giriş", "Sonuç", "Sonuç"]), [
    "sonuc",
    "giris",
    "sonuc-2",
    "sonuc-3",
  ]);
});

test("headingsOf ve tableOfContents: yalnız H2, iç etiket ve varlık çözülür", () => {
  const body =
    '<h2 id="x">Ne <strong>yapıyoruz</strong></h2><p>a</p><h3>Alt</h3><h2>Fiyat &amp; Süre</h2><h2> </h2>';
  assert.equal(headingsOf(body).length, 3);
  assert.deepEqual(tableOfContents(body), [
    { anchor: "ne-yapiyoruz", text: "Ne yapıyoruz" },
    { anchor: "fiyat-sure", text: "Fiyat & Süre" },
  ]);
  assert.deepEqual(tableOfContents("<p>başlıksız</p>"), []);
});

test("tableOfContentsHtml: tek liste, metin kaçışlı; boşsa null", () => {
  assert.equal(
    tableOfContentsHtml([{ anchor: "a-b", text: "A < B" }]),
    '<ul><li><a href="#a-b">A &lt; B</a></li></ul>',
  );
  assert.equal(tableOfContentsHtml([]), null);
});

test("entriesOf: CMS'in eklediği işaretlemeye rağmen aynı girdiler", () => {
  const entries = [
    { anchor: "giris", text: "Giriş" },
    { anchor: "fiyat-sure", text: "Fiyat & Süre" },
  ];
  const stored =
    '<ul role="list"><li><a href="#giris" target="_self">Giriş</a></li><li><a href="#fiyat-sure">Fiyat &amp; Süre</a></li></ul>';
  assert.deepEqual(entriesOf(stored), entries);
  assert.deepEqual(entriesOf(tableOfContentsHtml(entries)), entries);
  assert.deepEqual(entriesOf(null), []);
});
