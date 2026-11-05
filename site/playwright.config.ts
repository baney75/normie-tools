import { defineConfig, devices } from "@playwright/test";

// Serves the built site. Run `npm run build` first (the root test:e2e script does).
const PORT = 4173;
// The site is served under /nt/, as on https://dbaney.com/nt/. Tests use paths with no leading slash.
const BASE = `http://127.0.0.1:${PORT}/nt/`;

// On a host that cannot run a browser, skip it by name: NT_E2E_SKIP=webkit,firefox.
// CI never sets this, so CI runs all three.
const skip = new Set((process.env.NT_E2E_SKIP ?? "").split(",").map((n) => n.trim()).filter(Boolean));

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: BASE,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ].filter((p) => !skip.has(p.name)),
});
