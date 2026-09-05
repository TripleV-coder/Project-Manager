// @ts-check
import { NextResponse } from 'next/server';
import {
  checkRateLimit,
  createRateLimitError,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIG,
  getClientIP,
  resetRateLimit,
} from './rateLimit';

/**
 * Recover the preset name (e.g. 'login', 'auth', 'global') a config object
 * came from, so different presets get independent rate-limit counters
 * instead of all sharing one bucket per IP/user. Callers always pass one of
 * the RATE_LIMIT_CONFIG.* objects by reference (see withApiProtection.js and
 * the hand-rolled auth routes), so identity comparison is reliable.
 * @param {import('./rateLimit').RateLimitConfig} config
 * @returns {string}
 */
function presetNameFor(config) {
  const match = Object.entries(RATE_LIMIT_CONFIG).find(([, value]) => value === config);
  if (match) return match[0];
  // Not a known preset object (e.g. a spread copy) — fall back to a stable
  // key derived from its shape so it still gets its own bucket rather than
  // silently sharing 'global's.
  return `custom:${config.windowMs}:${config.max}`;
}

/**
 * Apply rate limiting to an API request.
 * Async: uses the distributed Redis limiter when REDIS_URL is configured,
 * otherwise falls back to the in-memory limiter. Both paths return the same
 * { allowed, count, remaining, resetTime, resetDate } shape.
 *
 * Usage in route handlers:
 *
 * const rateLimitResult = await applyRateLimit(request, userId, RATE_LIMIT_CONFIG.login);
 * if (!rateLimitResult.allowed) {
 *   return handleRateLimitError(response, rateLimitResult);
 * }
 *
 * @param {Request} request
 * @param {string | null} [userId]
 * @param {import('./rateLimit').RateLimitConfig} [config]
 */
export async function applyRateLimit(request, userId = null, config = RATE_LIMIT_CONFIG.global) {
  // Namespaced by preset (not a bare literal) so e.g. the login preset
  // (max:5) and the global preset (max:1000) never share a counter — see
  // Task "shared rate-limit buckets across presets" fix.
  const namespace = presetNameFor(config);

  if (process.env.REDIS_URL) {
    const redisLimiter = await import('./rateLimitRedis');
    // NOTE: as of the two-pass design in withApiProtection.js (IP-only pass 1
    // via applyRateLimit, then a separate per-user pass 2 via
    // applyUserRateLimit), no caller in this codebase passes a non-null
    // userId here anymore — this branch is currently unreachable in
    // practice. Left in place (namespaced correctly) for any future direct
    // caller that still wants the combined IP+user check in one call.
    if (userId) {
      // Authenticated: combine IP + user limits (most restrictive wins).
      return redisLimiter.checkRateLimitCombined(
        request,
        userId,
        namespace,
        { ...config, max: Math.ceil(config.max * 2) }, // IP limit is more lenient
        config // User limit is stricter
      );
    }
    return redisLimiter.checkRateLimitByIP(request, namespace, config);
  }

  // In-memory fallback (single-instance deployments).
  const clientIP = getClientIP(request);
  if (userId) {
    // See NOTE above — currently unreachable via any caller in this repo.
    const ipConfig = { ...config, max: Math.ceil(config.max * 2) }; // IP limit is more lenient
    const ipLimit = checkRateLimit(`${namespace}:${clientIP}`, ipConfig);
    if (!ipLimit.allowed) return ipLimit;

    const userLimit = checkRateLimit(`${namespace}:user:${userId}`, config); // User limit is stricter
    if (!userLimit.allowed) return userLimit;

    return ipLimit;
  }
  return checkRateLimit(`${namespace}:${clientIP}`, config);
}

/**
 * Apply a per-user-only rate limit — no IP check. Used as the second pass in
 * withApiProtection AFTER the first (IP-only) pass has already run and
 * authentication has succeeded, so the IP side isn't double-counted.
 *
 * @param {string} userId
 * @param {import('./rateLimit').RateLimitConfig} [config]
 */
export async function applyUserRateLimit(userId, config = RATE_LIMIT_CONFIG.global) {
  const namespace = presetNameFor(config);
  if (process.env.REDIS_URL) {
    const redisLimiter = await import('./rateLimitRedis');
    return redisLimiter.checkRateLimitByUser(userId, namespace, config);
  }
  return checkRateLimit(`${namespace}:user:${userId}`, config);
}

/**
 * Format rate limit error response
 * @param {import('./rateLimit').RateLimitResult} rateLimit
 */
export function handleRateLimitError(rateLimit) {
  const error = createRateLimitError(rateLimit);

  return NextResponse.json(
    {
      error: error.message,
      retryAfter: error.retryAfter,
      resetAt: error.resetAt,
    },
    {
      status: 429,
      headers: getRateLimitHeaders(rateLimit),
    }
  );
}

/**
 * Add rate limit headers to response
 * @param {import('next/server').NextResponse} response
 * @param {import('./rateLimit').RateLimitResult} rateLimit
 */
export function addRateLimitHeaders(response, rateLimit) {
  const headers = getRateLimitHeaders(rateLimit);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

/**
 * Reset rate limit after successful authentication
 * Called after successful login to give user fresh limits
 *
 * NOTE: not currently called anywhere in this codebase — kept for future use.
 * Namespaced under the 'login' preset to match the bucket applyRateLimit
 * would have keyed the login attempt under (RATE_LIMIT_CONFIG.login), so a
 * reset here actually clears the counter that was incremented.
 * @param {Request} request
 */
export async function resetAuthRateLimit(request) {
  const namespace = presetNameFor(RATE_LIMIT_CONFIG.login);
  const clientIP = getClientIP(request);
  if (process.env.REDIS_URL) {
    const redisLimiter = await import('./rateLimitRedis');
    await redisLimiter.resetRateLimit(namespace, `ip:${clientIP}`);
    return;
  }
  resetRateLimit(`${namespace}:${clientIP}`);
}

/**
 * Validate request body size (prevent large upload attacks)
 * Next.js has default limits but this adds explicit check
 * @param {Request} request
 * @param {number} [maxSize]
 */
export async function validateRequestSize(request, maxSize = 1024 * 1024) {
  // 1MB default
  const contentLength = request.headers.get('content-length');
  const method = (request.method || 'GET').toUpperCase();
  const bodyMethod = method === 'POST' || method === 'PUT' || method === 'PATCH';

  if (contentLength) {
    if (Number.parseInt(contentLength, 10) > maxSize) {
      return { valid: false, error: `Corps de requête trop volumineux (max ${maxSize} octets)` };
    }
    return { valid: true };
  }

  // No content-length. Reject a mutation that streams its body — we can't
  // bound it here, so refuse rather than pass an unbounded request through.
  if (bodyMethod && request.headers.get('transfer-encoding')) {
    return { valid: false, error: 'Longueur du corps de requête requise' };
  }

  return { valid: true };
}

/**
 * Validate content type header
 * @param {Request} request
 * @param {string} [expectedType]
 */
export function validateContentType(request, expectedType = 'application/json') {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.includes(expectedType)) {
    return {
      valid: false,
      error: `Expected ${expectedType} content type`,
    };
  }

  return { valid: true };
}

/**
 * Validate authorization header format
 * @param {Request} request
 */
export function validateAuthHeader(request) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return {
      valid: false,
      error: 'Missing authorization header',
      token: null,
    };
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Invalid authorization format (expected: Bearer <token>)',
      token: null,
    };
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix

  if (!token) {
    return {
      valid: false,
      error: 'Empty authorization token',
      token: null,
    };
  }

  return {
    valid: true,
    token,
  };
}

/**
 * Create standardized error response
 * @param {string} message
 * @param {number} [statusCode]
 * @param {unknown} [details]
 */
export function createErrorResponse(message, statusCode = 400, details = null) {
  /** @type {{ error: string, details?: unknown }} */
  const response = { error: message };

  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * CORS helper - already in route.js but provided here for completeness
 * @param {import('next/server').NextResponse} response
 */
export function handleCORS(response) {
  // Headers are set in next.config.js for all responses
  // This is kept for backward compatibility
  return response;
}

/**
 * Security middleware chain for common checks
 * Usage: const middleware = createSecurityMiddleware([
 *   validateContentType,
 *   validateAuthHeader,
 *   applyRateLimit
 * ]);
 *
 * const validation = middleware(request);
 * if (!validation.success) {
 *   return createErrorResponse(validation.error, validation.statusCode);
 * }
 * @param {Array<(request: Request) => { valid: boolean, error?: string, statusCode?: number }>} [checks]
 */
export function createSecurityMiddlewareChain(checks = []) {
  /** @param {Request} request */
  return (request) => {
    for (const check of checks) {
      const result = check(request);
      if (!result.valid) {
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode || 400,
        };
      }
    }
    return { success: true };
  };
}

export default {
  applyRateLimit,
  applyUserRateLimit,
  handleRateLimitError,
  addRateLimitHeaders,
  validateRequestSize,
  validateContentType,
  validateAuthHeader,
  createErrorResponse,
  handleCORS,
  resetAuthRateLimit,
};
