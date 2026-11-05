import { defineConfig, devices } from "@playwright/test";

const PORT = 8788;

/**
 * Browser tests against the real Worker running locally under Wrangler.
 * Three projects cover desktop, Android and iPhone (WebKit).
 *
 * PW_CHROME_CHANNEL lets a machine without Playwright's own Chromium use an
 * installed browser instead (for example "chrome"). CI leaves it unset.
 */
const channel = process.env["PW_CHROME_CHANNEL"];
const chromium = channel === undefined ? {} : { channel };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: process.env["CI"] !== undefined,
  retries: process.env["CI"] === undefined ? 0 : 1,
  reporter: process.env["CI"] === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"], ...chromium } },
    { name: "android", use: { ...devices["Pixel 7"], ...chromium } },
    { name: "iphone", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `npx wrangler dev --port ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/healthz`,
    reuseExistingServer: process.env["CI"] === undefined,
    timeout: 60_000,
  },
});
