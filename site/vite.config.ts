/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Relative base so the built site works from any static host or sub-folder.
export default defineConfig({
  base: "./",
  plugins: [react()],
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
