import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

/**
 * DreamRiver E2E Test Configuration
 *
 * Run all tests:       npx playwright test
 * Run with UI:         npx playwright test --ui
 * Run specific file:   npx playwright test tests/e2e/dream-submission.spec.ts
 * Run specific browser: npx playwright test --project=chromium
 * Debug mode:          npx playwright test --debug
 * View report:         npx playwright show-report
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// When CI runs against a Vercel preview URL guarded by Deployment Protection,
// every request needs the x-vercel-protection-bypass header. The secret is
// forwarded from GitHub Actions via VERCEL_PROTECTION_BYPASS. Locally this
// is undefined, so the header is omitted and tests run against a normal dev
// server unimpeded.
const VERCEL_BYPASS = process.env.VERCEL_PROTECTION_BYPASS;
const extraHTTPHeaders = VERCEL_BYPASS
  ? { 'x-vercel-protection-bypass': VERCEL_BYPASS }
  : undefined;

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: './test-results',

  /* Maximum time one test can run */
  timeout: 60_000,

  /* Expect timeout for assertions */
  expect: { timeout: 10_000 },

  /* Run tests in parallel across files */
  fullyParallel: false, // Sequential — auth state shared via storageState

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Limit parallel workers on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Shared settings for all projects */
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',

    /* Navigation timeout */
    navigationTimeout: 30_000,

    /* Ignore HTTPS errors (e.g. Vercel preview cert issues) */
    ignoreHTTPSErrors: true,

    /* Bypass Vercel Deployment Protection on preview URLs in CI. No-op
       when VERCEL_PROTECTION_BYPASS isn't set (i.e. local runs). */
    extraHTTPHeaders,
  },

  /* Configure projects for cross-browser and responsive testing */
  projects: [
    // ── Setup: authenticate once and save session ──────────
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // ── Desktop browsers ───────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ── Mobile viewports ───────────────────────────────────
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 7'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 14'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // ── Tablet ─────────────────────────────────────────────
    {
      name: 'tablet',
      use: {
        ...devices['iPad (gen 7)'],
        storageState: './tests/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  /* Run local dev server before starting tests (optional) */
  // Uncomment if you want Playwright to start your dev server:
  // webServer: {
  //   command: 'npm run dev',
  //   url: BASE_URL,
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
