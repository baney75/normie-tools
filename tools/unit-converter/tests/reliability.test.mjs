import test from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, CATEGORY_IDS, convertUnit } from "../calc.mjs";

// Messy inputs: blank, commas, spaces, exponents, negatives, zero, huge numbers, words,
// emoji, NaN, same unit twice, every unit pair. None may throw, give NaN or Infinity,
// and a bad one must give a plain-words message.
const base = { category: "length", from: "inch", to: "millimeter", value: "12" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", "-", ".", "-.", "0.0000000001", null, undefined, {}, [], 5, 1.5, NaN, Infinity, true];

function noBadText(r, where) {
  const blob = JSON.stringify(r);
  assert.ok(!/NaN|Infinity|undefined|\[object/.test(blob), `${where}: ${blob}`);
}

test("messy: every messy value for every kind never throws and never gives NaN", () => {
  for (const category of CATEGORY_IDS) {
    const [a, b] = CATEGORIES[category].units;
    for (const value of MESSY) {
      const r = convertUnit({ category, from: a.id, to: b.id, value });
      noBadText(r, `${category} ${String(value)}`);
      if (r.ok) assert.match(r.answer, /^-?[0-9][0-9,]*(\.[0-9]+)?$/);
      else {
        assert.ok(r.problems.length > 0);
        for (const p of r.problems) {
          assert.equal(typeof p.message, "string");
          assert.ok(p.message.length > 10);
          assert.ok(!/NaN|undefined|null|Infinity|\[object/.test(p.message), p.message);
        }
      }
    }
  }
});

test("messy: whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { category: {}, from: [], to: () => 1, value: {} }]) {
    const r = convertUnit(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
    noBadText(r, "input");
  }
});

test("messy: unit names that are not in the list, including odd keys", () => {
  for (const bad of ["", "INCH", "inches", "__proto__", "constructor", "toString", "pound", null, 5]) {
    const r = convertUnit({ ...base, from: bad });
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.problems[0].field, "from");
  }
  for (const bad of ["__proto__", "constructor", "hasOwnProperty", "", "money", null]) {
    const r = convertUnit({ ...base, category: bad });
    assert.equal(r.ok, false, String(bad));
    assert.equal(r.problems[0].field, "category");
  }
});

test("messy: spaces and commas are accepted", () => {
  assert.equal(convertUnit({ ...base, value: " 1,000 " }).answer, "25,400");
});

test("messy: negative is fine for temperature but not for length, zero is fine everywhere", () => {
  assert.equal(convertUnit({ category: "temperature", from: "celsius", to: "fahrenheit", value: "-10" }).answer, "14");
  assert.equal(convertUnit({ ...base, value: "-1" }).ok, false);
  assert.equal(convertUnit({ ...base, value: "-0" }).answer, "0");
  for (const category of CATEGORY_IDS) {
    const [a, b] = CATEGORIES[category].units;
    const r = convertUnit({ category, from: a.id, to: b.id, value: "0" });
    assert.equal(r.ok, true, category);
  }
});

test("messy: huge and tiny typed numbers give an answer or a calm error, never NaN", () => {
  assert.equal(convertUnit({ ...base, value: "999999999999" }).ok, true);
  assert.equal(convertUnit({ ...base, value: "1000000000000" }).ok, false);
  assert.equal(convertUnit({ ...base, value: "1e15" }).ok, false);
  const tiny = convertUnit({ category: "length", from: "millimeter", to: "mile", value: "0.000000001" });
  assert.equal(tiny.ok, true);
  assert.equal(tiny.answer, "0.000000000000000621371");
});

test("messy: every unit to every unit in every kind works for a normal number", () => {
  for (const category of CATEGORY_IDS) {
    for (const a of CATEGORIES[category].units) {
      for (const b of CATEGORIES[category].units) {
        const r = convertUnit({ category, from: a.id, to: b.id, value: "37.5" });
        assert.equal(r.ok, true, `${a.id} to ${b.id}`);
        noBadText(r, `${a.id} to ${b.id}`);
      }
    }
  }
});

test("messy: same input twice gives the same answer", () => {
  assert.deepEqual(convertUnit(base), convertUnit({ ...base }));
});
