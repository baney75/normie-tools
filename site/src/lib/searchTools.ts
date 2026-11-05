import type { Tool } from "../data/tools";

const STOPWORDS = new Set([
  "the", "a", "an", "my", "to", "i", "want", "need", "help", "me", "please", "with", "of", "for",
  "and", "is", "into", "in", "on", "from", "it", "can", "you",
]);

function stem(word: string): string {
  let w = word;
  if (w.length > 3 && /(x|s|ch|sh|z)es$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  return w;
}

const same = (a: string, b: string) => a === b || a + "e" === b || b + "e" === a;

export function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function keywords(text: string): string[] {
  return words(text)
    .filter((w) => !STOPWORDS.has(w))
    .map(stem);
}

function hits(queryWord: string, field: string[]): number {
  return field.filter((f) => same(queryWord, f)).length;
}

export function searchTools(query: string, tools: Tool[]): Tool[] {
  const q = keywords(query);
  if (q.length === 0) return [];
  const scored = tools.map((tool, index) => {
    const name = keywords(tool.name);
    const group = keywords(tool.group ?? "");
    const idWords = tool.id.split("-").map(stem);
    let score = 0;
    for (const w of q) {
      score += 3 * hits(w, name) + 1 * hits(w, group) + 2 * hits(w, idWords);
    }
    return { tool, index, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((s) => s.tool);
}
