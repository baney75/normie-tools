import test from "node:test";
import assert from "node:assert/strict";
import { explainLoan } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero,
// huge numbers, words, emoji, NaN, rate 0, term 1, term 1200. None may throw,
// give NaN or Infinity, and a bad one must give a plain-words message.
const base = { amount: "10000", rate: "6", term: "36", termUnit: "months", fees: "", extra: "" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", null, undefined];
const FIELDS = ["amount", "rate", "term", "fees", "extra"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy text in every field never throws and never gives NaN", () => {
  for (const field of FIELDS) {
    for (const text of MESSY) {
      for (const unit of ["months", "years"]) {
        const r = explainLoan({ ...base, termUnit: unit, [field]: text });
        noBadNumbers(r, `${field}=${JSON.stringify(text)}`);
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
  }
});

test("messy: whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { amount: {}, rate: [], term: () => 1 }]) {
    const r = explainLoan(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: spaces, commas and dollar signs are accepted", () => {
  const r = explainLoan({ ...base, amount: " $1,000.50 ", rate: " 12 ", term: " 12 ", fees: "$1,000", extra: " 5 " });
  assert.equal(r.ok, true);
  assert.equal(r.principalCents, 100050);
  assert.equal(r.feesCents, 100000);
  assert.equal(r.extraCents, 500);
});

test("messy: negative, zero, huge and exponent amounts give a calm error", () => {
  for (const amount of ["-5", "0", "1e15", "1000000000000000", "1e3", "2000000000"]) {
    const r = explainLoan({ ...base, amount });
    assert.equal(r.ok, false, amount);
    assert.equal(r.problems[0].field, "amount");
  }
});

test("messy: rate 0, term 1 and term 1200 all work", () => {
  assert.equal(explainLoan({ ...base, rate: "0" }).ok, true);
  assert.equal(explainLoan({ ...base, term: "1" }).ok, true);
  assert.equal(explainLoan({ ...base, term: "1200" }).ok, true);
  assert.equal(explainLoan({ ...base, term: "100", termUnit: "years" }).ok, true);
  assert.equal(explainLoan({ ...base, term: "1201" }).ok, false);
  assert.equal(explainLoan({ ...base, term: "0" }).ok, false);
});

test("messy: biggest allowed loan at the highest rate stays whole numbers", () => {
  const r = explainLoan({ amount: "1000000000", rate: "100", term: "1200", termUnit: "months", fees: "1000000000", extra: "1000000000" });
  assert.equal(r.ok, true);
  noBadNumbers(r, "max");
  assert.equal(r.byYear.at(-1).balanceCents, 0);
});

test("messy: same input twice gives the same answer", () => {
  assert.deepEqual(explainLoan(base), explainLoan({ ...base }));
});
