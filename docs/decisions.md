# Decisions

Log of choices made while scaffolding NT. Newest first.

## 2026-11-05 - Privacy machine list and path markers

- Kept the four house machine names as fragment-built patterns only (never written as full hostnames in this file).
- Dropped an accidental extra machine alias from the first Claude scaffold pass.
- Path markers cover common home directories on Unix and Windows, plus the shared agent workspace path segment, all built from fragments in the scanner.
- Patterns stay fragment-built so committed files never contain the banned literals.

## 2026-11-05 - Coding CLI: Claude fallback after Codex

- First attempt used Codex GPT-6.1 Sol with full sandbox bypass on the worktree.
- Codex ran a long time, wrote no package.json or scripts, then exited.
- Fell back to Claude Code sonnet with bypassPermissions, as the coding-cli-stack default when Codex is blocked.
- Claude produced package.json, check scripts, CI, templates, and a green npm test.

## 2026-11-05 - License allow-list exception for argparse

- markdownlint-cli2 pulls in argparse with Python-2.0 / PSF-2.0.
- Those SPDX ids are not on the short allow list.
- Approved argparse by name in docs/license-approvals.txt as a dev-only dependency that is never shipped to people.
- Revisit before any browser or app bundle ships argparse.

## 2026-11-05 - Reading level limit set to grade 7.0

- Person-facing target is "about grade 6".
- The checker uses a simple Flesch-Kincaid estimate with a hard fail at grade 7.0.
- Gives a little headroom for short product names without letting dense copy through.

## 2026-11-05 - Markdownlint relaxations

- Disabled MD013 (line length) and MD034 (bare URL) repo-wide so research URL lines and tables stay readable.
- Disabled MD060 repo-wide for compact tables.
- Under plan/ only, also relaxed blank-line, inline HTML, emphasis, and fence-language rules so existing plan docs pass without a rewrite.
- Did not disable substantive content checks to force green.

## 2026-11-05 - Apache-2.0

- Chose Apache-2.0 for the repo (LICENSE, NOTICE, docs/license-choice.md).
- Matches the product brief and keeps patent grant language for contributors.

## 2026-11-05 - Private first, public after green CI and privacy scan

- GitHub repo starts PRIVATE.
- Flip to public only after: clean custom privacy scan, clean gitleaks (or documented free equivalent), and green CI on the pushed SHA.
- Enable secret scanning and push protection when flipping public.

## 2026-11-05 - Default branch name main

- Local import used master.
- Rename to main before the first GitHub push so CI and docs match the brief.
