#!/usr/bin/env python3
"""Search a folder of markdown notes. Standard library only. No network use.

Usage: python3 refs.py search "<words>" [--dir <folder>] [--limit N]

Default folder: research/ at the repo root. Inside a skill, pass --dir references.
Each hit shows file, line number, and the line. Files are ranked by how many
search words they contain, then by total matches.
"""
import argparse
import os
import re
import sys


def default_dir():
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.join(here, "..", "research")
    return repo if os.path.isdir(repo) else os.path.join(here, "..", "references")


def tokens(query):
    return [t for t in re.findall(r"[a-z0-9']+", query.lower()) if len(t) > 1]


def search(folder, query, limit=10):
    words = tokens(query)
    if not words:
        return []
    results = []
    for dirpath, _, names in os.walk(folder):
        for name in sorted(names):
            if not name.lower().endswith(".md"):
                continue
            path = os.path.join(dirpath, name)
            with open(path, encoding="utf-8", errors="replace") as f:
                lines = f.read().splitlines()
            text = "\n".join(lines).lower()
            present = [w for w in words if w in text]
            if not present:
                continue
            hits = [(i + 1, ln.strip()) for i, ln in enumerate(lines) if any(w in ln.lower() for w in words)]
            results.append((len(present), len(hits), os.path.relpath(path, folder), hits))
    results.sort(key=lambda r: (-r[0], -r[1], r[2]))
    return results[:limit]


def main(argv=None):
    p = argparse.ArgumentParser(prog="refs")
    sub = p.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search")
    s.add_argument("query")
    s.add_argument("--dir", default=default_dir())
    s.add_argument("--limit", type=int, default=5)
    a = p.parse_args(argv)
    if not os.path.isdir(a.dir):
        print(f"No notes folder at {a.dir}", file=sys.stderr)
        return 2
    found = search(a.dir, a.query, a.limit)
    if not found:
        print("No matches.")
        return 1
    for _, _, name, hits in found:
        print(name)
        for n, line in hits[:3]:
            print(f"  {n}: {line[:160]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
