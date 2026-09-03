/**
 *  * @file src/scrapers/XGScraper.js
  * Scrapes expected goals (xG) and expected goals against (xGA) per match.
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';

export class XGScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeMatches(matches) {
        const results = [];
        for (const match of matches) {
            try {
                const xg = await this.#scrapeSingleMatch(match);
                if (xg) results.push(xg);
            } catch (err) {
                console.warn(`[XGScraper] Skipping ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`);
            }
        }
        return results;
    }

    async #scrapeSingleMatch(match) {
        const primary = SOURCE_CONFIG.xg.primary;
        const context = await this.#browserManager.createContext('xg');
        const page = await context.newPage();

        try {
            // Understat requires match ID; we attempt search-based discovery
            const searchUrl = `${primary.baseUrl}/main.php`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            // Fallback: try FBref direct match URL pattern
            const fbref = SOURCE_CONFIG.xg.fallback;
            const fbrefUrl = `${fbref.baseUrl}/en/matches/${match.date.replace(/-/g, '')}`;

            await rateLimit(fbref.baseUrl);
            await page.goto(fbrefUrl, { waitUntil: 'networkidle', timeout: 30000 });

            // Look for match link
            const matchLink = page.locator(`a:has-text("${match.homeTeam}"):has-text("${match.awayTeam}")`).first();
            if (await matchLink.isVisible({ timeout: 5000 }).catch(() => false)) {
                await matchLink.click();
                await page.waitForLoadState('networkidle');
            }

            // Extract xG from FBref scorebox
            const scorebox = page.locator('.scorebox');
            const homeXg = await scorebox.locator('div:has-text("xG") + div, [data-stat="xg"] .poptip').first().textContent({ timeout: 5000 }).catch(() => null);
            const awayXg = await scorebox.locator('div:has-text("xG") + div, [data-stat="xg"] .poptip').nth(1).textContent({ timeout: 5000 }).catch(() => null);

            if (!homeXg || !awayXg) return null;

            return {
                date: match.date,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homeXg: parseFloat(homeXg.trim()),
                awayXg: parseFloat(awayXg.trim()),
                homeXga: parseFloat(awayXg.trim()),
                awayXga: parseFloat(homeXg.trim()),
                source: 'fbref'
            };
        } catch (err) {
            throw err;
        } finally {
            await page.close();
        }
    }
}

