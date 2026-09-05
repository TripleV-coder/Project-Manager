describe('production required vars', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
    jest.resetModules();
  });

  test('missing SECRETS_ENCRYPTION_KEY is an error in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
    process.env.MONGO_URL = 'mongodb://localhost/x';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    delete process.env.SECRETS_ENCRYPTION_KEY;
    const { validateEnv } = require('@/lib/envValidation');
    const r = validateEnv();
    expect(r.valid).toBe(false);
    expect(r.errors.join(' ')).toMatch(/SECRETS_ENCRYPTION_KEY/);
  });

  test('all prod vars present → valid', () => {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'x'.repeat(32);
    process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
    process.env.SECRETS_ENCRYPTION_KEY = 'z'.repeat(32);
    process.env.MONGO_URL = 'mongodb+srv://h/x';
    process.env.ALLOWED_ORIGINS = 'https://app.example.com';
    const { validateEnv } = require('@/lib/envValidation');
    expect(validateEnv().valid).toBe(true);
  });
});
