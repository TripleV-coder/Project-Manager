// @ts-check
import connectDB from '@/lib/mongodb';
import { signToken, signTokenWithMinutes, verifyToken } from '@/lib/auth';
import {
  COOKIE_NAME,
  createAuthCookieClearHeader,
  createAuthCookieHeader,
  getCookieConfig,
  getTokenFromCookies,
} from '@/lib/authCookie';
import {
  ACCESS_TOKEN_TTL_MIN,
  buildRefreshCookie,
  generateJti,
  signRefreshToken,
} from '@/lib/auth/refresh';
import User from '@/models/User';

const INVALID_BEARER_VALUES = new Set(['', 'null', 'undefined', 'cookie-authenticated']);

/**
 * Check if a string looks like a JWT (three dot-separated segments).
 * @param {string} token
 * @returns {boolean}
 */
function isJwtLike(token) {
  return typeof token === 'string' && token.split('.').length === 3;
}

/**
 * Extract the Bearer token from the Authorization header.
 * @param {Request} request
 * @returns {string | null}
 */
export function getBearerToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (INVALID_BEARER_VALUES.has(token)) {
    return null;
  }

  return token;
}

/**
 * Extract the auth token from request cookies.
 * @param {Request} request
 * @returns {string | null}
 */
export function getCookieToken(request) {
  const cookieToken = request.cookies?.get?.(COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const cookieHeader = request.headers.get('cookie');
  return getTokenFromCookies(cookieHeader);
}

/**
 * Resolve the auth token from a request, checking bearer then cookie.
 * @param {Request} request
 * @returns {{ token: string | null, source: 'authorization' | 'cookie' | null }}
 */
export function getTokenFromRequest(request) {
  const bearerToken = getBearerToken(request);

  if (bearerToken && isJwtLike(bearerToken)) {
    return { token: bearerToken, source: 'authorization' };
  }

  const cookieToken = getCookieToken(request);
  if (cookieToken) {
    return { token: cookieToken, source: 'cookie' };
  }

  if (bearerToken) {
    return { token: bearerToken, source: 'authorization' };
  }

  return { token: null, source: null };
}

/**
 * Find and validate the user from a decoded JWT payload.
 * @param {Record<string, any>} payload - Decoded JWT payload
 * @param {{ includePassword?: boolean }} [options]
 * @returns {Promise<object | null>} Populated user document or null
 */
async function findAuthenticatedUser(payload, options = {}) {
  const { includePassword = false } = options;

  await connectDB();

  let query = User.findById(payload.userId).populate('role_id');
  if (includePassword) {
    query = query.select('+password');
  }

  const user = await query;
  if (!user || !user.role_id) {
    return null;
  }

  if (user.status !== 'Actif') {
    return null;
  }

  const tokenVersion = payload.tokenVersion ?? 0;
  if (tokenVersion !== (user.tokenVersion ?? 0)) {
    return null;
  }

  return user;
}

/**
 * Authenticate an incoming request by verifying its JWT and loading the user.
 * @param {Request} request - The incoming HTTP request
 * @param {{ includePassword?: boolean }} [options]
 * @returns {Promise<object | null>} Authenticated user document or null
 */
export async function authenticateRequest(request, options = {}) {
  const { token, source } = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  let payload = await verifyToken(token);

  if (!payload && source === 'authorization') {
    const cookieToken = getCookieToken(request);
    if (cookieToken && cookieToken !== token) {
      payload = await verifyToken(cookieToken);
    }
  }

  if (!payload?.userId) {
    return null;
  }

  return findAuthenticatedUser(payload, options);
}

/**
 * Verify the JWT from a request without loading the full user.
 * @param {Request} request
 * @returns {Promise<import('jose').JWTPayload | null>} Decoded payload or null
 */
export async function verifyRequestToken(request) {
  const { token, source } = getTokenFromRequest(request);
  if (!token) {
    return null;
  }

  let payload = await verifyToken(token);

  if (!payload && source === 'authorization') {
    const cookieToken = getCookieToken(request);
    if (cookieToken && cookieToken !== token) {
      payload = await verifyToken(cookieToken);
    }
  }

  return payload || null;
}

/**
 * Build the JWT payload from a user document.
 * @param {object} user - Mongoose user document with populated role_id
 * @returns {{ userId: string, email: string, role: string, tokenVersion: number }}
 */
export function buildAuthTokenPayload(user) {
  return {
    userId: user._id.toString(),
    email: user.email,
    role: user.role_id?.nom || 'user',
    tokenVersion: user.tokenVersion ?? 0,
  };
}

/**
 * Create a signed JWT access token for a user.
 * @param {object} user - Mongoose user document with populated role_id
 * @param {number | null} [expirationMinutes=null] - Expiration in minutes, or null for default (7 days)
 * @returns {Promise<string>} Signed JWT string
 */
export async function createUserAccessToken(user, expirationMinutes = null) {
  const payload = buildAuthTokenPayload(user);

  if (typeof expirationMinutes === 'number' && Number.isFinite(expirationMinutes)) {
    return signTokenWithMinutes(payload, expirationMinutes);
  }

  return signToken(payload);
}

/**
 * Serialize a user document for client-side consumption.
 * @param {object} user - Mongoose user document with populated role_id
 * @returns {object} Serialized user object safe for JSON responses
 */
export function serializeAuthenticatedUser(user) {
  const role = user.role_id
    ? {
        id: user.role_id._id,
        nom: user.role_id.nom,
        description: user.role_id.description,
        permissions: user.role_id.permissions,
        visibleMenus: user.role_id.visibleMenus,
      }
    : null;

  return {
    id: user._id,
    nom_complet: user.nom_complet,
    email: user.email,
    role,
    role_id: role,
    avatar: user.avatar,
    poste_titre: user.poste_titre,
    département_équipe: user.département_équipe,
    compétences: user.compétences,
    status: user.status,
    first_login: user.first_login,
    must_change_password: user.must_change_password,
    projets_assignés: user.projets_assignés,
    twoFactorEnabled: user.twoFactorEnabled || false,
  };
}

/**
 * Attach an auth cookie to a NextResponse.
 * @param {import('next/server').NextResponse} response
 * @param {string} token - JWT token value
 * @param {{ expiresIn?: number, maxAge?: number }} [options]
 * @returns {import('next/server').NextResponse} The response with Set-Cookie header
 */
export function attachAuthCookie(response, token, options = {}) {
  const cookieConfig = getCookieConfig();

  response.headers.set(
    'Set-Cookie',
    createAuthCookieHeader(token, {
      ...cookieConfig,
      ...options,
      expiresIn: options.expiresIn ?? options.maxAge ?? cookieConfig.maxAge,
    })
  );

  return response;
}

/**
 * Clear auth cookies from a NextResponse (both access and refresh).
 * @param {import('next/server').NextResponse} response
 * @returns {import('next/server').NextResponse} The response with cleared cookies
 */
export function clearAuthCookies(response) {
  response.headers.append('Set-Cookie', createAuthCookieClearHeader());
  response.headers.append('Set-Cookie', buildRefreshCookie('', { clear: true }));
  return response;
}

/**
 * Issue a fresh access+refresh token pair for a user, set both cookies.
 * Persists the refresh jti so future refreshes can reject reused tokens.
 * @param {import('next/server').NextResponse} response
 * @param {object} user - Mongoose user with populated role_id
 * @returns {Promise<{ accessToken: string, refreshToken: string }>}
 */
export async function issueAuthTokens(response, user) {
  const accessToken = await createUserAccessToken(user, ACCESS_TOKEN_TTL_MIN);
  const jti = generateJti();
  const refreshToken = await signRefreshToken({
    userId: user._id.toString(),
    tokenVersion: user.tokenVersion ?? 0,
    jti,
  });

  user.currentRefreshJti = jti;
  await user.save();

  attachAuthCookie(response, accessToken, { expiresIn: ACCESS_TOKEN_TTL_MIN * 60 });
  response.headers.append('Set-Cookie', buildRefreshCookie(refreshToken));

  return { accessToken, refreshToken };
}
