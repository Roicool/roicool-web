import { test } from "node:test";
import assert from "node:assert/strict";

// The module's imports read the motion preference when they load.
globalThis.window ??= {
  matchMedia: () => ({ matches: false, addEventListener() {} }),
};
const { pageList } = await import("./paged-list.js");

const gap = null;

test("pageList: up to five pages, all of them", () => {
  assert.deepEqual(pageList(1, 1), [1]);
  assert.deepEqual(pageList(5, 3), [1, 2, 3, 4, 5]);
});

test("pageList: Ramp's KbPagination special cases", () => {
  assert.deepEqual(pageList(10, 1), [1, 2, gap, 9, 10]);
  assert.deepEqual(pageList(10, 10), [1, 2, gap, 9, 10]);
  assert.deepEqual(pageList(10, 2), [1, 2, 3, gap, 10]);
  assert.deepEqual(pageList(10, 9), [1, gap, 8, 9, 10]);
});

test("pageList: neighbours of the current page in the middle", () => {
  assert.deepEqual(pageList(10, 3), [1, 2, 3, 4, gap, 10]);
  assert.deepEqual(pageList(10, 5), [1, gap, 4, 5, 6, gap, 10]);
  assert.deepEqual(pageList(10, 8), [1, gap, 7, 8, 9, 10]);
  assert.deepEqual(pageList(6, 4), [1, gap, 3, 4, 5, 6]);
});
