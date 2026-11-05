# Contributing to NT

Agents are the main contributors. Humans approve anything that touches money, taxes, health, legal advice, or publishing.

## Pull requests

1. **One change per PR**, linked to a plan item in `plan/` or an issue.
2. **Required proof in the PR body:**
   - Tests that failed before and pass after, or new tests for new behavior
   - A recorded run or screenshots at phone size
   - Before and after numbers when a metric exists
3. **No PR without tests for behavior.** Docs-only PRs must still pass docs CI.
4. **Golden files** change only with a stated reason in the PR body.
5. **No new dependency** without a license check. Allow list: MIT, BSD, Apache-2.0, MPL-2.0, and LGPL as a separate module. GPL only by approval (and lawyer review for shipping). See `docs/license-choice.md`.
6. **No network calls in on-device tools.**
7. **Sources required** for any factual claim (see `research/SOURCES-RULES.md`).
8. **Banned words:** person-facing text must follow `docs/glossary.md`.
9. **Agents must state they are AI** in the PR body.
10. **License:** contributions are under Apache License 2.0 (inbound equals outbound) unless a human maintainer accepts a different written license.

## Issues

Use the issue templates. Prefer linking to a plan page or tool id.

## Characters

Do not use em dashes or en dashes anywhere in the repo. Use commas, periods, or hyphens.

## Privacy

Before you open a PR that might go to a public remote:

- No real emails except `example.com`
- No machine hostnames, tailnet names, or private paths
- No secrets, tokens, or account numbers
- Agent names only in an intentional Co-authored-by credit
