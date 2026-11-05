import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compareOffers } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.cases.find((c) => c.id === id);
const run = (id) => {
  const r = compareOffers(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};
const pick = (r, key) => r.offers.map((o) => o[key]);
const want = (c, key) => c.expect.offers.map((o) => o[key]);

test("monthly-payment-exact: every golden offer matches the independent payment", () => {
  for (const c of golden.cases) assert.deepEqual(pick(run(c.id), "monthlyPaymentCents"), want(c, "monthlyPaymentCents"), c.id);
  assert.deepEqual(pick(run("two-offers"), "monthlyPaymentCents"), [30422, 23029]);
});

test("total-paid-exact: total paid matches the independent sum", () => {
  for (const c of golden.cases) assert.deepEqual(pick(run(c.id), "totalPaidCents"), want(c, "totalPaidCents"), c.id);
});

test("total-interest-exact: total interest matches, and paid minus borrowed equals interest", () => {
  for (const c of golden.cases) {
    const r = run(c.id);
    assert.deepEqual(pick(r, "totalInterestCents"), want(c, "totalInterestCents"), c.id);
    for (const o of r.offers) assert.equal(o.totalPaidCents - o.principalCents, o.totalInterestCents, c.id);
  }
});

test("cost-of-borrowing-exact: interest plus fees for each offer", () => {
  for (const c of golden.cases) {
    const r = run(c.id);
    assert.deepEqual(pick(r, "costOfBorrowingCents"), want(c, "costOfBorrowingCents"), c.id);
    for (const o of r.offers) assert.equal(o.costOfBorrowingCents, o.totalInterestCents + o.feesCents, c.id);
  }
  assert.equal(run("two-offers").offers[1].costOfBorrowingCents, 125411);
});

test("lowest-cost-fact: names the offer with the lowest cost of borrowing", () => {
  for (const c of golden.cases) assert.deepEqual(run(c.id).lowestCost, c.expect.lowestCost, c.id);
  assert.deepEqual(run("two-offers").lowestCost, { offers: [0], tie: false });
  assert.deepEqual(run("three-offers").lowestCost, { offers: [2], tie: false });
});

test("lowest-payment-fact: names the offer with the lowest monthly payment", () => {
  for (const c of golden.cases) assert.deepEqual(run(c.id).lowestPayment, c.expect.lowestPayment, c.id);
  assert.deepEqual(run("two-offers").lowestPayment, { offers: [1], tie: false });
  assert.deepEqual(run("three-offers").lowestPayment, { offers: [1], tie: false });
});

test("ties-listed: tied offers are all named", () => {
  const same = run("tie-identical");
  assert.deepEqual(same.lowestCost, { offers: [0, 1], tie: true });
  assert.deepEqual(same.lowestPayment, { offers: [0, 1], tie: true });
  const half = run("tie-payment-only");
  assert.deepEqual(half.lowestPayment, { offers: [0, 1], tie: true });
  assert.deepEqual(half.lowestCost, { offers: [0], tie: false });
});

test("zero-rate-and-edges: rate 0, one month and 1200 months", () => {
  const r = run("edges");
  assert.equal(r.offers[0].monthlyPaymentCents, 10000);
  assert.equal(r.offers[0].totalInterestCents, 0);
  assert.equal(r.offers[1].months, 1200);
  assert.equal(run("tie-payment-only").offers[0].monthlyPaymentCents, 10000);
});

test("same amount and length is reported", () => {
  for (const c of golden.cases) assert.equal(run(c.id).sameAmountAndLength, c.expect.sameAmountAndLength, c.id);
});

test("messy-input-never-nan: spaces, commas and a dollar sign give the same answer", () => {
  const a = run("tie-identical");
  assert.deepEqual(a.offers[0], a.offers[1]);
});

test("plain-error-words: golden bad entries name the offer, field and kind", () => {
  for (const e of golden.errors) {
    const r = compareOffers(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.offer, p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/NaN|undefined|null|Infinity/.test(p.message), e.id);
  }
});
