/**
 *  * @file src/core/DataStore.js
  * File I/O manager: CSV writing, directory creation, and DOC generation.
   */

import fs from 'fs-extra';
import path from 'path';
import { stringify } from 'csv-stringify/sync';

export class DataStore {
    #baseDir;

    constructor(baseDir = './output') {
        this.#baseDir = baseDir;
    }

    async initialize() {
        await fs.ensureDir(this.#baseDir);
        const subdirs = [
            'match_history', 'xg_data', 'player_ratings',
            'injuries', 'managers', 'h2h', 'market_odds',
            'elo', 'standings', 'forebet'
        ];
        for (const dir of subdirs) {
            await fs.ensureDir(path.join(this.#baseDir, dir));
        }
    }

    /**
       * Write array of objects to CSV.
          * @param {string} filePath - Relative path inside output dir (no extension)
             * @param {Array<Record<string,any>>} data
                * @param {string[]} [columns] - Explicit column order
                   */
    async writeCsv(filePath, data, columns = null) {
        if (!data || data.length === 0) return;

        const fullPath = path.join(this.#baseDir, `${filePath}.csv`);
        await fs.ensureDir(path.dirname(fullPath));

        const cols = columns ?? Object.keys(data[0]);
        const csv = stringify(data, {
            header: true,
            columns: cols,
            cast: {
                boolean: (v) => v ? 'true' : 'false',
                object: (v) => JSON.stringify(v)
            }
        });

        await fs.writeFile(fullPath, csv, 'utf-8');
        console.log(`[DataStore] Written: ${fullPath}`);
    }

    /**
       * Append a markdown audit log entry.
          * @param {string} content
             */
    async appendLog(content) {
        const logPath = path.join(this.#baseDir, 'scrape_log.md');
        const timestamp = new Date().toISOString();
        await fs.appendFile(logPath, `\n## ${timestamp}\n\n${content}\n`, 'utf-8');
    }
}

