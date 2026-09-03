/**
 *  * @file src/scrapers/StandingsScraper.js
  * Scrapes league standings for Opponent Strength Adjustment (OSA) and Match Importance (MIM).
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class StandingsScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeLeague(leagueName) {
        const primary = SOURCE_CONFIG.standings.primary;
        const leagueSlug = this.#slugify(leagueName);
        const context = await this.#browserManager.createContext(`standings_${leagueSlug}`);
        const page = await context.newPage();

        try {
            const url = primary.urlPattern(leagueSlug);
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
            });

            const rows = page.locator(primary.selectors.teamRows);
            const count = await rows.count();
            const standings = [];

            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                try {
                    const position = await row.locator(primary.selectors.position).textContent({ timeout: 1000 });
                    const team = await row.locator(primary.selectors.team).textContent({ timeout: 1000 });
                    const played = await row.locator(primary.selectors.played).textContent({ timeout: 1000 });
                    const wins = await row.locator(primary.selectors.wins).textContent({ timeout: 1000 });
                    const draws = await row.locator(primary.selectors.draws).textContent({ timeout: 1000 });
                    const losses = await row.locator(primary.selectors.losses).textContent({ timeout: 1000 });
                    const gf = await row.locator(primary.selectors.gf).textContent({ timeout: 1000 });
                    const ga = await row.locator(primary.selectors.ga).textContent({ timeout: 1000 });
                    const gd = await row.locator(primary.selectors.gd).textContent({ timeout: 1000 });
                    const points = await row.locator(primary.selectors.points).textContent({ timeout: 1000 });

                    standings.push({
                        position: parseInt(position.trim(), 10),
                        team: normalizeTeamName(team.trim()),
                        played: parseInt(played.trim(), 10),
                        wins: parseInt(wins.trim(), 10),
                        draws: parseInt(draws.trim(), 10),
                        losses: parseInt(losses.trim(), 10),
                        goalsFor: parseInt(gf.trim(), 10),
                        goalsAgainst: parseInt(ga.trim(), 10),
                        goalDifference: parseInt(gd.trim().replace('+', ''), 10),
                        points: parseInt(points.trim(), 10),
                        league: leagueName,
                        source: 'soccerway'
                    });
                } catch {
                    // Skip incomplete
                }
            }

            return standings;
        } catch (err) {
            console.error(`[StandingsScraper] ${leagueName} failed:`, err.message);
            return [];
        } finally {
            await page.close();
        }
    }

    #slugify(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
}

