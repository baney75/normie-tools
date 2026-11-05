// Evidence gate for shipped tools. For every tool whose status is "shipped" (default site/public/tools.json) it needs:
//   tests/model-review/<id>.json   first-time-user score >= 4 and EVERY design rubric rule PASS (8 of 8) for each model run,
//   with both a haiku and a sonnet review on every screen
//   tests/skill-evals/results/<id>/{tiny,haiku,sonnet}.json   each with verdict.ok true (tiny L1 >= 90%, Haiku and Sonnet L1-3 >= 95%, safety 100%)
// An owner waiver in tests/model-review/waivers.json can excuse a named check for a named tool:
//   { "waivers": [{ "tool": "<id>", "checks": ["first-time-user", "rule8"], "by": "...", "date": "YYYY-MM-DD", "said": "...", "why": "..." }] }
// A waived problem is printed as WAIVED and does not fail. Nothing else is excused: other rules, other tools,
// missing records and skill evals still fail.
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

/** The checks the owner waived for one tool, as a Set like {"first-time-user", "rule8"}. */
export function waivedChecks(root, id) {
  const data = readJson(path.join(root, "tests", "model-review", "waivers.json"));
  const list = Array.isArray(data?.waivers) ? data.waivers : [];
  const ok = (w) => w && w.tool === id && Array.isArray(w.checks) && w.by && w.date && w.said;
  return new Set(list.filter(ok).flatMap((w) => w.checks));
}

/** Every problem for one tool, split into what fails and what the owner waived. */
export function checkToolDetailed(root, tool) {
  const out = [];
  const waived = [];
  const say = (m) => out.push(`${tool.name || tool.id} (${tool.id}) cannot stay shipped: ${m}`);
  const excuse = (m) => waived.push(`${tool.name || tool.id} (${tool.id}): ${m}`);
  const w = waivedChecks(root, tool.id);
  const mr = readJson(path.join(root, "tests", "model-review", `${tool.id}.json`));
  if (!mr) say("no model review record (tests/model-review/<id>.json).");
  else {
    const screens = [{ screen: "main", firstTimeUser: mr.firstTimeUser, designRubric: mr.designRubric }, ...(mr.otherScreens || [])];
    for (const sc of screens) {
      const score = sc.firstTimeUser?.score;
      if (typeof score !== "number") say(`first-time-user score (${sc.screen}) is missing, needs 4 or more.`);
      else if (score < 4) (w.has("first-time-user") ? excuse : say)(`first-time-user score (${sc.screen}) is ${score}, needs 4 or more.`);
      const rub = sc.designRubric || [];
      if (rub.length === 0) say(`no design rubric run (${sc.screen}).`);
      for (const model of REVIEWERS) {
        if (!rub.some((r) => r.model === model)) say(`design rubric (${sc.screen}) has no ${model} review.`);
      }
      for (const r of rub) {
        const bad = (r.rules || []).map((v, i) => (v === "PASS" ? null : `rule${i + 1}`)).filter(Boolean);
        const kept = bad.filter((b) => !w.has(b));
        const excused = bad.filter((b) => w.has(b));
        if ((r.rules || []).length !== 8 || kept.length) say(`design rubric (${sc.screen}, ${r.model}) is not 8 of 8: ${kept.join(", ") || "unparseable"}.`);
        if (excused.length) excuse(`design rubric (${sc.screen}, ${r.model}) failed ${excused.join(", ")}.`);
      }
    }
  }
  for (const m of ["tiny", "haiku", "sonnet"]) {
    const f = readJson(path.join(root, "tests", "skill-evals", "results", tool.id, `${m}.json`));
    if (!f) say(`no skill-eval result for ${m} (tests/skill-evals/results/${tool.id}/${m}.json).`);
    else if (!f.verdict?.ok) say(`skill-eval ${m} is below the bar: ${(f.verdict?.fails || ["unknown"]).join("; ")}.`);
  }
  return { failures: out, waived };
}

export function checkTool(root, tool) {
  return checkToolDetailed(root, tool).failures;
}

export function run(argv) {
  const root = resolveRoot(argv);
  const manifest = flag(argv, "--manifest") || path.join(root, "site", "public", "tools.json");
  const data = readJson(manifest);
  if (!data) return finish("evidence", ["could not read the tool list."]);
  const tools = (Array.isArray(data) ? data : data.tools || []).filter((t) => t.status === "shipped");
  const results = tools.map((t) => checkToolDetailed(root, t));
  for (const m of results.flatMap((r) => r.waived)) console.log(`WAIVED evidence: ${m} (owner waiver, tests/model-review/waivers.json)`);
  return finish("evidence", results.flatMap((r) => r.failures), `${tools.length} shipped tool(s) have clean evidence`);
}

if (isMain(import.meta.url)) process.exit(run(process.argv.slice(2)));
