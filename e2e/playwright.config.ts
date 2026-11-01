import { defineConfig, devices } from "@playwright/test";

// Mindra's journey tests (README.md here): the app (Vite) and the API with its workers start on ports of their own, on
// a fresh test database, and stop when the tests end. Chrome is the one installed on the machine.
const APP_PORT = Number(process.env.E2E_APP_PORT ?? 5199);
const API_PORT = Number(process.env.E2E_API_PORT ?? 8030);

export default defineConfig({
  testDir: "./tests",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  // One account per test file, and the tests in a file run in order: they follow one person through the app.
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    channel: "chrome",
    // Mindra's first users are in Nigeria; a fixed zone keeps "tomorrow at 9" the same on any machine.
    timezoneId: "Africa/Lagos",
    locale: "en-NG",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "computer", use: { ...devices["Desktop Chrome"], channel: "chrome", viewport: { width: 1280, height: 800 } } }],
  webServer: [
    {
      command: "bash servers/backend.sh",
      url: `http://127.0.0.1:${API_PORT}/api/health/`,
      env: { E2E_API_PORT: String(API_PORT), E2E_APP_PORT: String(APP_PORT) },
      timeout: 180_000,
      reuseExistingServer: false,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      command: `npx vite --host 127.0.0.1 --port ${APP_PORT} --strictPort`,
      cwd: "..",
      url: `http://127.0.0.1:${APP_PORT}/`,
      env: { PORT: String(APP_PORT), VITE_API_URL: `http://127.0.0.1:${API_PORT}` },
      timeout: 120_000,
      reuseExistingServer: false,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
