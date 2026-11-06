/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { shareHead } from "./share-head";

// The site lives at https://dbaney.com/nt/, so the base is absolute.
export default defineConfig({
  base: "/nt/",
  plugins: [react(), shareHead()],
  // The service worker reads this list to save every file, including the lazy tool pages, for offline use.
  build: { manifest: "asset-manifest.json" },
  // Tool math lives in ../tools/*/calc.mjs and is imported by the pages, so let the dev server read it.
  server: { fs: { allow: [".."] } },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
