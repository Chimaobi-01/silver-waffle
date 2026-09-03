/**
 *  * @file src/scrapers/InjuryScraper.js
  * Scrapes real-time injury and suspension data for Positional Injury Weighting (PIW).
   */

import { SOURCE_CONFIG } from '../config/sources.js';
import { retryWithBackoff } from '../utils/RetryWithBackoff.js';
import { rateLimit } from '../utils/RateLimiter.js';
import { normalizeTeamName } from '../utils/Normalizers.js';

export class InjuryScraper {
    #browserManager;

    constructor(browserManager) {
        this.#browserManager = browserManager;
    }

    async scrapeTeam(teamName) {
        const primary = SOURCE_CONFIG.injuries.primary;
        const teamSlug = this.#slugify(teamName);
        const context = await this.#browserManager.createContext(`injury_${teamSlug}`);
        const page = await context.newPage();

        try {
            // FotMob search approach
            const searchUrl = `${primary.baseUrl}/search?q=${encodeURIComponent(teamName)}`;
            await rateLimit(primary.baseUrl);
            await retryWithBackoff(async () => {
                await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
            });

            const teamLink = page.locator(`a:has-text("${teamName}")`).first();
            if (await teamLink.isVisible({ timeout: 5000 }).catch(() => false)) {
                await teamLink.click();
                await page.waitForLoadState('networkidle');
            }

            // Navigate to squad/injury tab
            const squadTab = page.locator('a:has-text("Squad"), a:has-text("Team"), [data-testid="squad-tab"]').first();
            if (await squadTab.isVisible({ timeout: 3000 }).catch(() => false)) {
                await squadTab.click();
                await page.waitForTimeout(1000);
            }

            const injurySection = page.locator(primary.selectors.injurySection);
            const hasInjuries = await injurySection.isVisible({ timeout: 3000 }).catch(() => false);

            const injuries = [];
            if (hasInjuries) {
                const rows = injurySection.locator('tr, .player-row');
                const count = await rows.count();
                for (let i = 0; i < count; i++) {
                    try {
                        const row = rows.nth(i);
                        const name = await row.locator(primary.selectors.playerName).textContent({ timeout: 1000 });
                        const type = await row.locator(primary.selectors.injuryType).textContent({ timeout: 1000 }).catch(() => 'Unknown');
                        const returnDate = await row.locator(primary.selectors.returnDate).textContent({ timeout: 1000 }).catch(() => 'Unknown');
                        const status = await row.locator(primary.selectors.status).textContent({ timeout: 1000 }).catch(() => 'Out');

                        injuries.push({
                            player: name.trim(),
                            injuryType: type.trim(),
                            expectedReturn: returnDate.trim(),
                            status: status.trim(),
                            team: normalizeTeamName(teamName),
                            source: 'fotmob'
                        });
                    } catch {
                        // Skip malformed
                    }
                }
            }

            return injuries;
        } catch (err) {
            console.error(`[InjuryScraper] ${teamName} failed:`, err.message);
            return [];
        } finally {
            await page.close();
        }
    }

    #slugify(name) {
        return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }
}

