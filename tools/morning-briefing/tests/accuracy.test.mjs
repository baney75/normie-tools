import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EXAMPLE, MAX_ITEMS, OFFLINE_NOTE, buildBriefing, formatDate, formatTime, parseTime } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));
const claims = JSON.parse(fs.readFileSync(path.join(here, "..", "claims.json"), "utf8")).claims;
const brief = (id) => golden.briefings.find((b) => b.id === id);
const run = (id) => {
  const r = buildBriefing(brief(id).input);
  assert.equal(r.ok, true, id);
  return r;
};

test("times-read-plainly: every golden time matches the hand-worked minutes", () => {
  for (const t of golden.times) {
    const r = parseTime(t.text);
    if (t.minutes === null) assert.equal(r.ok, false, `${t.text}: ${t.note}`);
    else assert.deepEqual(r, { ok: true, minutes: t.minutes }, `${t.text}: ${t.note}`);
  }
  for (const c of golden.clockWords) assert.equal(formatTime(c.minutes), c.text);
  for (const d of golden.dates) assert.equal(formatDate(d.input), d.text, d.input);
  assert.equal(formatDate({ year: 2026, month: 11, day: 5 }), "Thursday, November 5, 2026");
});

test("day-in-time-order: items are sorted by time and ties keep the typed order", () => {
  const full = run("full");
  const day = full.sections.find((s) => s.id === "day");
  assert.deepEqual(day.lines.map((l) => l.split(": ")[1]), brief("full").dayOrder);
  assert.equal(run("ties-and-midnight").text, brief("ties-and-midnight").text);
});

test("unclear-time-listed: a time that is not clear goes under Time not clear", () => {
  const day = run("full").sections.find((s) => s.id === "day");
  assert.equal(day.unclearHeading, "Time not clear");
  assert.deepEqual(day.unclear, brief("full").unclear);
  assert.ok(!day.lines.some((l) => /Call Sam|Mail/.test(l)));
  assert.equal(run("no-title").text, brief("no-title").text);
});

test("counts-capped: only 5 are used and the text says how many were left out", () => {
  assert.equal(MAX_ITEMS, 5);
  const r = run("cap-at-five");
  assert.equal(r.text, brief("cap-at-five").text);
  assert.equal(r.notes.length, 1);
  const day = buildBriefing({ include: { day: true }, day: Array.from({ length: 9 }, (_, i) => ({ time: `${i + 1}am`, title: `T${i}` })) });
  assert.equal(day.sections[0].lines.length, 5);
  assert.match(day.notes[0], /4 left out/);
});

test("example-always-labelled: weather and news lines carry the word Example", () => {
  const r = run("full");
  for (const id of ["weather", "news"]) {
    const s = r.sections.find((x) => x.id === id);
    assert.match(s.heading, /Example/);
    assert.match(s.label, /^Example\. Not today's (weather|news)\.$/);
    for (const l of s.lines) assert.match(l, /^Example/);
  }
  assert.equal(EXAMPLE.weatherLabel, "Example. Not today's weather.");
});

test("plain-text-exact: the text matches the hand-written briefing for each golden case", () => {
  for (const b of golden.briefings) assert.equal(buildBriefing(b.input).text, b.text, b.id);
  const noDay = run("reminders-only");
  assert.ok(!/My day|Weather|News/.test(noDay.text));
});

test("offline-statement: shown when weather or news is ticked, left out otherwise", () => {
  assert.equal(OFFLINE_NOTE, "Live weather and news need the NT app or your AI helper. This page does not go online.");
  assert.ok(run("full").text.includes(OFFLINE_NOTE));
  assert.ok(run("weather-only").text.includes(OFFLINE_NOTE));
  assert.ok(!run("reminders-only").text.includes(OFFLINE_NOTE));
  assert.ok(!run("full").text.match(/source|according to|reports?\b/i));
});

test("messy-input-never-nan: golden messy briefings stay plain", () => {
  for (const b of golden.briefings) assert.ok(!/NaN|undefined|null|Infinity|\[object/.test(buildBriefing(b.input).text), b.id);
});

test("plain-error-words: bad date and no parts picked name the field", () => {
  for (const e of golden.errors) {
    const r = buildBriefing(e.input);
    assert.equal(r.ok, false, e.id);
    assert.deepEqual(r.problems.map((p) => p.field), e.fields, e.id);
    for (const p of r.problems) assert.ok(p.message.length > 10);
  }
});

test("every claim in claims.json is named in a test", () => {
  const src = fs.readFileSync(fileURLToPath(import.meta.url), "utf8");
  assert.ok(claims.length >= 5 && claims.length <= 10);
  for (const c of claims) assert.ok(src.includes(`test("${c.id}:`), c.id);
});
