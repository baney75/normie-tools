# scripts/

Checks that CI and `npm test` run. Plain Node, no build step. Node 22 or newer.

## Run them

```bash
npm install        # once; installs markdownlint-cli2
npm test           # every check, then a summary
npm run check:privacy   # one check; names are in package.json
```

`npm test` runs all checks even when one fails, so one run lists every problem.
Each script also takes `--root <dir>` to scan another folder (the unit tests use this).

## What each check does

| Script | Rule |
| --- | --- |
| `check-banned-characters.mjs` | No U+2013 or U+2014 in any text file. Skips pdf, png, svg, lock and other binary types. |
| `check-privacy.mjs` | No real emails (only example.com and localhost), no house machine names, no private tailnet suffix, no private path markers, no ghp_, gho_, sk- or AWS key shapes, no private key headers. Reports path, line and rule. Never prints the match. Patterns are built from fragments so the script does not match itself. |
| `check-sources.mjs` | Each `research/*.md` topic file (not README or SOURCES-RULES) has a `URL:` line or markdown link and a real `Checked: YYYY-MM-DD` date. A file with no URL passes only if it is marked TODO and has no numeric claim line. Lines with TODO, headings and metadata lines are not claims. |
| `check-licenses.mjs` | Allows MIT, BSD, Apache-2.0, MPL-2.0, ISC, CC0, Unlicense, 0BSD. "A OR B" passes if one branch is allowed. LGPL only under a `modules/`, `vendor/` or `third_party/` path. GPL fails unless the package is named in `docs/license-approvals.txt`. That file can also approve one package with an unlisted license, with a reason in a comment. No dependencies passes. |
| `check-required-tests.mjs` | Each folder directly under `tools/` that has code files needs a test file. A tools folder with only READMEs passes. |
| markdownlint-cli2 | Config in `.markdownlint-cli2.jsonc`. Line length (MD013), bare URLs (MD034) and compact table pipes (MD060) are off. `plan/.markdownlint.jsonc` also relaxes blank-line and layout rules for imported plan notes. |
| `check-banned-jargon.mjs` | Glossary terms (left column of `docs/glossary.md`) must not appear in person-facing copy. |
| `check-reading-level.mjs` | Flesch-Kincaid grade at most 7.0 per file (target is about grade 6). |
| `check-no-clutter.mjs` | Average sentence at most 20 words, any sentence at most 30, any paragraph at most 150. |
| `check-links.mjs` | Offline check of relative markdown links and `#anchors`. External links are counted and skipped, and never fail the suite. |
| `tests/checkers.test.mjs` | `node:test` regression tests for the checkers. Fixtures are built in a temp folder at run time. |

## Person-facing scope

The jargon, reading-level and clutter checks scan only:

- `docs/person-facing/**/*.md`
- `tools/*/README.person.md` (when present)

They do not scan builder docs: AGENTS.md, CONTRIBUTING.md, `plan/`, `research/`, `brand/`, or the builder-note README files in `site/`, `app/`, `cli/`, `router/`, `skills/`, `tests/` and `tools/`. `docs/glossary.md` and `plan/v5-work/rewrite-plan.md` are never scanned for jargon because they define the terms.

Markdown is stripped before reading level and clutter are measured: headings, code, tables, comments and link targets are dropped. An empty file, or one with only headings, passes.

Jargon exceptions:

- The glossary says to keep some terms as plain or official names: preview, MB, GB, AGI, VITA, TCE, Free File, revision date, code execution. The check skips those.
- A line that carries the HTML comment `nt-allow-jargon` is skipped. Use it only for an exact app button or menu name (rewrite plan rule 4).

## Skips and limits

- Binary files are skipped by extension and by a NUL byte test.
- Reading level uses a syllable estimate, so it is a guide. Treat a near miss as a prompt to simplify, not as a proof.
- The sources check proves a link and a date exist. It does not open the link.
- The privacy script is a floor. CI also runs gitleaks from the official release binary (no paid license).

## Placeholder jobs

`.github/workflows/ci.yml` still has two jobs named `placeholder-*`. They are set to `if: false` and only print SKIP. They stand for checks that need code:

- `placeholder-golden-accuracy`: Free File tax cases and File Converter document pairs
- `placeholder-tool-search-eval`: finding the right tool

To activate one: remove `if: false`, replace the echo step with the real command, and add the job to branch protection.

These two are live now (they were placeholders):

- `accessibility`: axe at phone size, reduced motion, progress indicator, autosave and resume (`npm run test:a11y`)
- `upload-error-contract`: wrong-file-type message names the type given and the type needed (`npm run test:upload-contract`)

## Branch names

CI runs on pushes to `main` and `master`. Renaming the default branch is not part of this scaffold.
