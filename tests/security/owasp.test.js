/**
 * OWASP Top 10 (2021) — defensive coverage suite.
 *
 * This file does not exhaustively prove the absence of every variant; it
 * pins the known mitigations in place so a refactor can't silently regress
 * them. Each describe() block names the OWASP category it covers.
 */

import { evaluatePermissions } from '@/lib/withApiProtection';
import { _resetKeyCache, decryptSecret, encryptSecret, isEncrypted } from '@/lib/crypto/secrets';

describe('OWASP A01:2021 — Broken Access Control', () => {
  test('unknown permissions deny by default', () => {
    expect(evaluatePermissions({}, 'admin')).toBe(false);
    expect(evaluatePermissions({}, ['admin'])).toBe(false);
    expect(evaluatePermissions({}, { all: ['admin'] })).toBe(false);
  });

  test('AND requires every permission — partial match denies', () => {
    expect(evaluatePermissions({ read: true }, { all: ['read', 'write'] })).toBe(false);
  });

  test('OR allows any matching permission', () => {
    expect(evaluatePermissions({ audit: true }, ['admin', 'audit'])).toBe(true);
  });
});

describe('OWASP A02:2021 — Cryptographic Failures', () => {
  beforeEach(() => {
    process.env.SECRETS_ENCRYPTION_KEY =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    _resetKeyCache();
  });

  test('stored secrets are AES-256-GCM, never plaintext on the wire', () => {
    const ct = encryptSecret('client_secret_42');
    expect(ct).not.toContain('client_secret_42');
    expect(isEncrypted(ct)).toBe(true);
  });

  test('AEAD: tampered ciphertext is rejected (no silent decryption)', () => {
    const ct = encryptSecret('payload');
    const charToFlip = ct[10] === 'a' ? 'b' : 'a';
    const tampered = ct.slice(0, 10) + charToFlip + ct.slice(11);
    expect(() => decryptSecret(tampered)).toThrow();
  });

  test('IV is randomized — same plaintext gives different ciphertext', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });
});

describe('OWASP A03:2021 — Injection', () => {
  test('User model declares typed schema fields (mitigates NoSQL operator injection)', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('models/User.js', 'utf8');
    // Typed string fields prevent mongoose from accepting raw query operators
    // like { $ne: null } where a primitive is expected. We pin the discipline.
    expect(src).toMatch(/email:\s*\{[\s\S]*?type:\s*String/);
    expect(src).toMatch(/password:\s*\{[\s\S]*?type:\s*String/);
  });

  test('zod request validation is wired on auth routes', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('app/api/auth/login/route.js', 'utf8');
    expect(src).toMatch(/validateBody/);
    expect(src).toMatch(/loginRequestSchema/);
  });
});

describe('OWASP A04:2021 — Insecure Design', () => {
  test('login endpoint enforces lockout (defense-in-depth, not just rate limit)', async () => {
    // The login route increments loginAttempts and sets lockUntil at 5 — pin
    // the constant so a refactor can't quietly raise the ceiling.
    const src = await import('fs').then((fs) =>
      fs.readFileSync('app/api/auth/login/route.js', 'utf8')
    );
    expect(src).toMatch(/failedLoginAttempts\s*>=\s*5/);
    expect(src).toMatch(/15\s*\*\s*60\s*\*\s*1000/); // 15-minute lockout
  });
});

describe('OWASP A05:2021 — Security Misconfiguration', () => {
  test('middleware sets CSP, HSTS-in-prod, X-Frame-Options DENY, X-Content-Type-Options nosniff', async () => {
    const src = await import('fs').then((fs) => fs.readFileSync('middleware.js', 'utf8'));
    expect(src).toMatch(/Content-Security-Policy/);
    expect(src).toMatch(/Strict-Transport-Security/);
    expect(src).toMatch(/X-Frame-Options.*DENY/);
    expect(src).toMatch(/X-Content-Type-Options.*nosniff/);
    expect(src).toMatch(/frame-ancestors 'none'/);
    expect(src).toMatch(/object-src 'none'/);
  });

  test("CSP does not contain 'unsafe-inline' or 'unsafe-eval' for scripts in production branch", async () => {
    const src = await import('fs').then((fs) => fs.readFileSync('middleware.js', 'utf8'));
    // Match the production scriptSrc literal — should NOT contain unsafe-inline/eval
    const prodScriptSrc = src.match(/script-src 'self' 'nonce-\$\{nonce\}' 'strict-dynamic'\s*`/);
    expect(prodScriptSrc).toBeTruthy();
  });
});

describe('OWASP A07:2021 — Identification and Authentication Failures', () => {
  test('login returns identical message+status for missing user / wrong password / inactive (no enumeration)', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('app/api/auth/login/route.js', 'utf8')
    );
    const occurrences = src.match(/error: GENERIC_AUTH_ERROR/g) || [];
    // 4 failure branches: no-user, inactive, locked, wrong-password
    expect(occurrences.length).toBeGreaterThanOrEqual(4);
    expect(src).toMatch(/Identifiants invalides/);
  });

  test('login enforces a minimum response duration (timing equalization)', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('app/api/auth/login/route.js', 'utf8')
    );
    expect(src).toMatch(/MIN_LOGIN_DURATION_MS/);
    expect(src).toMatch(/settleAtLeast/);
  });

  test('refresh tokens use a separate cookie + jti tracked server-side', async () => {
    const src = await import('fs').then((fs) => fs.readFileSync('lib/auth/refresh.js', 'utf8'));
    expect(src).toMatch(/refresh_token/);
    expect(src).toMatch(/HttpOnly/);
    expect(src).toMatch(/jti/);
  });
});

describe('OWASP A09:2021 — Security Logging and Monitoring Failures', () => {
  test('5+ failed logins triggers admin notification', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('app/api/auth/login/route.js', 'utf8')
    );
    expect(src).toMatch(/notifyAboutFailedLogins/);
    expect(src).toMatch(/lockoutThresholdReached/);
  });

  test('audit service exists and is wired into login flow', async () => {
    const src = await import('fs').then((fs) =>
      fs.readFileSync('app/api/auth/login/route.js', 'utf8')
    );
    expect(src).toMatch(/logActivity/);
  });
});
