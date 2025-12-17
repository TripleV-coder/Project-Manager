import { authenticator } from 'otplib';
import QRCode from 'qrcode';

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

/**
 * Verify a backup code and mark it as used
 * @param {string} code - The backup code to verify
 * @param {string[]} validCodes - Array of valid backup codes
 * @returns {{valid: boolean, remainingCodes: string[]}}
 */
export function verifyBackupCode(code, validCodes) {
  const normalizedCode = code.toUpperCase().replace(/\s/g, '');
  const index = validCodes.findIndex(c => c === normalizedCode);

  if (index === -1) {
    return { valid: false, remainingCodes: validCodes };
  }

  // Remove used code
  const remainingCodes = [...validCodes];
  remainingCodes.splice(index, 1);

  return { valid: true, remainingCodes };
}
