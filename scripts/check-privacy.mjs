// Privacy scan. Fails on: real emails (only example.com and localhost allowed),
// the four house machine names, the private tailnet suffix, private path
// markers, and token shapes (ghp_, gho_, sk-, AWS keys, private key headers).
// Patterns are built from fragments so no literal ever appears in this file.
// Output is path, line and rule only. Matched text is never printed.
import { isMain, resolveRoot, textFiles, readText, rel, finish } from "./lib/common.mjs";

const j = (...p) => p.join("");

const RULES = [
  {
    rule: "real-email",
    re: /[A-Za-z0-9._%+-]+@([A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g,
    keep: (m) => {
      const host = m[1].toLowerCase();
      return !(host === "example.com" || host.endsWith(".example.com") || host === "localhost");
    },
  },
  {
    rule: "house-machine-name",
    re: new RegExp(`\\b(?:${[j("chapel", "1"), j("parish", "1"), j("abbey", "1"), j("rectory", "1")].join("|")})\\b`, "gi"),
  },
  {
    rule: "private-tailnet-suffix",
    re: new RegExp(`\\.${j("ts")}\\.${j("net")}\\b`, "gi"),
  },
  {
    rule: "private-path-marker",
    re: new RegExp(
      [
        `/${j("ho", "me")}/[A-Za-z0-9_.-]+`,
        `/${j("Us", "ers")}/[A-Za-z0-9_.-]+`,
        `[A-Za-z]:\\\\${j("Us", "ers")}\\\\`,
        `/${j("work", "space")}(?![A-Za-z0-9_.-])`,
      ].join("|"),
      "g",
    ),
  },
  { rule: "github-token", re: new RegExp(`\\b(?:${j("gh", "p_")}|${j("gh", "o_")}|${j("gh", "u_")}|${j("gh", "s_")})[A-Za-z0-9]{20,}`, "g") },
  { rule: "api-secret-key", re: new RegExp(`\\b${j("s", "k-")}[A-Za-z0-9_-]{20,}`, "g") },
  { rule: "aws-key", re: new RegExp(`\\b(?:${j("AK", "IA")}|${j("AS", "IA")})[0-9A-Z]{16}\\b`, "g") },
  { rule: "private-key-block", re: new RegExp(`-----BEGIN [A-Z ]*${j("PRIVATE", " KEY")}-----`, "g") },
];

export function run(root) {
  const failures = [];
  for (const file of textFiles(root)) {
    // A worktree's top-level .git is a pointer file holding a local path. Skip it.
    if (rel(root, file) === ".git") continue;
    const lines = readText(file).split("\n");
    lines.forEach((line, i) => {
      for (const { rule, re, keep } of RULES) {
        re.lastIndex = 0;
        for (const m of line.matchAll(re)) {
          if (keep && !keep(m)) continue;
          failures.push(`${rel(root, file)}:${i + 1} rule ${rule}`);
          break;
        }
      }
    });
  }
  return failures;
}

if (isMain(import.meta.url)) {
  process.exit(finish("privacy", run(resolveRoot()), "no private details found"));
}
