// No-clutter limits for person-facing markdown (see AGENTS.md house rule 2):
//   - average sentence length per file: at most 20 words
//   - any one sentence: at most 30 words
//   - any one paragraph: at most 150 words (a list item counts as its own paragraph)
// Markdown is stripped first. Empty or headings-only files pass.
// Scope: docs/person-facing/**/*.md and tools/*/README.person.md.
import fs from "node:fs";
import { isMain, resolveRoot, personFacingFiles, rel, finish } from "./lib/common.mjs";
import { proseBlocks, sentencesOf, wordsOf } from "./lib/prose.mjs";

export const MAX_AVG_SENTENCE = 20;
export const MAX_SENTENCE = 30;
export const MAX_PARAGRAPH = 150;

export function run(root) {
  const failures = [];
  run.count = 0;
  for (const file of personFacingFiles(root)) {
    run.count++;
    const r = rel(root, file);
    let total = 0;
    let n = 0;
    for (const block of proseBlocks(fs.readFileSync(file, "utf8"))) {
      const pw = wordsOf(block.text).length;
      if (pw > MAX_PARAGRAPH) failures.push(`${r}:${block.line}: paragraph has ${pw} words, limit is ${MAX_PARAGRAPH}`);
      for (const s of sentencesOf(block)) {
        const w = wordsOf(s).length;
        total += w;
        n++;
        if (w > MAX_SENTENCE) failures.push(`${r}:${block.line}: sentence has ${w} words, limit is ${MAX_SENTENCE}`);
      }
    }
    if (n > 0 && total / n > MAX_AVG_SENTENCE) {
      failures.push(`${r}: average sentence is ${(total / n).toFixed(1)} words, limit is ${MAX_AVG_SENTENCE}`);
    }
  }
  return failures;
}

if (isMain(import.meta.url)) {
  const failures = run(resolveRoot());
  console.log(`no-clutter: ${run.count} person-facing file(s) scanned`);
  process.exit(finish("no-clutter", failures, "person-facing copy is within the limits"));
}
