// Reading level of person-facing markdown.
// Target: about grade 6. Limit: Flesch-Kincaid grade 7.0 per file (fails above it).
//   grade = 0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
// Markdown is stripped first (headings, code, tables, comments, link targets).
// A file with no prose (empty or headings only) passes.
// Scope: docs/person-facing/**/*.md and tools/*/README.person.md.
import fs from "node:fs";
import { isMain, resolveRoot, personFacingFiles, rel, finish } from "./lib/common.mjs";
import { allSentences, wordsOf, countSyllables } from "./lib/prose.mjs";

export const LIMIT = 7.0;

export function gradeOf(src) {
  const sentences = allSentences(src);
  if (sentences.length === 0) return null;
  let words = 0;
  let syllables = 0;
  for (const s of sentences) {
    for (const w of wordsOf(s.text)) {
      words++;
      syllables += countSyllables(w);
    }
  }
  if (words === 0) return null;
  const grade = 0.39 * (words / sentences.length) + 11.8 * (syllables / words) - 15.59;
  return { grade, words, sentences: sentences.length };
}

export function run(root) {
  const failures = [];
  run.count = 0;
  for (const file of personFacingFiles(root)) {
    run.count++;
    const g = gradeOf(fs.readFileSync(file, "utf8"));
    if (g && g.grade > LIMIT) {
      failures.push(
        `${rel(root, file)}: reading grade ${g.grade.toFixed(1)} is above the limit of ${LIMIT.toFixed(1)} (${g.words} words, ${g.sentences} sentences). Use shorter words and sentences.`,
      );
    }
  }
  return failures;
}

if (isMain(import.meta.url)) {
  const failures = run(resolveRoot());
  console.log(`reading-level: ${run.count} person-facing file(s) scanned, limit grade ${LIMIT.toFixed(1)}`);
  process.exit(finish("reading-level", failures, "person-facing copy is within the limit"));
}
