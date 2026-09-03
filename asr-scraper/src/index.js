/**
 *  * @file src/index.js
  * CLI entry point for the ASR Scraping Suite.
   * Usage:
    *   node src/index.js                    # Auto-discover today's fixtures
     *   node src/index.js --auto-fixtures    # Same as default
      *   node src/index.js --headed           # Run with visible browser (debug)
       *   node src/index.js --slow-mo 500      # Slow motion for debugging
        *   node src/index.js --fixtures '[{"home":"Remo","away":"Coritiba","league":"BRA Serie B"}]'
         */

import { ScraperEngine } from './core/ScraperEngine.js';

function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        autoFixtures: true,
        headless: true,
        slowMo: 0,
        fixtures: null,
        concurrency: 3,
        outputDir: './output'
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--auto-fixtures':
                options.autoFixtures = true;
                break;
            case '--headed':
                options.headless = false;
                break;
            case '--slow-mo':
                options.slowMo = parseInt(args[++i], 10) || 500;
                break;
            case '--fixtures':
                try {
                    options.fixtures = JSON.parse(args[++i]);
                    options.autoFixtures = false;
                } catch {
                    console.error('Invalid --fixtures JSON');
                    process.exit(1);
                }
                break;
            case '--concurrency':
                options.concurrency = parseInt(args[++i], 10) || 3;
                break;
            case '--output':
                options.outputDir = args[++i];
                break;
            case '--help':
                console.log(`
                                                                                                                                                                                                                                                       ASR Model v3.1 Scraping Suite
                                                                                                                                                                                                                                                       Usage: node src/index.js [options]

                                                                                                                                                                                                                                                       Options:
                                                                                                                                                                                                                                                         --auto-fixtures          Auto-discover today's fixtures (default)
                                                                                                                                                                                                                                                           --fixtures '<json>'      Provide fixture array as JSON string
                                                                                                                                                                                                                                                             --headed                 Run browser in visible mode (debug)
                                                                                                                                                                                                                                                               --slow-mo <ms>           Slow motion delay between actions
                                                                                                                                                                                                                                                                 --concurrency <n>        Max parallel fixture scrapes (default: 3)
                                                                                                                                                                                                                                                                   --output <dir>           Output directory (default: ./output)
                                                                                                                                                                                                                                                                     --help                   Show this help message
                                                                                                                                                                                                                                                                             `);
                process.exit(0);
        }
    }

    return options;
}

async function main() {
    const args = parseArgs();
    const engine = new ScraperEngine(args);

    try {
        await engine.initialize();
        await engine.run(args.fixtures);
    } catch (err) {
        console.error('[Main] Fatal error:', err);
        process.exit(1);
    }
}

main();

