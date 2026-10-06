import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
const FAULT_PORT = 4174;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  // First load compiles ~10 MB of MuPDF WASM in the worker.
  expect: { timeout: 20_000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, grepInvert: /@fault|@it-locale/ },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }, grepInvert: /@fault|@it-locale|@perf/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, grepInvert: /@fault|@it-locale|@perf/ },
    { name: 'chromium-it', use: { ...devices['Desktop Chrome'], locale: 'it-IT' }, grep: /@it-locale/ },
    {
      name: 'chromium-fault',
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${FAULT_PORT}` },
      grep: /@fault/,
    },
  ],
  webServer: [
    {
      command: 'npm run build && npm run preview',
      port: PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
    {
      command: 'npm run build:e2e-fault && npm run preview:e2e-fault',
      port: FAULT_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
    },
  ],
});
