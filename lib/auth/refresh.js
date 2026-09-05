// @ts-check
import { createLogger } from '@/lib/logger';
const log = createLogger('auth-refresh');
import { SignJWT, jwtVerify } from 'jose';
import { randomBytes } from 'crypto';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET is required for refresh tokens');
}

const isProd = process.env.NODE_ENV === 'production';
const refreshSecretRaw = process.env.JWT_REFRESH_SECRET;

if (isProd && (!refreshSecretRaw || refreshSecretRaw.length < 32)) {
  throw new Error(
    'FATAL: JWT_REFRESH_SECRET (min 32 chars) is required in production. ' +
      'Generate one with: openssl rand -base64 48'
  );
}
if (!isProd && !refreshSecretRaw) {
  log.warn('[auth] JWT_REFRESH_SECRET not set — deriving from JWT_SECRET (dev only)');
}

const REFRESH_SECRET = new TextEncoder().encode(
  refreshSecretRaw || process.env.JWT_SECRET + '_refresh'
);

export const ACCESS_TOKEN_TTL_MIN = parseInt(process.env.ACCESS_TOKEN_TTL_MIN || '15', 10);
export const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);

export const REFRESH_COOKIE_NAME = 'refresh_token';

/**
 * Sign a refresh token with longer expiration and isolated secret.
 * @param {{ userId: string, tokenVersion: number, jti: string }} payload
 * @returns {Promise<string>}
 */
export async function signRefreshToken(payload) {
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(REFRESH_SECRET);
}

/**
 * Verify and decode a refresh token.
 * @param {string} token
 * @returns {Promise<import('jose').JWTPayload | null>}
 */
export async function verifyRefreshToken(token) {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    if (payload.type !== 'refresh') return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Build the Set-Cookie header for the refresh token (HttpOnly, Secure, SameSite=Strict).
 * @param {string} token
 * @param {{ clear?: boolean }} [options]
 * @returns {string}
 */
export function buildRefreshCookie(token, options = {}) {
  const { clear = false } = options;
  const maxAge = clear ? 0 : REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60;
  const expires = clear
    ? 'Thu, 01 Jan 1970 00:00:00 GMT'
    : new Date(Date.now() + maxAge * 1000).toUTCString();

  let cookie = `${REFRESH_COOKIE_NAME}=${clear ? '' : token}`;
  cookie += `; Path=/api/auth`;
  cookie += `; Expires=${expires}`;
  cookie += `; Max-Age=${maxAge}`;
  cookie += `; HttpOnly`;
  cookie += `; SameSite=Strict`;
  if (process.env.NODE_ENV === 'production') {
    cookie += `; Secure`;
  }
  return cookie;
}

/**
 * Generate a unique, unpredictable JWT ID for a refresh token (rotation tracking).
 * @returns {string}
 */
export function generateJti() {
  return randomBytes(16).toString('hex');
}

/**
 * Read refresh token from request cookies.
 * @param {Request | import('next/server').NextRequest} request
 * @returns {string | null}
 */
export function getRefreshTokenFromRequest(request) {
  const cookieFromAPI = /** @type {any} */ (request).cookies?.get?.(REFRESH_COOKIE_NAME)?.value;
  if (cookieFromAPI) return cookieFromAPI;

  const header = request.headers.get('cookie');
  if (!header) return null;
  const match = header.split(';').find((c) => c.trim().startsWith(`${REFRESH_COOKIE_NAME}=`));
  if (!match) return null;
  return match.trim().split('=')[1] || null;
}
