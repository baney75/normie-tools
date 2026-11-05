#!/usr/bin/env python3
"""Build dist/skills/<tool>.zip for each skill. Standard library only.

  python3 scripts/build_skills.py [--out dist/skills] [--include-coming-soon] [--root <repo>]

A skill whose tool is coming_soon in site/public/tools.json is skipped unless
--include-coming-soon is given. Checks per skill: SKILL.md header name matches the
folder, a description is present, no file is over the limit, and the unpacked size
is at most 30 MB. The zip's top level is the skill folder. scripts/refs.py is
copied into each skill's scripts/ folder so the skill can search its references/.
"""
import argparse
import json
import os
import re
import sys
import zipfile

LIMIT = 30 * 1024 * 1024
FIXED_TIME = (2026, 1, 1, 0, 0, 0)  # same zip bytes every build
SKIP = {"__pycache__", ".DS_Store"}


def header(skill_md):
    m = re.match(r"^---\n(.*?)\n---\n", skill_md, re.S)
    out = {}
    if m:
        for line in m.group(1).splitlines():
            k, _, v = line.partition(":")
            out[k.strip()] = v.strip()
    return out


def collect(skill_dir, refs_py):
    files = []
    for dirpath, dirs, names in os.walk(skill_dir):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        for n in sorted(names):
            if n in SKIP or n.endswith(".pyc"):
                continue
            full = os.path.join(dirpath, n)
            files.append((os.path.relpath(full, skill_dir).replace(os.sep, "/"), full))
    if refs_py and not any(a == "scripts/refs.py" for a, _ in files):
        files.append(("scripts/refs.py", refs_py))
    return sorted(files)


def build(root, out_dir, include_coming_soon):
    problems, built = [], []
    with open(os.path.join(root, "site", "public", "tools.json"), encoding="utf-8") as f:
        status = {t["id"]: t["status"] for t in json.load(f)["tools"]}
    skills_dir = os.path.join(root, "skills")
    refs_py = os.path.join(root, "scripts", "refs.py")
    refs_py = refs_py if os.path.isfile(refs_py) else None
    for name in sorted(os.listdir(skills_dir)):
        d = os.path.join(skills_dir, name)
        if not os.path.isfile(os.path.join(d, "SKILL.md")):
            continue
        if status.get(name) != "shipped" and not include_coming_soon:
            continue
        with open(os.path.join(d, "SKILL.md"), encoding="utf-8") as f:
            h = header(f.read())
        if h.get("name") != name:
            problems.append(f"{name}: header name '{h.get('name')}' does not match the folder")
        if not h.get("description"):
            problems.append(f"{name}: header has no description")
        files = collect(d, refs_py)
        total = sum(os.path.getsize(p) for _, p in files)
        if total > LIMIT:
            problems.append(f"{name}: {total} bytes is over the {LIMIT} byte limit")
            continue
        os.makedirs(out_dir, exist_ok=True)
        zpath = os.path.join(out_dir, f"{name}.zip")
        with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
            for arc, p in files:
                zi = zipfile.ZipInfo(f"{name}/{arc}", FIXED_TIME)
                zi.external_attr = 0o644 << 16
                with open(p, "rb") as fh:
                    z.writestr(zi, fh.read(), zipfile.ZIP_DEFLATED)
        built.append((name, zpath, total))
    return built, problems


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
    ap.add_argument("--out", default=None)
    ap.add_argument("--include-coming-soon", action="store_true")
    a = ap.parse_args(argv)
    root = os.path.abspath(a.root)
    out = os.path.abspath(a.out or os.path.join(root, "dist", "skills"))
    built, problems = build(root, out, a.include_coming_soon)
    for name, zpath, total in built:
        print(f"built {os.path.relpath(zpath, root)} ({total} bytes unpacked)")
    if not built and not problems:
        print("no shipped skills to build (all tools are coming soon)")
    for p in problems:
        print(f"FAIL {p}", file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
