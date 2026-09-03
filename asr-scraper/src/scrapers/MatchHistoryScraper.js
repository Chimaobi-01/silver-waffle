/**
 *  * @file src/scrapers/MatchHistoryScraper.js
  * Scrapes 10-match history: scores, HT scores, competition, venue.
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class MatchHistoryScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeTeam(teamName, leagueHint = '') {
        const primary = SOURCE_CONFIG.matchHistory.primary;
        const teamSlug = this.#slugify(teamName);

        const context = await this.#browserManager.createContext(`history_${teamSlug}`);
        const page = await context.newPage();

        try {
            const url = primary.urlPattern(teamSlug);
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
            });

            // Handle cookie banners
            const cookieBtn = page.locator('#onetrust-accept-btn-handler, button:has-text("Accept all")').first();
            if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await cookieBtn.click();
            }

            const rows = page.locator(primary.selectors.matchRows).slice(0, 10);
            const count = Math.min(await rows.count(), 10);
            const matches = [];

            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                try {
                    const date = await row.locator(primary.selectors.date).textContent({ timeout: 2000 });
                    const home = await row.locator(primary.selectors.homeTeam).textContent({ timeout: 2000 });
                    const away = await row.locator(primary.selectors.awayTeam).textContent({ timeout: 2000 });
                    const homeScore = await row.locator(primary.selectors.homeScore).textContent({ timeout: 2000 });
                    const awayScore = await row.locator(primary.selectors.awayScore).textContent({ timeout: 2000 });
                    const homeHT = await row.locator(primary.selectors.homeHT).textContent({ timeout: 1000 }).catch(() => null);
                    const awayHT = await row.locator(primary.selectors.awayHT).textContent({ timeout: 1000 }).catch(() => null);
                    const competition = await row.locator(primary.selectors.competition).textContent({ timeout: 1000 }).catch(() => leagueHint);

                    const isHome = normalizeTeamName(home.trim()) === normalizeTeamName(teamName);

                    matches.push({
                        date: date.trim(),
                        homeTeam: normalizeTeamName(home.trim()),
                        awayTeam: normalizeTeamName(away.trim()),
                        homeScore: parseInt(homeScore.trim(), 10),
                        awayScore: parseInt(awayScore.trim(), 10),
                        homeHT: homeHT ? parseInt(homeHT.trim(), 10) : null,
                        awayHT: awayHT ? parseInt(awayHT.trim(), 10) : null,
                        competition: competition.trim(),
                        venue: isHome ? 'home' : 'away',
                        teamPerspective: teamName
                    });
                } catch {
                    // Skip incomplete rows
                }
            }

            return matches;
        } catch (err) {
            console.error(`[MatchHistory] ${teamName} failed:`, err.message);
            throw err;
        } finally {
            await page.close();
        }
    }

    #slugify(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
}

