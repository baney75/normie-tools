// License allow-list for dependencies.
// Reads package-lock.json (and node_modules/*/package.json when lock data is missing).
// Allowed: MIT, BSD (2/3-clause), Apache-2.0, MPL-2.0, ISC, CC0-1.0, Unlicense, 0BSD.
// SPDX "A OR B" passes if any branch is allowed; "A AND B" needs every branch allowed.
// LGPL passes only when the package path looks like a separate module
// (a modules/, vendor/ or third_party/ folder). GPL and AGPL fail unless the
// package name is listed in docs/license-approvals.txt (one name per line, # comments).
// That file may also approve a single package whose license is not on the allow list.
// With no dependencies the check passes.
import fs from "node:fs";
import path from "node:path";
import { isMain, resolveRoot, finish } from "./lib/common.mjs";

const ALLOWED = new Set([
  "MIT", "MIT-0", "ISC", "APACHE-2.0", "MPL-2.0", "CC0-1.0", "UNLICENSE", "0BSD",
  "BSD", "BSD-2-CLAUSE", "BSD-3-CLAUSE",
]);

function approvals(root) {
  const f = path.join(root, "docs", "license-approvals.txt");
  if (!fs.existsSync(f)) return new Set();
  return new Set(
    fs.readFileSync(f, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean),
  );
}

// 'ok' | 'lgpl' | 'gpl' | 'bad'
function classify(id) {
  const u = id.trim().toUpperCase().replace(/\+$/, "");
  if (ALLOWED.has(u)) return "ok";
  if (/^LGPL/.test(u)) return "lgpl";
  if (/GPL/.test(u)) return "gpl";
  return "bad";
}

function evaluate(expr, ctx) {
  const e = expr.replace(/[()]/g, " ").trim();
  const ors = e.split(/\s+OR\s+/i);
  const results = ors.map((branch) => {
    const ands = branch.split(/\s+AND\s+/i).map((id) => verdict(id, ctx));
    return ands.every((v) => v === "ok") ? "ok" : ands.find((v) => v !== "ok");
  });
  return results.includes("ok") ? "ok" : results[0];
}

function verdict(id, ctx) {
  const c = classify(id);
  if (c === "lgpl") return /(^|\/)(modules|vendor|third[-_]party)\//.test(ctx.path) ? "ok" : "lgpl";
  if (c === "gpl" || c === "bad") return ctx.approved.has(ctx.name) ? "ok" : c;
  return c;
}

function declared(pkg) {
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license === "object" && pkg.license.type) return pkg.license.type;
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(" OR ");
  return null;
}

export function run(root) {
  const failures = [];
  const approved = approvals(root);
  const seen = new Map();
  const lockFile = path.join(root, "package-lock.json");
  if (fs.existsSync(lockFile)) {
    const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    for (const [p, pkg] of Object.entries(lock.packages ?? {})) {
      if (p === "") {
        const lic = declared(pkg);
        if (lic && lic !== "Apache-2.0") failures.push(`root package license is "${lic}", expected Apache-2.0`);
        continue;
      }
      if (pkg.link) continue;
      const name = pkg.name ?? p.split("node_modules/").pop();
      seen.set(p, { name, license: declared(pkg) });
    }
  }
  const nm = path.join(root, "node_modules");
  if (fs.existsSync(nm)) {
    const dirs = fs.readdirSync(nm, { withFileTypes: true }).filter((d) => d.isDirectory());
    const pkgDirs = [];
    for (const d of dirs) {
      if (d.name.startsWith(".")) continue;
      if (d.name.startsWith("@")) {
        for (const s of fs.readdirSync(path.join(nm, d.name))) pkgDirs.push(`${d.name}/${s}`);
      } else {
        pkgDirs.push(d.name);
      }
    }
    for (const name of pkgDirs) {
      const key = `node_modules/${name}`;
      if (seen.has(key) && seen.get(key).license) continue;
      const pj = path.join(nm, name, "package.json");
      if (!fs.existsSync(pj)) continue;
      try {
        seen.set(key, { name, license: declared(JSON.parse(fs.readFileSync(pj, "utf8"))) });
      } catch {
        failures.push(`${key}: package.json is not valid JSON`);
      }
    }
  }
  for (const [p, { name, license }] of [...seen.entries()].sort()) {
    if (!license) {
      failures.push(`${name} (${p}): no license declared`);
      continue;
    }
    const v = evaluate(license, { path: p, name, approved });
    if (v !== "ok") {
      const why = { lgpl: "LGPL needs a separate-module path", gpl: "GPL needs approval in docs/license-approvals.txt", bad: "is not on the allow list (a maintainer can approve it in docs/license-approvals.txt)" }[v];
      failures.push(`${name} (${p}): license "${license}" ${why}`);
    }
  }
  run.count = seen.size;
  return failures;
}

if (isMain(import.meta.url)) {
  const failures = run(resolveRoot());
  process.exit(finish("licenses", failures, `${run.count} dependencies checked, all licenses allowed`));
}
