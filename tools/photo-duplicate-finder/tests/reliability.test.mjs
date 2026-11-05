import test from "node:test";
import assert from "node:assert/strict";
import { dHashFromGray, findDuplicates, formatBytes, hamming, listText, planList, screenFiles, sha256Hex } from "../calc.mjs";

// Messy photos: empty files, zero bytes, tiny files, same bytes with different names,
// huge counts, wrong shapes. Nothing may throw, give NaN or Infinity, or lose a plain-words message.
const SHA = "ab".repeat(32);
const item = (id, over = {}) => ({ id, name: `${id}.jpg`, size: 10, sha256: SHA, ...over });

function clean(value, where) {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${where}: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => clean(v, `${where}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) clean(v, `${where}.${k}`);
}

test("messy: odd top-level input never throws and always says why in plain words", () => {
  for (const bad of [null, undefined, "photos", 5, {}, true, NaN]) {
    const r = findDuplicates(bad);
    assert.equal(r.ok, false);
    assert.ok(r.problems[0].message.length > 5);
  }
});

test("messy: bad items give a problem that names the photo", () => {
  const badItems = [null, 3, "x", {}, item("a", { size: -1 }), item("a", { size: 1.5 }), item("a", { size: NaN }), item("a", { size: Infinity }), item("a", { sha256: "short" }), item("a", { sha256: 5 }), item("a", { name: "" }), item("a", { name: "   " }), item("a", { dhash: "nothex" }), item("a", { dhash: 7 }), item("")];
  for (const b of badItems) {
    const r = findDuplicates([item("ok"), b]);
    assert.equal(r.ok, false, JSON.stringify(b));
    assert.match(r.problems[0].field, /^items\.1$/);
    assert.ok(r.problems[0].message.length > 5);
    assert.doesNotMatch(r.problems[0].message, /NaN|undefined|Infinity|null/);
  }
  assert.equal(findDuplicates([item("a"), item("a")]).ok, false);
});

test("messy: empty files and zero bytes are left out, never grouped", () => {
  const empty = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const r = findDuplicates([item("z1", { size: 0, sha256: empty }), item("z2", { size: 0, sha256: empty })]);
  assert.equal(r.ok, true);
  assert.equal(r.groups.length, 0);
  assert.equal(r.ignored.length, 2);
});

test("messy: tiny files with the same bytes and different names still group", async () => {
  const bytes = new Uint8Array([1]);
  const sha = await sha256Hex(bytes);
  const r = findDuplicates([item("1", { name: "ÅÄ photo.JPG", size: 1, sha256: sha }), item("2", { name: "\u{1F600}.png", size: 1, sha256: sha.toUpperCase() })]);
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].kind, "exact");
});

test("messy: 300 photos that are all the same file make one group", () => {
  const items = Array.from({ length: 300 }, (_, i) => item(`p${i}`, { name: `copy ${i}.jpg` }));
  const r = findDuplicates(items);
  assert.equal(r.ok, true);
  assert.equal(r.groups.length, 1);
  assert.equal(r.counts.extras, 299);
  clean(r, "r");
  const plan = planList(r.groups, items, {});
  assert.equal(plan.count, 299);
  assert.equal(plan.totalBytes, 2990);
});

test("messy: 300 photos that are all different make no group", () => {
  const items = Array.from({ length: 300 }, (_, i) => item(`p${i}`, { sha256: i.toString(16).padStart(64, "0") }));
  assert.equal(findDuplicates(items).groups.length, 0);
});

test("messy: wrong grids and hashes give null, not a crash", () => {
  for (const bad of [null, undefined, "x", 5, [], new Array(72).fill(NaN), new Array(72).fill(300), new Array(72).fill(-1), new Array(71).fill(1), new Array(72).fill("5")]) {
    assert.equal(dHashFromGray(bad), null);
  }
  assert.equal(dHashFromGray(new Uint8Array(72)), "0000000000000000");
  for (const [a, b] of [[null, null], ["", ""], ["zz", "zz"], [5, 6], ["0".repeat(15), "0".repeat(15)]]) assert.equal(hamming(a, b), null);
});

test("messy: planList and listText handle junk", () => {
  for (const g of [null, undefined, "x", [], [{ id: "g", kind: "exact", members: ["nope"], keepId: "nope" }]]) {
    const p = planList(g, null, null);
    assert.equal(p.count, 0);
    clean(p, "p");
    assert.match(listText(p), /Nothing was deleted/);
  }
});

test("messy: screenFiles copes with junk and names the file in plain words", () => {
  const r = screenFiles([null, {}, { name: "", size: 5 }, { name: "ok.jpg", size: "5" }, { name: "x.jpg", size: NaN }, { name: "t.jpg", size: 1 }], NaN);
  assert.deepEqual(r.accepted, [2, 5]);
  assert.equal(r.skipped.length, 4);
  for (const s of r.skipped) assert.ok(s.message.length > 5);
  assert.deepEqual(screenFiles("nope"), { accepted: [], skipped: [] });
});

test("messy: sizes and bytes never give NaN", async () => {
  for (const n of [NaN, Infinity, -5, null, undefined, "5", 1e15]) assert.doesNotMatch(formatBytes(n), /NaN|Infinity|undefined/);
  assert.equal(await sha256Hex(new Uint8Array(0)), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});
