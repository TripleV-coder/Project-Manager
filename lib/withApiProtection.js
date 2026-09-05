import {
  applyRateLimit,
  applyUserRateLimit,
  handleRateLimitError,
  validateRequestSize,
} from './apiMiddleware';
import { authenticateRequest } from './requestAuth';
import { RATE_LIMIT_CONFIG } from './rateLimit';
import { APIResponse, handleError } from './apiResponse';
import connectDB from './mongodb';

/**
 * Evaluate a permission expression against the user's permission map.
 * Accepted shapes:
 *   - 'permA'                          -> single permission required
 *   - ['permA', 'permB']               -> ANY of (OR) — backwards-compatible default
 *   - { all: ['permA', 'permB'] }      -> ALL required (AND)
 *   - { any: ['permA', 'permB'] }      -> ANY required (OR)
 *   - { all: [...], any: [...] }       -> all of `all` AND any of `any`
 * @param {object} perms
 * @param {string|string[]|object} expr
 * @returns {boolean}
 */
export function evaluatePermissions(perms, expr) {
  if (!expr) return true;
  if (typeof expr === 'string') return !!perms[expr];
  if (Array.isArray(expr)) {
    if (expr.length === 0) return true;
    return expr.some((p) => !!perms[p]);
  }
  if (typeof expr === 'object') {
    const allOk = !expr.all || (Array.isArray(expr.all) && expr.all.every((p) => !!perms[p]));
    const anyOk =
      !expr.any ||
      (Array.isArray(expr.any) && expr.any.length > 0 && expr.any.some((p) => !!perms[p]));
    return allOk && anyOk;
  }
  return false;
}

/**
 * Higher-order wrapper that applies rate limiting, request size validation,
 * authentication, and permission checks to API route handlers.
 *
 * @param {Function} handler - The route handler function (request, context) => Response
 * @param {Object} options
 * @param {boolean} [options.requireAuth=true] - Whether authentication is required
 * @param {string} [options.rateLimitPreset='global'] - Rate limit preset key
 * @param {number} [options.maxBodySize=1048576] - Max request body size in bytes (1MB default)
 * @param {string[]|object} [options.requiredPermissions=[]] - Permission expression
 *   (array = OR, {all: [...]} = AND, {any: [...]} = OR, combine for AND-of-AND/OR)
 */
export function withApiProtection(handler, options = {}) {
  const {
    requireAuth = true,
    rateLimitPreset = 'global',
    maxBodySize = 1048576,
    requiredPermissions = [],
  } = options;

  return async function protectedHandler(request, context) {
    try {
      await connectDB();

      // Request size validation for mutation methods
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const sizeCheck = await validateRequestSize(request, maxBodySize);
        if (!sizeCheck.valid) {
          return APIResponse.error(sizeCheck.error, 413, null, 'PAYLOAD_TOO_LARGE');
        }
      }

      const rateLimitConfig = RATE_LIMIT_CONFIG[rateLimitPreset] || RATE_LIMIT_CONFIG.global;

      // Pass 1: IP-only limit, plain (undoubled) config — runs for EVERY request,
      // including unauthenticated ones and ones that will go on to fail auth. This
      // reproduces exactly the real limit that applied before rate-limiting moved
      // ahead of auth (checkRateLimit(clientIP, config) with no userId), so it
      // closes the unauthenticated/failed-auth flood gap with no regression there.
      const ipLimit = await applyRateLimit(request, null, rateLimitConfig);
      if (!ipLimit.allowed) {
        return handleRateLimitError(ipLimit);
      }

      // Authentication
      let user = null;
      if (requireAuth) {
        user = await authenticateRequest(request);
        if (!user) {
          return APIResponse.unauthorized();
        }

        // Permission check (supports OR via array, AND via {all}, mixed via {all, any})
        const hasPermSpec =
          (Array.isArray(requiredPermissions) && requiredPermissions.length > 0) ||
          (typeof requiredPermissions === 'object' && requiredPermissions !== null) ||
          typeof requiredPermissions === 'string';
        if (hasPermSpec) {
          const perms = user.role_id?.permissions || {};
          if (!evaluatePermissions(perms, requiredPermissions)) {
            return APIResponse.forbidden();
          }
        }

        // Pass 2: per-user limit ONLY. Pass 1 already incremented the IP-keyed
        // counter for this request — re-checking it here (e.g. via applyRateLimit's
        // combined check) would double-count against the same key. Use the
        // dedicated per-user-only limiter instead, matching the per-user budget
        // the old combined check used internally.
        const userLimit = await applyUserRateLimit(user._id.toString(), rateLimitConfig);
        if (!userLimit.allowed) {
          return handleRateLimitError(userLimit);
        }
      }

      return await handler(request, { ...context, user });
    } catch (error) {
      return handleError(error, `${request.method} ${request.url}`);
    }
  };
}
