// Offline link check for markdown files. Checks relative file links and
// #anchors against real files and headings. External links (http, https,
// mailto, tel) are counted and skipped; they never fail the suite.
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, markdownFiles, rel, finish } from "./lib/common.mjs";

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`|\*|_|~/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

function anchorsOf(text) {
  const out = new Set();
  const counts = new Map();
  let fence = false;
  for (const line of text.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    if (fence) continue;
    const m = line.match(/^\s{0,3}#{1,6}\s+(.*?)\s*#*\s*$/);
    if (!m) continue;
    const base = slug(m[1]);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    out.add(n === 0 ? base : `${base}-${n}`);
  }
  for (const m of text.matchAll(/<a\s+(?:name|id)="([^"]+)"/g)) out.add(m[1]);
  return out;
}

function linksOf(text) {
  const links = [];
  let fence = false;
  text.split("\n").forEach((raw, i) => {
    if (/^\s*(```|~~~)/.test(raw)) fence = !fence;
    if (fence) return;
    const line = raw.replace(/`[^`]*`/g, "");
    for (const m of line.matchAll(/!?\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
      links.push({ line: i + 1, target: m[1] });
    }
    const ref = line.match(/^\s{0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/);
    if (ref) links.push({ line: i + 1, target: ref[1] });
  });
  return links;
}

export function run(root) {
  const failures = [];
  const stats = { checked: 0, external: 0 };
  const cache = new Map();
  const anchors = (file) => {
    if (!cache.has(file)) cache.set(file, anchorsOf(fs.readFileSync(file, "utf8")));
    return cache.get(file);
  };
  for (const file of markdownFiles(root)) {
    const text = fs.readFileSync(file, "utf8");
    for (const { line, target } of linksOf(text)) {
      const where = `${rel(root, file)}:${line}`;
      if (EXTERNAL.test(target)) {
        stats.external++;
        continue;
      }
      stats.checked++;
      const [pathPart, fragment] = target.split("#");
      const clean = decodeURI(pathPart.split("?")[0]);
      const dest = clean === ""
        ? file
        : clean.startsWith("/")
          ? path.join(root, clean)
          : path.resolve(path.dirname(file), clean);
      if (!fs.existsSync(dest)) {
        failures.push(`${where}: missing file "${target}"`);
        continue;
      }
      if (fragment && dest.toLowerCase().endsWith(".md") && fs.statSync(dest).isFile()) {
        if (!anchors(dest).has(decodeURIComponent(fragment).toLowerCase())) {
          failures.push(`${where}: no heading for anchor "#${fragment}" in ${rel(root, dest)}`);
        }
      }
    }
  }
  run.stats = stats;
  return failures;
}

if (isMain(import.meta.url)) {
  const failures = run(resolveRoot());
  console.log(`links: ${run.stats.checked} internal checked, ${run.stats.external} external skipped (offline)`);
  process.exit(finish("links", failures, "all internal links resolve"));
}
