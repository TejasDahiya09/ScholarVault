/**
 * Simple Query Cache for Frontend
 * Prevents duplicate API calls within a time window
 * 
 * Usage:
 * const data = await cachedFetch('/api/subjects', 5 * 60 * 1000); // 5 min cache
 */

const queryCache = new Map();

/**
 * Cached fetch wrapper
 * @param {string} url - API endpoint
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 * @returns {Promise} API response
 */
export async function cachedFetch(url, ttl = 5 * 60 * 1000) {
  const now = Date.now();
  const cached = queryCache.get(url);

  // Return cached result if still valid
  if (cached && now - cached.timestamp < ttl) {
    console.log(`[Cache HIT] ${url}`);
    return cached.data;
  }

  // Fetch fresh data
  console.log(`[Cache MISS] ${url}`);
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('sv_token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Store in cache
    queryCache.set(url, {
      data,
      timestamp: now
    });

    return data;
  } catch (err) {
    console.error(`[Cache ERROR] ${url}:`, err);
    throw err;
  }
}

/**
 * Invalidate a specific cache entry
 * @param {string} url - API endpoint to invalidate
 */
export function invalidateCache(url) {
  queryCache.delete(url);
  console.log(`[Cache INVALIDATED] ${url}`);
}

/**
 * Clear all cache
 */
export function clearCache() {
  queryCache.clear();
  console.log('[Cache CLEARED]');
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats() {
  return {
    entries: queryCache.size,
    keys: Array.from(queryCache.keys()),
    totalSize: JSON.stringify(Array.from(queryCache.values())).length
  };
}

export default { cachedFetch, invalidateCache, clearCache, getCacheStats };
