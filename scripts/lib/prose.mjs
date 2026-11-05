// Markdown to prose helpers shared by the jargon, reading-level and clutter checks.

// Returns blocks of prose: { line, text, kind }. Headings, code, tables, rules,
// HTML comments and link targets are dropped. A list item is its own block.
export function proseBlocks(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let inFence = false;
  let inComment = false;
  let para = null;
  const flush = () => {
    if (para && para.text.trim()) blocks.push(para);
    para = null;
  };
  lines.forEach((raw, idx) => {
    let line = raw;
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      flush();
      return;
    }
    if (inFence) return;
    if (inComment) {
      if (line.includes("-->")) {
        inComment = false;
        line = line.slice(line.indexOf("-->") + 3);
      } else {
        return;
      }
    }
    line = line.replace(/<!--.*?-->/g, "");
    if (line.includes("<!--")) {
      inComment = true;
      line = line.slice(0, line.indexOf("<!--"));
    }
    if (/^\s*$/.test(line)) return flush();
    if (/^\s{0,3}#{1,6}\s/.test(line)) return flush();
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return flush();
    if (/^\s*\|/.test(line)) return flush();
    if (/^---\s*$/.test(line)) return flush();
    let kind = "para";
    const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      line = item[1];
      kind = "item";
    }
    line = line.replace(/^\s*>\s?/, "");
    line = inline(line);
    if (!line.trim()) return;
    if (kind === "item") {
      blocks.push({ line: idx + 1, text: line.trim(), kind });
      return;
    }
    if (!para) para = { line: idx + 1, text: "", kind };
    para.text += (para.text ? " " : "") + line.trim();
  });
  flush();
  return blocks;
}

function inline(s) {
  return s
    .replace(/`[^`]*`/g, " ")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/<https?:[^>]*>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    .replace(/\s+/g, " ");
}

export function sentencesOf(block) {
  const text = block.text.trim();
  if (!text) return [];
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/).map((s) => s.trim()).filter(Boolean);
  return parts;
}

export function wordsOf(text) {
  return text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? [];
}

export function countSyllables(word) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 1;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

export function allSentences(src) {
  return proseBlocks(src).flatMap((b) => sentencesOf(b).map((s) => ({ line: b.line, text: s })));
}
