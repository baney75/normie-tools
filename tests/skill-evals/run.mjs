// Skill eval harness stub. Validates case files and lists them. Does not call a model yet.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");

export function loadCases(dir = path.join(here, "cases")) {
  const problems = [];
  const cases = [];
  for (const n of fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    let c;
    try {
      c = JSON.parse(fs.readFileSync(path.join(dir, n), "utf8"));
    } catch {
      problems.push(`${n}: not valid JSON`);
      continue;
    }
    if (!c.skill || !fs.existsSync(path.join(root, "skills", c.skill, "SKILL.md"))) problems.push(`${n}: skill "${c.skill}" not found in skills/`);
    if (!c.task) problems.push(`${n}: no task`);
    if (!Array.isArray(c.expect) || c.expect.length === 0) problems.push(`${n}: expect needs at least one line`);
    for (const f of c.files || []) {
      if (!fs.existsSync(path.join(root, "skills", c.skill || "", f))) problems.push(`${n}: file ${f} not found`);
    }
    cases.push({ file: n, ...c });
  }
  return { cases, problems };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { cases, problems } = loadCases();
  for (const c of cases) console.log(`${c.skill}: ${c.expect.length} expectation(s) - ${c.task}`);
  for (const p of problems) console.error(`FAIL ${p}`);
  console.log("stub: no model was called");
  process.exit(problems.length ? 1 : 0);
}
