// Model review harness. Runs a pinned prompt against one screen text with the claude CLI.
// Never part of `npm test`. Run it on purpose:
//   node tests/model-review/run.mjs <first-time-user|design-rubric> <screen-text-file> [--model <name>]
// `node tests/model-review/run.mjs --pin` rewrites the hash file after an intended prompt change.
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const promptsDir = path.join(here, "prompts");
const hashFile = path.join(here, "prompts.sha256.json");

export function hashPrompts() {
  const out = {};
  for (const n of fs.readdirSync(promptsDir).filter((f) => f.endsWith(".md")).sort()) {
    out[n] = crypto.createHash("sha256").update(fs.readFileSync(path.join(promptsDir, n))).digest("hex");
  }
  return out;
}

export function modelOf(name) {
  const m = fs.readFileSync(path.join(promptsDir, `${name}.md`), "utf8").match(/^Model:\s*(\S+)/m);
  return m ? m[1] : "sonnet";
}

function main(argv) {
  if (argv.includes("--pin")) {
    fs.writeFileSync(hashFile, `${JSON.stringify(hashPrompts(), null, 2)}\n`);
    console.log("pinned", Object.keys(hashPrompts()).join(", "));
    return 0;
  }
  const [name, screen] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--model");
  if (!name || !screen) {
    console.error("usage: node tests/model-review/run.mjs <first-time-user|design-rubric> <screen-text-file> [--model <name>]");
    return 2;
  }
  const pinned = JSON.parse(fs.readFileSync(hashFile, "utf8"));
  if (hashPrompts()[`${name}.md`] !== pinned[`${name}.md`]) {
    console.error(`prompt ${name}.md does not match its pinned hash. Re-pin with --pin after review.`);
    return 1;
  }
  const mi = argv.indexOf("--model");
  const model = mi !== -1 ? argv[mi + 1] : modelOf(name);
  const prompt = fs.readFileSync(path.join(promptsDir, `${name}.md`), "utf8");
  const input = `${prompt}\n\n--- SCREEN ---\n${fs.readFileSync(screen, "utf8")}\n`;
  const r = spawnSync("claude", ["-p", "--model", model], { input, encoding: "utf8" });
  if (r.error) {
    console.error(`could not run the claude CLI: ${r.error.message}`);
    return 1;
  }
  process.stdout.write(r.stdout);
  return r.status ?? 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  process.exit(main(process.argv.slice(2)));
}
