// Ship gate. Reads the tool manifest (default site/public/tools.json) and, for every
// tool whose status is "shipped", requires:
//   1. a page-claims file at claimsPath (JSON: { "claims": [{ "id", "text" }] })
//   2. accuracy tests that name every claim id (<dir>/tests/accuracy.test.*)
//   3. a reliability suite with messy inputs (<dir>/tests/reliability.test.*, mentions "messy")
//   4. a phone-size e2e spec (site/e2e/<id>.spec.*, uses a phone width of 390 or smaller)
//   5. an upload-error contract test when the tool takes files (takesFiles: true)
//   6. a recorded run with every test passing (<dir>/ship-record.json: { passed, total })
// <dir> is tool.dir when set, else tools/<id>. Coming soon tools are skipped.
// Flags: --manifest <file>  --root <dir>
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, finish } from "./lib/common.mjs";

function flag(argv, name) {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

function findFile(dir, stem) {
  if (!fs.existsSync(dir)) return null;
  const hit = fs.readdirSync(dir).sort().find((n) => n.startsWith(`${stem}.`) && !n.endsWith(".md"));
  return hit ? path.join(dir, hit) : null;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function checkTool(root, tool) {
  const out = [];
  const who = `${tool.name || tool.id} (${tool.id})`;
  const say = (msg) => out.push(`${who} cannot ship: ${msg}`);
  const dir = path.join(root, tool.dir || path.join("tools", tool.id));
  const tests = path.join(dir, "tests");

  let claimIds = [];
  if (!tool.claimsPath) {
    say("no page-claims file is named. Set claimsPath in the tool list.");
  } else {
    const file = path.join(root, tool.claimsPath);
    if (!fs.existsSync(file)) {
      say(`the page-claims file is missing (${tool.claimsPath}). List every promise the page makes.`);
    } else {
      const data = readJson(file);
      if (!data || !Array.isArray(data.claims) || data.claims.length === 0) {
        say(`the page-claims file has no claims (${tool.claimsPath}). It needs a "claims" list with an id and text for each.`);
      } else {
        claimIds = data.claims.map((c) => String(c.id || "")).filter(Boolean);
        if (claimIds.length !== data.claims.length) say("a claim in the page-claims file has no id.");
      }
    }
  }

  const accuracy = findFile(tests, "accuracy.test");
  if (!accuracy) {
    say(`no accuracy tests found (expected ${path.relative(root, tests)}/accuracy.test.*). Each claim needs a test.`);
  } else {
    const body = fs.readFileSync(accuracy, "utf8");
    for (const id of claimIds) {
      if (!body.includes(id)) say(`no accuracy test covers the claim "${id}". Name the claim id in a test.`);
    }
  }

  const reliability = findFile(tests, "reliability.test");
  if (!reliability) {
    say(`no reliability suite found (expected ${path.relative(root, tests)}/reliability.test.*). It must try messy inputs.`);
  } else if (!/messy/i.test(fs.readFileSync(reliability, "utf8"))) {
    say("the reliability suite has no messy inputs. Add cases such as blank, huge, rotated, or misnamed files.");
  }

  const e2e = findFile(path.join(root, "site", "e2e"), tool.id);
  if (!e2e || !path.basename(e2e).startsWith(`${tool.id}.spec.`)) {
    say(`no phone-size e2e spec found (expected site/e2e/${tool.id}.spec.*).`);
  } else {
    const widths = [...fs.readFileSync(e2e, "utf8").matchAll(/width:\s*(\d{3})/g)].map((m) => Number(m[1]));
    if (!widths.some((w) => w <= 430)) say("the e2e spec does not run at phone size (width 430 or less).");
  }

  if (tool.takesFiles && !findFile(tests, "upload-errors.test")) {
    say(`this tool takes files but has no upload-error contract test (expected ${path.relative(root, tests)}/upload-errors.test.*).`);
  }

  const rec = readJson(path.join(dir, "ship-record.json"));
  if (!rec) {
    say(`no recorded test run (${path.relative(root, dir)}/ship-record.json). Run the suites and record the result.`);
  } else if (!(Number.isInteger(rec.total) && rec.total > 0 && rec.passed === rec.total)) {
    say(`the recorded run is not 100% (passed ${rec.passed} of ${rec.total}). Every test must pass.`);
  }
  return out;
}

export function run(root, manifestPath) {
  const file = manifestPath || path.join(root, "site", "public", "tools.json");
  run.shipped = 0;
  if (!fs.existsSync(file)) return [`the tool list is missing (${path.relative(root, file)}).`];
  const manifest = readJson(file);
  if (!manifest || !Array.isArray(manifest.tools)) return [`the tool list is not valid JSON with a "tools" list (${path.relative(root, file)}).`];
  const failures = [];
  for (const tool of manifest.tools) {
    if (tool.status !== "shipped") continue;
    run.shipped++;
    failures.push(...checkTool(root, tool));
  }
  return failures;
}

if (isMain(import.meta.url)) {
  const argv = process.argv.slice(2);
  const root = resolveRoot(argv);
  const m = flag(argv, "--manifest");
  const failures = run(root, m ? path.resolve(m) : null);
  process.exit(finish("ship-gate", failures, `${run.shipped} shipped tool(s) meet every requirement`));
}
