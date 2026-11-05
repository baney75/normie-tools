import test from "node:test";
import assert from "node:assert/strict";
import { explainStudentLoan } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero,
// huge numbers, words, emoji, NaN, rate 0, wait 0, 100 years. None may throw,
// give NaN or Infinity, and a bad one must give a plain-words message.
const base = { balance: "20000", rate: "5", waitMonths: "6", capitalize: false, payment: "300", start: "2026-09", years: "10" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", "2026-1", "2026/09", "0000-00", null, undefined];
const FIELDS = ["balance", "rate", "waitMonths", "payment", "start", "years", "capitalize"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy text in every field never throws and never gives NaN", () => {
  for (const field of FIELDS) {
    for (const text of MESSY) {
      const r = explainStudentLoan({ ...base, [field]: text });
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
});

test("messy: whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { balance: {}, rate: [], waitMonths: () => 1 }]) {
    const r = explainStudentLoan(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: spaces, commas and dollar signs are accepted", () => {
  const r = explainStudentLoan({ ...base, balance: " $1,000.50 ", rate: " 12 ", waitMonths: " 12 ", payment: " $50 ", start: " 2026-09 ", years: " 5 " });
  assert.equal(r.ok, true);
  assert.equal(r.principalCents, 100050);
  assert.equal(r.waitMonths, 12);
  assert.equal(r.paymentCents, 5000);
});

test("messy: negative, zero, huge and exponent balances give a calm error", () => {
  for (const balance of ["-5", "0", "1e15", "1000000000000000", "1e3", "2000000000"]) {
    const r = explainStudentLoan({ ...base, balance });
    assert.equal(r.ok, false, balance);
    assert.equal(r.problems[0].field, "balance");
  }
});

test("messy: rate 0, wait 0 and 100 years all work", () => {
  assert.equal(explainStudentLoan({ ...base, rate: "0" }).ok, true);
  assert.equal(explainStudentLoan({ ...base, waitMonths: "0" }).ok, true);
  assert.equal(explainStudentLoan({ ...base, years: "100" }).ok, true);
  assert.equal(explainStudentLoan({ ...base, years: "101" }).ok, false);
  assert.equal(explainStudentLoan({ ...base, years: "0" }).ok, false);
  assert.equal(explainStudentLoan({ ...base, waitMonths: "600" }).ok, true);
  assert.equal(explainStudentLoan({ ...base, waitMonths: "601" }).ok, false);
});

test("messy: a payment too small gives a calm plain error, not a hang", () => {
  const r = explainStudentLoan({ ...base, payment: "0.01" });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].field, "payment");
});

test("messy: leaving the payment, start and years empty still gives the balance", () => {
  const r = explainStudentLoan({ balance: "5000", rate: "4.5" });
  assert.equal(r.ok, true);
  assert.equal(r.payoff, null);
  assert.equal(r.minPayment, null);
  assert.equal(r.balanceAtStartCents, 500000);
});

test("messy: biggest allowed loan at the highest rate stays whole numbers", () => {
  const r = explainStudentLoan({ balance: "1000000000", rate: "100", waitMonths: "600", capitalize: false, payment: "1000000000", start: "2200-12", years: "100" });
  assert.equal(r.ok, true);
  noBadNumbers(r, "max");
  assert.equal(r.payoff.byYear.at(-1).balanceCents, 0);
  const slow = explainStudentLoan({ balance: "1000000000", rate: "100", waitMonths: "600", capitalize: false, payment: "100000000", years: "100" });
  noBadNumbers(slow, "slow");
});

test("messy: same input twice gives the same answer", () => {
  assert.deepEqual(explainStudentLoan(base), explainStudentLoan({ ...base }));
});
