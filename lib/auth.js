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
  lockoutDuration: 15
};

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

// Signer un token avec durée configurable
export async function signToken(payload, expirationDays = 7) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${expirationDays}d`)
    .sign(JWT_SECRET);
}

// Signer un token avec durée en minutes (pour session timeout)
export async function signTokenWithMinutes(payload, expirationMinutes = 30) {
  // Minimum 30 minutes, maximum 7 jours (10080 minutes)
  const minutes = Math.min(Math.max(expirationMinutes, 30), 10080);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${minutes}m`)
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (_error) {
    return null;
  }
}

// Validation du mot de passe avec paramètres configurables
export function validatePassword(password, settings = {}) {
  const minLength = settings.passwordMinLength || DEFAULT_SECURITY.passwordMinLength;
  const maxLength = 128;
  const requireNumbers = settings.passwordRequireNumbers !== false;
  const requireSymbols = settings.passwordRequireSymbols !== false;

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~]/.test(password);

  if (password.length < minLength || password.length > maxLength) {
    return { valid: false, message: `Le mot de passe doit contenir entre ${minLength} et ${maxLength} caractères` };
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
