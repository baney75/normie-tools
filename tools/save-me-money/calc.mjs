// Save Me Money math. Pure ES module, shared by the website and the skill.
// The skill has its own Python copy in skills/save-me-money/scripts/calc.py.
//
// The person types repeating costs: a name, an amount, and how often (week, month or year).
// Money is integer cents. Each line becomes a yearly cost and a monthly cost:
//   week:  yearly = amount * 52 (exact). A year is taken as 52 weeks. This is an estimate.
//   month: yearly = amount * 12 (exact).
//   year:  yearly = amount (exact).
//   monthly figure of every line = yearly / 12, rounded half up to the cent, ONCE per line.
// Totals are plain sums of the line figures: total yearly = sum of yearly, total monthly = sum of
// the monthly figures. So the total month can differ from total year / 12 by a few cents.
// Lines are listed biggest yearly cost first. A tie keeps the typed order.
// A blank or zero amount is left out. This counts typed numbers. It is not advice.
import { divRoundHalfUp, parseMoney } from "../_shared/money.mjs";

export { formatMoney } from "../_shared/money.mjs";

export const MAX_AMOUNT_CENTS = 100_000_000_000; // $1,000,000,000 per line
export const MAX_ROWS = 40;
export const MAX_NAME = 60;
export const WEEKS_PER_YEAR = 52;
export const EVERY = ["week", "month", "year"];
const PER_YEAR = { week: 52n, month: 12n, year: 1n };

/**
 * @typedef {{ name: string, amount: string, every: string }} CostLine
 * @typedef {{ field: string, kind: "missing"|"bad", message: string }} CostProblem
 * @typedef {{ index: number, name: string, amountCents: number, every: "week"|"month"|"year",
 *   yearlyCents: number, monthlyCents: number }} CostRow
 * @typedef {{ ok: true, hasAmounts: boolean, count: number, yearlyCents: number, monthlyCents: number,
 *   rows: CostRow[] }} CostResult
 */

export const MESSAGES = {
  missing: "The list of costs is missing.",
  tooMany: "Too many lines. Use 40 or fewer.",
  bad: (label) => `${label}: use a dollar amount like 12.50, or leave it empty.`,
  negative: (label) => `${label}: use zero or more. A minus sign does not work here.`,
  big: (label) => `${label}: that is too big for this tool. Use $1,000,000,000 or less.`,
  every: (label) => `${label}: pick week, month or year for how often.`,
};

const isBlank = (t) => t === undefined || t === null || String(t).trim() === "";

/**
 * Typed costs in, yearly and monthly costs out, or plain-words problems. Never throws, never NaN.
 * @param {{ items?: Partial<CostLine>[] }} input
 * @returns {CostResult | { ok: false, problems: CostProblem[] }}
 */
export function listCosts(input) {
  const src = input && typeof input === "object" ? input : {};
  const list = src.items;
  if (!Array.isArray(list)) return { ok: false, problems: [{ field: "items", kind: "missing", message: MESSAGES.missing }] };
  if (list.length > MAX_ROWS) return { ok: false, problems: [{ field: "items", kind: "bad", message: MESSAGES.tooMany }] };
  /** @type {CostProblem[]} */
  const problems = [];
  /** @type {CostRow[]} */
  const rows = [];
  list.forEach((line, i) => {
    const row = line && typeof line === "object" ? line : {};
    const rawName = typeof row.name === "string" ? row.name.trim() : "";
    const label = Array.from(rawName).slice(0, MAX_NAME).join("") || `Cost ${i + 1}`;
    if (isBlank(row.amount)) return;
    const cents = parseMoney(row.amount);
    if (cents === null) return void problems.push({ field: `items.${i}`, kind: "bad", message: MESSAGES.bad(label) });
    if (cents < 0) return void problems.push({ field: `items.${i}`, kind: "bad", message: MESSAGES.negative(label) });
    if (cents > MAX_AMOUNT_CENTS) return void problems.push({ field: `items.${i}`, kind: "bad", message: MESSAGES.big(label) });
    const every = typeof row.every === "string" ? row.every.trim().toLowerCase() : "";
    if (!EVERY.includes(every)) return void problems.push({ field: `items.${i}`, kind: "bad", message: MESSAGES.every(label) });
    if (cents === 0) return;
    const yearly = BigInt(cents) * PER_YEAR[every];
    const monthly = divRoundHalfUp(yearly, 12n);
    rows.push({
      index: i,
      name: label,
      amountCents: cents,
      every: /** @type {"week"|"month"|"year"} */ (every),
      yearlyCents: Number(yearly),
      monthlyCents: Number(monthly),
    });
  });
  if (problems.length > 0) return { ok: false, problems };
  rows.sort((a, b) => b.yearlyCents - a.yearlyCents || a.index - b.index);
  return {
    ok: true,
    hasAmounts: rows.length > 0,
    count: rows.length,
    yearlyCents: rows.reduce((a, r) => a + r.yearlyCents, 0),
    monthlyCents: rows.reduce((a, r) => a + r.monthlyCents, 0),
    rows,
  };
}

/**
 * Questions to ask before a call. Generic on purpose: no prices, no offers, no advice.
 * The page and the skill both use this exact list.
 */
export const QUESTIONS = [
  "What is the price today?",
  "What did it cost a year ago?",
  "Is there a cheaper plan with the same things in it?",
  "Can I stop this with no fee?",
  "When does my current deal end?",
];
