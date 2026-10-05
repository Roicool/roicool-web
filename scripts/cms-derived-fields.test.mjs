import { test } from "node:test";
import assert from "node:assert/strict";
import {
  textOf,
  countWords,
  minutesFor,
  planUpdates,
  planCounts,
  signatureOf,
} from "./cms-derived-fields.mjs";

const FIELDS = {
  body: "icerik",
  readingTime: "okuma-suresi",
  wordCount: "kelime-sayisi",
};

test("textOf: etiketler düşer, varlıklar çözülür, boşluk tek olur", () => {
  assert.equal(
    textOf(
      '<h2>Başlık</h2><p>Bir&nbsp;iki &amp; <a href="#">üç</a>.</p><style>p{}</style>',
    ),
    "Başlık Bir iki & üç .",
  );
  assert.equal(textOf("&#305;&#x15F;"), "ış");
  assert.equal(textOf(null), "");
});

test("countWords: Türkçe metin, rakamlar sayılır; tek başına işaret sayılmaz", () => {
  assert.equal(countWords("<p>Dönüşüm oranı %12 arttı — 3 ayda.</p>"), 6);
  assert.equal(countWords("<p>   </p>"), 0);
  assert.equal(countWords(""), 0);
});

test("minutesFor: yukarı yuvarlar, dolu gövdede en az bir dakika", () => {
  assert.equal(minutesFor(0, 200), 0);
  assert.equal(minutesFor(1, 200), 1);
  assert.equal(minutesFor(200, 200), 1);
  assert.equal(minutesFor(201, 200), 2);
});

test("planUpdates: yalnız değeri değişen kayıtlar, arşiv atlanır", () => {
  const body = `<p>${"kelime ".repeat(450)}</p>`;
  const items = [
    {
      id: "same",
      fieldData: {
        name: "Aynı",
        icerik: body,
        "kelime-sayisi": 450,
        "okuma-suresi": 3,
      },
    },
    {
      id: "new",
      fieldData: { name: "Yeni", icerik: body },
    },
    {
      id: "archived",
      isArchived: true,
      fieldData: { name: "Arşiv", icerik: body },
    },
    {
      id: "emptied",
      fieldData: {
        name: "Boşaltıldı",
        icerik: "",
        "kelime-sayisi": 90,
        "okuma-suresi": 1,
      },
    },
    {
      id: "empty",
      fieldData: { name: "Boş", icerik: "" },
    },
  ];
  const updates = planUpdates(items, FIELDS, 200);
  assert.deepEqual(
    updates.map((update) => update.id),
    ["new", "emptied"],
  );
  assert.deepEqual(updates[0].fieldData, {
    "kelime-sayisi": 450,
    "okuma-suresi": 3,
  });
  assert.equal(updates[0].minutes, 3);
  // A body that was emptied clears the stale numbers instead of keeping them.
  assert.deepEqual(updates[1].fieldData, {
    "kelime-sayisi": null,
    "okuma-suresi": null,
  });
  assert.equal(updates[1].minutes, 0);
});

test("planUpdates: içindekiler yalnız linkleri değişince yazılır", () => {
  const fields = { ...FIELDS, tableOfContents: "icindekiler" };
  const body = "<h2>Giriş</h2><p>bir iki üç</p><h2>Sonuç</h2>";
  const settled = {
    "kelime-sayisi": 5,
    "okuma-suresi": 1,
  };
  const items = [
    {
      id: "same",
      fieldData: {
        icerik: body,
        ...settled,
        icindekiler:
          '<ul role="list"><li><a href="#giris">Giriş</a></li><li><a href="#sonuc">Sonuç</a></li></ul>',
      },
    },
    { id: "missing", fieldData: { icerik: body, ...settled } },
    {
      id: "renamed",
      fieldData: {
        icerik: body.replace("Sonuç", "Özet"),
        ...settled,
        icindekiler:
          '<ul><li><a href="#giris">Giriş</a></li><li><a href="#sonuc">Sonuç</a></li></ul>',
      },
    },
    {
      id: "no-headings",
      fieldData: {
        icerik: "<p>bir iki üç dört beş</p>",
        ...settled,
        icindekiler: '<ul><li><a href="#giris">Giriş</a></li></ul>',
      },
    },
  ];
  const updates = planUpdates(items, fields, 200);
  assert.deepEqual(
    updates.map((update) => update.id),
    ["missing", "renamed", "no-headings"],
  );
  assert.equal(
    updates[0].fieldData.icindekiler,
    '<ul><li><a href="#giris">Giriş</a></li><li><a href="#sonuc">Sonuç</a></li></ul>',
  );
  assert.equal(updates[0].headings, 2);
  assert.match(updates[1].fieldData.icindekiler, /#ozet">Özet/);
  assert.equal(updates[2].fieldData.icindekiler, null);
  // Without the option the table of contents is never touched.
  assert.ok(
    planUpdates(items, FIELDS, 200).every(
      (update) => !("icindekiler" in update.fieldData),
    ),
  );
});

test("planUpdates: güncelleme tarihi yalnız metin gerçekten değişince", () => {
  const fields = {
    ...FIELDS,
    updatedAt: "guncelleme-tarihi",
    signature: "icerik-imzasi",
  };
  const now = new Date("2026-10-04T12:00:00Z");
  const body = "<p>bir iki üç</p>";
  const settled = {
    "kelime-sayisi": 3,
    "okuma-suresi": 1,
    "guncelleme-tarihi": "2026-09-01T00:00:00.000Z",
  };
  const signature = signatureOf(body);
  const items = [
    { id: "first", fieldData: { icerik: body, ...settled } },
    {
      id: "same-text-new-markup",
      fieldData: {
        icerik: '<p><strong>bir</strong> iki <a href="/x">üç</a></p>',
        ...settled,
        "icerik-imzasi": signature,
      },
    },
    {
      id: "edited",
      fieldData: {
        icerik: "<p>bir iki dört</p>",
        ...settled,
        "icerik-imzasi": signature,
      },
    },
  ];
  const updates = planUpdates(items, fields, 200, now);
  assert.deepEqual(
    updates.map((update) => update.id),
    ["first", "edited"],
  );
  assert.equal(updates[0].fieldData["icerik-imzasi"], signature);
  assert.ok(!("guncelleme-tarihi" in updates[0].fieldData));
  assert.equal(updates[0].revised, false);
  assert.equal(
    updates[1].fieldData["guncelleme-tarihi"],
    "2026-10-04T12:00:00.000Z",
  );
  assert.equal(updates[1].revised, true);
});

test("planUpdates: güncelleme tarihi boşsa oluşturma tarihini alır", () => {
  const fields = {
    ...FIELDS,
    updatedAt: "guncelleme-tarihi",
    signature: "icerik-imzasi",
  };
  const now = new Date("2026-10-04T12:00:00Z");
  const body = "<p>bir iki üç</p>";
  const settled = {
    icerik: body,
    "kelime-sayisi": 3,
    "okuma-suresi": 1,
    "icerik-imzasi": signatureOf(body),
  };
  const items = [
    {
      id: "created",
      createdOn: "2026-09-27T15:48:39.812Z",
      fieldData: settled,
    },
    { id: "no-date", fieldData: settled },
    {
      id: "dated",
      fieldData: { ...settled, "guncelleme-tarihi": "2026-09-30T00:00:00Z" },
    },
  ];
  const updates = planUpdates(items, fields, 200, now);
  assert.deepEqual(
    updates.map((update) => [update.id, update.fieldData["guncelleme-tarihi"]]),
    [
      ["created", "2026-09-27T15:48:39.812Z"],
      ["no-date", "2026-10-04T12:00:00.000Z"],
    ],
  );
  assert.ok(updates.every((update) => update.revised === false));
});

test("planCounts: yalnız yayında ve arşivsiz kaynaklar sayılır, değişen hedef yazılır", () => {
  const targets = [
    { id: "seo", fieldData: { name: "SEO", "yazi-sayisi": 1 } },
    { id: "geo", fieldData: { name: "GEO", "yazi-sayisi": 0 } },
    { id: "crm", fieldData: { name: "CRM" } },
    { id: "old", isArchived: true, fieldData: { name: "Eski" } },
  ];
  const sources = [
    { id: "a", fieldData: { kategori: "seo" } },
    { id: "b", fieldData: { kategori: "seo" } },
    { id: "c", isDraft: true, fieldData: { kategori: "geo" } },
    { id: "d", isArchived: true, fieldData: { kategori: "geo" } },
    { id: "e", fieldData: { kategori: ["crm", "crm", "seo"] } },
  ];
  assert.deepEqual(
    planCounts(targets, sources, "yazi-sayisi", "kategori").map(
      ({ id, count }) => [id, count],
    ),
    [
      ["seo", 3],
      ["crm", 1],
    ],
  );
});
