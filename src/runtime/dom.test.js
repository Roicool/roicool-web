import { test } from "node:test";
import assert from "node:assert/strict";
import { names, option, numberOption, flagOption } from "./dom.js";

/** Just enough of an element for the attribute readers. */
function element(attributes = {}) {
  return { getAttribute: (name) => attributes[name] ?? null };
}

test("names: tek ad, boşlukla ve virgülle ayrılmış çoklu ad", () => {
  assert.deepEqual(names(element({ "data-rc": "accordion" })), ["accordion"]);
  assert.deepEqual(names(element({ "data-rc": "reveal parallax" })), [
    "reveal",
    "parallax",
  ]);
  assert.deepEqual(names(element({ "data-rc": "reveal, parallax" })), [
    "reveal",
    "parallax",
  ]);
});

test("names: boş ya da eksik attribute boş liste verir", () => {
  assert.deepEqual(names(element({ "data-rc": "" })), []);
  assert.deepEqual(names(element()), []);
});

test("flagOption: yok → false, boş → true, olumsuz değerler → false", () => {
  assert.equal(flagOption(element(), "single"), false);
  assert.equal(flagOption(element({ "data-rc-single": "" }), "single"), true);
  for (const value of ["false", "0", "no", "off", "OFF"]) {
    assert.equal(
      flagOption(element({ "data-rc-single": value }), "single"),
      false,
      value,
    );
  }
  assert.equal(
    flagOption(element({ "data-rc-single": "yes" }), "single"),
    true,
  );
});

test("option: yok ya da boşsa fallback, doluysa değer", () => {
  assert.equal(option(element(), "open", "none"), "none");
  assert.equal(option(element({ "data-rc-open": "" }), "open", "none"), "none");
  assert.equal(option(element({ "data-rc-open": "first" }), "open"), "first");
});

test("numberOption: sayı çözülür, sayı değilse fallback", () => {
  assert.equal(
    numberOption(element({ "data-rc-delay": "6000" }), "delay", 0),
    6000,
  );
  assert.equal(
    numberOption(element({ "data-rc-delay": "abc" }), "delay", 0),
    0,
  );
  assert.equal(numberOption(element(), "delay", 250), 250);
});
