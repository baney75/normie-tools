// Loan Explainer math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/loan-explainer/scripts/calc.py.
//
// Money is integer cents. Rates are integer basis points (650 = 6.5%).
// Rounding: half up to the cent, only at these steps:
//   1. the monthly payment, once, from the exact fraction (see money.mjs monthlyPayment)
//   2. each month's interest = balance * rate / 12
// The last payment is trued up so the balance ends at exactly 0.
// This is an estimate from typed numbers. It is not an APR and it is not advice.
import {
  amortize,
  monthlyPayment,
  parseMoney,
  parseRate,
  parseWholeNumber,
} from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_MONTHS = 1200; // 100 years

/**
 * @typedef {{ amount: string, rate: string, term: string, termUnit: "months"|"years", fees: string, extra: string }} LoanInput
 * @typedef {{ field: "amount"|"rate"|"term"|"fees"|"extra", kind: "missing"|"bad", message: string }} LoanProblem
 * @typedef {{ year: number, paidCents: number, interestCents: number, principalCents: number, balanceCents: number }} YearRow
 * @typedef {{ monthlyPaymentCents: number, months: number, totalPaidCents: number, totalInterestCents: number, monthsSaved: number, interestSaved: number }} ExtraResult
 * @typedef {{ ok: true, principalCents: number, rateBps: number, months: number, feesCents: number, extraCents: number,
 *   monthlyPaymentCents: number, totalPaidCents: number, totalInterestCents: number, costOfBorrowingCents: number,
 *   extra: ExtraResult|null, byYear: YearRow[] }} LoanResult
 */

export const MESSAGES = {
  amountMissing: "Type the amount borrowed.",
  amountBad: "Amount borrowed: use a number above zero, like 12,000.",
  amountBig: "Amount borrowed: that is too big for this tool. Use $1,000,000,000 or less.",
  rateMissing: "Type the yearly interest rate. Type 0 if there is none.",
  rateBad: "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
  termMissing: "Type how long the loan lasts.",
  termBad: "Loan length: use a whole number. Up to 1,200 months or 100 years.",
  feesBad: "Upfront fees: use a dollar amount like 250, or leave it empty.",
  extraBad: "Extra each month: use a dollar amount like 50, or leave it empty.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/**
 * Read the typed text. Returns the numbers, or a list of plain-words problems.
 * @param {Partial<LoanInput>} input
 * @returns {{ ok: true, principalCents: number, rateBps: number, months: number, feesCents: number, extraCents: number }
 *   | { ok: false, problems: LoanProblem[] }}
 */
export function readLoanInput(input) {
  const src = input && typeof input === "object" ? input : {};
  /** @type {LoanProblem[]} */
  const problems = [];
  const add = (field, kind, message) => problems.push({ field, kind, message });

  let principalCents = 0;
  if (isBlank(src.amount)) add("amount", "missing", MESSAGES.amountMissing);
  else {
    const v = parseMoney(src.amount);
    if (v === null || v <= 0) add("amount", "bad", MESSAGES.amountBad);
    else if (v > MAX_AMOUNT_CENTS) add("amount", "bad", MESSAGES.amountBig);
    else principalCents = v;
  }

  let rateBps = 0;
  if (isBlank(src.rate)) add("rate", "missing", MESSAGES.rateMissing);
  else {
    const v = parseRate(src.rate);
    if (v === null || v < 0 || v > MAX_RATE_BPS) add("rate", "bad", MESSAGES.rateBad);
    else rateBps = v;
  }

  let months = 0;
  if (isBlank(src.term)) add("term", "missing", MESSAGES.termMissing);
  else {
    const n = parseWholeNumber(src.term);
    const total = n === null ? null : src.termUnit === "years" ? n * 12 : n;
    if (total === null || total < 1 || total > MAX_MONTHS) add("term", "bad", MESSAGES.termBad);
    else months = total;
  }

  let feesCents = 0;
  if (!isBlank(src.fees)) {
    const v = parseMoney(src.fees);
    if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) add("fees", "bad", MESSAGES.feesBad);
    else feesCents = v;
  }

  let extraCents = 0;
  if (!isBlank(src.extra)) {
    const v = parseMoney(src.extra);
    if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) add("extra", "bad", MESSAGES.extraBad);
    else extraCents = v;
  }

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, principalCents, rateBps, months, feesCents, extraCents };
}

/**
 * Group a schedule into loan years (12 payments each; the last year may be shorter).
 * @param {{ paymentCents: number, interestCents: number, principalCents: number, balanceCents: number }[]} rows
 * @returns {YearRow[]}
 */
export function groupByYear(rows) {
  /** @type {YearRow[]} */
  const out = [];
  for (let start = 0; start < rows.length; start += 12) {
    const chunk = rows.slice(start, start + 12);
    out.push({
      year: start / 12 + 1,
      paidCents: chunk.reduce((a, r) => a + r.paymentCents, 0),
      interestCents: chunk.reduce((a, r) => a + r.interestCents, 0),
      principalCents: chunk.reduce((a, r) => a + r.principalCents, 0),
      balanceCents: chunk[chunk.length - 1].balanceCents,
    });
  }
  return out;
}

/**
 * Work out a loan from numbers already read.
 * @param {{ principalCents: number, rateBps: number, months: number, feesCents?: number, extraCents?: number }} v
 * @returns {LoanResult|null} null only if a number is out of range
 */
export function calcLoan(v) {
  const feesCents = v.feesCents ?? 0;
  const extraCents = v.extraCents ?? 0;
  const payment = monthlyPayment(v.principalCents, v.rateBps, v.months);
  if (payment === null) return null;
  const plain = amortize(v.principalCents, v.rateBps, v.months, { paymentCents: payment });
  if (plain === null) return null;
  let extra = null;
  let shown = plain;
  if (extraCents > 0) {
    const fast = amortize(v.principalCents, v.rateBps, v.months, { paymentCents: payment, extraCents });
    if (fast === null) return null;
    extra = {
      monthlyPaymentCents: payment + extraCents,
      months: fast.rows.length,
      totalPaidCents: fast.totalPaidCents,
      totalInterestCents: fast.totalInterestCents,
      monthsSaved: plain.rows.length - fast.rows.length,
      interestSaved: plain.totalInterestCents - fast.totalInterestCents,
    };
    shown = fast;
  }
  return {
    ok: true,
    principalCents: v.principalCents,
    rateBps: v.rateBps,
    months: v.months,
    feesCents,
    extraCents,
    monthlyPaymentCents: payment,
    totalPaidCents: plain.totalPaidCents,
    totalInterestCents: plain.totalInterestCents,
    costOfBorrowingCents: plain.totalInterestCents + feesCents,
    extra,
    byYear: groupByYear(shown.rows),
  };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<LoanInput>} input
 * @returns {LoanResult | { ok: false, problems: LoanProblem[] }}
 */
export function explainLoan(input) {
  const read = readLoanInput(input);
  if (!read.ok) return read;
  const result = calcLoan(read);
  if (result === null) {
    return {
      ok: false,
      problems: [{ field: "amount", kind: "bad", message: "These numbers are too big to work out. Try smaller ones." }],
    };
  }
  return result;
}
