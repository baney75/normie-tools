// Photo Duplicate Finder: pure logic. On this device only. No network, no timers.
// The browser reads each photo and gives this module its bytes (for the exact check) and a
// 9 by 8 grayscale grid (for the "looks the same" check). Nothing here reads, moves or deletes a file.

/** @typedef {{id: string, name: string, size: number, sha256: string, dhash?: string|null}} PhotoInfo */
/** @typedef {{id: string, kind: "exact"|"lookalike", members: string[], keepId: string}} Group */
/** @typedef {{field: string, kind: string, message: string}} Problem */

/** Most photos looked at in one run. */
export const MAX_PHOTOS = 300;
/** A photo bigger than this is skipped (decimal megabytes, as formatBytes shows them). */
export const MAX_BYTES = 25_000_000;
/** Two photos "look alike" when their 64-bit difference hashes differ in at most this many bits. */
export const LOOKALIKE_MAX_DISTANCE = 5;
/** The hash is read from a grid this wide and tall. */
export const GRID_W = 9;
export const GRID_H = 8;

const HEX64 = /^[0-9a-fA-F]{64}$/;
const HEX16 = /^[0-9a-fA-F]{16}$/;

/** SHA-256 of the bytes as 64 lowercase hex letters. Uses Web Crypto, or node:crypto where that is missing. */
export async function sha256Hex(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (subtle && typeof subtle.digest === "function") {
    const buf = await subtle.digest("SHA-256", data);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(data).digest("hex");
}

/** Grayscale 0 to 255 from RGBA pixels. Transparent parts are laid on white. Rounds half up at the end of each pixel. */
export function grayFromRgba(rgba) {
  const out = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const a = rgba[i + 3];
    const mix = (c) => (c * a + 255 * (255 - a)) / 255;
    const luma = (299 * mix(rgba[i]) + 587 * mix(rgba[i + 1]) + 114 * mix(rgba[i + 2])) / 1000;
    out.push(Math.max(0, Math.min(255, Math.floor(luma + 0.5))));
  }
  return out;
}

/**
 * The 64-bit difference hash from a 9 wide, 8 tall grid of gray values (72 numbers, row by row).
 * Each bit says whether a pixel is brighter than the one to its right. First bit is the top left.
 * Returns 16 lowercase hex letters, or null when the grid is not 72 numbers from 0 to 255.
 */
export function dHashFromGray(gray) {
  if (!Array.isArray(gray) && !ArrayBuffer.isView(gray)) return null;
  if (gray.length !== GRID_W * GRID_H) return null;
  for (let i = 0; i < gray.length; i++) {
    const v = gray[i];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 255) return null;
  }
  let hex = "";
  let nibble = 0;
  let n = 0;
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W - 1; x++) {
      nibble = nibble * 2 + (gray[y * GRID_W + x] > gray[y * GRID_W + x + 1] ? 1 : 0);
      n++;
      if (n % 4 === 0) {
        hex += nibble.toString(16);
        nibble = 0;
      }
    }
  }
  return hex;
}

/** How many of the 64 bits differ between two 16-letter hashes. Returns null if either is not a hash. */
export function hamming(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !HEX16.test(a) || !HEX16.test(b)) return null;
  let d = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** Plain size text with decimal units, one decimal place, rounded half up. */
export function formatBytes(n) {
  if (!Number.isFinite(n) || n < 0) return "0 bytes";
  if (n < 1000) return `${Math.floor(n)} ${Math.floor(n) === 1 ? "byte" : "bytes"}`;
  const units = [[1000, "KB"], [1_000_000, "MB"], [1_000_000_000, "GB"]];
  for (let u = 0; u < units.length; u++) {
    const tenths = Math.floor((n * 10) / units[u][0] + 0.5);
    if (tenths < 10000 || u === units.length - 1) return `${Math.floor(tenths / 10)}.${tenths % 10} ${units[u][1]}`;
  }
  return "0 bytes";
}

const problem = (field, message, kind = "bad") => ({ field, kind, message });

/**
 * Sort so the first member is the one to keep: biggest file first, then name (plain letter order), then id.
 * @param {PhotoInfo[]} list
 */
function byKeepOrder(list) {
  return [...list].sort((a, b) => b.size - a.size || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * Decide which picked files can be looked at.
 * @param {{name: string, size: number}[]} files in the order the person picked them
 * @param {number} alreadyHave photos already on the list
 * @returns {{accepted: number[], skipped: {index: number, name: string, reason: "empty"|"too-big"|"over-cap", message: string}[]}} indexes into files
 */
export function screenFiles(files, alreadyHave = 0) {
  const accepted = [];
  const skipped = [];
  if (!Array.isArray(files)) return { accepted, skipped };
  let have = Number.isFinite(alreadyHave) && alreadyHave > 0 ? Math.floor(alreadyHave) : 0;
  files.forEach((f, index) => {
    const name = f && typeof f.name === "string" && f.name.trim() ? f.name : "A file with no name";
    const size = f && typeof f.size === "number" && Number.isFinite(f.size) ? f.size : -1;
    if (size <= 0) {
      skipped.push({ index, name, reason: "empty", message: `${name} is empty, so it was skipped.` });
    } else if (size > MAX_BYTES) {
      skipped.push({ index, name, reason: "too-big", message: `${name} is ${formatBytes(size)}. That is over ${formatBytes(MAX_BYTES)}, so it was skipped.` });
    } else if (have >= MAX_PHOTOS) {
      skipped.push({ index, name, reason: "over-cap", message: `${name} was left out. Up to ${MAX_PHOTOS} photos are checked at a time.` });
    } else {
      accepted.push(index);
      have++;
    }
  });
  return { accepted, skipped };
}

/**
 * Group photos. Exact groups share the same bytes (same SHA-256). "Look alike" groups
 * hold photos whose difference hashes are within the distance limit, joined step by step,
 * so a group can hold photos that are not all close to each other. Those need a person to check.
 * Photos with no bytes (size 0) are left out.
 * @param {PhotoInfo[]} items
 * @returns {{ok: true, groups: Group[], ignored: {id: string, reason: string}[], counts: {photos: number, exactGroups: number, lookAlikeGroups: number, extras: number}} | {ok: false, problems: Problem[]}}
 */
export function findDuplicates(items) {
  if (!Array.isArray(items)) return { ok: false, problems: [problem("items", "Pick some photos first.")] };
  if (items.length > MAX_PHOTOS) {
    return { ok: false, problems: [problem("items", `That is more than ${MAX_PHOTOS} photos. Use fewer photos in one run.`, "too-many")] };
  }
  const problems = [];
  const seen = new Set();
  /** @type {PhotoInfo[]} */
  const good = [];
  const ignored = [];
  items.forEach((it, i) => {
    const field = `items.${i}`;
    if (!it || typeof it !== "object") return void problems.push(problem(field, `Photo ${i + 1} could not be read.`));
    if (typeof it.id !== "string" || !it.id) return void problems.push(problem(field, `Photo ${i + 1} has no id.`));
    if (seen.has(it.id)) return void problems.push(problem(field, `Photo ${i + 1} is listed twice.`));
    seen.add(it.id);
    if (typeof it.name !== "string" || !it.name.trim()) return void problems.push(problem(field, `Photo ${i + 1} has no name.`));
    if (typeof it.size !== "number" || !Number.isSafeInteger(it.size) || it.size < 0) return void problems.push(problem(field, `${it.name} has a size that does not make sense.`));
    if (typeof it.sha256 !== "string" || !HEX64.test(it.sha256)) return void problems.push(problem(field, `${it.name} could not be checked.`));
    if (it.dhash != null && (typeof it.dhash !== "string" || !HEX16.test(it.dhash))) return void problems.push(problem(field, `${it.name} has a look-alike code that does not make sense.`));
    if (it.size === 0) return void ignored.push({ id: it.id, reason: "empty" });
    good.push({ id: it.id, name: it.name, size: it.size, sha256: it.sha256.toLowerCase(), dhash: it.dhash ? it.dhash.toLowerCase() : null });
  });
  if (problems.length) return { ok: false, problems };

  // Union-find over photos. First join identical bytes, then join near hashes.
  const parent = good.map((_, i) => i);
  const find = (i) => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const join = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[Math.max(ra, rb)] = Math.min(ra, rb);
  };
  const firstBySha = new Map();
  good.forEach((p, i) => {
    if (firstBySha.has(p.sha256)) join(i, firstBySha.get(p.sha256));
    else firstBySha.set(p.sha256, i);
  });
  for (let i = 0; i < good.length; i++) {
    if (!good[i].dhash) continue;
    for (let j = i + 1; j < good.length; j++) {
      if (!good[j].dhash) continue;
      const d = hamming(good[i].dhash, good[j].dhash);
      if (d !== null && d <= LOOKALIKE_MAX_DISTANCE) join(i, j);
    }
  }
  const comps = new Map();
  good.forEach((p, i) => {
    const r = find(i);
    if (!comps.has(r)) comps.set(r, []);
    comps.get(r).push(p);
  });
  /** @type {Group[]} */
  const groups = [];
  let extras = 0;
  for (const members of comps.values()) {
    if (members.length < 2) continue;
    const sorted = byKeepOrder(members);
    const exact = members.every((m) => m.sha256 === members[0].sha256);
    groups.push({ id: `g-${members[0].id}`, kind: exact ? "exact" : "lookalike", members: sorted.map((m) => m.id), keepId: sorted[0].id });
    extras += members.length - 1;
  }
  return {
    ok: true,
    groups,
    ignored,
    counts: {
      photos: good.length,
      exactGroups: groups.filter((g) => g.kind === "exact").length,
      lookAlikeGroups: groups.filter((g) => g.kind === "lookalike").length,
      extras,
    },
  };
}

/**
 * The list of files marked to remove. Nothing is removed by this. A group in `putBack` marks nothing.
 * @param {Group[]} groups
 * @param {PhotoInfo[]} photos
 * @param {{keep?: Record<string, string>, putBack?: string[]}} [choices] keep maps a group id to the photo id to keep
 */
export function planList(groups, photos, choices = {}) {
  const byId = new Map((Array.isArray(photos) ? photos : []).map((p) => [p.id, p]));
  const keep = choices && typeof choices.keep === "object" && choices.keep ? choices.keep : {};
  const back = new Set(Array.isArray(choices?.putBack) ? choices.putBack : []);
  const rows = [];
  for (const g of Array.isArray(groups) ? groups : []) {
    if (back.has(g.id)) continue;
    const chosen = typeof keep[g.id] === "string" && g.members.includes(keep[g.id]) ? keep[g.id] : g.keepId;
    for (const id of g.members) {
      const p = byId.get(id);
      if (id === chosen || !p) continue;
      rows.push({ id, name: p.name, size: p.size, groupId: g.id, kind: g.kind, keptId: chosen, keptName: byId.get(chosen)?.name ?? "" });
    }
  }
  const totalBytes = rows.reduce((s, r) => s + r.size, 0);
  return { rows, count: rows.length, totalBytes };
}

/** The plain text file the person saves. File names only, never contents. */
export function listText(plan) {
  const lines = [
    "Photo Duplicate Finder: my list of extras",
    "",
    "Nothing was deleted. Your photos are untouched.",
    "Use this list to remove them yourself, from your Photos app or Files app.",
    "",
    `Files on this list: ${plan.count}`,
    `Room they take: ${formatBytes(plan.totalBytes)}`,
    "",
    ...plan.rows.map((r) => `${r.name} (${formatBytes(r.size)}) - ${r.kind === "exact" ? "exact copy of" : "looks like, check yourself:"} ${r.keptName || "the one you keep"}`),
    "",
  ];
  return lines.join("\n");
}
