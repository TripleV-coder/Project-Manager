import { decryptSecret, encryptSecret, _resetKeyCache } from '@/lib/crypto/secrets';

describe('lib/crypto/secrets — SharePointConfig integration', () => {
  const originalKey = process.env.SECRETS_ENCRYPTION_KEY;
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    _resetKeyCache();
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalKey === undefined) delete process.env.SECRETS_ENCRYPTION_KEY;
    else process.env.SECRETS_ENCRYPTION_KEY = originalKey;
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
    _resetKeyCache();
  });

  test('decryptSecret with strict mode in production rejects plaintext', () => {
    process.env.NODE_ENV = 'production';
    const strict = process.env.NODE_ENV === 'production';

    expect(() => decryptSecret('plaintext-secret', { strict })).toThrow(/encrypted secret/i);
  });

  test('decryptSecret with strict mode in production allows encrypted secrets', () => {
    process.env.NODE_ENV = 'production';
    const strict = process.env.NODE_ENV === 'production';
    const encrypted = encryptSecret('my-secret-value');

    const decrypted = decryptSecret(encrypted, { strict });
    expect(decrypted).toBe('my-secret-value');
  });

  test('decryptSecret without strict mode allows plaintext in development', () => {
    process.env.NODE_ENV = 'development';
    const strict = process.env.NODE_ENV === 'production';

    const result = decryptSecret('plaintext-secret', { strict });
    expect(result).toBe('plaintext-secret');
  });
});
