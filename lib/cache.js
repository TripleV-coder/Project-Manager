import NodeCache from 'node-cache';

// Cache instance with configuration
const cache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check expirations every 2 minutes
  useClones: false, // Performance: don't clone objects
  deleteOnExpire: true
});

// Log cache operations in development
cache.on('set', (key, _value) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] SET: ${key}`);
  }
});

cache.on('expired', (key, _value) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Cache] EXPIRED: ${key}`);
  }
});

/**
 * Get from cache or execute fetch function
 * @param {string} key - Cache key
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} ttl - Time to live in seconds (optional)
 * @returns {Promise<any>}
 */
export async function getCached(key, fetchFn, ttl = 600) {
  // Check if exists in cache
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  // Otherwise execute function and cache result
  try {
    const data = await fetchFn();
    cache.set(key, data, ttl);
    return data;
  } catch (error) {
    console.error(`[Cache] Error for key ${key}:`, error);
    throw error;
  }
}

/**
 * Invalidate cache by pattern
 * @param {string} pattern - Pattern to match (ex: 'projects:*')
 */
export function invalidateCache(pattern) {
  const keys = cache.keys();
  const toDelete = keys.filter(key => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(key);
    }
    return key === pattern;
  });

  if (toDelete.length > 0) {
    cache.del(toDelete);
    console.log(`[Cache] Invalidated ${toDelete.length} keys: ${pattern}`);
  }
}

/**
 * Clear entire cache
 */
export function clearCache() {
  cache.flushAll();
  console.log('[Cache] Cache cleared completely');
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
}

// Cache key prefixes for organization
export const CACHE_KEYS = {
  PROJECTS_ALL: 'projects:all',
  PROJECTS_USER: (userId) => `projects:user:${userId}`,
  PROJECT_DETAIL: (projectId) => `project:${projectId}`,
  TASKS_PROJECT: (projectId) => `tasks:project:${projectId}`,
  USER_PROFILE: (userId) => `user:${userId}`,
  SPRINTS_PROJECT: (projectId) => `sprints:project:${projectId}`,
  STATS_DASHBOARD: (userId) => `stats:dashboard:${userId}`
};

export default cache;
