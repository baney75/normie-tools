import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_ROWS, planBudget } from "../calc.mjs";
import { parseMoney } from "../../_shared/money.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero, huge numbers,
// words, emoji, NaN. None may throw or give NaN or Infinity, and a bad one must give plain words.
const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const line = (name, amount) => ({ name, amount });
const base = () => ({ income: [line("Pay", "3000")], expenses: [line("Rent", "1200"), line("Food", "400")] });
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "1.2.3", null, undefined, {}, [], true, 12, 1.5, NaN, Infinity];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy amount in every list never throws and never gives NaN", () => {
  for (const list of ["income", "expenses"]) {
    for (const text of MESSY) {
      const input = base();
      input[list][0] = line("Line", text);
      const r = planBudget(input);
      noBadNumbers(r, `${list}=${String(text)}`);
      if (!r.ok) {
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
  for (const input of [undefined, null, {}, [], "text", 5, { income: "x", expenses: 4 }, { income: {}, expenses: null }]) {
    const r = planBudget(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: lines that are not objects count as empty lines", () => {
  const r = planBudget({ income: [null, 5, "x", line("Pay", "10")], expenses: [undefined, []] });
  assert.equal(r.ok, true);
  assert.equal(r.incomeCents, 1000);
  assert.equal(r.incomeRows[0].name, "Income line 1");
  assert.equal(r.expenseRows[1].name, "Spending line 2");
});

test("messy: spaces, commas and dollar signs are accepted; bad lines name themselves", () => {
  const r = planBudget({ income: [line(" Pay ", " $1,000.50 ")], expenses: [line("", " 5 ")] });
  assert.equal(r.ok, true);
  assert.equal(r.incomeCents, 100050);
  assert.equal(r.incomeRows[0].name, "Pay");
  const bad = planBudget({ income: [line("Pay", "1")], expenses: [line("Rent", "-5"), line("", "1e3")] });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.problems.map((p) => p.field), ["expenses.0", "expenses.1"]);
  assert.match(bad.problems[0].message, /^Rent: /);
  assert.match(bad.problems[1].message, /^Spending line 2: /);
});

test("messy: zero, huge, too many lines and long names", () => {
  assert.equal(planBudget({ income: [line("Pay", "0")], expenses: [line("Rent", "0")] }).hasAmounts, false);
  const top = planBudget({ income: [line("Pay", "1,000,000,000")], expenses: [line("Rent", "1,000,000,000")] });
  assert.equal(top.ok, true);
  assert.equal(top.leftCents, 0);
  assert.equal(planBudget({ income: [line("Pay", "1,000,000,000.01")], expenses: [] }).ok, false);
  const many = Array.from({ length: MAX_ROWS }, (_, i) => line(`L${i}`, "1"));
  const full = planBudget({ income: many, expenses: many });
  assert.equal(full.ok, true);
  assert.equal(full.incomeCents, MAX_ROWS * 100);
  assert.equal(planBudget({ income: [...many, line("x", "1")], expenses: [] }).ok, false);
  const long = planBudget({ income: [line("A".repeat(500), "1")], expenses: [] });
  assert.equal(long.incomeRows[0].name.length, 60);
});

test("messy: money text matches the golden list", () => {
  for (const c of golden.money) assert.equal(parseMoney(c.text), c.cents, c.text);
});

test("messy: errors in golden name the right lines", () => {
  for (const e of golden.errors) {
    const r = planBudget(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
  }
});
