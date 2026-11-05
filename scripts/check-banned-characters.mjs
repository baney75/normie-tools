// Fails if any text file contains U+2013 (en dash) or U+2014 (em dash).
// Binary, pdf, png, svg and lock files are skipped. This file names the
// characters only by escape so it never trips itself.
import { isMain, resolveRoot, textFiles, readText, rel, finish } from "./lib/common.mjs";

const BANNED = /[\u2013\u2014]/g;
const NAMES = { "\u2013": "U+2013", "\u2014": "U+2014" };

export function run(root) {
  const failures = [];
  for (const file of textFiles(root)) {
    const lines = readText(file).split("\n");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(BANNED)) {
        failures.push(`${rel(root, file)}:${i + 1}:${m.index + 1} contains ${NAMES[m[0]]}`);
      }
    });
  }
  return failures;
}

if (isMain(import.meta.url)) {
  process.exit(finish("banned-characters", run(resolveRoot()), "no U+2013 or U+2014 found"));
}
