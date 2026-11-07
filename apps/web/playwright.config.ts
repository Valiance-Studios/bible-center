import {defineConfig, devices} from '@playwright/test';

/**
 * Not the dev server's usual port, and never a server that is already running: one started with
 * `npm run dev:staging` talks to the real Firebase project, so tests reusing it would create real accounts.
 */
const E2E_PORT = 5174;
const baseURL = `http://localhost:${E2E_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{name: 'chromium', use: {...devices['Desktop Chrome']}}],
  webServer: {
    command: `npm run dev -- --mode development --port ${E2E_PORT}`,
    url: baseURL,
    reuseExistingServer: false,
  },
});
