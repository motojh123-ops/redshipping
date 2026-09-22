import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Red Shipping ERP
 * Configured specifically for integration with Litmus Check and litmus-agent CLI.
 * 
 * - Outputs JSON report to ./reports/report.json
 * - Retains traces and screenshots on failure to ./traces for AI triage
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['json', { outputFile: './reports/report.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  outputDir: './traces',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
