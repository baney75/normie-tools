// Tax Filing Helper: the practice match check. Pure ES module, no network, no timers.
//
// The page walks a person through a MOCK filing site. Every answer in the sheet is made up.
// This module only does one job: it compares what was typed on the practice screens with the
// answer sheet and says, in plain words, what matches and what does not.
//
// Rules:
//   - Money is compared as INTEGER CENTS (parseMoney from tools/_shared/money.mjs). "2,810.5" and
//     "$2810.50" are the same amount. Nothing is rounded: more than two decimal digits is not a dollar amount.
//   - Text is compared after trimming, folding runs of spaces to one space, and ignoring capital letters.
//   - Nothing is ever sent, filed or submitted. This is a count of matching answers. It is not tax advice.
import { formatMoney, parseMoney } from "../_shared/money.mjs";

export { formatMoney };

/** @typedef {{ id: string, screen: string, label: string, kind: "text"|"money", value: string }} SheetItem */
/** @typedef {"match"|"different"|"missing"} Status */

/** Most items a sheet may hold. Keeps pages and files small. */
export const MAX_ITEMS = 60;
const MAX_SHOWN = 60;

/**
 * The practice answer sheet. All of it is made up. example.com is the only email domain used.
 * No Social Security number, bank number or password is in it, on purpose.
 * @type {SheetItem[]}
 */
export const PRACTICE_SHEET = [
  { id: "first-name", screen: "About you", label: "First name", kind: "text", value: "Sample" },
  { id: "last-name", screen: "About you", label: "Last name", kind: "text", value: "Person" },
  { id: "email", screen: "About you", label: "Email", kind: "text", value: "sample.person@example.com" },
  { id: "employer", screen: "Pay from your job", label: "Employer name", kind: "text", value: "Example Bakery" },
  { id: "wages", screen: "Pay from your job", label: "Pay from your W-2", kind: "money", value: "32,450.00" },
  { id: "withheld", screen: "Pay from your job", label: "Tax already taken out of your pay", kind: "money", value: "2,810.50" },
  { id: "bank-name", screen: "Bank interest", label: "Bank name", kind: "text", value: "Example Credit Union" },
  { id: "interest", screen: "Bank interest", label: "Interest from your bank (1099-INT)", kind: "money", value: "12.34" },
];

/** Screens in order, each with its items. */
export function screensOf(sheet = PRACTICE_SHEET) {
  const out = [];
  for (const item of sheet) {
    let s = out.find((x) => x.name === item.screen);
    if (!s) out.push((s = { name: item.screen, items: [] }));
    s.items.push(item);
  }
  return out;
}

/** @param {unknown} v */
function asText(v) {
  if (typeof v === "string") return v;
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

/** Fold spaces and capitals so "  sample   PERSON " matches "Sample Person". */
export function foldText(v) {
  return asText(v).trim().replace(/\s+/g, " ").toLowerCase();
}

const shown = (v) => {
  const t = asText(v).trim().replace(/\s+/g, " ");
  return t.length > MAX_SHOWN ? `${t.slice(0, MAX_SHOWN)}...` : t;
};

/**
 * Compare typed practice answers with the sheet.
 * @param {unknown} sheet array of sheet items
 * @param {unknown} typed object: item id -> typed text
 * @returns {{ ok: true, total: number, matched: number, different: number, missing: number, allMatch: boolean, summary: string, rows: Array<{ id: string, screen: string, label: string, kind: string, expected: string, typed: string, status: Status, message: string }> } | { ok: false, problems: Array<{ field: string, kind: string, message: string }> }}
 */
export function checkAnswers(sheet, typed) {
  if (!Array.isArray(sheet) || sheet.length === 0) {
    return { ok: false, problems: [{ field: "sheet", kind: "missing", message: "The answer sheet is empty. Add at least one answer." }] };
  }
  if (sheet.length > MAX_ITEMS) {
    return { ok: false, problems: [{ field: "sheet", kind: "bad", message: `The answer sheet is too long. Use ${MAX_ITEMS} answers or fewer.` }] };
  }
  const got = typed && typeof typed === "object" && !Array.isArray(typed) ? typed : {};
  const problems = [];
  const rows = [];
  const seen = new Set();
  sheet.forEach((raw, i) => {
    const it = raw && typeof raw === "object" ? raw : {};
    const id = typeof it.id === "string" && it.id.trim() ? it.id.trim() : "";
    const label = typeof it.label === "string" && it.label.trim() ? it.label.trim() : `Answer ${i + 1}`;
    if (!id || seen.has(id)) {
      problems.push({ field: id || `sheet.${i}`, kind: "bad", message: `${label}: each answer needs its own id.` });
      return;
    }
    seen.add(id);
    const kind = it.kind === "money" ? "money" : "text";
    const want = asText(it.value);
    const wantCents = kind === "money" ? parseMoney(want) : null;
    if (kind === "money" && (wantCents === null || wantCents < 0)) {
      problems.push({ field: id, kind: "bad", message: `${label}: the sheet needs a dollar amount like 1,200.50.` });
      return;
    }
    if (kind === "text" && foldText(want) === "") {
      problems.push({ field: id, kind: "bad", message: `${label}: the sheet has nothing to match.` });
      return;
    }
    const expected = kind === "money" ? formatMoney(wantCents) : want.trim();
    const t = asText(Object.prototype.hasOwnProperty.call(got, id) ? got[id] : "");
    let status;
    let message;
    if (t.trim() === "") {
      status = "missing";
      message = `${label}: nothing typed yet. The sheet says ${expected}.`;
    } else if (kind === "money") {
      const c = parseMoney(t);
      if (c === null) {
        status = "different";
        message = `${label}: "${shown(t)}" is not a dollar amount. The sheet says ${expected}.`;
      } else if (c === wantCents) {
        status = "match";
        message = `${label}: matches.`;
      } else {
        status = "different";
        message = `${label}: you typed ${formatMoney(c)}. The sheet says ${expected}.`;
      }
    } else if (foldText(t) === foldText(want)) {
      status = "match";
      message = `${label}: matches.`;
    } else {
      status = "different";
      message = `${label}: you typed "${shown(t)}". The sheet says "${expected}".`;
    }
    rows.push({ id, screen: typeof it.screen === "string" ? it.screen : "", label, kind, expected, typed: shown(t), status, message });
  });
  if (problems.length) return { ok: false, problems };
  const matched = rows.filter((r) => r.status === "match").length;
  const missing = rows.filter((r) => r.status === "missing").length;
  const different = rows.length - matched - missing;
  const total = rows.length;
  const allMatch = matched === total;
  const summary = allMatch
    ? `All ${total} answers match.`
    : `${matched} of ${total} answers match. ${total - matched} need a look.`;
  return { ok: true, total, matched, different, missing, allMatch, summary, rows };
}
