/**
 *  * @file src/scrapers/H2HScraper.js
  * Scrapes historical H2H results at the specific venue for Head-to-Head Modifier (HM).
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class H2HScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeH2H(homeTeam, awayTeam) {
        const primary = SOURCE_CONFIG.h2h.primary;
        const context = await this.#browserManager.createContext('h2h');
        const page = await context.newPage();

        try {
            // Flashscore H2H requires match ID; we search by team names
            const searchUrl = `${primary.baseUrl}/search/?q=${encodeURIComponent(homeTeam + ' ' + awayTeam)}`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            const matchLink = page.locator('a[href*="/match/"]').first();
            if (await matchLink.isVisible({ timeout: 5000 }).catch(() => false)) {
                const href = await matchLink.getAttribute('href');
                const matchId = href.split('/match/')[1]?.split('/')[0];
                if (matchId) {
                    await page.goto(`${primary.baseUrl}/match/${matchId}/#/h2h/overall`, { waitUntil: 'networkidle' });
                }
            }

            const rows = page.locator(primary.selectors.h2hRows).slice(0, 5);
            const count = Math.min(await rows.count(), 5);
            const results = [];

            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                try {
                    const date = await row.locator(primary.selectors.date).textContent({ timeout: 2000 });
                    const home = await row.locator(primary.selectors.homeTeam).textContent({ timeout: 2000 });
                    const away = await row.locator(primary.selectors.awayTeam).textContent({ timeout: 2000 });
                    const homeScore = await row.locator(primary.selectors.homeScore).textContent({ timeout: 2000 });
                    const awayScore = await row.locator(primary.selectors.awayScore).textContent({ timeout: 2000 });

                    results.push({
                        date: date.trim(),
                        homeTeam: normalizeTeamName(home.trim()),
                        awayTeam: normalizeTeamName(away.trim()),
                        homeScore: parseInt(homeScore.trim(), 10),
                        awayScore: parseInt(awayScore.trim(), 10),
                        source: 'flashscore'
                    });
                } catch {
                    // Skip incomplete
                }
            }

            return results;
        } catch (err) {
            console.error(`[H2HScraper] ${homeTeam} vs ${awayTeam} failed:`, err.message);
            return [];
        } finally {
            await page.close();
        }
    }
}

