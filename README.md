# NT (normie-tools)

**Small tools for everyday things. Use them yourself, or ask your AI app.**

NT aims to be the greatest tools for normies: everyday people with no tech background. The word "normie" is used with respect.

## Status

Plan stage. Nothing is built or published yet. The plan PDF and working notes live under `plan/`.

## Research

NT is built from research on real people, not guesses. Start at [research/README.md](research/README.md) for the topic index, and see [docs/design-from-research.md](docs/design-from-research.md) for how each finding becomes a rule, a component, and a test.

## What is here

| Path | What it is |
|---|---|
| `plan/` | Version 5 plan PDF, ideas, platform sources, and v5 working notes |
| `brand/` | Marks, wordmarks, favicons, tokens |
| `research/` | Checked sources on attention, literacy, trust, money stress, and related topics |
| `tools/` | Future tool folders (empty scaffold) |
| `skills/` | Future AI-app add-ons |
| `site/` | Future NT website |
| `app/` | Future NT App |
| `cli/` | Future `nt` command (builders) |
| `router/` | Future tool finder |
| `tests/` | Shared fixtures, golden files, harness |
| `docs/` | Builder docs |

## Run it

Needs Node 22 or newer and Python 3. From the repo root:

```bash
npm ci                    # install everything
npm test                  # every repo check
npm run test:site         # site unit tests
npm run test:skills       # skill tests (Python)
npm run build             # build the site into site/dist
npm run test:e2e          # build, then browser tests in Chromium, WebKit and Firefox
npm run test:a11y         # build, then the accessibility browser tests
npm run test:upload-contract  # upload message tests
npm run check:ship-gate   # the ship gate
```

Browser tests need browsers once: `cd site && npx playwright install --with-deps chromium webkit firefox`. Without `--with-deps`, WebKit may still fail on a Linux machine that lacks system libraries. Run one browser with `npm run test:e2e -- --project=chromium`. CI installs all three. More in `site/README.md`.

## House ideas (short)

- Plain words. Person-facing copy targets about grade 6.
- Work on the person's phone or computer when the tool says so.
- Preview before change. Undo after.
- Never invent facts. Never submit, pay, or send for the person.
- Agents: read `AGENTS.md` before you touch the repo.

## License

Apache License 2.0. See `LICENSE` and `NOTICE`. Why this license: `docs/license-choice.md`.

## Contributing

Agents are the main contributors. Humans approve money, taxes, health, legal, and publishing. See `CONTRIBUTING.md`.
