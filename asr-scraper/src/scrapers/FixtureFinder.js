/**
 *  * @file src/scrapers/FixtureFinder.js
  * Discovers fixtures for the current day across all tracked leagues.
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class FixtureFinder {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async findTodayFixtures() {
        const primary = SOURCE_CONFIG.fixtures.primary;
        const fallback = SOURCE_CONFIG.fixtures.fallback;

        let fixtures = await this.#trySource(primary);
        if (!fixtures || fixtures.length === 0) {
            console.warn('[FixtureFinder] Primary source empty, trying fallback...');
            fixtures = await this.#trySource(fallback);
        }

        return fixtures.map(f => ({
            ...f,
            home: normalizeTeamName(f.home),
            away: normalizeTeamName(f.away)
        }));
    }

    async #trySource(source) {
        const context = await this.#browserManager.createContext('fixtures');
        const page = await context.newPage();

        try {
            await rateLimit(source.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(source.todayUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            // Accept cookies if banner appears
            const cookieBtn = page.locator('button:has-text("Accept"), button:has-text("I agree"), #onetrust-accept-btn-handler').first();
            if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await cookieBtn.click();
                await page.waitForTimeout(500);
            }

            const rows = page.locator(source.selectors.matchRows);
            const count = await rows.count();
            const fixtures = [];

            for (let i = 0; i < count; i++) {
                const row = rows.nth(i);
                try {
                    const home = await row.locator(source.selectors.homeTeam).textContent({ timeout: 2000 });
                    const away = await row.locator(source.selectors.awayTeam).textContent({ timeout: 2000 });
                    const league = await row.locator(source.selectors.league).textContent({ timeout: 1000 }).catch(() => 'Unknown');
                    const time = await row.locator(source.selectors.time).textContent({ timeout: 1000 }).catch(() => '');

                    if (home && away) {
                        fixtures.push({
                            home: home.trim(),
                            away: away.trim(),
                            league: league.trim(),
                            time: time.trim(),
                            date: new Date().toISOString().split('T')[0],
                            source: source.name
                        });
                    }
                } catch {
                    // Skip malformed rows
                }
            }

            return fixtures;
        } catch (err) {
            console.error(`[FixtureFinder] ${source.name} failed:`, err.message);
            return [];
        } finally {
            await page.close();
        }
    }
}

