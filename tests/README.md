# tests/

Shared tests for NT.

- `fixtures/`: made-up sample files only. No real personal data.
- `golden/`: expected outputs. Change only with a stated reason in the PR.
- `harness/`: runners, property checks, and mocks.

A tool folder without tests fails CI. See `plan/v5-work/test-design.md`.

## Ship gate

`npm run check:ship-gate` reads `site/public/tools.json`. Each tool marked `shipped` needs, under `<dir>` (`tools/<id>` unless the tool sets `dir`):

- the page-claims file named by `claimsPath` (JSON with a `claims` list of `id` and `text`)
- `<dir>/tests/accuracy.test.*` naming every claim id
- `<dir>/tests/reliability.test.*` with messy inputs
- `site/e2e/<id>.spec.*` at phone width (430 or less)
- `<dir>/tests/upload-errors.test.*` when the tool sets `takesFiles: true`
- `<dir>/ship-record.json` with `passed` equal to `total`

`fixtures/ship-gate-dummy/` is a shipped tool with none of these. It stays off the real list. `scripts/tests/ship-gate.test.mjs` points the gate at it with `--manifest` and expects a failure.

Other folders: `model-review/` (pinned prompts, run by hand), `skill-evals/` (stub), `sandbox/` (network block for skill script tests).
