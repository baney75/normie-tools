import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { INFO_FIELDS, YOU_DO, buildSheet, checkInfo, emptyData, parseSaved, pickWay, savedText } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));

test("free-way-from-plan: each set of answers picks the way the plan says", () => {
  for (const c of golden.ways) {
    const r = pickWay(c.answers);
    assert.equal(r.way, c.way, JSON.stringify(c.answers));
    assert.equal(r.name, c.name);
    const all = r.lines.join("\n");
    for (const s of c.has ?? []) assert.ok(all.includes(s), s);
    for (const s of c.hasNot ?? []) assert.ok(!all.includes(s), s);
  }
});

test("no-invented-numbers: only plan numbers appear, and the limit points to IRS.gov", () => {
  const allowed = new Set(["95,000", "2026", "2027", "5", "800-906-9887", "1", "4", "3", "2025"]);
  for (const c of golden.sheets) {
    const r = buildSheet(c.input);
    const text = r.text.replace(/https?:\/\/\S+/g, "").replace(/W-2|1099|1095-A|5-digit/g, "").replace(/\d{2}\/\d{2}\/\d{4}|\d{3}-\d{3}-\d{4}|\d{5}(-\d{4})?/g, "");
    for (const m of text.matchAll(/\$?\d[\d,.-]*\d|\d/g)) {
      const n = m[0].replace(/^\$/, "");
      assert.ok(allowed.has(n) || /^\d{1,2}$/.test(n), `unexpected number ${m[0]}`);
    }
  }
  const guided = pickWay({ income: "yes" }).lines.join(" ");
  assert.match(guided, /\$95,000/);
  assert.match(guided, /Check IRS\.gov for this year's limit/);
});

test("answer-sheet-exact: three golden sheets match line for line", () => {
  for (const c of golden.sheets) {
    const r = buildSheet(c.input);
    assert.equal(r.ok, true, c.id);
    assert.equal(r.way, c.way, c.id);
    assert.equal(r.text, c.expect, c.id);
  }
});

test("no-social-security-number: no such box, and the sheet says where to type it", () => {
  assert.equal(INFO_FIELDS.some((f) => /social|ssn|security/i.test(f.id + f.label)), false);
  const sheet = buildSheet({}).text;
  assert.match(sheet, /You type your Social Security number yourself on the IRS partner site\./);
  const r = buildSheet({ info: { ssn: "123-45-6789", socialSecurityNumber: "123456789" } });
  assert.equal(r.ok, true);
  assert.ok(!r.text.includes("123-45-6789"));
  assert.ok(!r.text.includes("123456789"));
  assert.ok(!savedText({ info: { ssn: "123-45-6789" } }).includes("123-45-6789"));
});

test("info-boxes-checked: golden entries are tidied or refused", () => {
  for (const c of golden.info) {
    const r = checkInfo(c.field, c.input);
    if (c.expect === null) {
      assert.equal(r.ok, false, `${c.field} ${c.input}`);
      assert.ok(r.message.length > 5);
    } else {
      assert.equal(r.ok, true, `${c.field} ${c.input}`);
      assert.equal(r.value, c.expect, `${c.field} ${c.input}`);
    }
  }
});

test("saved-file-round-trips: save then open gives the same answers", () => {
  for (const c of golden.sheets) {
    const first = buildSheet(c.input);
    const reopened = parseSaved(savedText(c.input));
    assert.equal(reopened.ok, true, c.id);
    const second = buildSheet(reopened.data);
    assert.equal(second.text, first.text, c.id);
  }
  assert.deepEqual(parseSaved(savedText(emptyData())).data, emptyData());
});

test("saved-file-shape-checked: wrong files are refused with the golden message", () => {
  for (const c of golden.saved) {
    const r = parseSaved(c.text);
    assert.equal(r.ok, false, c.id);
    assert.equal(r.problems[0].message, c.message, c.id);
  }
  const bad = parseSaved(JSON.stringify({ format: "nt-form-filler", version: 1, info: { zip: "12" }, answers: { open: "maybe" } }));
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.problems.map((p) => p.field).sort(), ["open", "zip"]);
});

test("saved-file-never-runs: code-like text stays plain text, and prototype keys are ignored", () => {
  const evil = `{"format":"nt-form-filler","version":1,"__proto__":{"polluted":true},"answers":{"__proto__":{"x":1}},"info":{"firstName":"Ann","constructor":"x"},"papers":["w2"]}`;
  const r = parseSaved(evil);
  assert.equal(r.ok, true);
  assert.equal({}.polluted, undefined);
  assert.equal(Object.keys(r.data.info).length, INFO_FIELDS.length);
  const code = parseSaved(`{"format":"nt-form-filler","version":1,"info":{"firstName":"alert()"}}`);
  assert.equal(code.ok, true);
  assert.equal(code.data.info.firstName, "alert()");
  const tags = parseSaved(`{"format":"nt-form-filler","version":1,"info":{"firstName":"<script>alert(1)</script>"}}`);
  assert.equal(tags.ok, false);
  assert.ok(!/\beval\b|new Function/.test(fs.readFileSync(path.join(here, "..", "calc.mjs"), "utf8").replace(/\/\/.*$/gm, "")));
});

test("never-submits: the sheet lists what the person does and what NT never does", () => {
  const sheet = buildSheet({}).text;
  for (const l of YOU_DO) assert.ok(sheet.includes(l), l);
  assert.match(sheet, /Press Submit\./);
  assert.match(sheet, /NT never presses Submit, signs for you, pays anything/);
  assert.match(sheet, /Nothing was sent\./);
});

test("messy-input-never-throws and plain-error-words: see reliability.test.mjs for the long list", () => {
  assert.equal(parseSaved(undefined).ok, false);
  assert.equal(buildSheet(null).ok, false);
});
