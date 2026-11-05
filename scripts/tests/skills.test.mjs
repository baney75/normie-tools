import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { loadCases } from "../../tests/skill-evals/run.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const skill = path.join(root, "skills", "receipt-to-spreadsheet");
const sandbox = path.join(root, "tests", "sandbox");

function py(args, { offline = false, cwd = root } = {}) {
  const env = { ...process.env };
  if (offline) env.PYTHONPATH = sandbox;
  return spawnSync("python3", args, { cwd, env, encoding: "utf8" });
}

test("skill: the example is a coming soon tool, with Level 1/2/3 files", () => {
  const m = JSON.parse(fs.readFileSync(path.join(root, "site/public/tools.json"), "utf8"));
  assert.equal(m.tools.find((t) => t.id === "receipt-to-spreadsheet").status, "coming_soon");
  const md = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  assert.match(md, /^---\nname: receipt-to-spreadsheet\ndescription: .+\n---\n/);
  assert.match(md, /## Environments/);
  assert.match(md, /## Steps \(Level 2\)/);
  assert.match(md, /## More detail \(Level 3\)/);
  for (const f of ["references/columns.md", "scripts/env_check.py", "scripts/receipt_totals.py"]) {
    assert.ok(fs.existsSync(path.join(skill, f)), f);
  }
});

test("skill scripts: python unit tests pass", () => {
  const r = py(["-m", "unittest", "discover", "-s", "skills/receipt-to-spreadsheet/tests", "-p", "test_*.py"]);
  assert.equal(r.status, 0, r.stderr);
});

test("sandbox mimic: scripts run with the network blocked", () => {
  const r = py([path.join(skill, "scripts", "env_check.py")], { offline: true });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /network: off/);
  assert.match(r.stdout, /READY/);
  const t = py([path.join(skill, "scripts", "receipt_totals.py"), path.join(skill, "examples", "sample-receipts.csv")], { offline: true });
  assert.equal(t.status, 0, t.stderr);
  assert.match(t.stdout, /total: 15\.83/);
  assert.match(t.stdout, /check this: line 6/);
});

test("sandbox mimic: the block really stops a connection", () => {
  const code = "import socket\ntry:\n    socket.create_connection(('127.0.0.1', 9), 1)\nexcept OSError as e:\n    print('blocked', e)\n    raise SystemExit(0)\nraise SystemExit(1)\n";
  const r = py(["-c", code], { offline: true });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("sandbox mimic: scripts also run in a network-less namespace when unshare allows it", (t) => {
  const probe = spawnSync("unshare", ["-rn", "true"]);
  if (probe.status !== 0) return t.skip("unshare -rn not available here");
  const r = spawnSync("unshare", ["-rn", "python3", path.join(skill, "scripts", "env_check.py")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /network: off/);
});

test("skill scripts use only the standard library and no network modules", () => {
  const banned = /^\s*(import|from)\s+(requests|urllib|http|httpx|aiohttp|ftplib|smtplib|numpy|pandas)\b/m;
  const files = [...fs.readdirSync(path.join(skill, "scripts")).map((n) => path.join(skill, "scripts", n)), path.join(root, "scripts", "refs.py")];
  for (const f of files.filter((x) => x.endsWith(".py"))) {
    assert.ok(!banned.test(fs.readFileSync(f, "utf8")), f);
  }
});

test("refs: search finds research notes, and nt refs search works", () => {
  const r = py(["cli/nt.py", "refs", "search", "autosave"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /\.md\n/);
  const none = py(["cli/nt.py", "refs", "search", "zzqqxx"]);
  assert.equal(none.status, 1);
  const inSkill = py([path.join(root, "scripts", "refs.py"), "search", "faded", "--dir", path.join(skill, "references")]);
  assert.equal(inSkill.status, 0, inSkill.stderr);
  assert.match(inSkill.stdout, /messy-receipts\.md/);
});

test("build-skills: skips coming soon by default, builds a checked zip when asked", () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), "nt-skills-"));
  const none = py(["scripts/build_skills.py", "--out", out]);
  assert.equal(none.status, 0, none.stderr);
  assert.deepEqual(fs.readdirSync(out), []);
  const r = py(["scripts/build_skills.py", "--out", out, "--include-coming-soon"]);
  assert.equal(r.status, 0, r.stderr);
  const zip = path.join(out, "receipt-to-spreadsheet.zip");
  assert.ok(fs.existsSync(zip));
  assert.ok(fs.statSync(zip).size < 30 * 1024 * 1024);
  const list = py(["-c", "import zipfile,sys\nz=zipfile.ZipFile(sys.argv[1])\nprint('\\n'.join(z.namelist()))", zip]).stdout.split("\n").filter(Boolean);
  assert.ok(list.every((n) => n.startsWith("receipt-to-spreadsheet/")), list.join(","));
  assert.ok(list.includes("receipt-to-spreadsheet/SKILL.md"));
  assert.ok(list.includes("receipt-to-spreadsheet/scripts/refs.py"));
  assert.ok(!list.some((n) => n.includes("__pycache__")));
});

test("build-skills: fails when the header name does not match the folder", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "nt-skillrepo-"));
  fs.mkdirSync(path.join(repo, "site/public"), { recursive: true });
  fs.mkdirSync(path.join(repo, "skills/foo"), { recursive: true });
  fs.writeFileSync(path.join(repo, "site/public/tools.json"), JSON.stringify({ tools: [{ id: "foo", status: "shipped" }] }));
  fs.writeFileSync(path.join(repo, "skills/foo/SKILL.md"), "---\nname: bar\ndescription: x\n---\nbody\n");
  const r = py(["scripts/build_skills.py", "--root", repo, "--out", path.join(repo, "out")]);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /does not match the folder/);
});

test("skill-evals: case files are valid", () => {
  const { cases, problems } = loadCases();
  assert.deepEqual(problems, []);
  assert.ok(cases.length >= 1);
});
