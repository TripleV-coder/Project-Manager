// @ts-check
/**
 * Simple in-memory rate limiting implementation
 * For production, use Redis or a dedicated service like Cloudflare
 *
 * This provides basic protection against brute force and DDoS
 * Complements server-level rate limiting (nginx, HAProxy, CDN, etc.)
 */

/**
 * @typedef {object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds
 * @property {number} max - Maximum number of requests in the window
 */

/**
 * @typedef {object} RateLimitResult
 * @property {boolean} allowed - Whether the request is allowed
 * @property {number} count - Current request count
 * @property {number} remaining - Remaining requests in the window
 * @property {number} resetTime - Seconds until window resets
 * @property {Date} resetDate - Date when the window resets
 * @property {number} [max] - Configured max requests, when the caller attaches it
 */

/**
 * Minimal shape this module needs from an incoming request: a Fetch-style
 * `Headers`-like `headers.get()`, with an optional Node-style `socket` for
 * the legacy fallback path.
 * @typedef {{ headers?: { get: (name: string) => string | null }, socket?: { remoteAddress?: string } }} IncomingRequestLike
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('rateLimit');

/** @type {Map<string, { count: number, resetTime: number }>} */
const rateLimitStore = new Map();

// Maximum entries to prevent memory issues in production
const MAX_RATE_LIMIT_ENTRIES = 100000;

// Configuration presets
export const RATE_LIMIT_CONFIG = {
  // Global API limit: 1000 requests per 15 minutes per IP
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000,
  },
  // Login endpoint: 5 attempts per 15 minutes per IP
  login: {
    windowMs: 15 * 60 * 1000,
    max: 5,
  },
  // Authentication endpoints: 10 per 15 minutes per IP
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10,
  },
  // File uploads: 50 per hour per IP
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 50,
  },
  // Strict for sensitive operations: 20 per hour per user
  sensitive: {
    windowMs: 60 * 60 * 1000,
    max: 20,
  },
};

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (IP, user ID, etc.)
 * @param {RateLimitConfig} [config] - Rate limit config {windowMs, max}
 * @returns {RateLimitResult}
 */
export function checkRateLimit(key, config = RATE_LIMIT_CONFIG.global) {
  const now = Date.now();

  // Get or create rate limit entry for this key
  let entry = rateLimitStore.get(key);

  if (!entry) {
    // Prevent unbounded memory growth - cleanup if at max capacity
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      cleanupExpiredLimits();
      // If still at max, remove oldest entries
      if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
        const entriesToRemove = Math.floor(MAX_RATE_LIMIT_ENTRIES * 0.1); // Remove 10%
        let removed = 0;
        for (const k of rateLimitStore.keys()) {
          if (removed >= entriesToRemove) break;
          rateLimitStore.delete(k);
          removed++;
        }
      }
    }

    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Reset if window has expired
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + config.windowMs;
  }

  // Increment counter
  entry.count++;

  const allowed = entry.count <= config.max;
  const remaining = Math.max(0, config.max - entry.count);
  const resetTime = Math.ceil((entry.resetTime - now) / 1000); // seconds until reset

  return {
    allowed,
    count: entry.count,
    remaining,
    resetTime,
    resetDate: new Date(entry.resetTime),
  };
}

/**
 * Resolve the client IP for rate-limiting.
 *
 * `x-forwarded-for` is attacker-controlled on the left. In production we only
 * trust the rightmost TRUSTED_PROXY_COUNT hops (added by our own infra) and
 * read the client as the hop just before them. In dev/test we trust the
 * leftmost value as-is so e2e rate-limit tests can spoof it.
 * @param {IncomingRequestLike} request
 * @returns {string}
 */
export function getClientIP(request) {
  const headers = request?.headers;
  if (!headers || typeof headers.get !== 'function') {
    return request?.socket?.remoteAddress || 'unknown';
  }

  const xff = headers.get('x-forwarded-for');
  const parts = xff
    ? xff
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  if (process.env.NODE_ENV !== 'production') {
    if (parts.length > 0) return parts[0];
    return headers.get('x-real-ip') || request?.socket?.remoteAddress || 'unknown';
  }

  // A proxy count of 0 would trust the raw client-supplied XFF value directly,
  // defeating the point of this function — treat 0 the same as unset (default to 1).
  const trusted = Number.parseInt(process.env.TRUSTED_PROXY_COUNT ?? '1', 10) || 1;
  if (parts.length >= trusted) {
    return parts[parts.length - trusted] || 'unknown';
  }

  return headers.get('x-real-ip') || 'unknown';
}

/**
 * Rate limit response headers to send to client
 * @param {RateLimitResult} limit
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
 * @param {RateLimitResult} limit
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
 * Middleware factory for Next.js API routes
 * Usage: const limiter = createRateLimitMiddleware(RATE_LIMIT_CONFIG.login);
 *        const result = limiter(request);
 *        if (!result.allowed) return handleRateLimit(response);
 * @param {RateLimitConfig} [config]
 */
export function createRateLimitMiddleware(config = RATE_LIMIT_CONFIG.global) {
  /** @param {IncomingRequestLike} request */
  return (request) => {
    const clientIP = getClientIP(request);
    return checkRateLimit(clientIP, config);
  };
}

/**
 * User-based rate limiting
 * More accurate than IP for authenticated requests
 * Prevents account takeover attempts
 * @param {string} userId
 * @param {RateLimitConfig} config
 */
export function checkRateLimitByUser(userId, config) {
  const key = `user:${userId}`;
  return checkRateLimit(key, config);
}

/**
 * Combined rate limiting: both IP and user
 * Uses most restrictive limit
 * @param {IncomingRequestLike} request
 * @param {string | null} userId
 * @param {RateLimitConfig} configIp
 * @param {RateLimitConfig} configUser
 */
export function checkRateLimitCombined(request, userId, configIp, configUser) {
  const clientIP = getClientIP(request);
  const ipLimit = checkRateLimit(clientIP, configIp);

  if (!ipLimit.allowed) {
    return ipLimit;
  }

  if (userId) {
    const userLimit = checkRateLimitByUser(userId, configUser);
    if (!userLimit.allowed) {
      return userLimit;
    }
  }

  return ipLimit;
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 * @param {string} key
 */
export function resetRateLimit(key) {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limit data (cleanup)
 */
export function clearAllRateLimits() {
  rateLimitStore.clear();
}

/**
 * Get current rate limit stats (for monitoring)
 */
export function getRateLimitStats() {
  return {
    activeKeys: rateLimitStore.size,
    data: Array.from(rateLimitStore.entries()).map(([key, value]) => ({
      key,
      count: value.count,
      resetTime: new Date(value.resetTime).toISOString(),
    })),
  };
}

/**
 * Cleanup expired entries (should be called periodically)
 * For production, use Redis for automatic expiration
 */
export function cleanupExpiredLimits() {
  const now = Date.now();
  let cleaned = 0;

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now >= entry.resetTime) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }

  return cleaned;
}

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    const cleaned = cleanupExpiredLimits();
    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      log.debug(`Cleaned up ${cleaned} expired rate limit entries`);
    }
  },
  5 * 60 * 1000
);

export default {
  checkRateLimit,
  createRateLimitMiddleware,
  checkRateLimitByUser,
  checkRateLimitCombined,
  getRateLimitHeaders,
  createRateLimitError,
  resetRateLimit,
  RATE_LIMIT_CONFIG,
};
