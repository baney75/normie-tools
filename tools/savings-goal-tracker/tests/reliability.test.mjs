import test from "node:test";
import assert from "node:assert/strict";
import { explainSavings, parseMonth } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero, huge numbers,
// words, emoji, NaN, rate 0, one month, 1,200 months. None may throw or give NaN or Infinity,
// and a bad one must give a plain-words message.
const baseWhen = { mode: "when", goal: "5000", saved: "500", monthly: "250", rate: "4", start: "2026-12", target: "" };
const baseBy = { mode: "by", goal: "5000", saved: "500", monthly: "", rate: "4", start: "2026-12", target: "2028-12" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", "2026-1", "2026-00", "2026-13", "0000-01", "99999-01", null, undefined];
const FIELDS = ["goal", "saved", "monthly", "rate", "start", "target"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy text in every field never throws and never gives NaN", () => {
  for (const base of [baseWhen, baseBy]) {
    for (const field of FIELDS) {
      for (const text of MESSY) {
        const r = explainSavings({ ...base, [field]: text });
        noBadNumbers(r, `${base.mode}.${field}=${JSON.stringify(text)}`);
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
  for (const input of [undefined, null, {}, [], "text", 5, { goal: {}, monthly: [], start: () => 1 }, { mode: "by" }, { mode: 7, goal: 5 }]) {
    const r = explainSavings(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: spaces, commas and dollar signs are accepted", () => {
  const r = explainSavings({ ...baseWhen, goal: " $5,000.50 ", saved: " 1,000 ", monthly: " $100 ", rate: " 3 % ", start: "  2026-01 " });
  assert.equal(r.ok, true);
  assert.equal(r.goalCents, 500050);
  assert.equal(r.savedCents, 100000);
});

test("messy: rate blank means zero, saved blank means zero", () => {
  const r = explainSavings({ goal: "1000", monthly: "100" });
  assert.equal(r.ok, true);
  assert.equal(r.rateBps, 0);
  assert.equal(r.savedCents, 0);
  assert.equal(r.months, 10);
});

test("messy: edges, rate 0, one month, 1,200 months, huge goal", () => {
  assert.equal(explainSavings({ ...baseWhen, rate: "0" }).ok, true);
  assert.equal(explainSavings({ ...baseWhen, goal: "500.01", saved: "500", monthly: "0.01", rate: "0" }).months, 1);
  assert.equal(explainSavings({ goal: "1200", monthly: "1" }).months, 1200);
  assert.equal(explainSavings({ goal: "1201", monthly: "1" }).status, "too-long");
  const big = explainSavings({ goal: "1,000,000,000", monthly: "1" });
  assert.equal(big.ok, true);
  assert.equal(big.status, "too-long");
  assert.equal(explainSavings({ ...baseBy, target: "2026-12" }).months, 1);
  assert.equal(explainSavings({ ...baseBy, start: "2000-01", target: "2099-12" }).months, 1200);
  assert.equal(explainSavings({ ...baseBy, start: "2000-01", target: "2100-01" }).ok, false);
});

test("messy: the highest rate over the longest time stays a safe number", () => {
  const w = explainSavings({ goal: "1,000,000,000", saved: "1", monthly: "1", rate: "100" });
  noBadNumbers(w, "w");
  assert.equal(w.ok, true);
  const b = explainSavings({ mode: "by", goal: "1,000,000,000", saved: "0", rate: "100", start: "2000-01", target: "2099-12" });
  noBadNumbers(b, "b");
  // Either an answer or a calm "too big" note. Never a crash.
  if (!b.ok) assert.match(b.problems[0].message, /too big/);
});

test("messy: the same input twice gives the same answer", () => {
  assert.deepEqual(explainSavings(baseWhen), explainSavings({ ...baseWhen }));
  assert.deepEqual(explainSavings(baseBy), explainSavings({ ...baseBy }));
});

test("messy: parseMonth rejects loose forms", () => {
  for (const t of ["2026-1", "26-12", "2026/12", "Dec 2026", "", 202612, null, "2026-12-01", "1899-12", "2201-01"]) assert.equal(parseMonth(t), null, String(t));
  assert.deepEqual(parseMonth("1900-01"), { year: 1900, month: 1 });
});
