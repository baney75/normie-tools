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
