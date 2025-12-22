/**
 * Cache Utility Module
 * 
 * Performance-optimized caching layer for ScholarVault
 * Reduces database hits and improves response times
 * 
 * Cache Strategy:
 * - Subjects: 1 hour (rarely change)
 * - Notes metadata: 30 minutes (semi-static)
 * - Search results: 5 minutes (frequently accessed)
 * - User sessions: 15 minutes (short-lived)
 */

import NodeCache from 'node-cache';

// ===== CACHE INSTANCES =====
// Separate caches for different data types (better memory management)

// Subjects cache (1 hour TTL)
const subjectsCache = new NodeCache({
  stdTTL: 3600,        // 1 hour
  checkperiod: 600,    // Check for expired keys every 10 min
  useClones: false,    // Performance: return references, not clones
  maxKeys: 100         // Max subjects
});

// Notes metadata cache (30 minutes TTL)
const notesCache = new NodeCache({
  stdTTL: 1800,        // 30 minutes
  checkperiod: 300,    // Check every 5 min
  useClones: false,
  maxKeys: 10000       // Support large note collections
});

// Search results cache (5 minutes TTL)
const searchCache = new NodeCache({
  stdTTL: 300,         // 5 minutes
  checkperiod: 60,     // Check every minute
  useClones: false,
  maxKeys: 1000        // Cache 1000 unique searches
});

// Analytics cache (batched writes, 2 minute TTL)
const analyticsCache = new NodeCache({
  stdTTL: 120,
  checkperiod: 30,
  useClones: false,
  maxKeys: 500
});

// ===== CACHE WRAPPER FUNCTIONS =====

/**
 * Get or set cache with automatic miss handling
 * @param {NodeCache} cache - Cache instance
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data on miss
 * @returns {Promise<any>} Cached or fresh data
 */
async function getOrSet(cache, key, fetchFn) {
  // Try cache first
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Cache miss - fetch data
  try {
    const data = await fetchFn();
    if (data !== null && data !== undefined) {
      cache.set(key, data);
    }
    return data;
  } catch (error) {
    console.error(`[Cache] Error fetching data for key: ${key}`, error);
    throw error;
  }
}

/**
 * Invalidate cache entries by pattern
 * @param {NodeCache} cache - Cache instance
 * @param {string} pattern - Key pattern to match
 */
function invalidatePattern(cache, pattern) {
  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  cache.del(matchingKeys);
  return matchingKeys.length;
}

/**
 * Get cache statistics for monitoring
 */
function getStats() {
  return {
    subjects: subjectsCache.getStats(),
    notes: notesCache.getStats(),
    search: searchCache.getStats(),
    analytics: analyticsCache.getStats()
  };
}

/**
 * Clear all caches (useful for admin operations)
 */
function clearAll() {
  subjectsCache.flushAll();
  notesCache.flushAll();
  searchCache.flushAll();
  analyticsCache.flushAll();
}

// ===== SPECIFIC CACHE HELPERS =====

const Cache = {
  // Subjects operations
  subjects: {
    get: (key) => subjectsCache.get(key),
    set: (key, value, ttl) => subjectsCache.set(key, value, ttl),
    del: (key) => subjectsCache.del(key),
    getOrSet: (key, fetchFn) => getOrSet(subjectsCache, key, fetchFn),
    invalidateAll: () => subjectsCache.flushAll()
  },

  // Notes operations
  notes: {
    get: (key) => notesCache.get(key),
    set: (key, value, ttl) => notesCache.set(key, value, ttl),
    del: (key) => notesCache.del(key),
    getOrSet: (key, fetchFn) => getOrSet(notesCache, key, fetchFn),
    invalidateAll: () => notesCache.flushAll(),
    invalidateSubject: (subjectId) => invalidatePattern(notesCache, `subject_${subjectId}`)
  },

  // Search operations
  search: {
    get: (key) => searchCache.get(key),
    set: (key, value, ttl) => searchCache.set(key, value, ttl),
    del: (key) => searchCache.del(key),
    getOrSet: (key, fetchFn) => getOrSet(searchCache, key, fetchFn),
    invalidateAll: () => searchCache.flushAll(),
    // Create cache key from query params
    createKey: (query, page = 1, filters = {}) => {
      const filterStr = Object.entries(filters)
        .sort()
        .map(([k, v]) => `${k}:${v}`)
        .join('|');
      return `search:${query}:p${page}:${filterStr}`;
    }
  },

  // Analytics operations
  analytics: {
    get: (key) => analyticsCache.get(key),
    set: (key, value, ttl) => analyticsCache.set(key, value, ttl),
    del: (key) => analyticsCache.del(key),
    invalidateAll: () => analyticsCache.flushAll()
  },

  // Utility operations
  getStats,
  clearAll,
  invalidatePattern
};

export default Cache;
