import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explainMortgage } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const byId = (id) => golden.mortgages.find((c) => c.id === id);
const run = (id) => {
  const r = explainMortgage(byId(id).input);
  assert.equal(r.ok, true, id);
  return r;
};
const each = (key) => {
  for (const c of golden.mortgages) assert.equal(run(c.id)[key], c.expect[key], `${c.id} ${key}`);
};

test("loan-amount-exact: price minus down payment matches", () => {
  each("loanCents");
  assert.equal(run("basic-30y").loanCents, 24000000);
});

test("payment-exact: principal and interest match the independent payment", () => {
  each("piCents");
  assert.equal(run("basic-30y").piCents, 143892);
});

test("monthly-extras-exact: tax and insurance divide by 12 and round half up, HOA and mortgage insurance as typed", () => {
  each("taxMonthCents");
  each("insuranceMonthCents");
  each("hoaCents");
  each("pmiCents");
  assert.equal(run("tax-half-cent").taxMonthCents, 834);
  assert.equal(run("tax-half-cent").insuranceMonthCents, 833);
  assert.equal(run("with-mortgage-insurance").pmiCents, 9510);
});

test("total-monthly-exact: the five parts add to the total", () => {
  each("totalMonthlyCents");
  for (const c of golden.mortgages) {
    const r = run(c.id);
    assert.equal(r.totalMonthlyCents, r.piCents + r.taxMonthCents + r.insuranceMonthCents + r.hoaCents + r.pmiCents, c.id);
  }
  assert.equal(run("basic-30y").totalMonthlyCents, 188892);
});

test("total-interest-exact: total interest matches the independent schedule", () => {
  each("totalInterestCents");
  assert.equal(run("zero-rate-20y").totalInterestCents, 0);
});

test("first-payment-split-exact: interest plus principal is the payment", () => {
  each("firstInterestCents");
  each("firstPrincipalCents");
  for (const c of golden.mortgages) {
    const r = run(c.id);
    assert.equal(r.firstInterestCents + r.firstPrincipalCents, r.piCents, c.id);
  }
  assert.equal(run("basic-30y").firstInterestCents, 120000);
});

test("zero-rate-and-edges: rate 0, one year and 100 years", () => {
  assert.equal(run("zero-rate-20y").piCents, 41667);
  assert.equal(run("one-year").months, 12);
  assert.equal(run("long-100y").months, 1200);
  each("months");
  each("rateBps");
});

test("messy-input-never-nan: typed with spaces, commas, dollar and percent signs gives the clean answer", () => {
  assert.deepEqual(run("messy-typing"), run("basic-30y"));
  assert.deepEqual(run("typed-17-years").months, 204);
});

test("plain-error-words: golden bad entries name the field and kind", () => {
  for (const e of golden.errors) {
    const r = explainMortgage(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => [p.field, p.kind]), e.errors, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !/NaN|undefined|null|Infinity/.test(p.message), e.id);
  }
});
