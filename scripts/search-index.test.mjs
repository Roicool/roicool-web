import { test } from "node:test";
import assert from "node:assert/strict";
import { buildIndex, excerpt, resolveField } from "./search-index.mjs";

const FIELDS = [
  { slug: "name", displayName: "Name" },
  { slug: "slug", displayName: "Slug" },
  { slug: "aciklama", displayName: "Summary" },
  { slug: "gorsel", displayName: "Main image" },
  { slug: "kategori", displayName: "Category" },
  { slug: "okuma-suresi", displayName: "Reading time" },
];

test("resolveField: slug ya da görünen ad, ilk bulunan", () => {
  assert.equal(resolveField(FIELDS, ["ozet", "Summary"]), "aciklama");
  assert.equal(resolveField(FIELDS, ["main image"]), "gorsel");
  assert.equal(resolveField(FIELDS, ["yok"]), null);
});

test("excerpt: HTML düşer, sınırda kelimeden kesilir", () => {
  assert.equal(excerpt("<p>Kısa metin.</p>", 50), "Kısa metin.");
  assert.equal(
    excerpt("Google Tag Manager kapsayıcı etiket tetikleyici", 30),
    "Google Tag Manager kapsayıcı…",
  );
  assert.equal(excerpt(null, 10), "");
});

test("buildIndex: yalnız yayında, alanlar eşlenir, kategori adı ve linki gelir", () => {
  const config = {
    excerpt: 40,
    categories: { collection: "kategori", url: "/kategori/{slug}" },
    sources: [
      {
        type: "post",
        collection: "blog",
        url: "/blog/{slug}",
        fields: {
          text: ["aciklama"],
          image: ["gorsel"],
          category: ["kategori"],
          minutes: ["okuma-suresi"],
          date: ["guncelleme-tarihi"],
        },
      },
      { type: "term", collection: "sozluk", url: "/sozluk/{slug}" },
    ],
  };
  const data = {
    kategori: {
      fields: [],
      items: [{ id: "c1", fieldData: { name: "SEO", slug: "seo" } }],
    },
    blog: {
      fields: FIELDS,
      items: [
        {
          id: "p1",
          fieldData: {
            name: "GTM nedir?",
            slug: "gtm",
            aciklama: "<p>Etiket yönetimi.</p>",
            gorsel: { url: "https://cdn/x.png" },
            kategori: "c1",
            "okuma-suresi": 7,
          },
        },
        { id: "p2", isDraft: true, fieldData: { name: "Taslak", slug: "t" } },
        { id: "p3", isArchived: true, fieldData: { name: "Eski", slug: "e" } },
      ],
    },
  };
  const { index, warnings } = buildIndex(config, data);
  assert.deepEqual(index.items, [
    {
      type: "post",
      title: "GTM nedir?",
      url: "/blog/gtm",
      text: "Etiket yönetimi.",
      image: "https://cdn/x.png",
      category: "SEO",
      categoryUrl: "/kategori/seo",
      minutes: 7,
    },
  ]);
  assert.deepEqual(index.categories, [{ name: "SEO", url: "/kategori/seo" }]);
  assert.ok(warnings.some((w) => w.includes("date")));
  assert.ok(warnings.some((w) => w.includes("sozluk")));
});
