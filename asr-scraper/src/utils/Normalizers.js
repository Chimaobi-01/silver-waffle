/**
 *  * @file src/utils/Normalizers.js
  * Data normalization: team names, score parsing, date formatting.
   */

import { TEAM_ALIASES } from '../config/sources.js';

/**
 * Normalize a team name to its canonical form using alias map.
  * @param {string} rawName
   * @returns {string}
    */
export function normalizeTeamName(rawName) {
    const cleaned = rawName.trim().replace(/\s+/g, ' ');

    for (const [canonical, aliases] of Object.entries(TEAM_ALIASES)) {
        if (canonical.toLowerCase() === cleaned.toLowerCase()) return canonical;
        for (const alias of aliases) {
            if (alias.toLowerCase() === cleaned.toLowerCase()) return canonical;
        }
    }

    return cleaned;
}

/**
 * Parse a score string like "2:1" or "2-1" into integers.
  * @param {string} scoreStr
   * @returns {[number, number] | null}
    */
export function parseScore(scoreStr) {
    const match = scoreStr.match(/(\d+)[\s:-](\d+)/);
    if (!match) return null;
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
}

/**
 * Format date to ISO YYYY-MM-DD.
  * @param {string|Date} dateInput
   * @returns {string}
    */
export function formatDate(dateInput) {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;
    return d.toISOString().split('T')[0];
}

