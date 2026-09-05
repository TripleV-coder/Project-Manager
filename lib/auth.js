// @ts-nocheck -- TODO(S2-#11): migrate to .ts with proper types
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

// CRITICAL: JWT_SECRET must be defined in environment
// Fail fast if not configured
if (!process.env.JWT_SECRET) {
  throw new Error(
    'FATAL: JWT_SECRET environment variable is required. ' +
      'Set a strong secret key in your environment configuration. ' +
      'Example: openssl rand -base64 32'
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

// Valeurs par défaut pour la sécurité (utilisées si BD non disponible)
const DEFAULT_SECURITY = {
  sessionTimeout: 30, // minutes (converti en jours pour JWT: 30min = court, on garde 7j par défaut)
  passwordMinLength: 8,
  passwordRequireNumbers: true,
  passwordRequireSymbols: true,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
};

/**
 * Hash a plain text password using bcrypt.
 * @param {string} password - The plain text password
 * @returns {Promise<string>} The hashed password
 */
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

/**
 * Compare a plain text password against a bcrypt hash.
 * @param {string} password - The plain text password
 * @param {string} hashedPassword - The bcrypt hash to compare against
 * @returns {Promise<boolean>} True if the password matches
 */
export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Sign a JWT with an expiration in days.
 * @param {Record<string, unknown>} payload - Token payload data
 * @param {number} [expirationDays=7] - Token lifetime in days
 * @returns {Promise<string>} The signed JWT string
 */
export async function signToken(payload, expirationDays = 7) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationDays}d`)
    .sign(JWT_SECRET);
}

/**
 * Sign a JWT with an expiration in minutes (for session timeout).
 * @param {Record<string, unknown>} payload - Token payload data
 * @param {number} [expirationMinutes=30] - Token lifetime in minutes (clamped 1..10080)
 * @returns {Promise<string>} The signed JWT string
 */
export async function signTokenWithMinutes(payload, expirationMinutes = 30) {
  // Minimum 1 minute, maximum 7 days (10080 minutes)
  const minutes = Math.min(Math.max(Math.floor(expirationMinutes), 1), 10080);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT.
 * @param {string} token - The JWT string to verify
 * @returns {Promise<import('jose').JWTPayload | null>} Decoded payload, or null if invalid
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (_error) {
    return null;
  }
}

/**
 * Validate a password against configurable strength rules.
 * @param {string} password - The password to validate
 * @param {object} [settings] - Optional security settings overrides
 * @param {number} [settings.passwordMinLength] - Minimum length
 * @param {boolean} [settings.passwordRequireNumbers] - Require digits
 * @param {boolean} [settings.passwordRequireSymbols] - Require special characters
 * @returns {{ valid: boolean, message?: string }}
 */
export function validatePassword(password, settings = {}) {
  const minLength = settings.passwordMinLength || DEFAULT_SECURITY.passwordMinLength;
  const maxLength = 128;
  const requireNumbers = settings.passwordRequireNumbers !== false;
  const requireSymbols = settings.passwordRequireSymbols !== false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;'`~]/.test(password);

  if (password.length < minLength || password.length > maxLength) {
    return {
      valid: false,
      message: `Le mot de passe doit contenir entre ${minLength} et ${maxLength} caractères`,
    };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
  }
  if (requireNumbers && !hasNumber) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  if (requireSymbols && !hasSpecial) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
  }

  return { valid: true };
}

// Export des valeurs par défaut pour utilisation externe
export const DEFAULT_SECURITY_SETTINGS = DEFAULT_SECURITY;
