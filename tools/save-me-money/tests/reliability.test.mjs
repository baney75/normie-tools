import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listCosts, MAX_ROWS } from "../calc.mjs";
import { parseMoney } from "../../_shared/money.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero, huge numbers,
// words, emoji, NaN. None may throw or give NaN or Infinity, and a bad one must give plain words.
const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const item = (name, amount, every = "month") => ({ name, amount, every });
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "1.2.3", null, undefined, {}, [], true, 12, 1.5, NaN, Infinity];
const EVERY = ["week", "month", "year", "", " Week ", "YEAR", "day", "weekly", null, undefined, 5, {}, "\u{1F600}"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy amount never throws and never gives NaN", () => {
  for (const text of MESSY) {
    const r = listCosts({ items: [item("Phone", text), item("Gym", "20", "week")] });
    noBadNumbers(r, String(text));
    if (!r.ok) {
      assert.ok(r.problems.length > 0);
      for (const p of r.problems) {
        assert.ok(p.message.length > 10);
        assert.ok(!/NaN|undefined|null|Infinity|\[object/.test(p.message), p.message);
      }
    }
  }
});

test("messy: every messy how-often value never throws", () => {
  for (const every of EVERY) {
    const r = listCosts({ items: [{ name: "Phone", amount: "10", every }] });
    noBadNumbers(r, String(every));
    if (!r.ok) assert.match(r.problems[0].message, /^Phone: pick week, month or year/);
  }
});

test("messy: whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { items: "x" }, { items: {} }, { items: null }]) {
    const r = listCosts(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: lines that are not objects count as empty lines", () => {
  const r = listCosts({ items: [null, 5, "x", [], item("Water", "10")] });
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
  assert.equal(r.yearlyCents, 12000);
});

test("messy: spaces, commas and dollar signs are accepted; bad lines name themselves", () => {
  const r = listCosts({ items: [item(" Pay ", " $1,000.50 ")] });
  assert.equal(r.ok, true);
  assert.equal(r.rows[0].name, "Pay");
  assert.equal(r.rows[0].amountCents, 100050);
  const bad = listCosts({ items: [item("Rent", "-5"), item("", "1e3")] });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.problems.map((p) => p.field), ["items.0", "items.1"]);
  assert.match(bad.problems[1].message, /^Cost 2: /);
});

test("messy: zero, huge, too many lines and long names", () => {
  assert.equal(listCosts({ items: [item("Gym", "0")] }).hasAmounts, false);
  const top = listCosts({ items: [item("A", "1,000,000,000", "week")] });
  assert.equal(top.ok, true);
  assert.equal(listCosts({ items: [item("A", "1,000,000,000.01")] }).ok, false);
  const many = Array.from({ length: MAX_ROWS }, (_, i) => item(`L${i}`, "1", "year"));
  assert.equal(listCosts({ items: many }).ok, true);
  assert.equal(listCosts({ items: [...many, item("x", "1")] }).ok, false);
  assert.equal(listCosts({ items: [item("A".repeat(500), "1")] }).rows[0].name.length, 60);
});

test("messy: money text matches the golden list", () => {
  for (const c of golden.money) assert.equal(parseMoney(c.text), c.cents, c.text);
});

test("messy: results are plain data and the input is not changed", () => {
  const input = { items: [item("Phone", "65"), item("Gym", "10", "week")] };
  const copy = JSON.stringify(input);
  const r = listCosts(input);
  assert.equal(JSON.stringify(input), copy);
  assert.doesNotThrow(() => JSON.stringify(r));
});
