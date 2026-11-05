import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dHashFromGray, findDuplicates, formatBytes, grayFromRgba, hamming, listText, planList, screenFiles, sha256Hex } from "../calc.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const golden = JSON.parse(fs.readFileSync(path.join(here, "golden.json"), "utf8"));

test("exact-by-sha256: SHA-256 matches the independent values and node:crypto", async () => {
  for (const c of golden.sha256) {
    const bytes = new TextEncoder().encode(c.text);
    assert.equal(await sha256Hex(bytes), c.hex, c.text);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), c.hex);
  }
  for (const c of golden.sha256Bytes) assert.equal(await sha256Hex(new Uint8Array(c.bytes)), c.hex);
});

test("exact-by-sha256: groups of same bytes with different names, biggest kept", () => {
  for (const c of golden.exactCases) {
    const r = findDuplicates(c.items);
    assert.equal(r.ok, true, c.id);
    assert.deepEqual({ groups: r.groups, ignored: r.ignored, counts: r.counts }, c.expect, c.id);
  }
});

test("different-bytes-not-exact: no exact group when the bytes differ", () => {
  const none = golden.exactCases.find((c) => c.id === "none");
  const r = findDuplicates(none.items);
  assert.equal(r.groups.length, 0);
  for (const c of golden.lookCases) {
    const g = findDuplicates(c.items);
    for (const grp of g.groups.filter((x) => x.kind === "exact")) {
      const shas = new Set(grp.members.map((id) => c.items.find((i) => i.id === id).sha256));
      assert.equal(shas.size, 1, c.id);
    }
  }
});

test("lookalike-threshold: difference hashes and distances match the independent values", () => {
  for (const g of golden.gray) assert.equal(dHashFromGray(g.pixels), g.hash, g.name);
  for (const h of golden.hamming) assert.equal(hamming(h.a, h.b), h.distance, h.why);
  for (const c of golden.lookCases) {
    const r = findDuplicates(c.items);
    assert.deepEqual({ groups: r.groups, ignored: r.ignored, counts: r.counts }, c.expect, c.id);
  }
});

test("lookalike-threshold: a transparent pixel is laid on white before the gray step", () => {
  assert.deepEqual(grayFromRgba([0, 0, 0, 0, 255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255]), [255, 255, 0, 76]);
});

test("lookalike-says-check-yourself: kinds are named apart and the saved list says which", () => {
  const c = golden.lookCases[0];
  const r = findDuplicates(c.items);
  assert.equal(r.groups[0].kind, "lookalike");
  const photos = c.items;
  const text = listText(planList(r.groups, photos, {}));
  assert.match(text, /looks like, check yourself/);
  const e = golden.exactCases[0];
  const er = findDuplicates(e.items);
  assert.match(listText(planList(er.groups, e.items, {})), /exact copy of/);
});

test("keep-default-largest and put-it-back-unmarks: the marked list, count and size", () => {
  for (const c of golden.planCases) {
    const p = planList(c.groups, c.photos, c.choices);
    assert.deepEqual(p.rows.map((r) => r.name), c.expect.names, c.id);
    assert.equal(p.count, c.expect.count, c.id);
    assert.equal(p.totalBytes, c.expect.totalBytes, c.id);
  }
  const big = golden.exactCases.find((c) => c.id === "biggest-kept");
  assert.equal(findDuplicates(big.items).groups[0].keepId, "x2");
});

test("caps-and-skips: 300 photos, 25 MB, empty files", () => {
  assert.equal(golden.caps.maxPhotos, 300);
  const files = [{ name: "a.jpg", size: 100 }, { name: "e.jpg", size: 0 }, { name: "big.jpg", size: 25_000_001 }, { name: "ok.jpg", size: 25_000_000 }];
  const r = screenFiles(files, 0);
  assert.deepEqual(r.accepted, [0, 3]);
  assert.deepEqual(r.skipped.map((s) => s.reason), ["empty", "too-big"]);
  assert.match(r.skipped[1].message, /25\.0 MB/);
  const many = screenFiles(Array.from({ length: 305 }, (_, i) => ({ name: `p${i}.jpg`, size: 10 })), 0);
  assert.equal(many.accepted.length, 300);
  assert.equal(many.skipped.length, 5);
  assert.equal(many.skipped[0].reason, "over-cap");
  assert.equal(screenFiles([{ name: "x.jpg", size: 5 }], 300).accepted.length, 0);
  assert.equal(findDuplicates(Array.from({ length: 301 }, (_, i) => ({ id: `i${i}`, name: "n", size: 1, sha256: "a".repeat(64) }))).ok, false);
});

test("nothing-deleted: the saved list holds names, sizes and the promise only", () => {
  const c = golden.planCases[0];
  const text = listText(planList(c.groups, c.photos, c.choices));
  assert.match(text, /Nothing was deleted\. Your photos are untouched\./);
  assert.match(text, /IMG_1\.jpg \(3\.0 KB\)/);
  assert.match(text, /Files on this list: 3/);
  assert.match(text, /Room they take: 4\.5 KB/);
});

test("formatBytes: plain sizes", () => {
  for (const [n, s] of golden.formatBytes) assert.equal(formatBytes(n), s, String(n));
});

test("messy-input-never-throws: see reliability.test.mjs for the long list", () => {
  assert.equal(findDuplicates(null).ok, false);
  assert.equal(dHashFromGray([1, 2, 3]), null);
});
