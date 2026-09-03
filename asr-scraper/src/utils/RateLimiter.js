/**
 *  * @file src/utils/RateLimiter.js
  * Per-domain rate limiting with last-request tracking.
   */

import { RATE_LIMITS } from '../config/sources.js';

const lastRequestTimes = new Map();

/**
 * Enforce rate limit for a given URL/domain.
  * @param {string} url - Full URL or domain string
   */
export async function rateLimit(url) {
    const domain = url.replace(/^https?:\/\//, '').split('/')[0];
    const limitMs = RATE_LIMITS[domain] ?? 2000;

    const lastTime = lastRequestTimes.get(domain) ?? 0;
    const now = Date.now();
    const elapsed = now - lastTime;

    if (elapsed < limitMs) {
        const wait = limitMs - elapsed;
        await new Promise(resolve => setTimeout(resolve, wait));
    }

    lastRequestTimes.set(domain, Date.now());
}

