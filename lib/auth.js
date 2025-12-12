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

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch (error) {
    return null;
  }
}

export function validatePassword(password) {
  // 8-128 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 spécial
  const minLength = 8;
  const maxLength = 128;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength || password.length > maxLength) {
    return { valid: false, message: 'Le mot de passe doit contenir entre 8 et 128 caractères' };
  }
  if (!hasUpperCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' };
  }
  if (!hasLowerCase) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' };
  }
  if (!hasNumber) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  if (!hasSpecial) {
    return { valid: false, message: 'Le mot de passe doit contenir au moins un caractère spécial' };
  }

  return { valid: true };
}
