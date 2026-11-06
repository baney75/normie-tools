// Evidence gate for shipped tools. For every tool whose status is "shipped" (default site/public/tools.json) it needs:
//   tests/model-review/<id>.json   first-time-user score >= 4 and EVERY design rubric rule PASS (8 of 8) for each model run,
//   with both a haiku and a sonnet review on every screen
//   tests/skill-evals/results/<id>/{tiny,haiku,sonnet}.json   each with verdict.ok true (tiny L1 >= 90%, Haiku and Sonnet L1-3 >= 95%, safety 100%)
// An owner waiver in tests/model-review/waivers.json can excuse a named check for a named tool:
//   { "waivers": [{ "tool": "<id>", "checks": ["first-time-user"], "minScore": 3, "screens": ["main"],
//                   "by": "...", "date": "YYYY-MM-DD", "expires": "YYYY-MM-DD", "said": "...", "why": "..." }] }
// Only "first-time-user" can be waived, and it needs minScore (1 to 3): a lower score still fails. "screens" limits
// the waiver to those screens. Dates must be real calendar days, with "expires" after "date". After "expires" the
// waiver stops counting and the gate fails. Every entry in the file is checked, for any tool, and one that breaks
// these rules fails the gate. A waived problem prints as WAIVED, and the pass line says how many tools needed one.
// Nothing else is excused: other rules, other tools, missing records and skill evals still fail.
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

const WAIVABLE = new Set(["first-time-user"]);
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/** True for a real calendar day like 2027-01-05. "2027-99-99" is false. */
const realDay = (s) => {
  if (typeof s !== "string" || !DAY.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** Why a waiver entry is not valid, or null when it is. */
export function waiverProblem(w, today) {
  if (!w || typeof w !== "object") return "not an object";
  if (!Array.isArray(w.checks) || w.checks.length === 0) return "no checks named";
  const bad = w.checks.filter((c) => !WAIVABLE.has(c));
  if (bad.length) return `cannot waive ${bad.join(", ")} (only first-time-user)`;
  for (const k of ["tool", "by", "said"]) if (typeof w[k] !== "string" || !w[k].trim()) return `missing ${k}`;
  if (!realDay(w.date)) return "date must be a real day, YYYY-MM-DD";
  if (!realDay(w.expires)) return "expires must be a real day, YYYY-MM-DD";
  if (w.expires <= w.date) return "expires must be after date";
  if (w.expires < today) return `expired on ${w.expires}`;
  if (w.checks.includes("first-time-user") && !(Number.isInteger(w.minScore) && w.minScore >= 1 && w.minScore <= 3)) return "first-time-user needs minScore 1 to 3";
  if (w.screens !== undefined && (!Array.isArray(w.screens) || w.screens.length === 0)) return "screens must be a list";
  return null;
}

/** Every problem in the waiver file, for any tool. An unreadable file is a problem; no file is fine. */
export function waiverFileProblems(root, today = new Date().toISOString().slice(0, 10)) {
  const file = path.join(root, "tests", "model-review", "waivers.json");
  if (!fs.existsSync(file)) return [];
  const data = readJson(file);
  if (!data || !Array.isArray(data.waivers)) return ["tests/model-review/waivers.json must hold { \"waivers\": [...] }."];
  return data.waivers.flatMap((w, i) => {
    const p = waiverProblem(w, today);
    return p ? [`waiver ${i + 1} in tests/model-review/waivers.json${w?.tool ? ` (${w.tool})` : ""} is not valid: ${p}.`] : [];
  });
}

/** The valid waivers for one tool. Invalid entries are reported once by waiverFileProblems. */
export function waiversFor(root, id, today = new Date().toISOString().slice(0, 10)) {
  const data = readJson(path.join(root, "tests", "model-review", "waivers.json"));
  const list = (Array.isArray(data?.waivers) ? data.waivers : []).filter((w) => w && w.tool === id);
  return { valid: list.filter((w) => !waiverProblem(w, today)) };
}

/** Every problem for one tool, split into what fails and what the owner waived. */
export function checkToolDetailed(root, tool) {
  const out = [];
  const waived = [];
  const say = (m) => out.push(`${tool.name || tool.id} (${tool.id}) cannot stay shipped: ${m}`);
  const excuse = (m) => waived.push(`${tool.name || tool.id} (${tool.id}): ${m}`);
  const { valid: wv } = waiversFor(root, tool.id);
  const onScreen = (w, screen) => !w.screens || w.screens.includes(screen);
  const ftuOk = (screen, score) => wv.some((w) => w.checks.includes("first-time-user") && onScreen(w, screen) && score >= w.minScore);
  const ruleOk = (screen, rule) => wv.some((w) => w.checks.includes(rule) && onScreen(w, screen));
  const mr = readJson(path.join(root, "tests", "model-review", `${tool.id}.json`));
  if (!mr) say("no model review record (tests/model-review/<id>.json).");
  else {
    // A tool in scenes/screens.json must have every listed screen reviewed: the main screen is the last one listed.
    const want = readJson(path.join(root, "tests", "model-review", "scenes", "screens.json"))?.[tool.id];
    if (Array.isArray(want)) {
      const got = [...(mr.otherScreens || []).map((o) => o.screen), want[want.length - 1]];
      if (JSON.stringify(mr.screens) !== JSON.stringify(want) || JSON.stringify(got) !== JSON.stringify(want))
        say(`the review record does not cover every screen in tests/model-review/scenes/screens.json (needs ${want.join(", ")}; has ${(mr.screens || got).join(", ")}).`);
    }
    const screens = [{ screen: "main", firstTimeUser: mr.firstTimeUser, designRubric: mr.designRubric }, ...(mr.otherScreens || [])];
    for (const sc of screens) {
      const score = sc.firstTimeUser?.score;
      if (typeof score !== "number") say(`first-time-user score (${sc.screen}) is missing, needs 4 or more.`);
      else if (score < 4) (ftuOk(sc.screen, score) ? excuse : say)(`first-time-user score (${sc.screen}) is ${score}, needs 4 or more.`);
      const rub = sc.designRubric || [];
      if (rub.length === 0) say(`no design rubric run (${sc.screen}).`);
      for (const model of REVIEWERS) {
        if (!rub.some((r) => r.model === model)) say(`design rubric (${sc.screen}) has no ${model} review.`);
      }
      for (const r of rub) {
        const bad = (r.rules || []).map((v, i) => (v === "PASS" ? null : `rule${i + 1}`)).filter(Boolean);
        const kept = bad.filter((b) => !ruleOk(sc.screen, b));
        const excused = bad.filter((b) => ruleOk(sc.screen, b));
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
  const waivedTools = results.filter((r) => r.waived.length).length;
  const ok = waivedTools
    ? `${tools.length} shipped tool(s) pass, ${waivedTools} of them only under an owner waiver (see WAIVED above)`
    : `${tools.length} shipped tool(s) have clean evidence`;
  return finish("evidence", [...waiverFileProblems(root), ...results.flatMap((r) => r.failures)], ok);
}

if (isMain(import.meta.url)) process.exit(run(process.argv.slice(2)));
