// Shared helpers for the NT check scripts. Plain Node, no dependencies.
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);

// Binary or generated files that text checks skip.
const BINARY_EXT = new Set([
  ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".svg",
  ".woff", ".woff2", ".ttf", ".otf", ".zip", ".gz", ".tgz", ".wasm",
  ".lock", ".mp3", ".mp4", ".m4a", ".wav", ".webm",
]);

// Repo root: --root <dir> (used by the regression tests), else the parent of scripts/.
export function resolveRoot(argv = process.argv.slice(2)) {
  const i = argv.indexOf("--root");
  if (i !== -1 && argv[i + 1]) return path.resolve(argv[i + 1]);
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
}

export function walk(root, { skipDirs = SKIP_DIRS } = {}) {
  const out = [];
  const visit = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name)) visit(full);
      } else if (e.isFile()) {
        out.push(full);
      }
    }
  };
  visit(root);
  return out;
}

export function rel(root, file) {
  return path.relative(root, file).split(path.sep).join("/");
}

export function isBinaryByName(file) {
  return BINARY_EXT.has(path.extname(file).toLowerCase());
}

// Text files only: skip by extension, then by a NUL byte in the first 8 KB.
export function readText(file) {
  if (isBinaryByName(file)) return null;
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return null;
  }
  if (buf.subarray(0, 8192).includes(0)) return null;
  return buf.toString("utf8");
}

export function textFiles(root) {
  return walk(root).filter((f) => readText(f) !== null);
}

export function markdownFiles(root) {
  return walk(root).filter((f) => f.toLowerCase().endsWith(".md"));
}

// Person-facing markdown: docs/person-facing/**/*.md and tools/*/README.person.md.
export function personFacingFiles(root) {
  const files = [];
  const pf = path.join(root, "docs", "person-facing");
  if (fs.existsSync(pf)) {
    files.push(...walk(pf).filter((f) => f.toLowerCase().endsWith(".md")));
  }
  const tools = path.join(root, "tools");
  if (fs.existsSync(tools)) {
    for (const e of fs.readdirSync(tools, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "node_modules") continue;
      const p = path.join(tools, e.name, "README.person.md");
      if (fs.existsSync(p)) files.push(p);
    }
  }
  return files;
}

// Exit helper: print findings, return the exit code.
export function finish(name, failures, okMessage) {
  if (failures.length === 0) {
    console.log(`PASS ${name}: ${okMessage}`);
    return 0;
  }
  for (const f of failures) console.error(`FAIL ${name}: ${f}`);
  console.error(`FAIL ${name}: ${failures.length} problem(s)`);
  return 1;
}

// True when the module is the entry point (import.meta.main needs a newer Node).
export function isMain(metaUrl) {
  return Boolean(process.argv[1]) && fileURLToPath(metaUrl) === path.resolve(process.argv[1]);
}
