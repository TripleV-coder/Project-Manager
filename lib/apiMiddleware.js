import { NextResponse } from 'next/server';
import {
  checkRateLimitCombined,
  createRateLimitError,
  getRateLimitHeaders,
  RATE_LIMIT_CONFIG,
  getClientIP,
  resetRateLimit
} from './rateLimit';

/**
 * Apply rate limiting to an API request
 * Usage in route handlers:
 *
 * const rateLimitResult = applyRateLimit(request, userId, RATE_LIMIT_CONFIG.login);
 * if (!rateLimitResult.allowed) {
 *   return handleRateLimitError(response, rateLimitResult);
 * }
 */
export function applyRateLimit(request, userId = null, config = RATE_LIMIT_CONFIG.global) {
  const clientIP = getClientIP(request);
  
  if (userId) {
    // For authenticated requests, use combined IP + user limits
    return checkRateLimitCombined(
      request,
      userId,
      { ...config, max: Math.ceil(config.max * 2) }, // IP limit is more lenient
      config // User limit is stricter
    );
  } else {
    // For unauthenticated requests, use IP-based limiting
    const ipLimiter = require('./rateLimit');
    return ipLimiter.checkRateLimit(clientIP, config);
  }
}

/**
 * Format rate limit error response
 */
export function handleRateLimitError(rateLimit) {
  const error = createRateLimitError(rateLimit);
  
  return NextResponse.json(
    {
      error: error.message,
      retryAfter: error.retryAfter,
      resetAt: error.resetAt
    },
    {
      status: 429,
      headers: getRateLimitHeaders(rateLimit)
    }
  );
}

/**
 * Add rate limit headers to response
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
 */
export function resetAuthRateLimit(request) {
  const clientIP = getClientIP(request);
  resetRateLimit(clientIP);
}

/**
 * Validate request body size (prevent large upload attacks)
 * Next.js has default limits but this adds explicit check
 */
export async function validateRequestSize(request, maxSize = 1024 * 1024) {
  // 1MB default
  const contentLength = request.headers.get('content-length');
  
  if (contentLength && parseInt(contentLength) > maxSize) {
    return {
      valid: false,
      error: `Request too large (max ${maxSize} bytes)`
    };
  }
  
  return { valid: true };
}

/**
 * Validate content type header
 */
export function validateContentType(request, expectedType = 'application/json') {
  const contentType = request.headers.get('content-type');
  
  if (!contentType || !contentType.includes(expectedType)) {
    return {
      valid: false,
      error: `Expected ${expectedType} content type`
    };
  }
  
  return { valid: true };
}

/**
 * Validate authorization header format
 */
export function validateAuthHeader(request) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return {
      valid: false,
      error: 'Missing authorization header',
      token: null
    };
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return {
      valid: false,
      error: 'Invalid authorization format (expected: Bearer <token>)',
      token: null
    };
  }
  
  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  if (!token) {
    return {
      valid: false,
      error: 'Empty authorization token',
      token: null
    };
  }
  
  return {
    valid: true,
    token
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(message, statusCode = 400, details = null) {
  const response = { error: message };
  
  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }
  
  return NextResponse.json(response, { status: statusCode });
}

/**
 * CORS helper - already in route.js but provided here for completeness
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
 */
export function createSecurityMiddlewareChain(checks = []) {
  return (request) => {
    for (const check of checks) {
      const result = check(request);
      if (!result.valid) {
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode || 400
        };
      }
    }
    return { success: true };
  };
}

export default {
  applyRateLimit,
  handleRateLimitError,
  addRateLimitHeaders,
  validateRequestSize,
  validateContentType,
  validateAuthHeader,
  createErrorResponse,
  handleCORS,
  resetAuthRateLimit
};
