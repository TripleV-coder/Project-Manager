/**
 * Rate limiting distribué avec Redis
 * Fallback vers in-memory si Redis n'est pas disponible
 *
 * Usage:
 *   import { checkRateLimit } from '@/lib/rateLimitRedis';
 *   const result = checkRateLimit('login', ip, { windowMs: 900000, max: 5 });
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('rateLimitRedis');

let RedisClient = null;
let useRedis = false;

/**
 * Initialize Redis connection if available
 */
async function initRedis() {
  if (RedisClient) return;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    log.info('REDIS_URL not set, using in-memory rate limiting');
    return;
  }

  try {
    const Redis = (await import('ioredis')).default;
    RedisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    await RedisClient.connect();
    useRedis = true;
    log.info('Redis connected for rate limiting');
  } catch (error) {
    log.warn('Redis connection failed, falling back to in-memory:', error.message);
    RedisClient = null;
    useRedis = false;
  }
}

// In-memory fallback store
const memoryStore = new Map();
const MAX_MEMORY_ENTRIES = 50000;

function checkMemoryLimit(key, windowMs, max) {
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || now >= entry.resetTime) {
    entry = { count: 0, resetTime: now + windowMs };
    memoryStore.set(key, entry);
  }

  entry.count++;

  if (memoryStore.size > MAX_MEMORY_ENTRIES) {
    const cutoff = now - windowMs;
    for (const [k, v] of memoryStore.entries()) {
      if (v.resetTime < cutoff) memoryStore.delete(k);
    }
  }

  return {
    allowed: entry.count <= max,
    count: entry.count,
    remaining: Math.max(0, max - entry.count),
    resetTime: Math.ceil((entry.resetTime - now) / 1000),
    resetDate: new Date(entry.resetTime),
  };
}

async function checkRedisLimit(key, windowMs, max) {
  const redisKey = `ratelimit:${key}`;

  try {
    const multi = RedisClient.multi();
    multi.incr(redisKey);
    multi.pexpire(redisKey, windowMs);
    const results = await multi.exec();

    const count = results[0][1];
    const ttl = await RedisClient.pttl(redisKey);
    const resetTime = ttl > 0 ? ttl : windowMs;

    return {
      allowed: count <= max,
      count,
      remaining: Math.max(0, max - count),
      resetTime: Math.ceil(resetTime / 1000),
      resetDate: new Date(Date.now() + resetTime),
    };
  } catch (error) {
    log.warn('Redis rate limit failed, falling back to memory:', error.message);
    return checkMemoryLimit(key, windowMs, max);
  }
}

/**
 * Check rate limit for a given key
 */
export async function checkRateLimit(namespace, key, config = { windowMs: 900000, max: 1000 }) {
  await initRedis();
  const fullKey = `${namespace}:${key}`;

  if (useRedis && RedisClient) {
    return checkRedisLimit(fullKey, config.windowMs, config.max);
  }

  return checkMemoryLimit(fullKey, config.windowMs, config.max);
}

/**
 * Check rate limit by IP
 */
export async function checkRateLimitByIP(request, namespace, config) {
  const ip =
    request?.headers?.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request?.headers?.get('x-real-ip') ||
    'unknown';

  return checkRateLimit(namespace, `ip:${ip}`, config);
}

/**
 * Check rate limit by user ID
 */
export async function checkRateLimitByUser(userId, namespace, config) {
  return checkRateLimit(namespace, `user:${userId}`, config);
}

/**
 * Combined rate limiting: IP + User
 */
export async function checkRateLimitCombined(request, userId, namespace, configIp, configUser) {
  const ipResult = await checkRateLimitByIP(request, namespace, configIp);
  if (!ipResult.allowed) return ipResult;

  if (userId) {
    const userResult = await checkRateLimitByUser(userId, namespace, configUser);
    if (!userResult.allowed) return userResult;
  }

  return ipResult;
}

/**
 * Get rate limit headers
 */
export function getRateLimitHeaders(limit) {
  return {
    'X-RateLimit-Limit': limit.max?.toString() || '1000',
    'X-RateLimit-Remaining': limit.remaining?.toString() || '0',
    'X-RateLimit-Reset': limit.resetDate?.toISOString() || '',
    'Retry-After': limit.resetTime?.toString() || '60',
  };
}

/**
 * Create rate limit error response
 */
export function createRateLimitError(limit) {
  return {
    statusCode: 429,
    message: 'Too many requests',
    retryAfter: limit.resetTime,
    resetAt: limit.resetDate?.toISOString(),
  };
}

/**
 * Reset rate limit for a key
 */
export async function resetRateLimit(namespace, key) {
  const fullKey = `${namespace}:${key}`;

  if (useRedis && RedisClient) {
    try {
      await RedisClient.del(`ratelimit:${fullKey}`);
    } catch (error) {
      log.warn('Redis reset failed:', error.message);
    }
  }

  memoryStore.delete(fullKey);
}

/**
 * Get stats (monitoring)
 */
export function getRateLimitStats() {
  return {
    provider: useRedis ? 'redis' : 'memory',
    memoryEntries: memoryStore.size,
  };
}

export default {
  checkRateLimit,
  checkRateLimitByIP,
  checkRateLimitByUser,
  checkRateLimitCombined,
  getRateLimitHeaders,
  createRateLimitError,
  resetRateLimit,
  getRateLimitStats,
};
