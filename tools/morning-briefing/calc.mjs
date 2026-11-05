// Morning Briefing logic. Pure functions, no network, no clock, no timers.
// The weather and news parts are made-up EXAMPLE content. Nothing here goes online.
// The same rules live in skills/morning-briefing/scripts/briefing.py. Both read tests/golden.json.

/** @typedef {{ weather?: boolean, news?: boolean, day?: boolean, reminders?: boolean }} Include */
/** @typedef {{ time?: unknown, title?: unknown }} DayRow */
/** @typedef {{ include?: Include, date?: unknown, day?: DayRow[], reminders?: unknown[] }} BriefingInput */
/** @typedef {{ field: string, kind: string, message: string }} Problem */

export const MAX_ITEMS = 5;
export const MAX_TITLE = 80;

export const SECTION_IDS = ["weather", "news", "day", "reminders"];

export const OFFLINE_NOTE = "Live weather and news need the NT app or your AI helper. This page does not go online.";

/** Made-up content. It is always shown with the word Example. */
export const EXAMPLE = {
  weatherHeading: "Weather (Example)",
  weatherLines: ["Example town: 58 degrees, clear."],
  weatherLabel: "Example. Not today's weather.",
  newsHeading: "News headlines (Example)",
  newsLines: [
    "Example headline: The town pool opens for the summer.",
    "Example headline: A bake sale is on Saturday.",
    "Example headline: The library has a new sign.",
  ],
  newsLabel: "Example. Not today's news.",
};

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const asText = (x) => (typeof x === "string" ? x : "");
const tidy = (x) => asText(x).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
const clip = (s) => Array.from(s).slice(0, MAX_TITLE).join("");

/**
 * Read a time a person typed. Returns minutes after midnight, or { ok: false } when it is not clear.
 * Clear: "7:30 am", "7am", "7 a.m.", "13:05", "07:30", "noon", "midnight".
 * Not clear: "7:30" (am or pm?), "later", "25:00", "7:75".
 * @param {unknown} text
 * @returns {{ ok: true, minutes: number } | { ok: false }}
 */
export function parseTime(text) {
  const s = tidy(text).toLowerCase().replace(/\./g, "").replace(/^at /, "");
  if (s === "noon") return { ok: true, minutes: 720 };
  if (s === "midnight") return { ok: true, minutes: 0 };
  const m = /^(\d{1,2})(?::(\d{2}))?\s?(am|pm)?$/.exec(s);
  if (!m) return { ok: false };
  const hour = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (min > 59) return { ok: false };
  if (m[3]) {
    if (hour < 1 || hour > 12) return { ok: false };
    return { ok: true, minutes: ((hour % 12) + (m[3] === "pm" ? 12 : 0)) * 60 + min };
  }
  // No am or pm: only a 24 hour time is clear (needs a colon, and 13 to 23 or a leading zero).
  if (m[2] === undefined) return { ok: false };
  if (hour > 23) return { ok: false };
  if (hour >= 13 || m[1].length === 2 && m[1][0] === "0") return { ok: true, minutes: hour * 60 + min };
  return { ok: false };
}

/** @param {number} minutes minutes after midnight, 0 to 1439 */
export function formatTime(minutes) {
  const h = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, "0");
  return `${h % 12 || 12}:${mm} ${h < 12 ? "am" : "pm"}`;
}

/**
 * Today's date in plain words, like "Thursday, November 5, 2026".
 * Takes "2026-11-05" or { year, month, day }. Returns "" when it is not a real date.
 * @param {unknown} date
 */
export function formatDate(date) {
  let y, mo, d;
  if (typeof date === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
    if (!m) return "";
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  } else if (date && typeof date === "object") {
    ({ year: y, month: mo, day: d } = /** @type {any} */ (date));
  } else return "";
  if (![y, mo, d].every(Number.isInteger)) return "";
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1000 || y > 9999 || t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return "";
  return `${WEEKDAYS[t.getUTCDay()]}, ${MONTHS[mo - 1]} ${d}, ${y}`;
}

/**
 * Order the things on a person's day by time. Rows with no clear time go last, in the order typed.
 * Blank rows are dropped. Only the first MAX_ITEMS rows are used.
 * @param {unknown} rows
 */
export function orderDay(rows) {
  const used = (Array.isArray(rows) ? rows : [])
    .map((r) => (r && typeof r === "object" ? r : {}))
    .map((r) => ({ typed: tidy(r.time), title: clip(tidy(r.title)) }))
    .filter((r) => r.typed || r.title);
  const kept = used.slice(0, MAX_ITEMS);
  const timed = [];
  const unclear = [];
  kept.forEach((r, order) => {
    const t = r.typed ? parseTime(r.typed) : { ok: false };
    const title = r.title || "No title";
    if (t.ok) timed.push({ minutes: t.minutes, time: formatTime(t.minutes), title, order });
    else unclear.push({ typed: r.typed, title });
  });
  timed.sort((a, b) => a.minutes - b.minutes || a.order - b.order);
  return { timed: timed.map(({ minutes, time, title }) => ({ minutes, time, title })), unclear, left: used.length - kept.length };
}

/** @param {unknown} rows */
export function cleanReminders(rows) {
  const used = (Array.isArray(rows) ? rows : [])
    .map((r) => clip(tidy(r && typeof r === "object" ? /** @type {any} */ (r).text : r)))
    .filter(Boolean);
  return { items: used.slice(0, MAX_ITEMS), left: Math.max(0, used.length - MAX_ITEMS) };
}

const leftNote = (n, what) => `Only the first ${MAX_ITEMS} ${what} are used. ${n} left out.`;

/**
 * Build the briefing. Returns { ok: true, dateLine, sections, notes, offlineNote, text }
 * or { ok: false, problems }.
 * Each section: { id, heading, lines, label?, unclearHeading?, unclear?, empty? }.
 * @param {BriefingInput} input
 */
export function buildBriefing(input) {
  /** @type {Problem[]} */
  const problems = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, problems: [{ field: "include", kind: "missing", message: "Pick at least one part to include." }] };
  }
  const inc = input.include && typeof input.include === "object" ? input.include : {};
  const on = (id) => inc[id] === true;
  if (!SECTION_IDS.some(on)) problems.push({ field: "include", kind: "none", message: "Pick at least one part to include." });
  let dateLine = "";
  if (input.date !== undefined && input.date !== null && input.date !== "") {
    dateLine = formatDate(input.date);
    if (!dateLine) problems.push({ field: "date", kind: "bad", message: "The date is not clear. Use a date like 2026-11-05, or leave it out." });
  }
  if (problems.length) return { ok: false, problems };

  const sections = [];
  const notes = [];
  if (on("weather")) sections.push({ id: "weather", heading: EXAMPLE.weatherHeading, lines: [...EXAMPLE.weatherLines], label: EXAMPLE.weatherLabel });
  if (on("news")) sections.push({ id: "news", heading: EXAMPLE.newsHeading, lines: [...EXAMPLE.newsLines], label: EXAMPLE.newsLabel });
  if (on("day")) {
    const o = orderDay(input.day);
    if (o.left > 0) notes.push(leftNote(o.left, "things on your day"));
    sections.push({
      id: "day",
      heading: "My day",
      lines: o.timed.map((x) => `${x.time}: ${x.title}`),
      unclearHeading: "Time not clear",
      unclear: o.unclear.map((x) => (x.typed ? `${x.typed}: ${x.title}` : x.title)),
      empty: "Nothing on your day.",
    });
  }
  if (on("reminders")) {
    const r = cleanReminders(input.reminders);
    if (r.left > 0) notes.push(leftNote(r.left, "reminders"));
    sections.push({ id: "reminders", heading: "My reminders", lines: r.items, empty: "No reminders." });
  }
  const offlineNote = on("weather") || on("news") ? OFFLINE_NOTE : "";
  const out = { ok: true, dateLine, sections, notes, offlineNote };
  return { ...out, text: briefingText(out) };
}

/** Plain text for saving. Bullets are hyphens. */
function briefingText(b) {
  const out = ["Morning briefing"];
  if (b.dateLine) out.push(b.dateLine);
  for (const s of b.sections) {
    out.push("", s.heading);
    const bullet = s.id === "news" || s.id === "reminders";
    if (s.lines.length === 0 && !(s.unclear && s.unclear.length)) out.push(s.empty);
    for (const l of s.lines) out.push(bullet ? `- ${l}` : l);
    if (s.unclear && s.unclear.length) {
      out.push(s.unclearHeading);
      for (const l of s.unclear) out.push(`- ${l}`);
    }
    if (s.label) out.push(s.label);
  }
  if (b.offlineNote) out.push("", b.offlineNote);
  for (const n of b.notes) out.push("", n);
  return out.join("\n") + "\n";
}
