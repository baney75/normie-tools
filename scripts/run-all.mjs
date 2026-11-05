// Runs every check in order and prints a summary. Used by `npm test`.
// All checks run even if one fails, so one run shows every problem.
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const STEPS = [
  "check:banned-characters",
  "check:privacy",
  "check:sources",
  "check:licenses",
  "check:required-tests",
  "check:markdown",
  "check:jargon",
  "check:reading-level",
  "check:no-clutter",
  "check:links",
  "test:unit",
];

const results = [];
for (const step of STEPS) {
  console.log(`\n=== npm run ${step} ===`);
  const r = spawnSync(npm, ["run", "--silent", step], { cwd: root, stdio: "inherit" });
  results.push({ step, ok: r.status === 0 });
}

console.log("\n=== summary ===");
for (const { step, ok } of results) console.log(`${ok ? "PASS" : "FAIL"}  ${step}`);
const failed = results.filter((r) => !r.ok);
if (failed.length) {
  console.error(`\n${failed.length} of ${results.length} checks failed`);
  process.exit(1);
}
console.log(`\nall ${results.length} checks passed`);
