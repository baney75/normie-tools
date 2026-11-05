// Mortgage Payment Explainer math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/mortgage-payment-explainer/scripts/calc.py.
//
// Money is integer cents. Rates are integer basis points (650 = 6.5%).
// Rounding: half up to the cent, only at these steps:
//   1. the loan payment (principal and interest), once, from the exact fraction (money.mjs monthlyPayment)
//   2. each month's interest = balance * rate / 12
//   3. monthly property tax = yearly tax / 12, once
//   4. monthly home insurance = yearly insurance / 12, once
// HOA and mortgage insurance are typed as monthly amounts and are used as typed.
// The last loan payment is trued up so the loan balance ends at exactly 0.
// This is an estimate from typed numbers. It does not use any rate or tax rule of its own, and it is not advice.
import {
  amortize,
  divRoundHalfUp,
  monthlyPayment,
  parseMoney,
  parseRate,
  parseWholeNumber,
} from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_YEARS = 100;

/**
 * @typedef {{ price: string, down: string, rate: string, term: string, tax: string, insurance: string, hoa: string, pmi: string }} MortgageInput
 * @typedef {"price"|"down"|"rate"|"term"|"tax"|"insurance"|"hoa"|"pmi"} MortgageField
 * @typedef {{ field: MortgageField, kind: "missing"|"bad", message: string }} MortgageProblem
 * @typedef {{ ok: true, priceCents: number, downCents: number, loanCents: number, rateBps: number, months: number,
 *   piCents: number, taxMonthCents: number, insuranceMonthCents: number, hoaCents: number, pmiCents: number,
 *   totalMonthlyCents: number, totalInterestCents: number, firstInterestCents: number, firstPrincipalCents: number }} MortgageResult
 */

export const MESSAGES = {
  priceMissing: "Type the home price.",
  priceBad: "Home price: use a number above zero, like 300,000.",
  priceBig: "Home price: that is too big for this tool. Use $1,000,000,000 or less.",
  downMissing: "Type your down payment in dollars. Type 0 if there is none.",
  downBad: "Down payment: use a dollar amount like 60,000. Type 0 if there is none.",
  downBig: "Down payment: it must be less than the home price.",
  rateMissing: "Type the yearly interest rate. Type 0 if there is none.",
  rateBad: "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
  termMissing: "Type how many years the loan lasts.",
  termBad: "Loan length: use a whole number of years, from 1 to 100.",
  taxBad: "Property tax for the year: use a dollar amount like 3,600, or leave it empty.",
  insuranceBad: "Home insurance for the year: use a dollar amount like 1,200, or leave it empty.",
  hoaBad: "HOA each month: use a dollar amount like 50, or leave it empty.",
  pmiBad: "Mortgage insurance each month: use a dollar amount like 95, or leave it empty.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/**
 * Read the typed text. Returns the numbers, or a list of plain-words problems.
 * @param {Partial<MortgageInput>} input
 */
export function readMortgageInput(input) {
  const src = input && typeof input === "object" ? input : {};
  /** @type {MortgageProblem[]} */
  const problems = [];
  const add = (field, kind, message) => problems.push({ field, kind, message });

  let priceCents = 0;
  let priceOk = false;
  if (isBlank(src.price)) add("price", "missing", MESSAGES.priceMissing);
  else {
    const v = parseMoney(src.price);
    if (v === null || v <= 0) add("price", "bad", MESSAGES.priceBad);
    else if (v > MAX_AMOUNT_CENTS) add("price", "bad", MESSAGES.priceBig);
    else {
      priceCents = v;
      priceOk = true;
    }
  }

  let downCents = 0;
  if (isBlank(src.down)) add("down", "missing", MESSAGES.downMissing);
  else {
    const v = parseMoney(src.down);
    if (v === null || v < 0) add("down", "bad", MESSAGES.downBad);
    else if (v > MAX_AMOUNT_CENTS || (priceOk && v >= priceCents)) add("down", "bad", MESSAGES.downBig);
    else downCents = v;
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
    if (n === null || n < 1 || n > MAX_YEARS) add("term", "bad", MESSAGES.termBad);
    else months = n * 12;
  }

  /** Optional money: blank means 0. */
  const optional = (field, message) => {
    if (isBlank(src[field])) return 0;
    const v = parseMoney(src[field]);
    if (v === null || v < 0 || v > MAX_AMOUNT_CENTS) {
      add(field, "bad", message);
      return 0;
    }
    return v;
  };
  const taxYearCents = optional("tax", MESSAGES.taxBad);
  const insuranceYearCents = optional("insurance", MESSAGES.insuranceBad);
  const hoaCents = optional("hoa", MESSAGES.hoaBad);
  const pmiCents = optional("pmi", MESSAGES.pmiBad);

  if (problems.length > 0) return { ok: false, problems };
  return { ok: true, priceCents, downCents, rateBps, months, taxYearCents, insuranceYearCents, hoaCents, pmiCents };
}

/**
 * Work out a mortgage from numbers already read.
 * @returns {MortgageResult|null} null only if a number is out of range
 */
export function calcMortgage(v) {
  const loanCents = v.priceCents - v.downCents;
  const pi = monthlyPayment(loanCents, v.rateBps, v.months);
  if (pi === null) return null;
  const plan = amortize(loanCents, v.rateBps, v.months, { paymentCents: pi });
  if (plan === null || plan.rows.length === 0) return null;
  const first = plan.rows[0];
  const taxMonthCents = Number(divRoundHalfUp(BigInt(v.taxYearCents), 12n));
  const insuranceMonthCents = Number(divRoundHalfUp(BigInt(v.insuranceYearCents), 12n));
  return {
    ok: true,
    priceCents: v.priceCents,
    downCents: v.downCents,
    loanCents,
    rateBps: v.rateBps,
    months: v.months,
    piCents: pi,
    taxMonthCents,
    insuranceMonthCents,
    hoaCents: v.hoaCents,
    pmiCents: v.pmiCents,
    totalMonthlyCents: pi + taxMonthCents + insuranceMonthCents + v.hoaCents + v.pmiCents,
    totalInterestCents: plan.totalInterestCents,
    firstInterestCents: first.interestCents,
    firstPrincipalCents: first.principalCents,
  };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {Partial<MortgageInput>} input
 * @returns {MortgageResult | { ok: false, problems: MortgageProblem[] }}
 */
export function explainMortgage(input) {
  const read = readMortgageInput(input);
  if (!read.ok) return read;
  const result = calcMortgage(read);
  if (result === null) {
    return {
      ok: false,
      problems: [{ field: "price", kind: "bad", message: "These numbers are too big to work out. Try smaller ones." }],
    };
  }
  return result;
}
