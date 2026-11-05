import test from "node:test";
import assert from "node:assert/strict";
import { explainMortgage } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero,
// huge numbers, words, emoji, NaN, rate 0, one year, 100 years. None may throw,
// give NaN or Infinity, and a bad one must give a plain-words message.
const base = { price: "300000", down: "60000", rate: "6", term: "30", tax: "", insurance: "", hoa: "", pmi: "" };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", null, undefined];
const FIELDS = ["price", "down", "rate", "term", "tax", "insurance", "hoa", "pmi"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

test("messy: every messy text in every field never throws and never gives NaN", () => {
  for (const field of FIELDS) {
    for (const text of MESSY) {
      const r = explainMortgage({ ...base, [field]: text });
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
  for (const input of [undefined, null, {}, [], "text", 5, { price: {}, down: [], term: () => 1 }]) {
    const r = explainMortgage(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
  }
});

test("messy: spaces, commas and dollar signs are accepted", () => {
  const r = explainMortgage({ ...base, price: " $300,000.50 ", down: " $1,000 ", rate: " 12 ", term: " 15 ", tax: "$3,600", insurance: " 1,200 ", hoa: " 5 ", pmi: "$7" });
  assert.equal(r.ok, true);
  assert.equal(r.priceCents, 30000050);
  assert.equal(r.loanCents, 29900050);
  assert.equal(r.hoaCents, 500);
  assert.equal(r.pmiCents, 700);
});

test("messy: negative, zero, huge and exponent prices give a calm error", () => {
  for (const price of ["-5", "0", "1e15", "1000000000000000", "1e3", "2000000000"]) {
    const r = explainMortgage({ ...base, price });
    assert.equal(r.ok, false, price);
    assert.equal(r.problems[0].field, "price");
  }
});

test("messy: a down payment as big as the price is a calm error", () => {
  for (const down of ["300000", "300000.01", "999999"]) {
    const r = explainMortgage({ ...base, down });
    assert.equal(r.ok, false, down);
    assert.equal(r.problems[0].field, "down");
  }
});

test("messy: rate 0, one year and 100 years all work, 0 and 101 years do not", () => {
  assert.equal(explainMortgage({ ...base, rate: "0" }).ok, true);
  assert.equal(explainMortgage({ ...base, term: "1" }).ok, true);
  assert.equal(explainMortgage({ ...base, term: "100" }).ok, true);
  assert.equal(explainMortgage({ ...base, term: "101" }).ok, false);
  assert.equal(explainMortgage({ ...base, term: "0" }).ok, false);
});

test("messy: biggest allowed numbers stay whole numbers", () => {
  const r = explainMortgage({ price: "1000000000", down: "0", rate: "100", term: "100", tax: "1000000000", insurance: "1000000000", hoa: "1000000000", pmi: "1000000000" });
  assert.equal(r.ok, true);
  noBadNumbers(r, "max");
});

test("messy: same input twice gives the same answer", () => {
  assert.deepEqual(explainMortgage(base), explainMortgage({ ...base }));
});
