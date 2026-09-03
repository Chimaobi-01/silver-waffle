/**
 *  * @file playwright.config.js
  * Playwright configuration optimized for web scraping.
   * Note: This is used if you run via `npx playwright test`.
    * For CLI usage, BrowserManager handles its own launch.
     */

import { defineConfig } from '@playwright/test';

export default defineConfig({
    // Scraping-oriented timeouts (generous for slow sites)
    timeout: 120_000,
    expect: {
        timeout: 10_000
    },

    // Run fully parallel for independent scrapes
    fullyParallel: true,
    workers: 3,

    // Reporter
    reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],

    // Shared settings
    use: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/New_York',
        actionTimeout: 15_000,
        navigationTimeout: 45_000,
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },

    // Projects (browsers to test against)
    projects: [
        {
            name: 'chromium',
            use: { browserName: 'chromium' }
        },
        {
            name: 'firefox',
            use: { browserName: 'firefox' }
        }
    ]
});

