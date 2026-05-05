// @ts-check
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const KEY_LEN = 32;
const IV_LEN = 12;
const TAG_LEN = 16;
const ENCRYPTED_PREFIX = 'enc:v1:';

/** @type {Buffer | null} */
let cachedKey = null;

function deriveKey() {
  if (cachedKey) return cachedKey;

  const raw = process.env.SECRETS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error('FATAL: SECRETS_ENCRYPTION_KEY is required to encrypt/decrypt stored secrets');
  }

  // Accept hex (64 chars = 32 bytes) directly, otherwise derive via scrypt
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    cachedKey = Buffer.from(raw, 'hex');
  } else {
    const salt = process.env.SECRETS_ENCRYPTION_SALT || 'project-manager-secrets-v1';
    cachedKey = scryptSync(raw, salt, KEY_LEN);
  }
  return cachedKey;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Output format: enc:v1:<base64(iv|tag|ciphertext)>
 * @param {string} plaintext
 * @returns {string} encrypted token (or empty string if input empty)
 */
export function encryptSecret(plaintext) {
  if (plaintext === null || plaintext === undefined || plaintext === '') return '';
  if (typeof plaintext !== 'string') {
    throw new TypeError('encryptSecret expects a string');
  }
  if (isEncrypted(plaintext)) return plaintext;

  const key = deriveKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, tag, ct]).toString('base64');
  return `${ENCRYPTED_PREFIX}${payload}`;
}

/**
 * Decrypt a token produced by encryptSecret. If the input is not encrypted
 * (legacy plaintext value), returns it unchanged for backwards compatibility.
 * @param {string} token
 * @returns {string}
 */
export function decryptSecret(token) {
  if (token === null || token === undefined || token === '') return '';
  if (typeof token !== 'string') {
    throw new TypeError('decryptSecret expects a string');
  }
  if (!isEncrypted(token)) return token;

  const key = deriveKey();
  const buf = Buffer.from(token.slice(ENCRYPTED_PREFIX.length), 'base64');
  if (buf.length < IV_LEN + TAG_LEN + 1) {
    throw new Error('Invalid encrypted secret payload');
  }
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

/**
 * @param {string} value
 * @returns {boolean}
 */
export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENCRYPTED_PREFIX);
}

// Test-only helper to reset the cached key (e.g. when env changes between tests)
export function _resetKeyCache() {
  cachedKey = null;
}
