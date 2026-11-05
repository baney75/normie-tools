// Loan Offer Compare math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/loan-offer-compare/scripts/calc.py.
//
// Two or three loan offers go in as typed text. Each offer is worked out with the same
// shared math as the Loan Explainer (tools/_shared/money.mjs). Money is integer cents.
// Rates are integer basis points (650 = 6.5%).
// Rounding: half up to the cent, only at these steps, as in the shared math:
//   1. each offer's monthly payment, once, from the exact fraction
//   2. each month's interest = balance * rate / 12
// The last payment is trued up so the balance ends at exactly 0.
// "Lowest" is a plain fact about the numbers typed. It is not advice and not an APR.
import { amortize, monthlyPayment, parseMoney, parseRate, parseWholeNumber } from "../_shared/money.mjs";

export { formatMoney, formatRate } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000
export const MAX_RATE_BPS = 10000; // 100%
export const MAX_MONTHS = 1200; // 100 years
export const MIN_OFFERS = 2;
export const MAX_OFFERS = 3;

/**
 * @typedef {{ amount: string, rate: string, term: string, termUnit: "months"|"years", fees: string }} OfferInput
 * @typedef {{ offer: number|null, field: "offers"|"amount"|"rate"|"term"|"fees", kind: "missing"|"bad", message: string }} CompareProblem
 * @typedef {{ principalCents: number, rateBps: number, months: number, feesCents: number, monthlyPaymentCents: number,
 *   totalPaidCents: number, totalInterestCents: number, costOfBorrowingCents: number }} OfferResult
 * @typedef {{ offers: number[], tie: boolean }} Lowest
 * @typedef {{ ok: true, offers: OfferResult[], lowestCost: Lowest, lowestPayment: Lowest, sameAmountAndLength: boolean }} CompareResult
 */

export const MESSAGES = {
  needTwo: "Type at least two offers to compare.",
  tooMany: "This tool compares up to three offers.",
  amountMissing: "Type the amount borrowed.",
  amountBad: "Amount borrowed: use a number above zero, like 12,000.",
  amountBig: "Amount borrowed: that is too big for this tool. Use $1,000,000,000 or less.",
  rateMissing: "Type the yearly interest rate. Type 0 if there is none.",
  rateBad: "Interest rate: use a percent from 0 to 100, like 6.5. Use two decimals at most.",
  termMissing: "Type how long the loan lasts.",
  termBad: "Loan length: use a whole number. Up to 1,200 months or 100 years.",
  feesBad: "Upfront fees: use a dollar amount like 250, or leave it empty.",
  tooBig: "These numbers are too big to work out. Try smaller ones.",
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/**
 * Read one offer's typed text. Returns numbers or problems (without the offer number filled in).
 * @param {Partial<OfferInput>} input
 */
export function readOffer(input) {
  const src = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  /** @type {{ field: "amount"|"rate"|"term"|"fees", kind: "missing"|"bad", message: string }[]} */
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

  if (problems.length > 0) return { ok: /** @type {const} */ (false), problems };
  return { ok: /** @type {const} */ (true), principalCents, rateBps, months, feesCents };
}

/**
 * Work out one offer from numbers already read.
 * @returns {OfferResult|null} null only if a number is out of range
 */
export function calcOffer(v) {
  const payment = monthlyPayment(v.principalCents, v.rateBps, v.months);
  if (payment === null) return null;
  const plain = amortize(v.principalCents, v.rateBps, v.months, { paymentCents: payment });
  if (plain === null) return null;
  return {
    principalCents: v.principalCents,
    rateBps: v.rateBps,
    months: v.months,
    feesCents: v.feesCents,
    monthlyPaymentCents: payment,
    totalPaidCents: plain.totalPaidCents,
    totalInterestCents: plain.totalInterestCents,
    costOfBorrowingCents: plain.totalInterestCents + v.feesCents,
  };
}

/**
 * Which offers have the lowest value. Every offer that shares the lowest is listed.
 * @param {number[]} values
 * @returns {Lowest}
 */
export function lowestOf(values) {
  const min = Math.min(...values);
  const offers = values.map((v, i) => (v === min ? i : -1)).filter((i) => i >= 0);
  return { offers, tie: offers.length > 1 };
}

/**
 * Typed text in, answer or plain-words problems out. Never throws, never gives NaN.
 * @param {{ offers?: Partial<OfferInput>[] }} input
 * @returns {CompareResult | { ok: false, problems: CompareProblem[] }}
 */
export function compareOffers(input) {
  const list = input && typeof input === "object" && Array.isArray(input.offers) ? input.offers : [];
  if (list.length < MIN_OFFERS) {
    return { ok: false, problems: [{ offer: null, field: "offers", kind: "missing", message: MESSAGES.needTwo }] };
  }
  if (list.length > MAX_OFFERS) {
    return { ok: false, problems: [{ offer: null, field: "offers", kind: "bad", message: MESSAGES.tooMany }] };
  }
  /** @type {CompareProblem[]} */
  const problems = [];
  const read = list.map((o, i) => {
    const r = readOffer(o);
    if (!r.ok) for (const p of r.problems) problems.push({ offer: i, field: p.field, kind: p.kind, message: `Offer ${i + 1}: ${p.message}` });
    return r;
  });
  if (problems.length > 0) return { ok: false, problems };
  const offers = read.map((r) => calcOffer(r));
  if (offers.some((o) => o === null)) {
    return { ok: false, problems: [{ offer: null, field: "amount", kind: "bad", message: MESSAGES.tooBig }] };
  }
  const done = /** @type {OfferResult[]} */ (offers);
  return {
    ok: true,
    offers: done,
    lowestCost: lowestOf(done.map((o) => o.costOfBorrowingCents)),
    lowestPayment: lowestOf(done.map((o) => o.monthlyPaymentCents)),
    sameAmountAndLength: done.every((o) => o.principalCents === done[0].principalCents && o.months === done[0].months),
  };
}
