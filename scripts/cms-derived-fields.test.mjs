import { test } from "node:test";
import assert from "node:assert/strict";
import {
  textOf,
  countWords,
  minutesFor,
  planUpdates,
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
