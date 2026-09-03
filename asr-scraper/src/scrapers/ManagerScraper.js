/**
 *  * @file src/scrapers/ManagerScraper.js
  * Scrapes managerial data: appointment date, tenure length, record.
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class ManagerScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeTeam(teamName) {
        const primary = SOURCE_CONFIG.managers.primary;
        const teamSlug = this.#slugify(teamName);
        const context = await this.#browserManager.createContext(`manager_${teamSlug}`);
        const page = await context.newPage();

        try {
            const url = primary.urlPattern(teamSlug);
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
            });

            // Handle cookie banner
            const cookieBtn = page.locator('#sp_message_container_518103 button, #CybotCookiebotDialogBodyButtonAccept').first();
            if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await cookieBtn.click();
            }

            const row = page.locator(primary.selectors.managerRow).first();
            const name = await row.locator(primary.selectors.name).textContent({ timeout: 5000 }).catch(() => null);
            const appointed = await row.locator(primary.selectors.appointed).textContent({ timeout: 3000 }).catch(() => null);
            const matches = await row.locator(primary.selectors.matches).textContent({ timeout: 3000 }).catch(() => null);
            const wins = await row.locator(primary.selectors.wins).textContent({ timeout: 3000 }).catch(() => null);
            const draws = await row.locator(primary.selectors.draws).textContent({ timeout: 3000 }).catch(() => null);
            const losses = await row.locator(primary.selectors.losses).textContent({ timeout: 3000 }).catch(() => null);

            if (!name) return null;

            return {
                team: normalizeTeamName(teamName),
                manager: name.trim(),
                appointedDate: appointed ? appointed.trim() : null,
                matchesManaged: matches ? parseInt(matches.trim(), 10) : null,
                wins: wins ? parseInt(wins.trim(), 10) : null,
                draws: draws ? parseInt(draws.trim(), 10) : null,
                losses: losses ? parseInt(losses.trim(), 10) : null,
                source: 'transfermarkt'
            };
        } catch (err) {
            console.error(`[ManagerScraper] ${teamName} failed:`, err.message);
            return null;
        } finally {
            await page.close();
        }
    }

    #slugify(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
}

