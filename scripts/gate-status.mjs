// One line per tool: is the model-review and skill-eval evidence clean? Prints to the screen, or to --out <file>.
// Reads the tool list (all statuses), so a demoted tool still shows with its last result.
import fs from "node:fs";
import path from "node:path";
import { checkTool } from "./check-evidence.mjs";
import { isMain, resolveRoot } from "./lib/common.mjs";

const read = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};

export function lines(root) {
  const tools = read(path.join(root, "site", "public", "tools.json")).tools;
  const out = [];
  for (const t of tools) {
    const mr = read(path.join(root, "tests", "model-review", `${t.id}.json`));
    const ev = ["tiny", "haiku", "sonnet"].map((m) => read(path.join(root, "tests", "skill-evals", "results", t.id, `${m}.json`)));
    if (!mr && ev.every((e) => !e)) continue;
    const problems = checkTool(root, t);
    const screens = mr ? [{ screen: "main", firstTimeUser: mr.firstTimeUser, designRubric: mr.designRubric }, ...(mr.otherScreens || [])] : [];
    const review = screens.map((s) => `${s.screen}: reader ${s.firstTimeUser?.score ?? "-"}/5, rubric ${(s.designRubric || []).map((r) => `${r.model} ${r.passes}/8`).join(" ")}`).join("; ");
    const skill = ["tiny", "haiku", "sonnet"].map((m, i) => `${m} ${ev[i] ? (ev[i].verdict.ok ? "ok" : "BELOW BAR") : "none"}`).join(", ");
    out.push(`${t.id} [${t.status}] ${problems.length ? "NOT CLEAN" : "CLEAN"} | review ${review || "none"} | skill-evals ${skill}`);
  }
  return out;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const text = `${lines(resolveRoot(argv)).join("\n")}\n`;
  const i = argv.indexOf("--out");
  if (i !== -1 && argv[i + 1]) fs.writeFileSync(argv[i + 1], text);
  process.stdout.write(text);
}
