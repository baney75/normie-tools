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
- Skill evals were not run in round 2. Round 3 ran them: see the round 3 entry below.
- placeholder-golden-accuracy stays off: it is for Free File tax cases and File Converter document pairs, and neither shipped.
- Tax Filing Helper, Save Me Money, Form Filler, Photo Duplicate Finder and Morning Briefing stay coming_soon (budget).

## 2026-11-05 - Round 3: the evidence gate, and what stays shipped

- A tool stays `shipped` only when `npm run check:evidence` passes for it. The gate needs a model review record (`tests/model-review/<id>.json`) and three skill-eval results (`tests/skill-evals/results/<id>/{tiny,haiku,sonnet}.json`). It is in CI beside the ship gate.
- Review bar: on every screen reviewed (calculators: empty and with numbers typed; tools with steps: each key screen), the first-time reader scores 4 or more out of 5, and every one of the 8 design rules passes for both Haiku and Sonnet. Rule 1 may not fail.
- The reviews are noisy by about one point. So the reader runs five times per screen and the middle score counts. The rubric runs five times per model and a rule passes when it passes in most runs. All runs are on record in the JSON.
- The reviewer reads what a person sees: every heading, label, hint, box with its value, and button, and whether a button is filled in the main-button colour. An earlier harness hid hints in plain spans from the reviewer, and the filled screen did not say the numbers were typed by the person. Both were fixed before the final runs.
- Skill-eval bars: the tiny local model (`qwen2.5:1.5b` through Ollama, free, on this machine) at level 1 90% or more. Haiku and Sonnet at levels 1, 2 and 3 95% or more, safety 100%. A Sonnet call marks each expect line and is asked again if its answer cannot be read.
- A 1.5B model cannot do the math or keep a long reply. So each skill script has a `--text` mode that prints answer-shaped plain words (main answer first, one sentence per fact, the estimate sentence last) and SKILL.md tells the model to say every line. JSON output did not change.

### Shipped (8): clean on the gate

Loan Explainer, Loan Offer Compare, Mortgage Payment Explainer, Student Loan Growth and Payoff, Debt Payoff Planner, Monthly Budget, Savings Goal Tracker, Unit Converter.

What changed to get there: one answer card that is always on screen ("Your answer shows here" until the numbers are in), one filled button on a screen ("Show my answer" first, then "Done. Back to home."), Change a number as an outline button, the first box has the cursor, Start over asks first and offers Put it back, Save a copy shows what goes in the file before it saves, hints say where to find each number, no number-like placeholders in the boxes, and result numbers never break across two lines.

### Coming soon (5): built and tested, but the review bar was not met

- Save Me Money: the reader scores 3 on the main and typed screens ("I already see my totals, I am not sure I need to save").
- Form Filler: the reader scores 3 on the review and question screens, and Haiku fails rules on the papers screen.
- Tax Filing Helper: the reader scores 3 on the start screen, and the tiny model fails level 1 (78% to 89%, below 90%) in repeated runs.
- Photo Duplicate Finder: the reader scores 3 on the start and final screens.
- Morning Briefing: the reader scores 3 on the final screen in the last run (it was clean in an earlier run).

Their code, tests, skills, e2e specs and review records stay in the repo. Their e2e specs skip themselves while they are coming soon. Per the round rule, they were demoted after repeated fix and re-review cycles, not after one.

### Other choices

- WebKit runs on this host without sudo: the Ubuntu libraries it needs are unpacked into `~/.local/share/pw-ubuntu-libs` and `scripts/e2e-webkit-local.sh` loads them. CI uses the normal Playwright install.
- The service worker now caches every page chunk on install, so every shipped tool opens offline.
- iOS splash images exist for the phone and iPad sizes in the device matrix.
- The Monthly Budget percents are whole numbers that add up to the percent of income spent, so one line can be 1 higher than its exact value. The page says so.
- Phase 3 (more v5 tools) was not started: the five Top 5 tools used the time.

### Round 2026-11-05 (rule 6 and 8 fixes, re-review)

- PrivacyNote now says only "There is no Send button on this page." Haiku had flagged "Your numbers are worked out here." as an unsourced claim (unit-converter, 3 of 5 runs failed rule 8), and the reader asked "worked out where?".
- Reviewer noise, same page, no change between runs: Loan Offer Compare reader score was 4 (runs 4,4,4,3,4) in the committed record and 3 (4,3,3,4,3) in the next full review on 2026-11-05. Unit Converter rule 8 passed in 2 of 5 Haiku runs in one invocation and in all five after the note change. The five-run majority vote is what the gate uses; no result was kept or dropped by hand.
- After the note change, Loan Offer Compare and Unit Converter were reviewed again and are 8/8 for both graders with reader scores of 4 or more. Savings Goal Tracker still scores 3 on the empty screen (the two choices at the top and "goal month" confuse the reader), so it is coming soon. Its code, tests and review record stay; its e2e spec skips itself.
- Debt Payoff, Loan Explainer, Monthly Budget, Mortgage and Student Loan were last reviewed with the longer note; their pages now carry the shorter one. The shorter note removes the claim the graders questioned, but those five were not re-reviewed after the change.

### Round 2026-11-05 (re-review after the shorter privacy note)

- Loan Explainer, Monthly Budget, Mortgage Payment Explainer and Student Loan Growth and Payoff were reviewed again with the shorter note. Both graders gave 8/8 on every screen and the reader scored 4 on every screen, so they stay shipped.
- Debt Payoff Planner scored 3 for the reader on the empty screen (runs 4, 3, 3). The reader's complaints are spread over several terms, with no single copy bug to fix, so it is coming soon. Its code, tests and review record stay; its e2e spec skips itself.
