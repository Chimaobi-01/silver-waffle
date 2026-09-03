/**
 *  * @file src/scrapers/PlayerRatingScraper.js
  * Scrapes player ratings per match to compute Squad Quality Factor (SQF).
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';

export class PlayerRatingScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeMatches(matches) {
        const results = [];
        for (const match of matches) {
            try {
                const ratings = await this.#scrapeSingleMatch(match);
                if (ratings) results.push(ratings);
            } catch (err) {
                console.warn(`[PlayerRating] Skipping ${match.homeTeam} vs ${match.awayTeam}: ${err.message}`);
            }
        }
        return results;
    }

    async #scrapeSingleMatch(match) {
        const primary = SOURCE_CONFIG.playerRatings.primary;
        const context = await this.#browserManager.createContext('ratings');
        const page = await context.newPage();

        try {
            // SofaScore uses match slugs; we search by team names
            const searchUrl = `${primary.baseUrl}/search?q=${encodeURIComponent(match.homeTeam + ' ' + match.awayTeam)}`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            const matchLink = page.locator('a[href*="/match/"]').first();
            if (await matchLink.isVisible({ timeout: 5000 }).catch(() => false)) {
                await matchLink.click();
                await page.waitForLoadState('networkidle');
            }

            // Extract ratings from lineup tab
            const homeRatings = await page.locator(primary.selectors.homeRatings).allTextContents();
            const awayRatings = await page.locator(primary.selectors.awayRatings).allTextContents();

            const parseRating = (arr) => arr.map(r => parseFloat(r.trim())).filter(n => !isNaN(n));
            const homeParsed = parseRating(homeRatings);
            const awayParsed = parseRating(awayRatings);

            const homeAvg = homeParsed.length ? homeParsed.reduce((a, b) => a + b, 0) / homeParsed.length : null;
            const awayAvg = awayParsed.length ? awayParsed.reduce((a, b) => a + b, 0) / awayParsed.length : null;

            return {
                date: match.date,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
                homeAvgRating: homeAvg ? Number(homeAvg.toFixed(2)) : null,
                awayAvgRating: awayAvg ? Number(awayAvg.toFixed(2)) : null,
                homeRatingsCount: homeParsed.length,
                awayRatingsCount: awayParsed.length,
                source: 'sofascore'
            };
        } catch (err) {
            throw err;
        } finally {
            await page.close();
        }
    }
}

