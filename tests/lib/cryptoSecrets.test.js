import { _resetKeyCache, decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto/secrets';

describe('lib/crypto/secrets — AES-256-GCM', () => {
  const originalKey = process.env.SECRETS_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    _resetKeyCache();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = originalKey;
    _resetKeyCache();
  });

  test('round-trips a plaintext secret', () => {
    const plaintext = 'super-secret-value-42!';
    const ct = encryptSecret(plaintext);

    expect(ct).not.toBe(plaintext);
    expect(isEncrypted(ct)).toBe(true);
    expect(decryptSecret(ct)).toBe(plaintext);
  });

  test('produces different ciphertexts for the same plaintext (random IV)', () => {
    const a = encryptSecret('hello');
    const b = encryptSecret('hello');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe('hello');
    expect(decryptSecret(b)).toBe('hello');
  });

  test('returns empty string for empty/null input', () => {
    expect(encryptSecret('')).toBe('');
    expect(encryptSecret(null)).toBe('');
    expect(encryptSecret(undefined)).toBe('');
    expect(decryptSecret('')).toBe('');
  });

  test('decryptSecret passes through legacy plaintext (backwards compat)', () => {
    expect(decryptSecret('legacy-plaintext-secret')).toBe('legacy-plaintext-secret');
    expect(isEncrypted('legacy-plaintext-secret')).toBe(false);
  });

  test('encryptSecret is idempotent on already-encrypted values', () => {
    const ct = encryptSecret('foo');
    expect(encryptSecret(ct)).toBe(ct);
  });

  test('tamper detection: modified ciphertext fails authentication', () => {
    const ct = encryptSecret('hello');
    // flip a byte in the base64 payload (after the prefix)
    const flipped = ct.slice(0, -2) + (ct.endsWith('A') ? 'B=' : 'A=');
    expect(() => decryptSecret(flipped)).toThrow();
  });

  test('decryption fails if key is rotated', () => {
    const ct = encryptSecret('hello');
    process.env.SECRETS_ENCRYPTION_KEY =
      'fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210';
    _resetKeyCache();
    expect(() => decryptSecret(ct)).toThrow();
  });

  test('throws when SECRETS_ENCRYPTION_KEY is missing', () => {
    delete process.env.SECRETS_ENCRYPTION_KEY;
    _resetKeyCache();
    expect(() => encryptSecret('x')).toThrow(/SECRETS_ENCRYPTION_KEY/);
  });

  test('accepts a passphrase (non-hex) and derives via scrypt', () => {
    process.env.SECRETS_ENCRYPTION_KEY = 'a-strong-passphrase-with-entropy';
    _resetKeyCache();
    const ct = encryptSecret('payload');
    expect(decryptSecret(ct)).toBe('payload');
  });

  test('strict mode rejects unencrypted input', () => {
    expect(() => decryptSecret('plaintext-value', { strict: true })).toThrow(/encrypted secret/i);
  });

  test('non-strict still returns legacy plaintext', () => {
    expect(decryptSecret('plaintext-value')).toBe('plaintext-value');
  });
});
