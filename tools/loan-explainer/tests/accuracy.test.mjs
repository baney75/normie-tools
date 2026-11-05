import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explainLoan } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.loans.find((c) => c.id === id);
const run = (id) => {
  const r = explainLoan(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};

test("monthly-payment-exact: every golden loan matches the independent payment", () => {
  for (const c of golden.loans) assert.equal(run(c.id).monthlyPaymentCents, c.expect.monthlyPaymentCents, c.id);
  assert.equal(run("car-36").monthlyPaymentCents, 30422);
  assert.equal(run("home-30y").monthlyPaymentCents, 126414);
});

test("total-paid-exact: total paid matches the independent sum", () => {
  for (const c of golden.loans) assert.equal(run(c.id).totalPaidCents, c.expect.totalPaidCents, c.id);
});

test("total-interest-exact: total interest matches, and paid minus borrowed equals interest", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    assert.equal(r.totalInterestCents, c.expect.totalInterestCents, c.id);
    assert.equal(r.totalPaidCents - r.principalCents, r.totalInterestCents, c.id);
  }
});

test("cost-of-borrowing-exact: interest plus fees", () => {
  const r = run("fees-extra");
  assert.equal(r.feesCents, 50000);
  assert.equal(r.costOfBorrowingCents, r.totalInterestCents + 50000);
  for (const c of golden.loans) assert.equal(run(c.id).costOfBorrowingCents, c.expect.costOfBorrowingCents, c.id);
});

test("extra-payment-savings-exact: months and interest saved match", () => {
  for (const c of golden.loans) assert.deepEqual(run(c.id).extra, c.expect.extra, c.id);
  const r = run("fees-extra");
  assert.equal(r.extra.monthsSaved, 60 - r.extra.months);
  assert.ok(r.extra.interestSaved > 0);
  assert.equal(run("car-36").extra, null);
});

test("by-year-table-adds-up: rows match golden, sum to totals, balance ends at zero", () => {
  for (const c of golden.loans) {
    const r = run(c.id);
    assert.deepEqual(r.byYear, c.expect.byYear, c.id);
    const shown = r.extra ?? r;
    assert.equal(r.byYear.reduce((a, y) => a + y.paidCents, 0), shown.totalPaidCents, c.id);
    assert.equal(r.byYear.reduce((a, y) => a + y.interestCents, 0), shown.totalInterestCents, c.id);
    assert.equal(r.byYear.reduce((a, y) => a + y.principalCents, 0), r.principalCents, c.id);
    assert.equal(r.byYear.at(-1).balanceCents, 0, c.id);
  }
});

test("zero-rate-and-edges: rate 0, one month and 1200 months", () => {
  const z = run("zero-rate");
  assert.equal(z.monthlyPaymentCents, 10000);
  assert.equal(z.totalInterestCents, 0);
  assert.equal(run("one-month").totalInterestCents, 1000);
  assert.equal(run("long-1200").byYear.length, 100);
});

test("messy-input-never-nan: typed with spaces, commas and a percent sign gives the same answer", () => {
  const messy = run("messy-typing");
  const clean = run("car-36");
  assert.deepEqual({ ...messy }, { ...clean });
});

test("plain-error-words: golden bad entries name the field and kind", () => {
  for (const e of golden.errors) {
    const r = explainLoan(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/NaN|undefined|null|Infinity/.test(p.message), e.id);
  }
});
