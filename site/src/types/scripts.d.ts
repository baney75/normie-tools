// Types for the repo's plain .mjs scripts, imported by tests.
declare module "*/check-banned-jargon.mjs" {
  export function loadTerms(root: string): string[];
  export function buildMatchers(terms: string[]): { term: string; re: RegExp }[];
}
declare module "*/check-reading-level.mjs" {
  export function gradeOf(src: string): { grade: number; words: number; sentences: number } | null;
}
declare module "*.mjs";
