// Banned jargon in person-facing copy.
// Terms come from the left column of the table in docs/glossary.md.
// Cells with commas or " / " give several terms; text in parentheses is dropped.
//
// Scope (person-facing only): docs/person-facing/**/*.md and tools/*/README.person.md.
// Not scanned: AGENTS.md, CONTRIBUTING.md, plan/, research/, brand/, and the
// builder-note README.md files in site/, app/, cli/, router/, skills/, tests/, tools/.
// docs/glossary.md and plan/v5-work/rewrite-plan.md define the terms, so they are never scanned.
//
// Exempt terms: the glossary says to keep these as plain or official names:
// preview, MB, GB, AGI, VITA, TCE, Free File, revision date, code execution.
// A line may carry the marker "nt-allow-jargon" in an HTML comment for an
// exact app button or menu name (rewrite rule 4).
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, personFacingFiles, rel, finish } from "./lib/common.mjs";

const EXEMPT = new Set([
  "preview", "mb", "gb", "agi", "vita", "tce", "free file", "revision date", "code execution",
  "grade 6 reading level",
]);
const NEVER_SCAN = new Set(["docs/glossary.md", "plan/v5-work/rewrite-plan.md"]);
const ALLOW_MARK = "nt-allow-jargon";

export function loadTerms(root) {
  const file = path.join(root, "docs", "glossary.md");
  if (!fs.existsSync(file)) return [];
  const terms = new Set();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.startsWith("|")) continue;
    const cell = line.split("|")[1]?.trim();
    if (!cell || cell === "Term" || /^-+$/.test(cell)) continue;
    const bare = cell.replace(/\([^)]*\)/g, " ");
    for (const part of bare.split(/,|\s\/\s/)) {
      const t = part.trim().replace(/^the\s+/i, "");
      if (t && !EXEMPT.has(t.toLowerCase())) terms.add(t);
    }
  }
  return [...terms];
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildMatchers(terms) {
  return terms.map((t) => {
    const plural = /[A-Za-z]$/.test(t) ? "(?:s|es)?" : "";
    return { term: t, re: new RegExp(`(?<![\\w.-])${escapeRe(t)}${plural}(?![\\w-])`, "i") };
  });
}

// Remove code, link targets and comments but keep line numbers.
function visibleLines(src) {
  let fence = false;
  return src.replace(/\r\n/g, "\n").split("\n").map((raw) => {
    if (/^\s*(```|~~~)/.test(raw)) {
      fence = !fence;
      return "";
    }
    if (fence || raw.includes(ALLOW_MARK)) return "";
    return raw
      .replace(/<!--.*?-->/g, " ")
      .replace(/`[^`]*`/g, " ")
      .replace(/\]\([^)]*\)/g, "]")
      .replace(/https?:\/\/\S+/g, " ");
  });
}

export function run(root) {
  const failures = [];
  const terms = loadTerms(root);
  const matchers = buildMatchers(terms);
  run.count = 0;
  for (const file of personFacingFiles(root)) {
    const r = rel(root, file);
    if (NEVER_SCAN.has(r)) continue;
    run.count++;
    visibleLines(fs.readFileSync(file, "utf8")).forEach((line, i) => {
      for (const { term, re } of matchers) {
        if (re.test(line)) failures.push(`${r}:${i + 1}: banned term "${term}" (see docs/glossary.md for the plain swap)`);
      }
    });
  }
  return failures;
}

if (isMain(import.meta.url)) {
  const root = resolveRoot();
  const failures = run(root);
  console.log(`jargon: ${loadTerms(root).length} glossary terms, ${run.count} person-facing file(s) scanned`);
  process.exit(finish("banned-jargon", failures, "no banned terms in person-facing copy"));
}
