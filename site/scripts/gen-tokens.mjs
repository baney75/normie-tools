// Reads ../brand/tokens.json and writes src/styles/tokens.css.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(here, "../../brand/tokens.json");
const OUT = path.resolve(here, "../src/styles/tokens.css");

export function buildTokensCss(json) {
  const lines = [
    "/* Generated from brand/tokens.json by scripts/gen-tokens.mjs. Do not edit. */",
    ":root {",
  ];
  for (const [name, value] of Object.entries(json.colors)) {
    lines.push(`  --nt-${name}: ${value};`);
  }
  lines.push(
    '  --nt-font-display: "Fraunces", Georgia, serif;',
    '  --nt-font-text: "Figtree", system-ui, sans-serif;',
    "  /* IBM Plex Mono is not bundled, so code uses the system monospace font. */",
    "  --nt-font-code: ui-monospace, monospace;",
    "  /* Smallest tap target: 44px. */",
    "  --nt-tap: 2.75rem;",
    "  --nt-space-1: 0.25rem;",
    "  --nt-space-2: 0.5rem;",
    "  --nt-space-3: 1rem;",
    "  --nt-space-4: 1.5rem;",
    "  --nt-space-5: 2rem;",
    "  --nt-space-6: 3rem;",
    "  --nt-radius: 0.75rem;",
    "  /* Max readable width. An engineering choice; no research source is claimed. */",
    "  --nt-measure: 65ch;",
    "}",
    "",
  );
  return lines.join("\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const json = JSON.parse(fs.readFileSync(SRC, "utf8"));
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, buildTokensCss(json));
  console.log("wrote src/styles/tokens.css");
}
