/**
 *  * @file src/scrapers/EloScraper.js
  * Scrapes club Elo ratings for Quality Floor (QF) and context adjustments.
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class EloScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeAll() {
        const primary = SOURCE_CONFIG.elo.primary;
        const context = await this.#browserManager.createContext('elo');
        const page = await context.newPage();

        try {
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(primary.urlPattern(), { waitUntil: 'networkidle', timeout: 30000 });
            });

            const rows = page.locator(primary.selectors.teamRows);
            const count = await rows.count();
            const ratings = [];

            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                try {
                    const rank = await row.locator(primary.selectors.rank).textContent({ timeout: 1000 });
                    const team = await row.locator(primary.selectors.team).textContent({ timeout: 1000 });
                    const country = await row.locator(primary.selectors.country).textContent({ timeout: 1000 }).catch(() => '');
                    const elo = await row.locator(primary.selectors.elo).textContent({ timeout: 1000 });

                    ratings.push({
                        rank: parseInt(rank.trim(), 10),
                        team: normalizeTeamName(team.trim()),
                        country: country.trim(),
                        elo: parseFloat(elo.trim()),
                        source: 'clubelo'
                    });
                } catch {
                    // Skip incomplete
                }
            }

            return ratings;
        } catch (err) {
            console.error('[EloScraper] Failed:', err.message);
            return [];
        } finally {
            await page.close();
        }
    }
}

