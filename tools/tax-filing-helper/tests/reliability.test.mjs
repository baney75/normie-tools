import test from "node:test";
import assert from "node:assert/strict";
import { checkAnswers, foldText, PRACTICE_SHEET, MAX_ITEMS } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero, huge numbers,
// words, emoji, NaN. None may throw or give NaN or Infinity.
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "1.2.3", null, undefined, {}, [], true, 12, 1.5, NaN, Infinity, "x".repeat(500)];

// A word the person typed is shown back as typed, so strings are only checked when the input was not a string.
function clean(value, where, echo = false) {
  if (typeof value === "number") assert.ok(Number.isFinite(value), where);
  else if (typeof value === "string") echo || assert.ok(!/NaN|undefined|Infinity|\[object/.test(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => clean(v, `${where}[${i}]`, echo));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) clean(v, `${where}.${k}`, echo);
}

test("messy: every messy typed value in every box never throws and never gives NaN", () => {
  for (const item of PRACTICE_SHEET) {
    for (const m of MESSY) {
      const r = checkAnswers(PRACTICE_SHEET, { [item.id]: m });
      assert.equal(r.ok, true);
      clean(r, `${item.id}=${String(m)}`, typeof m === "string");
      assert.ok(r.matched + r.different + r.missing === r.total);
    }
  }
});

test("messy: typed answers missing or the wrong type count as nothing typed", () => {
  for (const typed of [undefined, null, [], "text", 5, true]) {
    const r = checkAnswers(PRACTICE_SHEET, typed);
    assert.equal(r.ok, true);
    assert.equal(r.missing, PRACTICE_SHEET.length);
  }
});

test("messy: the whole sheet missing or the wrong type gives a plain problem", () => {
  for (const sheet of [undefined, null, {}, [], "x", 5, [null], [5], [{}], [{ id: "a" }]]) {
    const r = checkAnswers(sheet, {});
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/undefined|NaN|null/.test(p.message), p.message);
  }
});

test("messy: inherited names such as constructor or __proto__ are not answers", () => {
  const sheet = [{ id: "constructor", screen: "S", label: "Name", kind: "text", value: "x" }];
  assert.equal(checkAnswers(sheet, {}).rows[0].status, "missing");
  assert.equal(checkAnswers(sheet, JSON.parse('{"__proto__": "x"}')).rows[0].status, "missing");
});

test("messy: long typing is cut short on the screen, and too long a sheet is refused", () => {
  const r = checkAnswers(PRACTICE_SHEET, { "first-name": "x".repeat(500) });
  assert.ok(r.rows[0].typed.length <= 63);
  const many = Array.from({ length: MAX_ITEMS + 1 }, (_, i) => ({ id: `a${i}`, screen: "S", label: `L${i}`, kind: "text", value: "x" }));
  assert.equal(checkAnswers(many, {}).ok, false);
  assert.equal(checkAnswers(many.slice(0, MAX_ITEMS), {}).ok, true);
});

test("messy: money on the sheet must be a plain positive dollar amount", () => {
  for (const value of ["-5", "1e3", "12.345", "", "lots"]) {
    const r = checkAnswers([{ id: "a", screen: "S", label: "Pay", kind: "money", value }], { a: "1" });
    assert.equal(r.ok, false, value);
  }
  assert.equal(checkAnswers([{ id: "a", screen: "S", label: "Pay", kind: "money", value: "0" }], { a: "0.00" }).allMatch, true);
});

test("messy: foldText handles odd values", () => {
  for (const v of [null, undefined, 5, {}, [], NaN, " A  b "]) assert.equal(typeof foldText(v), "string");
  assert.equal(foldText(" A  b "), "a b");
});
