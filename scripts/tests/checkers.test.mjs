// Regression tests for the check scripts. Fixtures are built in a temp folder at
// run time, so no banned text is ever committed. Banned characters and private
// strings are assembled from code points and fragments.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { run as bannedChars } from "../check-banned-characters.mjs";
import { run as privacy } from "../check-privacy.mjs";
import { run as sources } from "../check-sources.mjs";
import { run as licenses } from "../check-licenses.mjs";
import { run as requiredTests } from "../check-required-tests.mjs";
import { run as jargon } from "../check-banned-jargon.mjs";
import { run as readingLevel, gradeOf } from "../check-reading-level.mjs";
import { run as noClutter } from "../check-no-clutter.mjs";
import { run as links } from "../check-links.mjs";

const EM = String.fromCodePoint(0x2014);
const EN = String.fromCodePoint(0x2013);

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "nt-check-"));
  for (const [name, body] of Object.entries(files)) {
    const full = path.join(root, name);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, body);
  }
  return root;
}

const GLOSSARY = "| Term | Plain swap |\n|---|---|\n| agent | your AI helper |\n| API | say where it comes from |\n| preview | keep |\n";

test("banned-characters: flags en and em dash, passes plain text, skips binary types", () => {
  const root = fixture({
    "a.md": `bad ${EM} here\nalso ${EN} here\n`,
    "b.md": "clean - text\n",
    "c.png": `${EM}`,
  });
  const out = bannedChars(root);
  assert.equal(out.length, 2);
  assert.ok(out.every((l) => l.startsWith("a.md:")));
});

test("privacy: flags real emails, machine names, paths and tokens; allows example.com", () => {
  const hosts = ["chapel", "parish", "abbey", "rectory"].map((n) => n + "1");
  const ws = ["/work", "space"].join("");
  const home = ["/ho", "me/", "someone"].join("");
  const ghp = ["gh", "p_"].join("") + "a".repeat(36);
  const sk = ["s", "k-"].join("") + "b".repeat(30);
  const aws = ["AK", "IA"].join("") + "ABCDEFGHIJKLMNOP";
  const root = fixture({
    "bad-email.md": `write to ${["some", "one", "@", "realmail", ".org"].join("")}\n`,
    ...Object.fromEntries(hosts.map((h, i) => [`bad-host${i}.md`, `runs on ${h}\n`])),
    "bad-ws.md": `see ${ws}/repo and ${ws}\n`,
    "ok-ws.md": `see ${ws}-notes and ${ws}er\n`,
    "ok-giga.md": `${["giga", "pc"].join("")}\n`,
    "bad-path.md": `see ${home}/file\n`,
    "bad-gh.md": `token ${ghp}\n`,
    "bad-sk.md": `key ${sk}\n`,
    "bad-aws.md": `id ${aws}\n`,
    "ok.md": "mail me@example.com or dev@localhost, name@marketplace\n",
  });
  const out = privacy(root);
  const files = out.map((l) => l.split(":")[0]).sort();
  assert.deepEqual(files, ["bad-aws.md", "bad-email.md", "bad-gh.md", "bad-host0.md", "bad-host1.md", "bad-host2.md", "bad-host3.md", "bad-path.md", "bad-sk.md", "bad-ws.md"]);
  assert.ok(!out.join("\n").includes(ghp), "secrets are never echoed");
  assert.ok(!out.join("\n").includes(sk), "secrets are never echoed");
});

test("privacy: skips a top-level .git pointer file but still scans other files", () => {
  const home = ["/ho", "me/", "someone"].join("");
  const root = fixture({
    ".git": `gitdir: ${home}/repo/.git/worktrees/x\n`,
    "nested/.git": `gitdir: ${home}/other\n`,
    "ok.md": "clean\n",
  });
  const files = privacy(root).map((l) => l.split(":")[0]);
  assert.deepEqual(files, ["nested/.git"]);
});

test("sources: needs URL or link plus a real Checked date", () => {
  const root = fixture({
    "research/README.md": "no sources here\n",
    "research/SOURCES-RULES.md": "no sources here\n",
    "research/good.md": "1. Title\n   - URL: https://example.com/a\n   - Checked: 2026-11-05\n",
    "research/link.md": "See [paper](https://example.com/p).\nChecked: 2026-01-31\n",
    "research/nodate.md": "- URL: https://example.com/a\n",
    "research/nolink.md": "Checked: 2026-11-05\nSome text.\n",
    "research/baddate.md": "- URL: https://example.com/a\nChecked: 2026-02-31\n",
  });
  const out = sources(root);
  const files = [...new Set(out.map((l) => l.split(":")[0]))].sort();
  assert.deepEqual(files, ["research/baddate.md", "research/nodate.md", "research/nolink.md"]);
});

test("sources: TODO-only files pass unless they hold an unsourced numeric claim", () => {
  const root = fixture({
    "research/todo-ok.md": "# Topic\n\n1. TODO: FTC Data Book 2024.\n",
    "research/todo-claim.md": "# Topic\n\n- TODO: add a source.\n- 40% of people quit forms.\n",
  });
  const out = sources(root);
  assert.equal(out.length, 1);
  assert.match(out[0], /^research\/todo-claim\.md:4:/);
});

function lockWith(packages) {
  const entries = { "": { name: "x", license: "Apache-2.0" } };
  for (const [p, license] of Object.entries(packages)) entries[p] = license === undefined ? {} : { license };
  return JSON.stringify({ lockfileVersion: 3, packages: entries });
}

test("licenses: allowed, OR branch, and rejected cases", () => {
  const root = fixture({
    "package-lock.json": lockWith({
      "node_modules/a": "MIT",
      "node_modules/b": "(MIT OR GPL-3.0-only)",
      "node_modules/c": "GPL-3.0-only",
      "node_modules/d": "LGPL-3.0-only",
      "node_modules/e": "Proprietary",
      "node_modules/f": undefined,
      "node_modules/g": "BSD-3-Clause",
      "tools/x/vendor/h": "LGPL-2.1-only",
    }),
  });
  const out = licenses(root).join("\n");
  assert.ok(!out.includes("(node_modules/a)"));
  assert.ok(!out.includes("(node_modules/b)"));
  assert.ok(!out.includes("(node_modules/g)"));
  assert.ok(!out.includes("vendor/h"));
  assert.match(out, /node_modules\/c\)/);
  assert.match(out, /node_modules\/d\)/);
  assert.match(out, /node_modules\/e\)/);
  assert.match(out, /node_modules\/f\)/);
});

test("licenses: approved GPL name passes; no dependencies passes", () => {
  const root = fixture({
    "package-lock.json": lockWith({ "node_modules/pandoc": "GPL-2.0-only" }),
    "docs/license-approvals.txt": "# approved\npandoc\n",
  });
  assert.deepEqual(licenses(root), []);
  assert.deepEqual(licenses(fixture({ "README.md": "x\n" })), []);
});

test("required-tests: code without a test fails; README-only and tested tools pass", () => {
  const root = fixture({
    "tools/README.md": "x\n",
    "tools/readme-only/README.md": "x\n",
    "tools/untested/src/main.js": "export {};\n",
    "tools/tested/src/main.js": "export {};\n",
    "tools/tested/src/main.test.js": "\n",
    "tools/py/tests/check.py": "\n",
    "tools/py/app.py": "\n",
  });
  const out = requiredTests(root);
  assert.equal(out.length, 1);
  assert.match(out[0], /tools\/untested/);
});

test("jargon: flags glossary terms in person-facing files only", () => {
  const root = fixture({
    "docs/glossary.md": GLOSSARY,
    "docs/person-facing/page.md": "Ask your agent.\n\nUse the API here.\n\nA preview shows first.\n\nOne agent line. <!-- nt-allow-jargon -->\n",
    "tools/one/README.person.md": "Plain words only.\n",
    "AGENTS.md": "agent API builders\n",
    "plan/notes.md": "agent API builders\n",
  });
  const out = jargon(root);
  assert.equal(out.length, 2);
  assert.ok(out.every((l) => l.startsWith("docs/person-facing/page.md:")));
});

test("reading-level: plain text passes, dense text fails, headings-only passes", () => {
  const plain = "Pick a file. Tap the big button. We show you what will change.\n";
  const dense = "Notwithstanding considerable organizational heterogeneity, comprehensive interoperability necessitates sophisticated infrastructure standardization initiatives.\n";
  assert.ok(gradeOf(plain).grade < 7);
  const root = fixture({
    "docs/person-facing/plain.md": plain,
    "docs/person-facing/dense.md": dense,
    "docs/person-facing/headings.md": "# Title\n\n## Another\n",
    "docs/person-facing/empty.md": "",
  });
  const out = readingLevel(root);
  assert.equal(out.length, 1);
  assert.match(out[0], /dense\.md: reading grade \d+\.\d is above the limit of 7\.0/);
});

test("no-clutter: sentence, average and paragraph limits", () => {
  const sentence = (n) => "Word" + " word".repeat(n - 1) + ".";
  const long = sentence(31);
  const para = Array.from({ length: 20 }, () => "One two three four five six seven eight.").join(" ");
  const root = fixture({
    "docs/person-facing/ok.md": "# Hi\n\nShort one. Short two.\n",
    "docs/person-facing/long-sentence.md": long + "\n",
    "docs/person-facing/long-paragraph.md": para + "\n",
    "docs/person-facing/avg.md": Array.from({ length: 3 }, () => sentence(25)).join(" ") + "\n",
  });
  const out = noClutter(root);
  const text = out.join("\n");
  assert.match(text, /long-sentence\.md:1: sentence has 31 words/);
  assert.match(text, /long-paragraph\.md:1: paragraph has 160 words/);
  assert.match(text, /avg\.md: average sentence is 25\.0 words/);
  assert.ok(!text.includes("ok.md"));
});

test("links: finds missing files and anchors, skips external links", () => {
  const root = fixture({
    "a.md": "# Top\n\n[ok](b.md) [anchor](b.md#section-one) [self](#top) [ext](https://example.com/x)\n\n[gone](missing.md) [badanchor](b.md#nope) [badself](#nope)\n\n```\n[ignored](nothing.md)\n```\n",
    "b.md": "# B\n\n## Section One\n",
  });
  const out = links(root);
  assert.equal(out.length, 3);
  assert.ok(out.some((l) => l.includes("missing file")));
  assert.equal(links.stats.external, 1);
});
