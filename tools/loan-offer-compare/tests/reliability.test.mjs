import test from "node:test";
import assert from "node:assert/strict";
import { compareOffers } from "../calc.mjs";

// Messy inputs: blank, commas, dollar signs, spaces, exponents, negatives, zero,
// huge numbers, words, emoji, NaN, rate 0, term 1, term 1200. None may throw,
// give NaN or Infinity, and a bad one must give a plain-words message.
const offer = { amount: "10000", rate: "6", term: "36", termUnit: "months", fees: "" };
const base = { offers: [offer, { ...offer, rate: "5" }] };
const MESSY = ["", "1,000", "$1,000.50", " 12 ", "1e3", "-5", "0", "1e15", "1000000000000000", "lots", "\u{1F600}", "NaN", "Infinity", "  ", "1,00,0", "$$5", "5%", "0x10", "١٢٣", "1.2.3", null, undefined];
const FIELDS = ["amount", "rate", "term", "fees"];

function noBadNumbers(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value) && Number.isSafeInteger(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => noBadNumbers(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) noBadNumbers(v, `${where}.${k}`);
}

function withField(index, field, text, unit) {
  return { offers: base.offers.map((o, i) => (i === index ? { ...o, termUnit: unit, [field]: text } : o)) };
}

test("messy: every messy text in every field of every offer never throws and never gives NaN", () => {
  for (let index = 0; index < 2; index++) {
    for (const field of FIELDS) {
      for (const text of MESSY) {
        for (const unit of ["months", "years"]) {
          const r = compareOffers(withField(index, field, text, unit));
          noBadNumbers(r, `${index}.${field}=${JSON.stringify(text)}`);
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
  }
});

test("messy: whole input missing or the wrong type", () => {
  for (const input of [undefined, null, {}, [], "text", 5, { offers: "x" }, { offers: [null, undefined] }, { offers: [5, "a"] }, { offers: [{}, {}] }, { offers: [[], []] }]) {
    const r = compareOffers(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length >= 1);
    for (const p of r.problems) assert.ok(!/NaN|undefined|null|Infinity|\[object/.test(p.message), p.message);
  }
});

test("messy: spaces, commas and dollar signs are accepted", () => {
  const r = compareOffers({ offers: [{ amount: " $1,000.50 ", rate: " 12 ", term: " 12 ", termUnit: "months", fees: "$1,000" }, offer] });
  assert.equal(r.ok, true);
  assert.equal(r.offers[0].principalCents, 100050);
  assert.equal(r.offers[0].feesCents, 100000);
});

test("messy: negative, zero, huge and exponent amounts give a calm error naming the offer", () => {
  for (const amount of ["-5", "0", "1e15", "1000000000000000", "1e3", "2000000000"]) {
    const r = compareOffers(withField(1, "amount", amount, "months"));
    assert.equal(r.ok, false, amount);
    assert.equal(r.problems[0].offer, 1);
    assert.equal(r.problems[0].field, "amount");
    assert.match(r.problems[0].message, /^Offer 2: /);
  }
});

test("messy: rate 0, term 1 and term 1200 all work, 1201 does not", () => {
  assert.equal(compareOffers(withField(0, "rate", "0", "months")).ok, true);
  assert.equal(compareOffers(withField(0, "term", "1", "months")).ok, true);
  assert.equal(compareOffers(withField(0, "term", "1200", "months")).ok, true);
  assert.equal(compareOffers(withField(0, "term", "100", "years")).ok, true);
  assert.equal(compareOffers(withField(0, "term", "1201", "months")).ok, false);
  assert.equal(compareOffers(withField(0, "term", "0", "months")).ok, false);
});

test("messy: one offer, four offers, and a long list give a plain error", () => {
  assert.equal(compareOffers({ offers: [offer] }).ok, false);
  assert.equal(compareOffers({ offers: [offer, offer, offer, offer] }).ok, false);
  assert.equal(compareOffers({ offers: [offer, offer, offer] }).ok, true);
});

test("messy: biggest allowed offers at the highest rate stay whole numbers", () => {
  const big = { amount: "1000000000", rate: "100", term: "1200", termUnit: "months", fees: "1000000000" };
  const r = compareOffers({ offers: [big, big, big] });
  assert.equal(r.ok, true);
  noBadNumbers(r, "max");
});

test("messy: same input twice gives the same answer", () => {
  assert.deepEqual(compareOffers(base), compareOffers({ offers: base.offers.map((o) => ({ ...o })) }));
});
