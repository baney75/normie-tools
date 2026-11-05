#!/usr/bin/env python3
"""nt: the NT command for AI helpers. Standard library only. No network use.

  nt refs search "<words>" [--limit N]   search the notes in research/
  nt tools [--status shipped|coming_soon]  list tools from site/public/tools.json
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import refs  # noqa: E402


def tools(argv):
    status = argv[argv.index("--status") + 1] if "--status" in argv else None
    with open(os.path.join(ROOT, "site", "public", "tools.json"), encoding="utf-8") as f:
        data = json.load(f)
    for t in data["tools"]:
        if status is None or t["status"] == status:
            print(f"{t['id']}\t{t['status']}\t{t['name']}")
    return 0


def main(argv):
    if argv[:2] == ["refs", "search"]:
        return refs.main(["search", *argv[2:]])
    if argv[:1] == ["tools"]:
        return tools(argv[1:])
    print(__doc__.strip(), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
