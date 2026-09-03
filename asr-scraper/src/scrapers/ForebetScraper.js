/**
 *  * @file src/scrapers/ForebetScraper.js
  * Scrapes Forebet pre-match win probabilities for the UTW engine.
   * Requires P(M3), P(M2), P(M1), and P(M0) for each team.
    */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';

export class ForebetScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeFixture(homeTeam, awayTeam) {
        const primary = SOURCE_CONFIG.forebet.primary;
        const context = await this.#browserManager.createContext('forebet');
        const page = await context.newPage();

        try {
            const todayUrl = `${primary.baseUrl}/en/football-tips-and-predictions-for-today`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(todayUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            // Find the specific match row
            const matchRow = page.locator(`tr:has-text("${homeTeam}"):has-text("${awayTeam}")`).first();
            if (await matchRow.isVisible({ timeout: 5000 }).catch(() => false)) {
                const homeWin = await matchRow.locator(primary.selectors.homeWinProb).textContent({ timeout: 3000 }).catch(() => null);
                const draw = await matchRow.locator(primary.selectors.drawProb).textContent({ timeout: 3000 }).catch(() => null);
                const awayWin = await matchRow.locator(primary.selectors.awayWinProb).textContent({ timeout: 3000 }).catch(() => null);
                const xg = await matchRow.locator(primary.selectors.expectedGoals).textContent({ timeout: 3000 }).catch(() => null);

                return {
                    homeTeam,
                    awayTeam,
                    homeWinProb: homeWin ? parseFloat(homeWin.replace('%', '').trim()) : null,
                    drawProb: draw ? parseFloat(draw.replace('%', '').trim()) : null,
                    awayWinProb: awayWin ? parseFloat(awayWin.replace('%', '').trim()) : null,
                    expectedGoals: xg ? parseFloat(xg.trim()) : null,
                    source: 'forebet'
                };
            }

            return null;
        } catch (err) {
            console.error(`[ForebetScraper] ${homeTeam} vs ${awayTeam} failed:`, err.message);
            return null;
        } finally {
            await page.close();
        }
    }

    /**
       * Scrapes historical Forebet probabilities for a team's last 3 matches (M3, M2, M1).
          * This requires archived Forebet pages or cached data.
             */
    async scrapeHistoricalProbabilities(teamName, matchDates) {
        // Historical Forebet data is not always publicly archived.
        // This is a placeholder for integration with a cached database
        // or paid API that provides historical pre-match odds.
        console.warn(`[ForebetScraper] Historical probabilities for ${teamName} require external archive access.`);
        return matchDates.map(date => ({
            date,
            team: teamName,
            winProb: null,
            note: 'Historical Forebet data not available via public scraping'
        }));
    }
}

