// Form Filler logic. Pure ES module, on this phone or computer, no network, no timers.
// Every fact comes from plan/v5-work/form-filler-free-file.md and plan/PLATFORM-SOURCES.md.
// The Python copy in skills/form-filler/scripts/fill.py must give the same words.
//
// There is no Social Security number anywhere in here, on purpose.

/** @typedef {"yes"|"no"|"unsure"|""} Choice */
/** @typedef {{ filing: Choice, income: Choice, fillable: Choice, open: Choice }} Answers */
/** @typedef {{ firstName: string, lastName: string, street: string, city: string, state: string, zip: string, birthDate: string, phone: string }} Info */
/** @typedef {{ answers: Answers, info: Info, papers: string[] }} Data */
/** @typedef {{ field: string, message: string }} Problem */

export const FORMAT = "nt-form-filler";
export const VERSION = 1;
export const MAX_FILE_CHARS = 200000;
export const MAX_TEXT = 100;

export const LINKS = {
  freeFile: "https://www.irs.gov/freefile",
  freeFilePage: "https://www.irs.gov/filing/irs-free-file-do-your-taxes-for-free",
  vita: "https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers",
};
export const VITA_PHONE = "800-906-9887";

export const QUESTION_IDS = ["filing", "income", "fillable", "open"];
export const CHOICES = ["yes", "no", "unsure"];

export const PAPERS = [
  { id: "ssn", label: "Social Security number or ITIN, for each person on your return" },
  { id: "w2", label: "W-2, the pay form from each job" },
  { id: "1099", label: "1099 forms, for other money you got" },
  { id: "1095a", label: "1095-A, if you had health insurance from the Marketplace" },
  { id: "lastreturn", label: "Last year's tax return, if you filed one" },
  { id: "ippin", label: "IP code the IRS sent you, if any" },
  { id: "bank", label: "Bank account details, if you want your refund sent to your bank" },
  { id: "credits", label: "Papers for credits (if you have them)" },
  { id: "sidejob", label: "For side jobs: what you were paid, and receipts for what you spent" },
];
export const PAPER_IDS = PAPERS.map((p) => p.id);

export const INFO_FIELDS = [
  { id: "firstName", label: "First name" },
  { id: "lastName", label: "Last name" },
  { id: "street", label: "Street address" },
  { id: "city", label: "City" },
  { id: "state", label: "State" },
  { id: "zip", label: "ZIP code" },
  { id: "birthDate", label: "Birth date" },
  { id: "phone", label: "Phone number" },
];

export const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "AS", "GU", "MP", "PR", "VI", "AA", "AE", "AP",
];

export const SSN_LINE = "You type your Social Security number yourself on the free filing site you pick on IRS.gov.";

export const YOU_DO = [
  "Make your Free File account.",
  "Check every number on the review page.",
  "Sign with the income number from last year's return, or a 5-digit code you pick.",
  "Press Submit, the button that sends your tax return.",
  "If you owe tax, you pay it yourself.",
];

export const CHOICE_WORDS = { yes: "Yes", no: "No", unsure: "Not sure", "": "Not answered" };

export const QUESTION_TEXT = {
  filing: "Are you filing this year's taxes?",
  income: "Was your income $95,000 or less last year?",
  fillable: "Are you willing to type into online copies of the IRS forms yourself?",
  open: "Is Free File open on IRS.gov yet?",
};

const BAD_CHARS = /[<>{}\[\]\;=@$%^*|~`]/;
const CONTROL = /[\u0000-\u001f\u007f]/;

function tidy(v) {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";
}

function realDate(y, m, d) {
  if (!(y >= 1000 && y <= 9999 && m >= 1 && m <= 12 && d >= 1)) return false;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  return d <= days;
}

const pad = (n, w) => String(n).padStart(w, "0");

/**
 * Check one info box. Blank is fine (the person may skip a box).
 * @returns {{ ok: true, value: string } | { ok: false, message: string }}
 */
export function checkInfo(field, input) {
  if (typeof input !== "string") return { ok: false, message: `${labelOf(field)}: type it as words or numbers.` };
  const text = tidy(input);
  if (text === "") return { ok: true, value: "" };
  const name = labelOf(field);
  if (text.length > MAX_TEXT) return { ok: false, message: `${name}: this is too long. Keep it under ${MAX_TEXT} letters.` };
  if (CONTROL.test(input.replace(/[\t\r\n]/g, " "))) return { ok: false, message: `${name}: use letters and numbers only.` };
  if (field === "firstName" || field === "lastName") {
    if (/[0-9]/.test(text) || BAD_CHARS.test(text) || !/\p{L}/u.test(text)) {
      return { ok: false, message: `${name}: use letters only. No numbers.` };
    }
    return { ok: true, value: text };
  }
  if (field === "street") {
    if (BAD_CHARS.test(text)) return { ok: false, message: `${name}: use letters and numbers only.` };
    return { ok: true, value: text };
  }
  if (field === "city") {
    if (/[0-9]/.test(text) || BAD_CHARS.test(text) || !/\p{L}/u.test(text)) {
      return { ok: false, message: `${name}: use letters only. No numbers.` };
    }
    return { ok: true, value: text };
  }
  if (field === "state") {
    const up = text.toUpperCase();
    if (!STATES.includes(up)) return { ok: false, message: `${name}: pick your state from the list.` };
    return { ok: true, value: up };
  }
  if (field === "zip") {
    if (!/^[0-9]{5}(-[0-9]{4})?$/.test(text)) return { ok: false, message: `${name}: type 5 numbers, like 12345.` };
    return { ok: true, value: text };
  }
  if (field === "birthDate") {
    let y; let m; let d;
    let hit = /^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})$/.exec(text);
    if (hit) { y = +hit[1]; m = +hit[2]; d = +hit[3]; } else {
      hit = /^([0-9]{1,2})\/([0-9]{1,2})\/([0-9]{4})$/.exec(text);
      if (hit) { m = +hit[1]; d = +hit[2]; y = +hit[3]; }
    }
    if (hit === null || !realDate(y, m, d)) return { ok: false, message: `${name}: pick a real date.` };
    return { ok: true, value: `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}` };
  }
  if (field === "phone") {
    if (!/^[0-9 ()+.-]+$/.test(text)) return { ok: false, message: `${name}: type 10 numbers, like 555-010-1234.` };
    let digits = text.replace(/[^0-9]/g, "");
    if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
    if (digits.length !== 10) return { ok: false, message: `${name}: type 10 numbers, like 555-010-1234.` };
    return { ok: true, value: `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` };
  }
  return { ok: false, message: `${name}: this box is not known.` };
}

function labelOf(field) {
  return INFO_FIELDS.find((f) => f.id === field)?.label ?? String(field);
}

/** "2000-01-31" becomes "01/31/2000". Anything else comes back as it is. */
export function showDate(iso) {
  const m = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

export function emptyData() {
  return {
    answers: { filing: "", income: "", fillable: "", open: "" },
    info: { firstName: "", lastName: "", street: "", city: "", state: "", zip: "", birthDate: "", phone: "" },
    papers: [],
  };
}

const isPlain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Check and clean whatever came in. Copies only the known boxes into a new object.
 * Never runs anything. Never throws.
 * @returns {{ ok: true, data: Data } | { ok: false, problems: Problem[] }}
 */
export function cleanData(input) {
  const data = emptyData();
  /** @type {Problem[]} */
  const problems = [];
  if (!isPlain(input)) return { ok: false, problems: [{ field: "file", message: "This is not an answer file from Form Filler." }] };
  const a = isPlain(input.answers) ? input.answers : {};
  for (const q of QUESTION_IDS) {
    const v = own(a, q) ? a[q] : "";
    if (v === "" || v === undefined || v === null) continue;
    if (CHOICES.includes(v)) data.answers[q] = v;
    else problems.push({ field: q, message: `${QUESTION_TEXT[q]} Use yes, no, or unsure.` });
  }
  const info = isPlain(input.info) ? input.info : {};
  for (const f of INFO_FIELDS) {
    const v = own(info, f.id) ? info[f.id] : "";
    if (v === undefined || v === null) continue;
    const r = checkInfo(f.id, v);
    if (r.ok) data.info[f.id] = r.value;
    else problems.push({ field: f.id, message: r.message });
  }
  if (input.papers !== undefined && !Array.isArray(input.papers)) {
    problems.push({ field: "papers", message: "Papers: this should be a list." });
  } else if (Array.isArray(input.papers)) {
    const seen = new Set();
    for (const p of input.papers) {
      if (typeof p === "string" && PAPER_IDS.includes(p)) seen.add(p);
      else problems.push({ field: "papers", message: "Papers: one item is not on the list." });
    }
    data.papers = PAPER_IDS.filter((id) => seen.has(id));
  }
  return problems.length ? { ok: false, problems } : { ok: true, data };
}

/**
 * Read a saved answer file (text). Checks the shape. Only JSON.parse touches it.
 * @returns {{ ok: true, data: Data } | { ok: false, problems: Problem[] }}
 */
export function parseSaved(text) {
  const bad = (message) => ({ ok: false, problems: [{ field: "file", message }] });
  if (typeof text !== "string" || text.trim() === "") return bad("This file is empty.");
  if (text.length > MAX_FILE_CHARS) return bad("This file is too big to be an answer file.");
  let raw;
  try {
    raw = JSON.parse(text);
  } catch {
    return bad("This is not an answer file from Form Filler.");
  }
  if (!isPlain(raw) || raw.format !== FORMAT) return bad("This is not an answer file from Form Filler.");
  if (raw.version !== VERSION) return bad("This answer file is from a different version.");
  return cleanData(raw);
}

/** The text of the file the person can save to use later. */
export function savedText(data) {
  const r = cleanData(data);
  const d = r.ok ? r.data : emptyData();
  return `${JSON.stringify({ format: FORMAT, version: VERSION, answers: d.answers, info: d.info, papers: d.papers }, null, 2)}\n`;
}

/**
 * Which free way may fit. Plain facts only, from the plan.
 * @param {Answers} answers
 */
export function pickWay(answers) {
  const a = { filing: "", income: "", fillable: "", open: "", ...(isPlain(answers) ? answers : {}) };
  /** @type {string[]} */
  const lines = [];
  let way;
  let name;
  if (a.filing === "no") {
    way = "past";
    name = "Not Free File";
    lines.push("Free File only does this year's taxes. It can't do taxes from past years.");
    lines.push("Check IRS.gov for help with past years.");
  } else if (a.income === "yes") {
    way = "guided";
    name = "Guided Free File";
    lines.push("Guided Free File asks simple questions, one at a time. The software does the math.");
    lines.push("Last season it was free for people with income of $95,000 or less. Check IRS.gov for this year's limit.");
    lines.push("Each company also sets its own rules, such as age or state.");
    lines.push("Some companies do your state return for free, some charge.");
  } else if (a.income === "no") {
    way = "fillable";
    name = "Free File Fillable Forms";
    lines.push("Free File Fillable Forms works at any income.");
    lines.push("You type into online copies of the IRS forms. Only some of the math is done for you.");
    lines.push("State taxes are not included.");
    if (a.fillable === "no" || a.fillable === "unsure") {
      lines.push("If you would rather not do the work yourself, a VITA volunteer can help for free.");
    }
  } else {
    way = "check";
    name = "Find your income number first";
    lines.push("The IRS calls your income number adjusted gross income, or AGI.");
    lines.push("You can see it by signing in to your IRS online account, under Tax Records.");
    lines.push("You can also ask the IRS to mail you a copy of last year's return.");
  }
  if (way !== "past") {
    if (a.open === "yes") lines.push("Start at IRS.gov/freefile.");
    else lines.push("Free File was closed when we checked on November 4, 2026. The IRS says it opens in January 2027. Check IRS.gov.");
  }
  return { way, name, lines };
}

export const NEVER_LINE = "This tool never presses Submit, signs for you, pays anything, or picks an extra that costs money. It never asks for your Free File password.";
export const START_LINE = "Always start at IRS.gov/freefile. If you go straight to a tax company's website, you won't get the free deal.";
export const CARD_LINE = "If any screen asks for a card number, stop.";

/**
 * The plain-text answer sheet. Same words as the Python script.
 * @param {unknown} input
 * @returns {{ ok: true, text: string, way: string } | { ok: false, problems: Problem[] }}
 */
export function buildSheet(input) {
  const r = cleanData(input);
  if (!r.ok) return r;
  const { answers, info, papers } = r.data;
  const pick = pickWay(answers);
  const out = [];
  out.push("Form Filler answer sheet");
  out.push("This is a list of your answers. It is not a tax return. Nothing was sent.");
  out.push("");
  out.push("Which free way may fit");
  out.push(pick.name);
  for (const l of pick.lines) out.push(`- ${l}`);
  out.push(`- ${START_LINE}`);
  out.push(`Official link: ${LINKS.freeFile}`);
  out.push(`Free help from a VITA volunteer: ${LINKS.vita} or ${VITA_PHONE}`);
  out.push("");
  out.push("Your answers");
  for (const q of QUESTION_IDS) out.push(`${QUESTION_TEXT[q]} ${CHOICE_WORDS[answers[q]]}`);
  out.push("");
  out.push("My info");
  for (const f of INFO_FIELDS) {
    const v = info[f.id];
    out.push(`${f.label}: ${v === "" ? "Not filled in" : f.id === "birthDate" ? showDate(v) : v}`);
  }
  out.push(`Social Security number: ${SSN_LINE}`);
  out.push("");
  out.push("Papers to find");
  for (const p of PAPERS) out.push(`${papers.includes(p.id) ? "[x]" : "[ ]"} ${p.label}`);
  out.push("");
  out.push("What you do yourself");
  for (const l of YOU_DO) out.push(`- ${l}`);
  out.push("");
  out.push(NEVER_LINE);
  out.push(CARD_LINE);
  out.push(`Source: IRS Free File page, ${LINKS.freeFilePage}`);
  out.push("");
  return { ok: true, text: out.join("\n"), way: pick.way };
}

/** Plain words for a list of problems. */
export function problemLines(problems) {
  return problems.map((p) => p.message);
}
