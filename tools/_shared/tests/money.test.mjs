import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  amortize,
  divRoundHalfUp,
  formatMoney,
  formatRate,
  monthlyPayment,
  parseMoney,
  parseRate,
  parseWholeNumber,
  roundHalfUp,
} from "../money.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "../../loan-explainer/tests/golden.json"), "utf8"));

test("parseMoney: golden texts", () => {
  for (const { text, cents } of golden.money) assert.equal(parseMoney(text), cents, JSON.stringify(text));
});

test("parseMoney: never NaN, never throws, on odd values", () => {
  for (const v of [undefined, null, NaN, Infinity, {}, [], "  ", "\u{1F4B8}", "1e3", "0x10", 12, 1.5]) {
    const r = parseMoney(v);
    assert.ok(r === null || Number.isSafeInteger(r), String(v));
  }
  assert.equal(parseMoney(12), 1200);
  assert.equal(parseMoney(NaN), null);
});

test("parseRate: golden texts", () => {
  for (const { text, bps } of golden.rate) assert.equal(parseRate(text), bps, JSON.stringify(text));
});

test("parseWholeNumber: digits only", () => {
  assert.equal(parseWholeNumber(" 36 "), 36);
  assert.equal(parseWholeNumber("1,200"), 1200);
  assert.equal(parseWholeNumber("12.0"), 12);
  assert.equal(parseWholeNumber("12.5"), null);
  assert.equal(parseWholeNumber("-1"), null);
  assert.equal(parseWholeNumber("1e3"), null);
  assert.equal(parseWholeNumber(""), null);
  assert.equal(parseWholeNumber("9999999999999999999"), null);
});

test("formatMoney: dollars with commas and two decimals", () => {
  assert.equal(formatMoney(123456), "$1,234.56");
  assert.equal(formatMoney(0), "$0.00");
  assert.equal(formatMoney(5), "$0.05");
  assert.equal(formatMoney(100000000), "$1,000,000.00");
  assert.equal(formatMoney(-150), "-$1.50");
  assert.equal(formatMoney(NaN), "");
  assert.equal(formatMoney(1.5), "");
  assert.equal(formatMoney(Number.MAX_SAFE_INTEGER), "$90,071,992,547,409.91");
});

test("formatRate: basis points as percent", () => {
  assert.equal(formatRate(650), "6.5%");
  assert.equal(formatRate(1225), "12.25%");
  assert.equal(formatRate(0), "0%");
  assert.equal(formatRate(500), "5%");
  assert.equal(formatRate(5), "0.05%");
});

test("parseMoney then formatMoney round trips", () => {
  for (const s of ["$1,234.56", "$0.01", "$10.00", "$999,999.99"]) assert.equal(formatMoney(parseMoney(s)), s);
});

test("roundHalfUp: halves go up", () => {
  assert.equal(roundHalfUp(1, 2), 1);
  assert.equal(roundHalfUp(5, 10), 1);
  assert.equal(roundHalfUp(49, 100), 0);
  assert.equal(roundHalfUp(150, 100), 2);
  assert.equal(roundHalfUp(249, 100), 2);
  assert.equal(roundHalfUp(250, 100), 3);
  assert.equal(roundHalfUp(-250, 100), -3);
  assert.equal(divRoundHalfUp(7n, 2n), 4n);
  assert.equal(roundHalfUp(1, 0), null);
  assert.equal(roundHalfUp(10n ** 30n, 1), null);
});

test("monthlyPayment: known loans", () => {
  assert.equal(monthlyPayment(1000000, 600, 36), 30422);
  assert.equal(monthlyPayment(20000000, 650, 360), 126414);
  assert.equal(monthlyPayment(120000, 0, 12), 10000);
  assert.equal(monthlyPayment(100000, 1200, 1), 101000);
  assert.equal(monthlyPayment(100, 0, 3), 33); // 33.33 rounds down
  assert.equal(monthlyPayment(200, 0, 3), 67); // 66.67 rounds up
  assert.equal(monthlyPayment(100, 0, 8), 13); // 12.5 rounds half up
});

test("monthlyPayment: bad input gives null", () => {
  for (const args of [[0, 500, 12], [-1, 500, 12], [1000, -1, 12], [1000, 500, 0], [1000, 500, 1.5], [NaN, 500, 12], [1000, 500, 20000], ["1000", 500, 12]]) {
    assert.equal(monthlyPayment(...args), null, JSON.stringify(args));
  }
});

test("amortize: balance ends at exactly zero and totals add up", () => {
  for (const [p, r, n] of [[1000000, 600, 36], [20000000, 650, 360], [1000, 1899, 7], [1, 500, 12], [999999, 0, 7]]) {
    const s = amortize(p, r, n);
    assert.equal(s.rows.at(-1).balanceCents, 0);
    assert.equal(s.rows.reduce((a, x) => a + x.paymentCents, 0), s.totalPaidCents);
    assert.equal(s.totalPaidCents - p, s.totalInterestCents);
    assert.equal(s.rows.reduce((a, x) => a + x.principalCents, 0), p);
    assert.ok(s.rows.length <= n);
  }
});

test("amortize: first row of a small loan is exact", () => {
  const s = amortize(1000000, 600, 36);
  assert.deepEqual(s.rows[0], { month: 1, paymentCents: 30422, interestCents: 5000, principalCents: 25422, balanceCents: 974578 });
});

test("amortize: extra payment ends the loan sooner with less interest", () => {
  const plain = amortize(2000000, 725, 60);
  const fast = amortize(2000000, 725, 60, { extraCents: 10000 });
  assert.ok(fast.rows.length < plain.rows.length);
  assert.ok(fast.totalInterestCents < plain.totalInterestCents);
  assert.equal(fast.rows.at(-1).balanceCents, 0);
});

test("amortize: bad input gives null", () => {
  assert.equal(amortize(0, 500, 12), null);
  assert.equal(amortize(1000, 500, 12, { extraCents: -1 }), null);
  assert.equal(amortize(1000, 500, 12, { paymentCents: 0 }), null);
});
