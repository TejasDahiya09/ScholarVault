import NodeCache from "node-cache";

/**
 * In-memory cache for database queries
 * TTL: 5 minutes (300 seconds)
 */
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired entries every 60 seconds
  useClones: false, // Don't clone objects for better performance
});

/**
 * Cache wrapper for database queries
 * @param {string} key - Cache key
 * @param {Function} fn - Async function to execute if cache miss
 * @param {number} ttl - Optional custom TTL in seconds
 * @returns {Promise<any>}
 */
export async function cacheQuery(key, fn, ttl = 300) {
  // Check cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss - execute function
  const result = await fn();
  
  // Store in cache
  cache.set(key, result, ttl);
  
  return result;
}

/**
 * Invalidate cache by key or pattern
 * @param {string} pattern - Key or pattern to invalidate
 */
export function invalidateCache(pattern) {
  if (pattern.includes('*')) {
    // Pattern matching - delete all keys matching pattern
    const keys = cache.keys();
    const regex = new RegExp(pattern.replace('*', '.*'));
    keys.forEach(key => {
      if (regex.test(key)) {
        cache.del(key);
      }
    });
  } else {
    // Exact key
    cache.del(pattern);
  }
}

/**
 * Clear entire cache
 */
export function clearCache() {
  cache.flushAll();
}

// ...existing code...
export default {
  cacheQuery,
  invalidateCache,
  clearCache,
};
