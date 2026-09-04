import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createHash } from 'crypto';

// Configuration TOTP
authenticator.options = {
  digits: 6,
  step: 30, // 30 seconds validity
  window: 1, // Allow 1 step before/after for clock drift
};

/**
 * Generate a new secret for 2FA setup
 * @param {string} email - User email for the authenticator label
 * @param {string} appName - Application name for the authenticator label
 * @returns {Promise<{secret: string, qrCodeUrl: string, otpauthUrl: string}>}
 */
export async function generateTwoFactorSecret(email, appName = 'PM Gestion') {
  const secret = authenticator.generateSecret();

  // Create the otpauth URL
  const otpauthUrl = authenticator.keyuri(email, appName, secret);

  // Generate QR code as data URL
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

  return {
    secret,
    qrCodeUrl,
    otpauthUrl,
  };
}

/**
 * Verify a TOTP token
 * @param {string} token - The 6-digit token to verify
 * @param {string} secret - The user's secret
 * @returns {boolean}
 */
export function verifyTwoFactorToken(token, secret) {
  try {
    return authenticator.verify({ token, secret });
  } catch (error) {
    console.error('2FA verification error:', error);
    return false;
  }
}

/**
 * Generate backup codes
 * @param {number} count - Number of codes to generate
 * @returns {string[]}
 */
export function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = Array.from({ length: 8 }, () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
      return chars.charAt(Math.floor(Math.random() * chars.length));
    }).join('');
    codes.push(code);
  }
  return codes;
}

export function hashBackupCode(code) {
  return createHash('sha256')
    .update(
      String(code || '')
        .toUpperCase()
        .replace(/\s/g, '')
    )
    .digest('hex');
}

export function hashBackupCodes(codes) {
  return (codes || []).map(hashBackupCode);
}

/**
 * Verify a backup code and mark it as used
 * @param {string} code - The backup code to verify
 * @param {string[]} storedCodes - Array of valid backup codes (plain or hashed)
 * @returns {{valid: boolean, remainingCodes: string[]}}
 */
export function verifyBackupCode(code, storedCodes) {
  const normalizedCode = String(code || '')
    .toUpperCase()
    .replace(/\s/g, '');
  const hashed = hashBackupCode(normalizedCode);
  const index = storedCodes.findIndex((item) => item === hashed || item === normalizedCode);

  if (index === -1) {
    return { valid: false, remainingCodes: storedCodes };
  }

  const remainingCodes = [...storedCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}
