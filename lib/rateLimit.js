/**
 * Simple in-memory rate limiting implementation
 * For production, use Redis or a dedicated service like Cloudflare
 *
 * This provides basic protection against brute force and DDoS
 * Complements server-level rate limiting (nginx, HAProxy, CDN, etc.)
 */

const rateLimitStore = new Map();

// Configuration presets
export const RATE_LIMIT_CONFIG = {
  // Global API limit: 1000 requests per 15 minutes per IP
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000
  },
  // Login endpoint: 5 attempts per 15 minutes per IP
  login: {
    windowMs: 15 * 60 * 1000,
    max: 5
  },
  // Authentication endpoints: 10 per 15 minutes per IP
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 10
  },
  // File uploads: 50 per hour per IP
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 50
  },
  // Strict for sensitive operations: 20 per hour per user
  sensitive: {
    windowMs: 60 * 60 * 1000,
    max: 20
  }
};

/**
 * Check rate limit for a given key
 * @param {string} key - Unique identifier (IP, user ID, etc.)
 * @param {object} config - Rate limit config {windowMs, max}
 * @returns {object} {allowed: boolean, remaining: number, resetTime: number}
 */
export function checkRateLimit(key, config = RATE_LIMIT_CONFIG.global) {
  const now = Date.now();
  
  // Get or create rate limit entry for this key
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs
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
    resetDate: new Date(entry.resetTime)
  };
}

/**
 * Get client IP address from request
 * Handles X-Forwarded-For header from proxies
 */
export function getClientIP(request) {
  // Check X-Forwarded-For header (set by proxies, CDN, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  
  // Fallback to direct connection IP
  return request.headers.get('x-real-ip') || 
         request.socket?.remoteAddress ||
         'unknown';
}

/**
 * Rate limit response headers to send to client
 */
export function getRateLimitHeaders(limit) {
  return {
    'X-RateLimit-Limit': limit.max?.toString() || '1000',
    'X-RateLimit-Remaining': limit.remaining?.toString() || '0',
    'X-RateLimit-Reset': limit.resetDate?.toISOString() || '',
    'Retry-After': limit.resetTime?.toString() || '60'
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
    resetAt: limit.resetDate?.toISOString()
  };
}

/**
 * Middleware factory for Next.js API routes
 * Usage: const limiter = createRateLimitMiddleware(RATE_LIMIT_CONFIG.login);
 *        const result = limiter(request);
 *        if (!result.allowed) return handleRateLimit(response);
 */
export function createRateLimitMiddleware(config = RATE_LIMIT_CONFIG.global) {
  return (request) => {
    const clientIP = getClientIP(request);
    return checkRateLimit(clientIP, config);
  };
}

/**
 * User-based rate limiting
 * More accurate than IP for authenticated requests
 * Prevents account takeover attempts
 */
export function checkRateLimitByUser(userId, config) {
  const key = `user:${userId}`;
  return checkRateLimit(key, config);
}

/**
 * Combined rate limiting: both IP and user
 * Uses most restrictive limit
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
      resetTime: new Date(value.resetTime).toISOString()
    }))
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
setInterval(() => {
  const cleaned = cleanupExpiredLimits();
  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    console.log(`🧹 Cleaned up ${cleaned} expired rate limit entries`);
  }
}, 5 * 60 * 1000);

export default {
  checkRateLimit,
  createRateLimitMiddleware,
  checkRateLimitByUser,
  checkRateLimitCombined,
  getRateLimitHeaders,
  createRateLimitError,
  resetRateLimit,
  RATE_LIMIT_CONFIG
};
