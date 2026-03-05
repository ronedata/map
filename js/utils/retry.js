/**
 * Retry Utility Module
 * Provides retry logic with exponential backoff for failed operations
 */

/**
 * Executes a function with retry logic and exponential backoff
 * @param {Function} fn - The async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 10000)
 * @param {Function} options.onRetry - Callback called before each retry
 * @returns {Promise<any>} Result of the function
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);

      if (onRetry) {
        onRetry(attempt + 1, maxRetries, delay, error);
      }

      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks if error is network-related and retryable
 * @param {Error} error - The error to check
 * @returns {boolean} True if error is retryable
 */
export function isNetworkError(error) {
  return (
    error.message.includes('fetch') ||
    error.message.includes('network') ||
    error.message.includes('NetworkError') ||
    error.message.includes('Failed to fetch') ||
    error.name === 'NetworkError'
  );
}
