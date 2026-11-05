// Full model review of one or more tools. On purpose only, never in `npm test`.
//   node tests/model-review/review.mjs <tool-id>... [--url http://127.0.0.1:4173] [--only-capture] [--no-sonnet-rubric]
// Captures the page at 390px wide (filled state is the one reviewed; empty state is saved too), then runs the
// pinned first-time-user prompt (Sonnet) and the pinned design rubric (Haiku and Sonnet) and writes
// tests/model-review/<tool>.json. The gate lives in scripts/check-evidence.mjs.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { askClaude, jsonIn } from "../lib/models.mjs";
import { hashPrompts } from "./run.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..", "..");
const require = createRequire(path.join(root, "site", "package.json"));
const promptsDir = path.join(here, "prompts");
const screensDir = path.join(here, "screens");

// What the person types, by what the box is called. Made-up numbers.
function sampleFor(label, i = 0) {
  const l = label.toLowerCase();
  const bump = (n) => String(n + (i % 3) * Math.round(n / 10));
  if (/optional/.test(l)) return "";
  if (/price|cost of the home|home/.test(l) && !/down/.test(l)) return bump(300000);
  if (/down/.test(l)) return bump(60000);
  if (/rate|apr|percent|interest|return/.test(l)) return String(5 + (i % 3) * 0.5);
  if (/years to pay|pay it back/.test(l)) return "30";
  if (/payment|each month|per month|a month|monthly/.test(l)) return bump(200);
  if (/year|month|term|length|how long|months/.test(l)) return String(24 + (i % 3) * 12);
  if (/date|when|start/.test(l)) return "";
  if (/name|nickname|call/.test(l)) return "";
  return bump(5000);
}

const CAPTURE = () => {
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const filled = (el) => {
    const bg = getComputedStyle(el).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (!m) return false;
    const [r, g, b, a = "1"] = m[1].split(",").map((x) => parseFloat(x));
    if (parseFloat(a) === 0) return false;
    return r >= 150 && g <= 110 && b <= 90; // the dark orange of the main button
  };
  const name = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || "").trim().replace(/\s+/g, " ");
  const main = document.querySelector("main") || document.body;
  const lines = [];
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_ELEMENT);
  const seen = new Set();
  let el = main;
  while (el) {
    if (vis(el)) {
      const tag = el.tagName;
      if (/^H[1-6]$/.test(tag)) lines.push(`[heading ${tag[1]}] ${name(el)}`);
      else if (tag === "P" || tag === "LI" || tag === "DT" || tag === "DD" || tag === "SUMMARY" || tag === "CAPTION") {
        if (!el.closest("button") && !seen.has(el)) lines.push(`${tag === "SUMMARY" ? "[closed section, tap to open] " : ""}${name(el)}`);
      } else if (tag === "LABEL") lines.push(`[label] ${name(el)}`);
      else if (tag === "INPUT" && (el.type === "radio" || el.type === "checkbox")) {
        const lab = el.id ? document.querySelector(`label[for="${el.id}"]`) : el.closest("label");
        lines.push(`[${el.type === "radio" ? "choice" : "tick box"}] ${lab ? name(lab) : name(el)} ${el.checked ? "(selected)" : ""}`);
      } else if (tag === "INPUT") {
        const lab = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        lines.push(`[box${el.disabled ? ", disabled" : ""}] ${lab ? name(lab) : name(el)} = "${el.value}"${el === document.activeElement ? " (cursor is here)" : ""}`);
      } else if (tag === "SELECT") lines.push(`[menu] ${name(el)} = "${el.options[el.selectedIndex]?.text ?? ""}"`);
      else if (tag === "BUTTON") {
        const f = filled(el);
        lines.push(`[${f ? "MAIN BUTTON, filled dark orange" : "plain button, outline only"}${el.disabled ? ", disabled" : ""}] ${name(el)}`);
      } else if (tag === "A") lines.push(`[${filled(el) ? "MAIN LINK, filled dark orange" : "link, plain"}] ${name(el)}`);
      else if ((tag === "TH" || tag === "TD") && name(el)) lines.push(`[cell] ${name(el)}`);
      else if (tag === "SPAN" || tag === "DIV") {
        // Hints and notes are often plain spans or divs. Read their own text, unless a parent line already holds it.
        const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).filter(Boolean).join(" ");
        if (own && !el.closest("p, li, dt, dd, button, label, h1, h2, h3, h4, h5, h6, summary, a, caption, th, td, [aria-hidden=true]")) lines.push(own);
      }
    }
    // next element in document order, skipping hidden subtrees
    let next = vis(el) || el === main ? el.firstElementChild : null;
    if (!next) {
      let n = el;
      while (n && n !== main && !n.nextElementSibling) n = n.parentElement;
      next = n && n !== main ? n.nextElementSibling : null;
    }
    el = next;
  }
  // collapse paragraphs that repeat a child's text (P inside LI etc.)
  const out = [];
  for (const l of lines) if (out[out.length - 1] !== l) out.push(l);
  const filledButtons = [...main.querySelectorAll("button, a")].filter((b) => vis(b) && filled(b) && !b.disabled).length;
  const startBox = main.querySelector("input:focus, select:focus");
  const disabledFilled = [...main.querySelectorAll("button")].some((b) => vis(b) && filled(b) && b.disabled);
  return { lines: out, filledButtons, disabledFilled, startBox: Boolean(startBox) };
};

async function defaultScenes(page, capture) {
  const empty = await capture();
  // Fill every number box by its label, then read again.
  const boxes = page.locator("input.nt-field-input");
  const n = await boxes.count();
  for (let i = 0; i < n; i++) {
    const b = boxes.nth(i);
    if (!(await b.isVisible()) || !(await b.isEditable())) continue;
    const mode = await b.getAttribute("inputmode");
    if (mode === "text") continue;
    const label = (await page.locator(`label[for="${await b.getAttribute("id")}"]`).first().innerText().catch(() => "")) || "";
    const v = sampleFor(label, i);
    if (v) await b.fill(v);
  }
  await page.waitForTimeout(150);
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  return [{ name: "empty", cap: empty }, { name: "filled", cap: await capture() }];
}

// A scene file (tests/model-review/scenes/<id>.mjs) drives a stepper page. It default-exports
// async (page, capture) => [{ name, cap }] where cap = await capture() at each screen worth reviewing.
async function scenesFor(page, base, id) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/#/tools/${id}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("input, select, button.primary", { timeout: 40000 });
  const capture = () => page.evaluate(CAPTURE);
  const file = path.join(here, "scenes", `${id}.mjs`);
  if (fs.existsSync(file)) return (await import(file)).default(page, capture);
  return defaultScenes(page, capture);
}

function screenText(id, state, cap) {
  const note = cap.disabledFilled ? "Layout notes: the one filled dark orange button is the main action. It is greyed out until there is an answer." : cap.filledButtons === 1
    ? "Layout notes: exactly one button is filled dark orange (the main action). Every other button is an outline."
    : cap.filledButtons === 0
      ? "Layout notes: no button is filled. All buttons are outlines."
      : `Layout notes: ${cap.filledButtons} buttons are filled dark orange.`;
  const focusNote = cap.startBox ? "The first box has the cursor in it and a bright outline: that is where to start typing." : "";
  const who = state === "empty" ? "Nothing is typed yet." : "The person has just typed their own numbers in the boxes, so the boxes hold their numbers.";
  return [`Screen: ${id}, ${state} state, phone 390px wide. Order is top to bottom. ${who}`, note, focusNote, "", ...cap.lines, ""].filter((l, i) => l !== "" || i > 1).join("\n");
}

const promptOf = (name) => fs.readFileSync(path.join(promptsDir, `${name}.md`), "utf8");
const withScreen = (name, screen) => `${promptOf(name)}\n\n--- SCREEN ---\n${screen}\n`;

export function ruleScore(result) {
  const j = jsonIn(String(result).split("RESULT:").pop() || "");
  if (!j) return null;
  const rules = Array.from({ length: 8 }, (_, i) => j[`rule${i + 1}`]);
  return { rules, passes: rules.filter((r) => r === "PASS").length, fails: j.fails || [] };
}

async function review(id, opts) {
  const { chromium } = require("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const scenes = await scenesFor(page, opts.url, id);
  await browser.close();
  fs.mkdirSync(screensDir, { recursive: true });
  for (const sc of scenes) fs.writeFileSync(path.join(screensDir, `${id}-${sc.name}.txt`), screenText(id, sc.name, sc.cap).replace(/[\u2013\u2014]/g, "-"));
  if (opts.onlyCapture) return null;
  const reviewed = scenes.filter((sc) => sc.only !== "save");
  const models = opts.noSonnetRubric ? ["haiku"] : ["haiku", "sonnet"];
  const results = reviewed.map((sc) => {
    const text = screenText(id, sc.name, sc.cap);
    // A single reader is noisy by a point or so. Ask three times and keep the middle score, with all three on record.
    const runs = Array.from({ length: opts.ftuRuns }, () => {
      const out = askClaude("sonnet", withScreen("first-time-user", text));
      return { out, score: jsonIn(out.split("RESULT:").pop() || "")?.score ?? 0 };
    });
    const sorted = [...runs].sort((a, b) => a.score - b.score);
    const mid = sorted[Math.floor((sorted.length - 1) / 2)];
    const ftuText = mid.out;
    const ftuJson = { score: mid.score };
    const allScores = runs.map((r) => r.score);
    // The grader is noisy too. Grade three times per model; a rule passes when it passes in most runs.
    const rubric = models.map((m) => {
      const runs = Array.from({ length: opts.rubricRuns }, () => {
        const result = askClaude(m, withScreen("design-rubric", text));
        return { result, ...(ruleScore(result) ?? { rules: [], passes: 0, fails: ["unparseable"] }) };
      });
      const rules = Array.from({ length: 8 }, (_, i) => (runs.filter((r) => r.rules[i] === "PASS").length > runs.length / 2 ? "PASS" : "FAIL"));
      const fails = rules.flatMap((v, i) => (v === "PASS" ? [] : runs.flatMap((r) => (r.rules[i] === "PASS" ? [] : r.fails.filter((f) => new RegExp(`rule\\s?${i + 1}\\b`, "i").test(f)))).slice(0, 2)));
      return { model: m, rule: `a rule passes when it passes in most of ${runs.length} runs`, rules, passes: rules.filter((v) => v === "PASS").length, fails, runs: runs.map((r) => ({ passes: r.passes, rules: r.rules })), result: runs[0].result };
    });
    return { screen: sc.name, firstTimeUser: { model: "sonnet", score: ftuJson.score, runs: allScores, rule: "middle score of the runs", output: ftuText }, designRubric: rubric };
  });
  const main = results[results.length - 1];
  const record = {
    tool: id,
    screen: `${reviewed.map((r) => r.screen).join(", ")} at 390px wide (text saved beside this file in screens/)`,
    at: new Date().toISOString().slice(0, 10),
    promptHashes: hashPrompts(),
    firstTimeUser: main.firstTimeUser,
    designRubric: main.designRubric,
    otherScreens: results.slice(0, -1),
  };
  fs.writeFileSync(path.join(here, `${id}.json`), `${JSON.stringify(record, null, 2).replace(/[\u2013\u2014]/g, "-")}\n`);
  return record;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const argv = process.argv.slice(2);
  const ui = argv.indexOf("--url");
  const url = ui !== -1 ? argv[ui + 1] : "http://127.0.0.1:4173";
  const ids = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--url" && argv[i - 1] !== "--ftu-runs" && argv[i - 1] !== "--rubric-runs");
  const opts = { url, onlyCapture: argv.includes("--only-capture"), ftuRuns: Number(argv[argv.indexOf("--ftu-runs") + 1]) || 3, rubricRuns: Number(argv[argv.indexOf("--rubric-runs") + 1]) || 3, noSonnetRubric: argv.includes("--no-sonnet-rubric") };
  let bad = 0;
  const queue = [...ids];
  await Promise.all(Array.from({ length: 2 }, async () => { while (queue.length) {
    const id = queue.shift();
    let r;
    try { r = await review(id, opts); } catch (e) { console.log(`${id}: ERROR ${String(e.message).split("\n")[0]}`); bad++; continue; }
    if (!r) return console.log(`${id}: captured`);
    const all = [{ screen: "main", firstTimeUser: r.firstTimeUser, designRubric: r.designRubric }, ...r.otherScreens];
    for (const sc of all) {
      const rub = sc.designRubric.map((x) => `${x.model}=${x.passes}/8`).join(" ");
      const fails = sc.designRubric.flatMap((x) => x.fails.map((f) => `${x.model}: ${f}`));
      console.log(`${id}/${sc.screen}: first-time-user=${sc.firstTimeUser.score} rubric ${rub}${fails.length ? `\n  fails: ${fails.join("\n         ")}` : ""}`);
      if ((sc.firstTimeUser.score ?? 0) < 4 || sc.designRubric.some((x) => x.passes < 8)) bad++;
    }
  } }));
  process.exit(bad ? 1 : 0);
}
