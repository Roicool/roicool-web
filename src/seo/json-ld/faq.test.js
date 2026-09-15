import { test } from "node:test";
import assert from "node:assert/strict";
import { faqPage } from "./faq.js";

const options = { url: "https://www.roicool.com/tr/sss", locale: "tr-TR" };

test("her soru bir Question düğümüne dönüşür", () => {
  const output = faqPage(
    [
      { question: "Roicool ne yapar?", answer: "Kısa cevap." },
      { question: "Nerede?", answer: "İstanbul." },
    ],
    options,
  );

  assert.equal(output["@type"], "FAQPage");
  assert.equal(output.mainEntity.length, 2);
  assert.equal(output.mainEntity[0].name, "Roicool ne yapar?");
  assert.equal(output.mainEntity[0].acceptedAnswer.text, "Kısa cevap.");
});

test("@id sayfanın canonical adresine bağlanır", () => {
  const output = faqPage([], options);
  assert.equal(output["@id"], "https://www.roicool.com/tr/sss#faq");
  assert.equal(output.inLanguage, "tr-TR");
});

test("boş liste geçerli ama boş bir FAQPage üretir", () => {
  const output = faqPage([], options);
  assert.deepEqual(output.mainEntity, []);
});
