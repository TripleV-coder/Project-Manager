/**
 * HttpOnly Cookie Authentication
 * 
 * Provides secure token storage using HttpOnly cookies
 * HttpOnly cookies cannot be accessed by JavaScript, protecting against XSS attacks
 * 
 * IMPORTANT: This requires setting cookies via Set-Cookie header in API responses
 * Clients cannot directly access or manipulate HttpOnly cookies (security feature)
 * 
 * Migration path:
 * 1. Phase 1: Dual mode (localStorage + cookies) for backward compatibility
 * 2. Phase 2: Cookies as primary, localStorage as fallback
 * 3. Phase 3: Deprecate localStorage, use cookies only
 */

const COOKIE_NAME = 'auth_token';
const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Generate Set-Cookie header value for authentication token
 * 
 * @param {string} token - JWT token to store
 * @param {object} options - Cookie options
 * @returns {string} Set-Cookie header value
 */
export function createAuthCookieHeader(token, options = {}) {
  const {
    expiresIn = '7d',
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'Strict',
    domain = null,
    path = '/'
  } = options;

  // Calculate expiration date
  let maxAge = 7 * 24 * 60 * 60; // 7 days default
  if (typeof expiresIn === 'string') {
    const match = expiresIn.match(/(\d+)(d|h|m|s)/);
    if (match) {
      const [, value, unit] = match;
      const multipliers = {
        d: 24 * 60 * 60,
        h: 60 * 60,
        m: 60,
        s: 1
      };
      maxAge = parseInt(value) * multipliers[unit];
    }
  } else if (typeof expiresIn === 'number') {
    maxAge = expiresIn;
  }

  const expirationDate = new Date(Date.now() + maxAge * 1000).toUTCString();

  let cookieStr = `${COOKIE_NAME}=${token}`;
  cookieStr += `; Path=${path}`;
  cookieStr += `; Expires=${expirationDate}`;
  cookieStr += `; Max-Age=${maxAge}`;
  cookieStr += `; HttpOnly`;
  cookieStr += `; SameSite=${sameSite}`;
  
  if (secure) {
    cookieStr += `; Secure`;
  }
  
  if (domain) {
    cookieStr += `; Domain=${domain}`;
  }

  return cookieStr;
}

/**
 * Generate Set-Cookie header to clear authentication cookie
 * Used for logout
 */
export function createAuthCookieClearHeader() {
  return `${COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict`;
}

/**
 * Extract token from cookie string (server-side)
 * Next.js request.cookies doesn't support HttpOnly directly,
 * but this helper shows the pattern
 */
export function getTokenFromCookies(cookieString) {
  if (!cookieString) return null;
  
  const cookies = cookieString.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});

  return cookies[COOKIE_NAME] || null;
}

/**
 * Response helper to set authentication cookie
 * Usage: 
 * const response = NextResponse.json({...data...});
 * setAuthCookie(response, token);
 * return response;
 */
export function setAuthCookie(response, token, options = {}) {
  const cookieHeader = createAuthCookieHeader(token, options);
  response.headers.set('Set-Cookie', cookieHeader);
  return response;
}

/**
 * Response helper to clear authentication cookie
 * Usage:
 * const response = NextResponse.json({message: 'Logged out'});
 * clearAuthCookie(response);
 * return response;
 */
export function clearAuthCookie(response) {
  const cookieHeader = createAuthCookieClearHeader();
  response.headers.set('Set-Cookie', cookieHeader);
  return response;
}

/**
 * Migration helper: Detect if client is using localStorage or cookies
 * Server receives token via:
 * 1. Authorization header (traditional, from localStorage)
 * 2. Cookie header (new, from HttpOnly cookie)
 * 
 * Returns the token from either source (with preference for Authorization header)
 */
export function getTokenFromRequest(request) {
  // Priority 1: Authorization header (current implementation)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Priority 2: Cookie (future implementation)
  // Note: In Next.js, cookies are accessed differently, this is conceptual
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const token = getTokenFromCookies(cookieHeader);
    if (token) return token;
  }

  return null;
}

/**
 * Middleware to ensure authentication (works with both methods)
 * Usage:
 * const token = getAuthToken(request);
 * if (!token) return error(401);
 * const payload = await verifyToken(token);
 */
export function getAuthToken(request) {
  return getTokenFromRequest(request);
}

/**
 * Response helper for successful login with dual mode support
 * Sets both Authorization header (via body) and HttpOnly cookie
 * 
 * Usage:
 * const response = NextResponse.json({...data...});
 * return setLoginResponse(response, token);
 */
export function setLoginResponse(response, token, options = {}) {
  // Set HttpOnly cookie
  setAuthCookie(response, token, options);
  
  // Note: Client receives token in response body for localStorage
  // This maintains backward compatibility
  // In a full migration, response body wouldn't include token
  // Client would rely solely on cookies
  
  return response;
}

/**
 * Configuration for cookie behavior based on environment
 */
export const COOKIE_CONFIG = {
  development: {
    secure: false,
    sameSite: 'Lax', // Allow cross-site for localhost development
    maxAge: 24 * 60 * 60 // 24 hours
  },
  production: {
    secure: true,
    sameSite: 'Strict', // Strict for production
    maxAge: 7 * 24 * 60 * 60 // 7 days
  },
  staging: {
    secure: true,
    sameSite: 'Strict',
    maxAge: 7 * 24 * 60 * 60
  }
};

/**
 * Get appropriate cookie config for current environment
 */
export function getCookieConfig() {
  return COOKIE_CONFIG[process.env.NODE_ENV] || COOKIE_CONFIG.production;
}

/**
 * MIGRATION GUIDE
 * 
 * Step 1: Update login endpoint
 * - Keep existing response with token in body (for localStorage)
 * - Add Set-Cookie header with HttpOnly cookie
 * - Clients can use either method
 * 
 * Step 2: Update API endpoints
 * - Check both Authorization header and cookies
 * - Use getTokenFromRequest() helper
 * - Prefer header if both present
 * 
 * Step 3: Update client
 * - Add cookie support to fetch (credentials: 'include')
 * - Keep localStorage for now as fallback
 * - Gradually phase out localStorage
 * 
 * Step 4: Full migration
 * - Remove localStorage token handling
 * - Rely on cookies only
 * - Remove token from login response body
 * 
 * Step 5: Security
 * - Enable HTTPS everywhere (Secure flag)
 * - Use SameSite=Strict
 * - Implement CSRF tokens if needed
 * - Regular security audits
 * 
 * Example login endpoint update:
 * 
 * const response = NextResponse.json({
 *   message: 'Login successful',
 *   user: {...}
 *   // NOTE: In migration step 4, remove:
 *   // token: token  // Only in transition period
 * });
 * 
 * // Set cookie (works immediately)
 * setAuthCookie(response, token, getCookieConfig());
 * 
 * return response;
 */

export default {
  createAuthCookieHeader,
  createAuthCookieClearHeader,
  getTokenFromCookies,
  getTokenFromRequest,
  setAuthCookie,
  clearAuthCookie,
  setLoginResponse,
  getAuthToken,
  getCookieConfig,
  COOKIE_CONFIG,
  COOKIE_NAME
};
