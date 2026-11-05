import test from "node:test";
import assert from "node:assert/strict";
import { INFO_FIELDS, buildSheet, checkInfo, cleanData, parseSaved, pickWay, savedText } from "../calc.mjs";

const MESSY = [
  undefined, null, NaN, Infinity, -1, 0, 1e15, true, [], {}, () => 1, "", " ", "  12  ", "1,000", "$1,000.50", "1e3", "-5",
  "text", "😀", "😀".repeat(80), "x".repeat(5000), "\u0000", "a\u0000b", "<script>", "../../etc/passwd", "'; DROP TABLE;--", "\n\n", "０１２３",
];

test("messy values in every info box never throw and always give words or a tidy value", () => {
  for (const f of INFO_FIELDS) {
    for (const v of MESSY) {
      const r = checkInfo(f.id, v);
      assert.equal(typeof r.ok, "boolean");
      if (r.ok) assert.equal(typeof r.value, "string");
      else assert.match(r.message, /^[A-Za-z].{8,}/);
      assert.ok(!/NaN|undefined|Infinity|\[object/.test(JSON.stringify(r)), `${f.id} ${String(v)}`);
    }
  }
});

test("messy whole inputs never throw", () => {
  for (const v of MESSY) {
    for (const fn of [cleanData, buildSheet, savedText, pickWay]) {
      let out;
      assert.doesNotThrow(() => { out = fn(v); }, `${fn.name} ${String(v)}`);
      assert.ok(!/NaN|undefined|Infinity|\[object/.test(typeof out === "string" ? out : JSON.stringify(out)), `${fn.name} ${String(v)}`);
    }
  }
});

test("messy files: bad text, huge text, deep nesting, wrong types", () => {
  const files = [
    "", "   ", "null", "[]", "42", "\"hi\"", "{", "{}", "﻿{}", "{\"format\":\"nt-form-filler\"}",
    "x".repeat(300000), `{"format":"nt-form-filler","version":1,"answers":"yes"}`,
    `{"format":"nt-form-filler","version":1,"info":[1,2]}`, `{"format":"nt-form-filler","version":1,"papers":"w2"}`,
    `{"format":"nt-form-filler","version":1,"papers":[1,{},null]}`, `{"format":"nt-form-filler","version":1,"info":{"phone":5551234567}}`,
    "[".repeat(5000), "%PDF-1.4\n%%EOF", "date,amount\n2026-01-02,12.50\n",
  ];
  for (const t of files) {
    let r;
    assert.doesNotThrow(() => { r = parseSaved(t); }, t.slice(0, 20));
    if (r.ok) assert.equal(typeof r.data.info.firstName, "string");
    else {
      assert.ok(r.problems.length > 0);
      for (const p of r.problems) assert.match(p.message, /^[A-Z].{8,}/);
    }
  }
});

test("messy answers: odd choices are refused, blanks are fine", () => {
  assert.equal(cleanData({ answers: { filing: "YES" } }).ok, false);
  assert.equal(cleanData({ answers: { filing: "", income: undefined, fillable: null } }).ok, true);
  assert.equal(pickWay({ filing: 5, income: {} }).way, "check");
});

test("messy dates: edge days", () => {
  for (const [v, ok] of [["2024-02-29", true], ["2023-02-29", false], ["1900-02-29", false], ["2000-02-29", true], ["0000-01-01", false], ["2020-04-31", false], ["12/31/1999", true], ["13/01/1999", false]]) {
    assert.equal(checkInfo("birthDate", v).ok, ok, v);
  }
});
