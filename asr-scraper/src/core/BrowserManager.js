/**
 *  * @file src/core/BrowserManager.js
  * Browser lifecycle manager with stealth contexts and proxy support.
   */

import { chromium, firefox } from '@playwright/test';
import { USER_AGENTS } from '../config/sources.js';

export class BrowserManager {
    #browser = null;
    #contexts = new Map();
    #options;

    constructor(options = {}) {
        this.#options = {
            headless: options.headless ?? true,
            slowMo: options.slowMo ?? 0,
            proxy: options.proxy ?? null,
            viewport: options.viewport ?? { width: 1920, height: 1080 },
            ...options
        };
    }

    async launch() {
        if (this.#browser) return this;

        const launchOptions = {
            headless: this.#options.headless,
            slowMo: this.#options.slowMo,
            args: [
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        };

        if (this.#options.proxy) {
            launchOptions.proxy = this.#options.proxy;
        }

        // Try Chromium first; fallback to Firefox if blocked
        try {
            this.#browser = await chromium.launch(launchOptions);
        } catch (err) {
            console.warn('[BrowserManager] Chromium launch failed, trying Firefox:', err.message);
            this.#browser = await firefox.launch(launchOptions);
        }

        console.log('[BrowserManager] Browser launched:', this.#browser.browserType().name());
        return this;
    }

    /**
       * Create an isolated browser context with unique fingerprint.
          * @param {string} contextId - Unique identifier for this context
             * @returns {Promise<import('@playwright/test').BrowserContext>}
                */
    async createContext(contextId = 'default') {
        if (!this.#browser) await this.launch();
        if (this.#contexts.has(contextId)) return this.#contexts.get(contextId);

        const userAgent = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
        const locale = ['en-US', 'en-GB', 'en-CA'][Math.floor(Math.random() * 3)];
        const timezoneId = ['America/New_York', 'Europe/London', 'America/Sao_Paulo'][Math.floor(Math.random() * 3)];

        const context = await this.#browser.newContext({
            userAgent,
            locale,
            timezoneId,
            viewport: this.#options.viewport,
            deviceScaleFactor: 1,
            hasTouch: false,
            javaScriptEnabled: true,
            bypassCSP: true,
            extraHTTPHeaders: {
                'Accept-Language': `${locale},${locale.split('-')[0]};q=0.9`,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'DNT': '1',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        // Inject stealth script to mask navigator.webdriver
        await context.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
            // Mask permissions
            const originalQuery = window.navigator.permissions?.query;
            if (originalQuery) {
                window.navigator.permissions.query = (parameters) =>
                    parameters.name === 'notifications'
                        ? Promise.resolve({ state: Notification.permission })
                        : originalQuery(parameters);
            }
        });

        this.#contexts.set(contextId, context);
        return context;
    }

    async closeContext(contextId) {
        const context = this.#contexts.get(contextId);
        if (context) {
            await context.close();
            this.#contexts.delete(contextId);
        }
    }

    async close() {
        for (const [id, context] of this.#contexts) {
            await context.close();
        }
        this.#contexts.clear();
        if (this.#browser) {
            await this.#browser.close();
            this.#browser = null;
        }
    }
}

