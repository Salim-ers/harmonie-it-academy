import { defineConfig, devices } from "@playwright/test";

/**
 * Parcours de bout en bout contre un serveur déjà démarré (`npm run build && npm start`)
 * avec une base locale importée et `EMAIL_DEV_OUTBOX=1`.
 * E2E_BASE_URL : adresse du serveur (http://localhost:3000 par défaut).
 * E2E_CHROMIUM_PATH : navigateur Chromium à utiliser si `npx playwright install chromium` n'est pas possible.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    locale: "fr-FR",
    trace: "retain-on-failure",
    launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH, args: ["--no-sandbox"] } : {},
  },
  projects: [
    { name: "bureau", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
});
