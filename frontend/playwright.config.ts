import { defineConfig, devices } from '@playwright/test';

// Needs the API (port 3000) running with the sample data seeded:
//   cd backend && npm run seed && npm start
// Or test a deployed site instead of the dev server:
//   E2E_BASE_URL=https://shop.example.com E2E_ADMIN_PASSWORD=... npm run e2e
const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: remote ?? 'http://localhost:4200',
    // Lets the tests run against Caddy's local certificate when testing on localhost.
    ignoreHTTPSErrors: !!remote && new URL(remote).hostname === 'localhost',
    trace: 'retain-on-failure'
  },
  webServer: remote
    ? undefined
    : {
        command: 'npm start',
        url: 'http://localhost:4200',
        reuseExistingServer: true,
        timeout: 120_000
      },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } }, testIgnore: /mobile\.spec\.ts/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec\.ts/ }
  ]
});
