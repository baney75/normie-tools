import test from "node:test";
import assert from "node:assert/strict";
import { MAX_ITEMS, MAX_TITLE, buildBriefing, formatDate, orderDay, parseTime } from "../calc.mjs";

// Messy inputs: blank, spaces, odd types, emoji, NaN, huge text, huge lists. None may throw or show NaN.
const MESSY = ["", " ", "  7:30   am ", "1e3", "-5", "0", "1e15", "lots", "\u{1F600}", "NaN", "Infinity", "7:30:00", "7.30", "at noon", "NOON", "12:60", "0:00", null, undefined, {}, [], true, 12, 1.5, NaN, Infinity, "a".repeat(5000), "\u0000\u0007"];

const bad = /NaN|undefined|null|Infinity|\[object/;
const ALL = { weather: true, news: true, day: true, reminders: true };

test("messy: parseTime never throws and always returns ok true with minutes in range, or ok false", () => {
  for (const x of MESSY) {
    const r = parseTime(x);
    if (r.ok) assert.ok(Number.isInteger(r.minutes) && r.minutes >= 0 && r.minutes < 1440, String(x));
    else assert.deepEqual(r, { ok: false });
  }
});

test("messy: every messy time and title builds a briefing with no NaN or undefined", () => {
  for (const x of MESSY) {
    const r = buildBriefing({ include: ALL, date: "2026-11-05", day: [{ time: x, title: x }, { time: "8am", title: "ok" }], reminders: [x, "ok"] });
    assert.equal(r.ok, true);
    // A person may type the word NaN as a title. That is their text. Check everything else.
    const mine = typeof x === "string" ? x.replace(/\s+/g, " ").trim() : "";
    const rest = mine ? r.text.split(mine).join("") : r.text;
    assert.ok(!bad.test(rest), `${String(x).slice(0, 20)}: ${r.text.slice(0, 200)}`);
  }
});

test("messy: odd shapes of input give plain words, not a crash", () => {
  for (const input of [null, undefined, 5, "x", [], {}, { include: null }, { include: "yes" }, { include: { day: "true" } }, NaN]) {
    const r = buildBriefing(input);
    assert.equal(r.ok, false);
    assert.ok(r.problems.length > 0);
    for (const p of r.problems) assert.ok(p.message.length > 10 && !bad.test(p.message));
  }
  for (const day of [null, 5, "x", {}, [null, 5, "x", []]]) assert.equal(buildBriefing({ include: { day: true }, day }).ok, true);
  for (const reminders of [null, 5, "x", {}, [null, 5, {}, []]]) assert.equal(buildBriefing({ include: { reminders: true }, reminders }).ok, true);
});

test("messy: long titles are cut and long lists are capped", () => {
  const o = orderDay(Array.from({ length: 1000 }, () => ({ time: "8am", title: "x".repeat(10000) })));
  assert.equal(o.timed.length, MAX_ITEMS);
  assert.ok(o.left > 900);
  for (const t of o.timed) assert.equal(Array.from(t.title).length, MAX_TITLE);
  const emoji = orderDay([{ time: "8am", title: "\u{1F600}".repeat(200) }]);
  assert.equal(Array.from(emoji.timed[0].title).length, MAX_TITLE);
});

test("messy: dates that are not dates give an empty string", () => {
  for (const d of [null, undefined, 5, NaN, "", "2026-1-1", "20261105", "2026-11-31", "0000-01-01", { year: 2026 }, { year: "2026", month: 1, day: 1 }, {}, []]) assert.equal(formatDate(d), "", String(d));
});

test("messy: a bad date is a calm problem, and a missing date is just left out", () => {
  const r = buildBriefing({ include: { day: true }, date: "tomorrow" });
  assert.equal(r.ok, false);
  assert.equal(r.problems[0].field, "date");
  assert.equal(buildBriefing({ include: { day: true } }).dateLine, "");
});
