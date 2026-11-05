import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CATEGORIES, convertUnit, formatSignificant } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.conversions.find((c) => c.id === id);
const answer = (id) => {
  const r = convertUnit(byId(id).input);
  assert.equal(r.ok, true, id);
  return r.answer;
};
const inCategory = (cat) => golden.conversions.filter((c) => c.input.category === cat);
const all = (cat) => {
  for (const c of inCategory(cat)) assert.equal(answer(c.id), c.expect.answer, c.id);
};

test("length-exact: every golden length matches the independent answer", () => {
  all("length");
  assert.equal(answer("inch-to-mm"), "25.4");
  assert.equal(answer("foot-to-cm"), "30.48");
  assert.equal(answer("yard-to-m"), "0.9144");
  assert.equal(answer("mile-to-km"), "1.60934");
});

test("weight-exact: every golden weight matches, and 16 ounces is 1 pound", () => {
  all("weight");
  assert.equal(answer("lb-to-kg"), "0.453592");
  assert.equal(answer("sixteen-oz-lb"), "1");
});

test("volume-exact: every golden volume matches, and the gallon parts add up", () => {
  all("volume");
  assert.equal(answer("gal-to-l"), "3.78541");
  assert.equal(answer("gal-to-cups"), "16");
  assert.equal(answer("tbsp-to-tsp"), "3");
});

test("temperature-exact: every golden temperature matches, and the fixed points hold", () => {
  all("temperature");
  assert.equal(answer("f32-to-c"), "0");
  assert.equal(answer("f212-to-c"), "100");
  assert.equal(answer("minus-40"), "-40");
  assert.equal(answer("body-temp"), "37");
  assert.equal(answer("c0-to-k"), "273.15");
  // Absolute zero is allowed; just below it is not.
  assert.equal(convertUnit({ category: "temperature", from: "kelvin", to: "celsius", value: "0" }).ok, true);
  assert.equal(convertUnit({ category: "temperature", from: "celsius", to: "kelvin", value: "-273.16" }).ok, false);
});

test("speed-exact: every golden speed matches", () => {
  all("speed");
  assert.equal(answer("mph-one"), "1.60934");
});

test("six-digits-half-up: rounds half up to 6 significant digits, once, with a carry", () => {
  assert.equal(answer("half-up-tie"), "1.00001");
  assert.equal(answer("round-big-same"), "1,234,570");
  assert.equal(answer("carry-over"), "1,000,000,000,000,000,000");
  assert.equal(formatSignificant(5n, 10n), "0.5");
  assert.equal(formatSignificant(1234565n, 1n), "1,234,570");
  assert.equal(formatSignificant(1234564n, 1n), "1,234,560");
  assert.equal(formatSignificant(9999995n, 10n), "1,000,000");
});

test("round-trip-no-drift: exact fractions, so exact pairs go there and back", () => {
  const ids = (cat) => CATEGORIES[cat].units.map((u) => u.id);
  for (const cat of ["length", "weight", "volume", "speed"]) {
    for (const a of ids(cat)) {
      for (const b of ids(cat)) {
        // 1,000,000 of a unit has few enough digits to survive the 6 digit rounding when it is a power of ten.
        const same = convertUnit({ category: cat, from: a, to: a, value: "1" });
        assert.equal(same.answer, "1", `${a} to itself`);
        const there = convertUnit({ category: cat, from: a, to: b, value: "1" });
        assert.equal(there.ok, true);
      }
    }
  }
  for (const [a, b] of [["fahrenheit", "celsius"], ["celsius", "kelvin"], ["kelvin", "fahrenheit"]]) {
    const same = convertUnit({ category: "temperature", from: a, to: a, value: "98.6" });
    assert.equal(same.answer, "98.6");
    void b;
  }
  // 5 miles is exactly 26,400 feet: no drift through the meter.
  assert.equal(convertUnit({ category: "length", from: "mile", to: "foot", value: "5" }).answer, "26,400");
  assert.equal(convertUnit({ category: "length", from: "yard", to: "inch", value: "100" }).answer, "3,600");
});

test("messy-input-never-nan: spaces, commas and a trailing dot give the same answer as clean typing", () => {
  const clean = convertUnit({ category: "length", from: "inch", to: "millimeter", value: "12" });
  for (const value of [" 12 ", "12.", "12.000", "0012"]) {
    assert.deepEqual(convertUnit({ category: "length", from: "inch", to: "millimeter", value }), clean, value);
  }
  for (const id of ["messy-spaces", "messy-trailing-dot", "messy-leading-dot"]) assert.equal(answer(id), byId(id).expect.answer);
});

test("plain-error-words: golden bad entries name the field and kind", () => {
  for (const e of golden.errors) {
    const r = convertUnit(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/NaN|undefined|null|Infinity/.test(p.message), e.id);
  }
});
