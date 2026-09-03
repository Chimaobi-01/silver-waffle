/**
 *  * @file src/scrapers/MarketOddsScraper.js
  * Scrapes pre-match betting odds for Market Divergence Signal (MDS).
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';

export class MarketOddsScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeFixture(homeTeam, awayTeam) {
        const primary = SOURCE_CONFIG.marketOdds.primary;
        const context = await this.#browserManager.createContext('odds');
        const page = await context.newPage();

        try {
            // Forebet search by fixture
            const searchUrl = `${primary.baseUrl}/en/football-tips-and-predictions-for-today`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            // Find match row
            const matchRow = page.locator(`tr:has-text("${homeTeam}"):has-text("${awayTeam}")`).first();
            if (await matchRow.isVisible({ timeout: 5000 }).catch(() => false)) {
                const homeProb = await matchRow.locator(primary.selectors.homeProb).textContent({ timeout: 3000 }).catch(() => null);
                const drawProb = await matchRow.locator(primary.selectors.drawProb).textContent({ timeout: 3000 }).catch(() => null);
                const awayProb = await matchRow.locator(primary.selectors.awayProb).textContent({ timeout: 3000 }).catch(() => null);
                const over25 = await matchRow.locator(primary.selectors.over25).textContent({ timeout: 3000 }).catch(() => null);
                const btts = await matchRow.locator(primary.selectors.btts).textContent({ timeout: 3000 }).catch(() => null);

                return {
                    homeTeam,
                    awayTeam,
                    homeWinProb: homeProb ? parseFloat(homeProb.replace('%', '').trim()) : null,
                    drawProb: drawProb ? parseFloat(drawProb.replace('%', '').trim()) : null,
                    awayWinProb: awayProb ? parseFloat(awayProb.replace('%', '').trim()) : null,
                    over25Prob: over25 ? parseFloat(over25.replace('%', '').trim()) : null,
                    bttsProb: btts ? parseFloat(btts.replace('%', '').trim()) : null,
                    source: 'forebet'
                };
            }

            return null;
        } catch (err) {
            console.error(`[MarketOdds] ${homeTeam} vs ${awayTeam} failed:`, err.message);
            return null;
        } finally {
            await page.close();
        }
    }
}

