import test from "node:test";
import assert from "node:assert/strict";
import { planDebtPayoff } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero,
// huge numbers, words, emoji, NaN, rate 0, one tiny debt, six debts. None may throw,
// give NaN or Infinity, and a bad one must give a plain-words message.
const row = { name: "Card", balance: "1000", rate: "18", minimum: "50" };
const base = { debts: [row], extra: "" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", null, undefined, 5, 1.5, true, [], {}];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

function check(r, where) {
  noBadNumbers(r, where);
  if (!r.ok) {
    assert.ok(r.problems.length > 0, where);
    for (const p of r.problems) {
      assert.equal(typeof p.message, "string");
      assert.ok(p.message.length > 10, where);
      assert.ok(!/NaN|undefined|null|Infinity|\[object/.test(p.message), `${where}: ${p.message}`);
    }
  }
}

test("messy: every messy text in every field never throws and never gives NaN", () => {
  for (const field of ["name", "balance", "rate", "minimum"]) {
    for (const text of MESSY) check(planDebtPayoff({ ...base, debts: [{ ...row, [field]: text }] }), `${field}=${JSON.stringify(text)}`);
  }
  for (const text of MESSY) check(planDebtPayoff({ ...base, extra: text }), `extra=${JSON.stringify(text)}`);
});

test("messy: the whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { debts: "x" }, { debts: {} }, { debts: [null, 5, "x", []] }, { debts: [[]] }, { debts: [{}] }]) {
    const r = planDebtPayoff(input);
    assert.equal(r.ok, false);
    check(r, JSON.stringify(input));
  }
});

test("messy: edges that are fine", () => {
  const ok = (d, extra = "") => planDebtPayoff({ debts: d, extra });
  assert.equal(ok([{ ...row, rate: "0" }]).ok, true); // rate 0
  assert.equal(ok([{ name: "", balance: "0.01", rate: "0", minimum: "0.01" }]).snowball.months, 1); // one cent
  assert.equal(ok([{ ...row, balance: "1,000,000,000", rate: "100", minimum: "90,000,000" }]).ok, true);
  const six = Array.from({ length: 6 }, (_, i) => ({ name: `D${i}`, balance: `${(i + 1) * 100}`, rate: `${i + 5}`, minimum: "20" }));
  assert.equal(ok(six).ok, true);
  assert.equal(ok([...six, row]).ok, false);
  assert.equal(ok([{ ...row, name: "x".repeat(500) }]).debts[0].name.length, 40);
  assert.equal(ok([{ ...row, name: "\u0000\n" }]).debts[0].name, "Debt 1");
});

test("messy: a name is only text and never changes the numbers", () => {
  const a = planDebtPayoff({ debts: [{ ...row, name: "<b>Card</b> \u{1F600}" }], extra: "" });
  const b = planDebtPayoff({ debts: [{ ...row, name: "Other" }], extra: "" });
  assert.deepEqual(a.snowball.totalInterestCents, b.snowball.totalInterestCents);
  assert.equal(a.debts[0].name, "<b>Card</b> \u{1F600}");
});

test("messy: six large debts at the top of the range stay inside safe integers", () => {
  const big = Array.from({ length: 6 }, () => ({ name: "", balance: "1,000,000,000", rate: "100", minimum: "90,000,000" }));
  const r = planDebtPayoff({ debts: big, extra: "1,000,000,000" });
  check(r, "top of range");
});
