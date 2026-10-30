import test from "node:test";
import assert from "node:assert/strict";
import { mergeDictation } from "../src/pages/family/familyPresentation.js";
test("completed speech goes into the unchanged draft at its captured caret", () => {
  assert.equal(
    mergeDictation(
      "Hello world",
      "lovely",
      { text: "Hello world", start: 6, end: 6 },
      true,
    ),
    "Hello lovely world",
  );
});
test("changed draft is staged instead of overwritten", () => {
  assert.equal(
    mergeDictation(
      "New typing",
      "spoken",
      { text: "Old typing", start: 10, end: 10 },
      true,
    ),
    null,
  );
  assert.equal(
    mergeDictation(
      "New typing",
      "spoken",
      { text: "Old typing", start: 10, end: 10 },
      false,
    ),
    "New typing spoken",
  );
});
test("overflow is never silently truncated", () => {
  const text = "x".repeat(4000);
  assert.equal(
    mergeDictation(text, "more", { text, start: 4000, end: 4000 }, true),
    null,
  );
});
