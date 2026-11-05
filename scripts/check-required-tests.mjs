// Rule: any immediate subfolder of tools/ that has code files must have a test file.
// Code: js mjs cjs ts tsx jsx py rs go sh. Test file: *.test.*, *.spec.*, test_*.py,
// *_test.*, or a code file inside a tests/, test/ or __tests__/ folder.
// tools/ with only README files passes.
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, walk, rel, finish } from "./lib/common.mjs";

const CODE = new Set([".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx", ".py", ".rs", ".go", ".sh"]);

function isTest(file) {
  const base = path.basename(file);
  if (/\.(test|spec)\.[^.]+$/.test(base)) return true;
  if (/^test_.+\.py$/.test(base) || /_test\.[^.]+$/.test(base)) return true;
  return /(^|\/)(tests?|__tests__)\//.test(file.split(path.sep).join("/"));
}

export function run(root) {
  const failures = [];
  const tools = path.join(root, "tools");
  if (!fs.existsSync(tools)) return failures;
  for (const e of fs.readdirSync(tools, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    const dir = path.join(tools, e.name);
    const code = walk(dir).filter((f) => CODE.has(path.extname(f).toLowerCase()));
    if (code.length === 0) continue;
    if (!code.some((f) => isTest(rel(dir, f)))) {
      failures.push(`${rel(root, dir)}: has ${code.length} code file(s) but no test file`);
    }
  }
  return failures;
}

if (isMain(import.meta.url)) {
  process.exit(finish("required-tests", run(resolveRoot()), "every tool with code has a test"));
}
