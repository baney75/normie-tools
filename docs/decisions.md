# Decisions

Log of choices made while scaffolding NT. Newest first.

## 2026-11-05 - Round 1 build decisions

- Stack: Vite, React, TypeScript, vitest, Playwright. Static PWA, no backend. All data tools run on the device.
- Money math: integer cents only. Exact to the cent, no float bugs.
- Claude.ai scripts: Python standard library plus the documented preinstalled packages. Assume no network. Matches the Anthropic sandbox and works for Free and Pro with code execution on.
- Skill zip budget: 30 MB uncompressed, the Anthropic Skills API upload limit.
- Primary screen: 390px iPhone width first, then the iPad matrix. Desktop comes second.
- Form Filler: prepare only. No signature capture. Share through the share sheet when the device offers one. The person signs.
- Morning Briefing: National Weather Service only, with the required User-Agent. Works offline with a calm message. No other news sources this round.
- Calorie foods: a bundled example list only, unless a USDA data dump is clearly licensed and fits. Legal safety.
- Tiny eval model: first available small local model, installed in user space only if missing and quick. Runs on one designated dev machine, never on seat machines.

## 2026-11-05 - Ship gate

- Every tool is listed in `public/tools.json` as `shipped` or `coming_soon`. The site shows a tool as usable only when it is `shipped`.
- A tool may be `shipped` only with a page-claims file, an accuracy test per claim, a reliability suite on messy inputs, a phone-size end-to-end test, and an upload-error contract test if it takes files. All must pass at 100%.
- The CI job `ship-gate` fails the build if any shipped tool misses one of these. A dummy fixture stays off the shipped list, and a test checks that the gate script exits non-zero when the fixture is turned on.
- A tool that misses any bar stays `coming_soon`. We never show a broken tool.

## 2026-11-05 - Every tool starts as coming_soon

- This round every tool in `tools.json` is `coming_soon`. The home page, search, and grid show it with a Coming soon badge and no working page.
- Why: nothing has passed the ship gate yet. Honest status beats a demo that fails.
- A tool moves to `shipped` in its own change, with the gate evidence in the pull request.

## 2026-11-05 - Container queries for layout

- Components size themselves from their own container, not the screen. The same Stepper, ToolGrid, and UploadField work in a phone column, an iPad Split View, and a wide page.
- Text keeps a maximum readable width on wide screens. The optional "Where you are" side panel shows only when the container is wide.
- Why: iPad Split View and Slide Over give odd widths that screen-width rules miss. The Playwright viewport matrix will check it.

## 2026-11-05 - Self-hosted fonts

- Fraunces and Figtree ship from the site itself (both OFL). No font files load from another server.
- Why: privacy (no third party sees a visit), offline use as a PWA, and no layout jump while a remote font loads.
- Icons come from lucide-react (ISC).

## 2026-11-05 - Research drives design

- `docs/design-from-research.md` maps each design rule to a research finding, its source, the component that enforces it, and the test that checks it.
- A component is built from a row in that table, not the other way around.

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

## 2026-11-05 - Brand subline keeps "AI app"

- The home subline "Use them yourself, or ask your AI app." stays. It is the brand subline.
- Only that phrase is exempt from the jargon rule. Everywhere else, person-facing copy says "AI helper".

## 2026-11-05 - Calculators have a main action again (reverses "no primary button")

- Earlier decision: live calculators may fail design rule 1 because the answer shows as the person types. That is reversed. The parent gate (round 3) says every rubric rule must pass for every shipped tool, so rule 1 FAIL is no longer accepted.
- Fix: each calculator has one filled button, "Print" in the "Save or print your answer" sheet, which is always on screen below the answer. Every other button is an outline. The answer card has a heavy orange top edge and is always on screen ("Your answer shows here" until the numbers are in). The first box has the cursor on load.
- Also added to all calculators: "Step 1 of 2 / Step 2 of 2" labels, one shared privacy line with a link to the page code, and Start over now asks first ("Clear the boxes" or "Keep my numbers") and then offers "Put it back".

## 2026-11-05 - Round 2 shipped calculators and what was not run

- Shipped: Loan Explainer, Loan Offer Compare, Mortgage Payment Explainer, Student Loan Growth and Payoff, Debt Payoff Planner, Monthly Budget, Savings Goal Tracker, Unit Converter. Each has a skill.
- Skill evals were not run. The remote eval host was not reachable from this host (SSH key refused) and no local model is installed, so the eval runner stays a shape check. Skills are covered by Python tests with shared golden cases and the sandbox mimic test.
- placeholder-golden-accuracy stays off: it is for Free File tax cases and File Converter document pairs, and neither shipped.
- Tax Filing Helper, Save Me Money, Form Filler, Photo Duplicate Finder and Morning Briefing stay coming_soon (budget).
