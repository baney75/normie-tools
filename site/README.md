# site/

The NT website. Phone first. Static files only, no backend. Builder README: technical words are fine here.

Status: all 76 tools are `coming_soon`. Nothing is usable yet.

## Stack

Vite 8, React 19, TypeScript (strict), vitest 5 with Testing Library and jsdom. Icons from lucide-react.

## Scripts

Run from `site/`, or use the root `npm run build`.

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Runs `tokens` and `llms` first (prebuild), then `tsc --noEmit` and `vite build` |
| `npm run tokens` | Writes `src/styles/tokens.css` from `../brand/tokens.json` |
| `npm run llms` | Writes `public/llms.txt` from `public/tools.json` |
| `npm test` | `vitest run` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:e2e` | Playwright against `vite preview`. Build first (the root `npm run test:e2e` does) |

Run one test file: `npx vitest run src/pages/pages.test.tsx`.

## How it works

- **Ship rule.** Only a tool with status `shipped` in `public/tools.json` may be usable. Every other tool shows its name, a Coming soon badge, and a link home. Tests check this for all tools.
- **Hash routing.** Routes look like `#/agents`, `#/install`, `#/research`, `#/tools/<id>`. This works on any static host. See `src/lib/hashRouter.ts`.
- **Fonts.** Fraunces (soft axis) and Figtree load from `node_modules` through `src/styles/fonts.css` and are bundled by Vite. No font loads from another server. IBM Plex Mono is not bundled; code uses the system monospace font.
- **Tokens.** `src/styles/tokens.css` is generated. Do not edit it.
- **Layout.** `Shell` sets `container-type: inline-size` on the main area. The optional side panel shows only at 60rem container width. Text width is capped by `--nt-measure`.
- **Motion.** `src/styles/motion.css` turns off all animation when the device asks for less. No timers, autoplay, or `alert()` in source.
- **Offline.** `public/sw.js` caches the shell and static files. It handles same-origin GET requests only, and registers in production builds only.
- **Copy.** Person-facing strings live in `src/copy/pages.ts`. `src/copy/pages.test.ts` runs the repo reading-level, jargon, and no-clutter checks on them. The `builders` sub-object is skipped.
- **Agents.** `public/llms.txt` is generated. Links are relative because no site address exists yet.

## Browser tests

Playwright runs from `site/e2e/` in three projects: Chromium, WebKit, Firefox. Install once with `npx playwright install --with-deps chromium webkit firefox` (system libraries need `sudo`). Run one project: `npx playwright test --project=chromium`.

- `viewport-matrix.spec.ts`: home, `/agents`, `/install` and every shipped tool (from `tools.json`) across iPhone SE, 15, 15 Pro Max, iPad mini, iPad Air portrait and landscape, Split View 1/3, 1280 and 1920. No sideways scroll, visible first heading and first input or button, tap targets at least 44px. WebKit writes every clipped screenshot to `../shots/matrix/`; Chromium writes home only. Chromium also writes home screenshots to `site/screenshots/` (gitignored) and two committed shots to `../shots/` (`home-390.png`, `home-1280.png`).
- `accessibility.spec.ts`: axe (WCAG 2.2 AA tags) at 390px on home, agents, install and the demo flow.
- `reduced-motion.spec.ts`, `stepper-intro.spec.ts`, `autosave-resume.spec.ts`, `upload-error-contract.spec.ts`: use the demo flow at `#/harness`. It is a test page, not a tool, and is not in `tools.json`.
- `coming-soon.spec.ts`: a Coming soon tile is not a link.
- `offline.spec.ts`: after one online visit, home, agents, install and every shipped tool load and take typing offline (Chromium only). The worker saves the build's `asset-manifest.json` file list, so lazy tool pages are cached too.

WebKit on a host without those libraries (no sudo): extract the Ubuntu noble `.deb` files for `libicu74`, `libxml2` and `libflite1` (`ar x` then `tar -xf data.tar.zst`) into `~/.local/share/pw-ubuntu-libs`, then run `scripts/e2e-webkit-local.sh [playwright args]` from the repo root. It sets `LD_LIBRARY_PATH` and `LD_PRELOAD` only if that folder exists (Playwright's WebKit wrapper overwrites `LD_LIBRARY_PATH`, so the preload is needed). CI does not use it.

Host limits: WebKit needs system libraries (`libicu`, `libxml2`, `libflite1` on Debian family) that a plain user install cannot add. On a host without them, set `NT_E2E_SKIP=webkit,firefox` to skip those projects. They stay configured and are not run locally. CI installs them with `--with-deps`.
