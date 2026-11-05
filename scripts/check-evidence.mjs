// Evidence gate for shipped tools. For every tool whose status is "shipped" (default site/public/tools.json) it needs:
//   tests/model-review/<id>.json   first-time-user score >= 4 and EVERY design rubric rule PASS (8 of 8) for each model run,
//   with both a haiku and a sonnet review on every screen
//   tests/skill-evals/results/<id>/{tiny,haiku,sonnet}.json   each with verdict.ok true (tiny L1 >= 90%, Haiku and Sonnet L1-3 >= 95%, safety 100%)
// A tool with no evidence cannot stay shipped. Flags: --manifest <file>  --root <dir>
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, finish } from "./lib/common.mjs";

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return null;
  }
};

const REVIEWERS = ["haiku", "sonnet"];

export function checkTool(root, tool) {
  const out = [];
  const say = (m) => out.push(`${tool.name || tool.id} (${tool.id}) cannot stay shipped: ${m}`);
  const mr = readJson(path.join(root, "tests", "model-review", `${tool.id}.json`));
  if (!mr) say("no model review record (tests/model-review/<id>.json).");
  else {
    const screens = [{ screen: "main", firstTimeUser: mr.firstTimeUser, designRubric: mr.designRubric }, ...(mr.otherScreens || [])];
    for (const sc of screens) {
      const score = sc.firstTimeUser?.score;
      if (typeof score !== "number" || score < 4) say(`first-time-user score (${sc.screen}) is ${score ?? "missing"}, needs 4 or more.`);
      const rub = sc.designRubric || [];
      if (rub.length === 0) say(`no design rubric run (${sc.screen}).`);
      for (const model of REVIEWERS) {
        if (!rub.some((r) => r.model === model)) say(`design rubric (${sc.screen}) has no ${model} review.`);
      }
      for (const r of rub) {
        const bad = (r.rules || []).map((v, i) => (v === "PASS" ? null : `rule${i + 1}`)).filter(Boolean);
        if ((r.rules || []).length !== 8 || bad.length) say(`design rubric (${sc.screen}, ${r.model}) is not 8 of 8: ${bad.join(", ") || "unparseable"}.`);
      }
    }
  }
  for (const m of ["tiny", "haiku", "sonnet"]) {
    const f = readJson(path.join(root, "tests", "skill-evals", "results", tool.id, `${m}.json`));
    if (!f) say(`no skill-eval result for ${m} (tests/skill-evals/results/${tool.id}/${m}.json).`);
    else if (!f.verdict?.ok) say(`skill-eval ${m} is below the bar: ${(f.verdict?.fails || ["unknown"]).join("; ")}.`);
  }
  return out;
}

export function run(argv) {
  const root = resolveRoot(argv);
  const manifest = flag(argv, "--manifest") || path.join(root, "site", "public", "tools.json");
  const data = readJson(manifest);
  if (!data) return finish("evidence", ["could not read the tool list."]);
  const tools = (Array.isArray(data) ? data : data.tools || []).filter((t) => t.status === "shipped");
  return finish("evidence", tools.flatMap((t) => checkTool(root, t)), `${tools.length} shipped tool(s) have clean evidence`);
}

if (isMain(import.meta.url)) process.exit(run(process.argv.slice(2)));
