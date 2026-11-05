import { defineConfig, devices } from "@playwright/test";

// Serves the built site. Run `npm run build` first (the root test:e2e script does).
const PORT = 4173;

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
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  ].filter((p) => !skip.has(p.name)),
});
