/**
 *  * @file src/core/ScraperEngine.js
  * Main orchestrator: discovers fixtures, delegates to scrapers, aggregates output.
   */

import pLimit from 'p-limit';
import { BrowserManager } from './BrowserManager.js';
import { DataStore } from './DataStore.js';
import { FixtureFinder } from '../scrapers/FixtureFinder.js';
import { MatchHistoryScraper } from '../scrapers/MatchHistoryScraper.js';
import { XGScraper } from '../scrapers/XGScraper.js';
import { PlayerRatingScraper } from '../scrapers/PlayerRatingScraper.js';
import { InjuryScraper } from '../scrapers/InjuryScraper.js';
import { ManagerScraper } from '../scrapers/ManagerScraper.js';
import { H2HScraper } from '../scrapers/H2HScraper.js';
import { MarketOddsScraper } from '../scrapers/MarketOddsScraper.js';
import { EloScraper } from '../scrapers/EloScraper.js';
import { StandingsScraper } from '../scrapers/StandingsScraper.js';
import { ForebetScraper } from '../scrapers/ForebetScraper.js';

export class ScraperEngine {
    #browserManager;
    #dataStore;
    #options;
    #limit;

    constructor(options = {}) {
        this.#options = {
            concurrency: options.concurrency ?? 3,
            headless: options.headless ?? true,
            slowMo: options.slowMo ?? 0,
            outputDir: options.outputDir ?? './output',
            ...options
        };
        this.#browserManager = new BrowserManager(this.#options);
        this.#dataStore = new DataStore(this.#options.outputDir);
        this.#limit = pLimit(this.#options.concurrency);
    }

    async initialize() {
        await this.#browserManager.launch();
        await this.#dataStore.initialize();
        console.log('[ScraperEngine] Initialized');
    }

    /**
       * Main entry: run full pipeline.
          * @param {Array<{home:string,away:string,league:string,date?:string}>} [fixtures] - Optional pre-defined fixtures
             */
    async run(fixtures = null) {
        const startTime = Date.now();
        console.log('[ScraperEngine] Starting pipeline...');

        // Step 1: Discover fixtures if not provided
        let targetFixtures = fixtures;
        if (!targetFixtures || targetFixtures.length === 0) {
            const finder = new FixtureFinder(this.#browserManager);
            targetFixtures = await finder.findTodayFixtures();
            console.log(`[ScraperEngine] Discovered ${targetFixtures.length} fixtures`);
        }

        if (targetFixtures.length === 0) {
            console.warn('[ScraperEngine] No fixtures found. Exiting.');
            return;
        }

        // Save fixture list
        await this.#dataStore.writeCsv('fixtures', targetFixtures, [
            'home', 'away', 'league', 'date', 'time', 'source'
        ]);

        // Step 2: Global data (Elo, Standings)
        const eloData = await this.#runWithFallback(
            () => new EloScraper(this.#browserManager).scrapeAll(),
            'Elo'
        );
        await this.#dataStore.writeCsv('elo/all_teams', eloData, ['rank', 'team', 'country', 'elo']);

        // Step 3: Per-fixture parallel scraping
        const results = await Promise.allSettled(
            targetFixtures.map((fixture, idx) =>
                this.#limit(() => this.#scrapeFixture(fixture, idx, targetFixtures.length))
            )
        );

        // Step 4: Summary & cleanup
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log(`\n[ScraperEngine] Pipeline complete: ${succeeded}/${targetFixtures.length} succeeded, ${failed} failed (${duration}s)`);

        await this.#browserManager.close();
    }

    async #scrapeFixture(fixture, idx, total) {
        const { home, away, league } = fixture;
        const label = `[${idx + 1}/${total}] ${home} vs ${away}`;
        console.log(`${label} — Starting scrape...`);

        const data = {
            fixture,
            matchHistory: { home: null, away: null },
            xg: null,
            playerRatings: null,
            injuries: { home: null, away: null },
            managers: { home: null, away: null },
            h2h: null,
            marketOdds: null,
            standings: null,
            forebet: null
        };

        try {
            // Match histories (10-match window) for both teams
            data.matchHistory.home = await this.#runWithFallback(
                () => new MatchHistoryScraper(this.#browserManager).scrapeTeam(home, league),
                `${label} MatchHistory(${home})`
            );
            data.matchHistory.away = await this.#runWithFallback(
                () => new MatchHistoryScraper(this.#browserManager).scrapeTeam(away, league),
                `${label} MatchHistory(${away})`
            );

            // xG data for historical matches
            if (data.matchHistory.home?.length) {
                data.xg = await this.#runWithFallback(
                    () => new XGScraper(this.#browserManager).scrapeMatches(data.matchHistory.home),
                    `${label} xG`
                );
            }

            // Player ratings (SQF) for recent matches
            if (data.matchHistory.home?.length) {
                data.playerRatings = await this.#runWithFallback(
                    () => new PlayerRatingScraper(this.#browserManager).scrapeMatches([
                        ...data.matchHistory.home.slice(0, 3),
                        ...data.matchHistory.away.slice(0, 3)
                    ]),
                    `${label} PlayerRatings`
                );
            }

            // Injuries / suspensions
            data.injuries.home = await this.#runWithFallback(
                () => new InjuryScraper(this.#browserManager).scrapeTeam(home),
                `${label} Injuries(${home})`
            );
            data.injuries.away = await this.#runWithFallback(
                () => new InjuryScraper(this.#browserManager).scrapeTeam(away),
                `${label} Injuries(${away})`
            );

            // Manager data
            data.managers.home = await this.#runWithFallback(
                () => new ManagerScraper(this.#browserManager).scrapeTeam(home),
                `${label} Manager(${home})`
            );
            data.managers.away = await this.#runWithFallback(
                () => new ManagerScraper(this.#browserManager).scrapeTeam(away),
                `${label} Manager(${away})`
            );
            // H2H history
            data.h2h = await this.#runWithFallback(
                () => new H2HScraper(this.#browserManager).scrapeH2H(home, away),
                `${label} H2H`
            );

            // Market odds / MDS
            data.marketOdds = await this.#runWithFallback(
                () => new MarketOddsScraper(this.#browserManager).scrapeFixture(home, away),
                `${label} MarketOdds`
            );

            // League standings
            data.standings = await this.#runWithFallback(
                () => new StandingsScraper(this.#browserManager).scrapeLeague(league),
                `${label} Standings`
            );

            // Forebet probabilities (UTW engine)
            data.forebet = await this.#runWithFallback(
                () => new ForebetScraper(this.#browserManager).scrapeFixture(home, away),
                `${label} Forebet`
            );

            // Persist per-fixture bundle
            await this.#persistFixtureData(home, away, data);

            console.log(`${label} — Complete`);
            return data;
        } catch (err) {
            console.error(`${label} — Failed:`, err.message);
            throw err;
        }
    }

    async #runWithFallback(fn, label) {
        try {
            return await fn();
        } catch (err) {
            console.warn(`[${label}] Primary failed: ${err.message}`);
            return null;
        }
    }

    async #persistFixtureData(home, away, data) {
        const safeName = `${home.replace(/\s+/g, '_')}_vs_${away.replace(/\s+/g, '_')}`;

        if (data.matchHistory.home) {
            await this.#dataStore.writeCsv(`match_history/${safeName}_home`, data.matchHistory.home);
        }
        if (data.matchHistory.away) {
            await this.#dataStore.writeCsv(`match_history/${safeName}_away`, data.matchHistory.away);
        }
        if (data.xg) {
            await this.#dataStore.writeCsv(`xg_data/${safeName}`, data.xg);
        }
        if (data.playerRatings) {
            await this.#dataStore.writeCsv(`player_ratings/${safeName}`, data.playerRatings);
        }
        if (data.injuries.home) {
            await this.#dataStore.writeCsv(`injuries/${safeName}_home`, data.injuries.home);
        }
        if (data.injuries.away) {
            await this.#dataStore.writeCsv(`injuries/${safeName}_away`, data.injuries.away);
        }
        if (data.h2h) {
            await this.#dataStore.writeCsv(`h2h/${safeName}`, data.h2h);
        }
        if (data.marketOdds) {
            await this.#dataStore.writeCsv(`market_odds/${safeName}`, [data.marketOdds]);
        }
        if (data.standings) {
            await this.#dataStore.writeCsv(`standings/${safeName}`, data.standings);
        }
        if (data.forebet) {
            await this.#dataStore.writeCsv(`forebet/${safeName}`, [data.forebet]);
        }
    }
}


