/**
 *  * @file src/utils/RetryWithBackoff.js
  * Resilient retry logic with exponential backoff and jitter.
   */

/**
 * Execute an async function with retry logic.
  * @param {Function} fn - Async function to execute
   * @param {Object} options
    * @param {number} options.maxRetries - Maximum retry attempts (default: 3)
     * @param {number} options.baseDelay - Base delay in ms (default: 1000)
      * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
       * @returns {Promise<any>}
        */
export async function retryWithBackoff(fn, options = {}) {
    const { maxRetries = 3, baseDelay = 1000, maxDelay = 10000 } = options;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            if (attempt === maxRetries) throw err;

            const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
            const jitter = Math.random() * 500;
            const totalDelay = delay + jitter;

            console.warn(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed. Retrying in ${Math.round(totalDelay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, totalDelay));
        }
    }
}

