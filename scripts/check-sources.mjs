// Every research/*.md topic file (not README.md or SOURCES-RULES.md) needs:
//   - at least one `URL:` line or markdown link to http(s), and
//   - a `Checked: YYYY-MM-DD` date (a real calendar date).
// A TODO-only file (no URL at all) is allowed if it says TODO and has no
// unsourced numeric claim lines. Lines that contain TODO, headings and
// `URL:`/`Checked:` metadata lines do not count as claims.
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, rel, finish } from "./lib/common.mjs";

const EXEMPT = new Set(["README.md", "SOURCES-RULES.md"]);
const URL_LINE = /\bURL:\s*<?https?:\/\/\S+/;
const MD_LINK = /\]\(https?:\/\/[^)\s]+\)/;
const CHECKED = /\bChecked:\s*(\d{4})-(\d{2})-(\d{2})\b/g;

function validDate(y, m, d) {
  const dt = new Date(Date.UTC(+y, +m - 1, +d));
  return dt.getUTCFullYear() === +y && dt.getUTCMonth() === +m - 1 && dt.getUTCDate() === +d;
}

export function run(root) {
  const failures = [];
  const dir = path.join(root, "research");
  if (!fs.existsSync(dir)) return failures;
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith(".md") || EXEMPT.has(name)) continue;
    const file = path.join(dir, name);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    const hasUrl = lines.some((l) => URL_LINE.test(l) || MD_LINK.test(l));
    const dates = [...text.matchAll(CHECKED)];
    const hasTodo = /\bTODO\b/.test(text);
    const where = rel(root, file);

    if (dates.some((d) => !validDate(d[1], d[2], d[3]))) {
      failures.push(`${where}: Checked date is not a real calendar date`);
    }
    if (hasUrl && dates.length > 0) continue;
    if (!hasUrl && hasTodo) {
      lines.forEach((l, i) => {
        if (!l.trim() || /^\s*#/.test(l) || /\bTODO\b/.test(l)) return;
        if (/^\s*[-*]?\s*(URL|Checked):/.test(l)) return;
        if (/\d/.test(l)) failures.push(`${where}:${i + 1}: numeric claim without a source in a TODO-only file`);
      });
      continue;
    }
    if (!hasUrl) failures.push(`${where}: no "URL:" line or markdown link to a source`);
    if (dates.length === 0) failures.push(`${where}: no "Checked: YYYY-MM-DD" date`);
  }
  return failures;
}

if (isMain(import.meta.url)) {
  process.exit(finish("sources", run(resolveRoot()), "research files are sourced and dated"));
}
